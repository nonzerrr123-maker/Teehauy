-- Applied to teehuay as remote migration 20260909102117.
begin;

drop policy lottery_draws_anon_read on public.lottery_draws;
drop policy lottery_draws_authenticated_read on public.lottery_draws;
create policy lottery_draws_anon_read on public.lottery_draws for select to anon
  using (status in ('scheduled', 'published', 'verified'));
create policy lottery_draws_authenticated_read on public.lottery_draws for select to authenticated
  using (status in ('scheduled', 'published', 'verified') or (select private.is_admin()));

create or replace function public.submit_prediction(
  p_draw_id uuid,
  p_source_type text,
  p_title text,
  p_note text,
  p_is_public boolean,
  p_numbers jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  new_prediction_id uuid;
  number_item jsonb;
  normalized_value text;
  normalized_kind text;
  item_rank smallint := 1;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if p_source_type not in ('dream', 'manual', 'model', 'post') then raise exception 'Invalid prediction source'; end if;
  if jsonb_typeof(p_numbers) <> 'array' or jsonb_array_length(p_numbers) < 1 or jsonb_array_length(p_numbers) > 30 then
    raise exception 'Predictions require 1-30 numbers';
  end if;

  insert into public.user_predictions (user_id, draw_id, source_type, title, note, is_public)
  values (current_user_id, p_draw_id, p_source_type, nullif(trim(p_title), ''), nullif(trim(p_note), ''), p_is_public)
  returning id into new_prediction_id;

  for number_item in select value from jsonb_array_elements(p_numbers)
  loop
    normalized_value := regexp_replace(coalesce(number_item ->> 'value', ''), '[^0-9]', '', 'g');
    normalized_kind := coalesce(nullif(number_item ->> 'kind', ''), case char_length(normalized_value) when 2 then 'dream_two' when 3 then 'dream_three' when 6 then 'six_digit_ticket' end);
    if normalized_kind not in ('six_digit_ticket', 'front_three', 'last_three', 'last_two', 'derived_top_two', 'dream_two', 'dream_three') then
      raise exception 'Invalid prediction number kind';
    end if;
    insert into public.prediction_numbers (prediction_id, user_id, number_kind, number_value, rank)
    values (new_prediction_id, current_user_id, normalized_kind, normalized_value, item_rank);
    item_rank := item_rank + 1;
  end loop;

  update public.user_predictions set status = 'submitted' where id = new_prediction_id;
  return new_prediction_id;
end;
$$;

revoke all on function public.submit_prediction(uuid, text, text, text, boolean, jsonb) from public, anon;
grant execute on function public.submit_prediction(uuid, text, text, text, boolean, jsonb) to authenticated;

insert into public.lottery_draws (draw_date, status, source_name, source_url)
values ('2026-09-16', 'scheduled', 'สำนักงานสลากกินแบ่งรัฐบาล', 'https://www.glo.or.th/')
on conflict (draw_date) do nothing;

commit;
