begin;

drop policy if exists tickets_owner_all on public.user_tickets;
drop policy if exists tickets_public_read on public.user_tickets;
drop policy if exists tickets_follower_read on public.user_tickets;

create policy tickets_authenticated_read
  on public.user_tickets
  for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or visibility = 'public'
    or (
      visibility = 'followers'
      and exists (
        select 1
        from public.user_follows follow
        where follow.follower_id = (select auth.uid())
          and follow.following_id = user_id
      )
    )
  );

create policy tickets_owner_insert
  on public.user_tickets
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy tickets_owner_update
  on public.user_tickets
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy tickets_owner_delete
  on public.user_tickets
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

commit;
