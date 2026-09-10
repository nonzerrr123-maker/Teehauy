begin;

-- Comments can expose their public author profile through PostgREST joins.
alter table public.post_comments
  add constraint post_comments_author_profile_fkey
  foreign key (author_id) references public.profiles(id) on delete cascade
  not valid;

alter table public.post_comments
  validate constraint post_comments_author_profile_fkey;

-- Purchased tickets stay private unless their owner explicitly shares them.
alter table public.user_tickets
  add column visibility text not null default 'private';

alter table public.user_tickets
  add constraint user_tickets_visibility_check
  check (visibility in ('private', 'followers', 'public'));

create index user_tickets_shared_user_created_idx
  on public.user_tickets (user_id, created_at desc)
  where visibility <> 'private';

create policy tickets_public_read
  on public.user_tickets
  for select
  to anon, authenticated
  using (visibility = 'public');

create policy tickets_follower_read
  on public.user_tickets
  for select
  to authenticated
  using (
    visibility = 'followers'
    and exists (
      select 1
      from public.user_follows follow
      where follow.follower_id = (select auth.uid())
        and follow.following_id = user_id
    )
  );

-- A bounded write path keeps comment validation and rate limits in one place.
create or replace function public.create_post_comment(
  p_post_id uuid,
  p_body text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  new_comment_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if char_length(trim(p_body)) not between 1 and 1000 then
    raise exception 'Comment body must be 1-1000 characters';
  end if;

  if not exists (
    select 1 from public.posts
    where id = p_post_id and status = 'published'
  ) then
    raise exception 'Published post not found';
  end if;

  if not public.check_rate_limit('create_post_comment', 12, 60) then
    raise exception 'Rate limit exceeded';
  end if;

  insert into public.post_comments (post_id, author_id, body, status)
  values (p_post_id, current_user_id, trim(p_body), 'published')
  returning id into new_comment_id;

  return new_comment_id;
end;
$$;

revoke all on function public.create_post_comment(uuid, text) from public, anon;
grant execute on function public.create_post_comment(uuid, text) to authenticated;

-- Recreate the dream workflow with an explicit public opt-in. The default remains
-- private. When opted in, the dream, its numbers, and a community post are made
-- public together in the same transaction.
drop function if exists public.save_dream_prediction(uuid, uuid, jsonb);

create function public.save_dream_prediction(
  p_interpretation_id uuid,
  p_draw_id uuid,
  p_numbers jsonb,
  p_is_public boolean default false
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  prediction_id uuid;
  dream_id_value uuid;
  dream_body text;
  number_item jsonb;
  normalized_value text;
  normalized_kind text;
  item_rank smallint := 1;
  public_post_body text;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select interpretation.dream_id, dream.dream_text
    into dream_id_value, dream_body
  from public.dream_interpretations interpretation
  join public.dreams dream on dream.id = interpretation.dream_id
  where interpretation.id = p_interpretation_id
    and interpretation.user_id = current_user_id
    and dream.user_id = current_user_id;

  if dream_id_value is null then
    raise exception 'Dream interpretation not found';
  end if;

  if not exists (
    select 1 from public.lottery_draws
    where id = p_draw_id and status = 'scheduled'
  ) then
    raise exception 'Scheduled draw not found';
  end if;

  if jsonb_typeof(p_numbers) <> 'array'
    or jsonb_array_length(p_numbers) not between 1 and 20 then
    raise exception 'Predictions require 1-20 numbers';
  end if;

  select id into prediction_id
  from public.user_predictions
  where user_id = current_user_id
    and draw_id = p_draw_id
    and dream_interpretation_id = p_interpretation_id
    and status = 'submitted'
  limit 1;

  if prediction_id is null then
    insert into public.user_predictions (
      user_id,
      draw_id,
      source_type,
      dream_interpretation_id,
      title,
      is_public
    )
    values (
      current_user_id,
      p_draw_id,
      'dream',
      p_interpretation_id,
      'เลขจากความฝัน',
      p_is_public
    )
    returning id into prediction_id;

    for number_item in select value from jsonb_array_elements(p_numbers)
    loop
      normalized_value := regexp_replace(
        coalesce(number_item ->> 'value', ''),
        '[^0-9]',
        '',
        'g'
      );
      normalized_kind := case number_item ->> 'type'
        when '2top' then 'derived_top_two'
        when '2bot' then 'last_two'
        when '3top' then 'dream_three'
        else null
      end;

      if normalized_kind is not null then
        insert into public.prediction_numbers (
          prediction_id,
          user_id,
          number_kind,
          number_value,
          rank
        )
        values (
          prediction_id,
          current_user_id,
          normalized_kind,
          normalized_value,
          item_rank
        )
        on conflict (prediction_id, number_kind, number_value) do nothing;
        item_rank := item_rank + 1;
      end if;
    end loop;

    update public.user_predictions
    set status = 'submitted'
    where id = prediction_id;
  elsif p_is_public then
    update public.user_predictions
    set is_public = true
    where id = prediction_id;
  end if;

  if p_is_public then
    update public.dreams
    set visibility = 'public'
    where id = dream_id_value;

    public_post_body := 'ฝันว่า “' || dream_body || '”' || E'\n\nเลขจากความฝัน: ' ||
      array_to_string(
        array(
          select regexp_replace(coalesce(value ->> 'value', ''), '[^0-9]', '', 'g')
          from jsonb_array_elements(p_numbers)
          where regexp_replace(coalesce(value ->> 'value', ''), '[^0-9]', '', 'g') <> ''
        ),
        ' · '
      );

    if not exists (
      select 1 from public.posts
      where author_id = current_user_id
        and related_prediction_id = prediction_id
        and status = 'published'
    ) then
      insert into public.posts (author_id, related_prediction_id, body, status)
      values (current_user_id, prediction_id, left(public_post_body, 2000), 'published');
    end if;
  end if;

  return prediction_id;
end;
$$;

revoke all on function public.save_dream_prediction(uuid, uuid, jsonb, boolean)
  from public, anon;
grant execute on function public.save_dream_prediction(uuid, uuid, jsonb, boolean)
  to authenticated;

commit;
