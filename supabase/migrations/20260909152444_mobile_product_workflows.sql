begin;

-- Creates an optional prediction and its community post as one transaction.
-- SECURITY INVOKER keeps all table RLS checks in force for the signed-in user.
create or replace function public.create_community_post(
  p_body text,
  p_draw_id uuid default null,
  p_numbers jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  new_prediction_id uuid;
  new_post_id uuid;
  number_item jsonb;
  normalized_value text;
  normalized_kind text;
  item_rank smallint := 1;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if char_length(trim(p_body)) not between 1 and 2000 then raise exception 'Post body must be 1-2000 characters'; end if;
  if jsonb_typeof(p_numbers) <> 'array' or jsonb_array_length(p_numbers) > 20 then raise exception 'Numbers must be an array with at most 20 entries'; end if;
  if not public.check_rate_limit('create_community_post', 5, 60) then raise exception 'Rate limit exceeded'; end if;

  if jsonb_array_length(p_numbers) > 0 then
    if p_draw_id is null or not exists (select 1 from public.lottery_draws where id = p_draw_id and status = 'scheduled') then
      raise exception 'A scheduled draw is required for posted numbers';
    end if;

    insert into public.user_predictions (user_id, draw_id, source_type, title, note, is_public)
    values (current_user_id, p_draw_id, 'post', 'เลขจากโพสต์ชุมชน', left(trim(p_body), 1000), true)
    returning id into new_prediction_id;

    for number_item in select value from jsonb_array_elements(p_numbers)
    loop
      normalized_value := regexp_replace(coalesce(number_item ->> 'value', ''), '[^0-9]', '', 'g');
      normalized_kind := case char_length(normalized_value) when 2 then 'dream_two' when 3 then 'dream_three' when 6 then 'six_digit_ticket' else null end;
      if normalized_kind is null then raise exception 'Only 2, 3, or 6 digit numbers are accepted'; end if;
      insert into public.prediction_numbers (prediction_id, user_id, number_kind, number_value, rank)
      values (new_prediction_id, current_user_id, normalized_kind, normalized_value, item_rank)
      on conflict (prediction_id, number_kind, number_value) do nothing;
      item_rank := item_rank + 1;
    end loop;

    update public.user_predictions set status = 'submitted' where id = new_prediction_id;
  end if;

  insert into public.posts (author_id, related_prediction_id, body, status)
  values (current_user_id, new_prediction_id, trim(p_body), 'published')
  returning id into new_post_id;

  return jsonb_build_object('post_id', new_post_id, 'prediction_id', new_prediction_id);
end;
$$;

revoke all on function public.create_community_post(text, uuid, jsonb) from public, anon;
grant execute on function public.create_community_post(text, uuid, jsonb) to authenticated;

-- Locks selected numbers from a persisted dream to one draw for later evaluation.
create or replace function public.save_dream_prediction(
  p_interpretation_id uuid,
  p_draw_id uuid,
  p_numbers jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  prediction_id uuid;
  number_item jsonb;
  normalized_value text;
  normalized_kind text;
  item_rank smallint := 1;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.dream_interpretations where id = p_interpretation_id and user_id = current_user_id) then raise exception 'Dream interpretation not found'; end if;
  if not exists (select 1 from public.lottery_draws where id = p_draw_id and status = 'scheduled') then raise exception 'Scheduled draw not found'; end if;
  if jsonb_typeof(p_numbers) <> 'array' or jsonb_array_length(p_numbers) not between 1 and 20 then raise exception 'Predictions require 1-20 numbers'; end if;

  select id into prediction_id from public.user_predictions
  where user_id = current_user_id and draw_id = p_draw_id and dream_interpretation_id = p_interpretation_id and status = 'submitted'
  limit 1;
  if prediction_id is not null then return prediction_id; end if;

  insert into public.user_predictions (user_id, draw_id, source_type, dream_interpretation_id, title, is_public)
  values (current_user_id, p_draw_id, 'dream', p_interpretation_id, 'เลขจากความฝัน', false)
  returning id into prediction_id;

  for number_item in select value from jsonb_array_elements(p_numbers)
  loop
    normalized_value := regexp_replace(coalesce(number_item ->> 'value', ''), '[^0-9]', '', 'g');
    normalized_kind := case number_item ->> 'type'
      when '2top' then 'derived_top_two'
      when '2bot' then 'last_two'
      when '3top' then 'dream_three'
      else null
    end;
    if normalized_kind is not null then
      insert into public.prediction_numbers (prediction_id, user_id, number_kind, number_value, rank)
      values (prediction_id, current_user_id, normalized_kind, normalized_value, item_rank)
      on conflict (prediction_id, number_kind, number_value) do nothing;
      item_rank := item_rank + 1;
    end if;
  end loop;

  update public.user_predictions set status = 'submitted' where id = prediction_id;
  return prediction_id;
end;
$$;

revoke all on function public.save_dream_prediction(uuid, uuid, jsonb) from public, anon;
grant execute on function public.save_dream_prediction(uuid, uuid, jsonb) to authenticated;

commit;
