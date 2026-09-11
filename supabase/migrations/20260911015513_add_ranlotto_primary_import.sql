begin;

alter table public.lottery_draws
  add column source_record_id text,
  add column provider_verification_status text
    check (provider_verification_status is null or provider_verification_status in (
      'issuer_verified',
      'partial_verified',
      'legacy_published',
      'ranlotto_published',
      'unverified',
      'disputed'
    ));

comment on column public.lottery_draws.source_record_id is
  'Stable record identifier supplied by the result provider.';
comment on column public.lottery_draws.provider_verification_status is
  'Provider-level provenance status. This is kept separate from the application verified/published state.';

create index lottery_draws_provider_status_date_idx
  on public.lottery_draws (source_name, provider_verification_status, draw_date desc);

create or replace function public.ingest_ranlotto_lottery_draw(
  p_draw_date date,
  p_source_checksum text,
  p_raw_payload jsonb,
  p_prizes jsonb,
  p_result_scope text,
  p_verification_status text,
  p_source_record_id text,
  p_actor uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_draw_id uuid;
  existing_status text;
  existing_scope text;
  incoming_status text;
  prize jsonb;
  expected_entries integer;
  source_page text;
begin
  if p_draw_date > (now() at time zone 'Asia/Bangkok')::date then
    raise exception 'Cannot publish a future draw';
  end if;
  if p_result_scope is null or p_result_scope not in ('full', 'analysis_subset') then
    raise exception 'Unsupported result scope';
  end if;
  if p_verification_status is null or p_verification_status not in (
    'issuer_verified', 'partial_verified', 'legacy_published',
    'ranlotto_published', 'unverified', 'disputed'
  ) then
    raise exception 'Unsupported provider verification status';
  end if;
  if p_source_checksum is null or char_length(p_source_checksum) < 16 then
    raise exception 'Source checksum is required';
  end if;

  expected_entries := case when p_result_scope = 'full' then 173 else 6 end;
  if jsonb_typeof(p_prizes) <> 'array' or jsonb_array_length(p_prizes) <> expected_entries then
    raise exception 'Unexpected prize entry count';
  end if;
  if (select count(*) from jsonb_array_elements(p_prizes) p where p ->> 'prize_type' = 'first') <> 1 then
    raise exception 'First prize count must be 1';
  end if;
  if (select count(*) from jsonb_array_elements(p_prizes) p where p ->> 'prize_type' = 'last_two') <> 1 then
    raise exception 'Last-two count must be 1';
  end if;
  if (select count(*) from jsonb_array_elements(p_prizes) p where p ->> 'prize_type' in ('front_three', 'last_three')) <> 4 then
    raise exception 'Three-digit prize count must be 4';
  end if;
  if p_result_scope = 'full' and (
    (select count(*) from jsonb_array_elements(p_prizes) p where p ->> 'prize_type' = 'adjacent_first') <> 2
    or (select count(*) from jsonb_array_elements(p_prizes) p where p ->> 'prize_type' = 'second') <> 5
    or (select count(*) from jsonb_array_elements(p_prizes) p where p ->> 'prize_type' = 'third') <> 10
    or (select count(*) from jsonb_array_elements(p_prizes) p where p ->> 'prize_type' = 'fourth') <> 50
    or (select count(*) from jsonb_array_elements(p_prizes) p where p ->> 'prize_type' = 'fifth') <> 100
  ) then
    raise exception 'Full draw prize groups are incomplete';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_prizes) p
    where p ->> 'prize_type' not in (
      'first', 'second', 'third', 'fourth', 'fifth',
      'adjacent_first', 'front_three', 'last_three', 'last_two'
    )
      or p ->> 'winning_number' !~ '^[0-9]+$'
      or case
        when p ->> 'prize_type' in ('first', 'second', 'third', 'fourth', 'fifth', 'adjacent_first')
          then char_length(p ->> 'winning_number') <> 6
        when p ->> 'prize_type' in ('front_three', 'last_three')
          then char_length(p ->> 'winning_number') <> 3
        when p ->> 'prize_type' = 'last_two'
          then char_length(p ->> 'winning_number') <> 2
        else true
      end
  ) then
    raise exception 'Prize number validation failed';
  end if;

  incoming_status := case when p_verification_status = 'issuer_verified' then 'verified' else 'published' end;
  source_page := 'https://www.ranlotto.com/lottery/' || p_draw_date::text;

  select id, status, result_scope
    into target_draw_id, existing_status, existing_scope
  from public.lottery_draws
  where draw_date = p_draw_date;

  -- Never replace a stronger verified result with a lower-assurance archive row,
  -- and never replace a complete verified draw with an analysis-only subset.
  if existing_status = 'verified' and incoming_status <> 'verified' then
    return target_draw_id;
  end if;
  if existing_status = 'verified' and existing_scope = 'full' and p_result_scope <> 'full' then
    return target_draw_id;
  end if;

  insert into public.lottery_draws (
    draw_date,
    status,
    result_scope,
    source_name,
    source_url,
    source_checksum,
    source_record_id,
    provider_verification_status,
    published_at,
    verified_at
  )
  values (
    p_draw_date,
    incoming_status,
    p_result_scope,
    'RANLOTTO',
    source_page,
    p_source_checksum,
    nullif(p_source_record_id, ''),
    p_verification_status,
    now(),
    case when incoming_status = 'verified' then now() else null end
  )
  on conflict (draw_date) do update set
    status = excluded.status,
    result_scope = excluded.result_scope,
    source_name = excluded.source_name,
    source_url = excluded.source_url,
    source_checksum = excluded.source_checksum,
    source_record_id = excluded.source_record_id,
    provider_verification_status = excluded.provider_verification_status,
    published_at = excluded.published_at,
    verified_at = excluded.verified_at
  returning id into target_draw_id;

  delete from public.lottery_prizes where draw_id = target_draw_id;
  for prize in select value from jsonb_array_elements(p_prizes)
  loop
    insert into public.lottery_prizes (
      draw_id,
      prize_type,
      winning_number,
      prize_amount,
      sequence_number
    )
    values (
      target_draw_id,
      prize ->> 'prize_type',
      prize ->> 'winning_number',
      (prize ->> 'prize_amount')::numeric,
      coalesce((prize ->> 'sequence_number')::smallint, 1)
    );
  end loop;

  insert into private.lottery_import_runs (
    draw_id,
    source_url,
    raw_payload,
    payload_checksum,
    status,
    imported_by,
    completed_at
  )
  values (
    target_draw_id,
    source_page,
    p_raw_payload,
    p_source_checksum,
    'imported',
    p_actor,
    now()
  )
  on conflict (payload_checksum) do update set
    draw_id = excluded.draw_id,
    status = 'imported',
    completed_at = now();

  if p_result_scope = 'full' and incoming_status = 'verified' then
    perform private.evaluate_lottery_draw(target_draw_id);
  end if;

  insert into private.audit_logs (actor_user_id, action, entity_type, entity_id, details)
  values (
    p_actor,
    'lottery.import_ranlotto',
    'lottery_draw',
    target_draw_id::text,
    jsonb_build_object(
      'draw_date', p_draw_date,
      'checksum', p_source_checksum,
      'result_scope', p_result_scope,
      'provider_verification_status', p_verification_status,
      'source_record_id', p_source_record_id
    )
  );

  return target_draw_id;
end;
$$;

revoke all on function public.ingest_ranlotto_lottery_draw(date, text, jsonb, jsonb, text, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.ingest_ranlotto_lottery_draw(date, text, jsonb, jsonb, text, text, text, uuid)
  to service_role;

commit;
