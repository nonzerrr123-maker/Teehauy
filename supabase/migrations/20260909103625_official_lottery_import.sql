begin;

create or replace function public.ingest_official_lottery_draw(
  p_draw_date date,
  p_source_url text,
  p_source_checksum text,
  p_raw_payload jsonb,
  p_prizes jsonb,
  p_actor uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_draw_id uuid;
  prize jsonb;
begin
  if (select auth.role()) <> 'service_role' then raise exception 'Service role required'; end if;
  if p_draw_date > (now() at time zone 'Asia/Bangkok')::date then raise exception 'Cannot publish a future draw'; end if;
  if jsonb_typeof(p_prizes) <> 'array' or jsonb_array_length(p_prizes) <> 173 then raise exception 'Official draw must contain 173 winning entries'; end if;
  if (select count(*) from jsonb_array_elements(p_prizes) p where p ->> 'prize_type' = 'first') <> 1 then raise exception 'First prize count must be 1'; end if;
  if (select count(*) from jsonb_array_elements(p_prizes) p where p ->> 'prize_type' = 'last_two') <> 1 then raise exception 'Last-two count must be 1'; end if;
  if (select count(*) from jsonb_array_elements(p_prizes) p where p ->> 'prize_type' in ('front_three', 'last_three')) <> 4 then raise exception 'Three-digit count must be 4'; end if;

  insert into public.lottery_draws (draw_date, status, source_name, source_url, source_checksum, published_at, verified_at)
  values (p_draw_date, 'verified', 'สำนักงานสลากกินแบ่งรัฐบาล', p_source_url, p_source_checksum, now(), now())
  on conflict (draw_date) do update set status = 'verified', source_name = excluded.source_name, source_url = excluded.source_url,
    source_checksum = excluded.source_checksum, published_at = excluded.published_at, verified_at = excluded.verified_at
  returning id into target_draw_id;

  delete from public.lottery_prizes where draw_id = target_draw_id;
  for prize in select value from jsonb_array_elements(p_prizes)
  loop
    insert into public.lottery_prizes (draw_id, prize_type, winning_number, prize_amount, sequence_number)
    values (target_draw_id, prize ->> 'prize_type', prize ->> 'winning_number', (prize ->> 'prize_amount')::numeric, coalesce((prize ->> 'sequence_number')::smallint, 1));
  end loop;

  insert into private.lottery_import_runs (draw_id, source_url, raw_payload, payload_checksum, status, imported_by, completed_at)
  values (target_draw_id, p_source_url, p_raw_payload, p_source_checksum, 'imported', p_actor, now())
  on conflict (payload_checksum) do update set draw_id = excluded.draw_id, status = 'imported', completed_at = now();

  perform private.evaluate_lottery_draw(target_draw_id);
  insert into private.audit_logs (actor_user_id, action, entity_type, entity_id, details)
  values (p_actor, 'lottery.import_verified', 'lottery_draw', target_draw_id::text, jsonb_build_object('draw_date', p_draw_date, 'checksum', p_source_checksum));
  return target_draw_id;
end;
$$;

revoke all on function public.ingest_official_lottery_draw(date, text, text, jsonb, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.ingest_official_lottery_draw(date, text, text, jsonb, jsonb, uuid) to service_role;

commit;
