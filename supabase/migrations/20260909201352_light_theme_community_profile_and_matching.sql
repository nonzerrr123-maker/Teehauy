-- Applied to teehuay as remote migration 20260909201352.
begin;

alter table public.user_preferences
  drop constraint if exists user_preferences_theme_check;

alter table public.user_preferences
  add constraint user_preferences_theme_check
  check (theme in ('light', 'dark', 'system'));

alter table public.posts
  add constraint posts_author_profile_fkey
  foreign key (author_id) references public.profiles(id) on delete cascade
  not valid;

alter table public.posts validate constraint posts_author_profile_fkey;

create or replace function private.evaluate_lottery_draw(p_draw_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.lottery_draws where id = p_draw_id and status = 'verified') then
    raise exception 'Draw must be verified before evaluation';
  end if;

  insert into public.prediction_matches (prediction_number_id, user_id, lottery_prize_id, match_kind, matched_number)
  select pn.id, pn.user_id, lp.id, pn.number_kind, pn.number_value
  from public.prediction_numbers pn
  join public.user_predictions up on up.id = pn.prediction_id and up.draw_id = p_draw_id and up.status = 'submitted'
  join public.lottery_prizes lp on lp.draw_id = p_draw_id and (
    (pn.number_kind = 'six_digit_ticket' and (
      (lp.prize_type in ('first', 'second', 'third', 'fourth', 'fifth', 'adjacent_first') and pn.number_value = lp.winning_number)
      or (lp.prize_type = 'front_three' and left(pn.number_value, 3) = lp.winning_number)
      or (lp.prize_type = 'last_three' and right(pn.number_value, 3) = lp.winning_number)
      or (lp.prize_type = 'last_two' and right(pn.number_value, 2) = lp.winning_number)
    ))
    or (pn.number_kind = 'front_three' and lp.prize_type = 'front_three' and pn.number_value = lp.winning_number)
    or (pn.number_kind = 'last_three' and lp.prize_type = 'last_three' and pn.number_value = lp.winning_number)
    or (pn.number_kind = 'dream_three' and lp.prize_type in ('front_three', 'last_three') and pn.number_value = lp.winning_number)
    or (pn.number_kind in ('last_two', 'dream_two') and lp.prize_type = 'last_two' and pn.number_value = lp.winning_number)
    or (pn.number_kind in ('derived_top_two', 'dream_two') and lp.prize_type = 'first' and pn.number_value = right(lp.winning_number, 2))
  )
  on conflict do nothing;

  insert into public.ticket_wins (ticket_id, user_id, lottery_prize_id, prize_amount)
  select ut.id, ut.user_id, lp.id, lp.prize_amount * ut.quantity
  from public.user_tickets ut
  join public.lottery_prizes lp on lp.draw_id = p_draw_id and (
    (lp.prize_type in ('first', 'second', 'third', 'fourth', 'fifth', 'adjacent_first') and ut.ticket_number = lp.winning_number)
    or (lp.prize_type = 'front_three' and left(ut.ticket_number, 3) = lp.winning_number)
    or (lp.prize_type = 'last_three' and right(ut.ticket_number, 3) = lp.winning_number)
    or (lp.prize_type = 'last_two' and right(ut.ticket_number, 2) = lp.winning_number)
  )
  where ut.draw_id = p_draw_id
  on conflict do nothing;
end;
$$;

revoke all on function private.evaluate_lottery_draw(uuid) from public, anon, authenticated;
grant execute on function private.evaluate_lottery_draw(uuid) to service_role;

commit;

