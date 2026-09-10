begin;

-- Signed-in users need scheduled draw metadata to save predictions and tickets.
-- Prize data remains unavailable until the draw is published or verified.
drop policy if exists lottery_draws_authenticated_read on public.lottery_draws;

create policy lottery_draws_authenticated_read
  on public.lottery_draws
  for select
  to authenticated
  using (
    status in ('scheduled', 'published', 'verified')
    or (select private.is_admin())
  );

commit;
