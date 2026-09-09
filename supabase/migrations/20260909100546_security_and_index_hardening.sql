-- Applied to teehuay as remote migration 20260909100546.
begin;

alter table private.lottery_import_runs enable row level security;
alter table private.audit_logs enable row level security;
alter table private.api_rate_limits enable row level security;

create policy api_rate_limits_owner_select on private.api_rate_limits for select to authenticated
  using ((select auth.uid()) = user_id);
create policy api_rate_limits_owner_insert on private.api_rate_limits for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy api_rate_limits_owner_update on private.api_rate_limits for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, update on private.api_rate_limits to authenticated;
alter function public.check_rate_limit(text, integer, integer) security invoker;

create index lottery_import_runs_imported_by_idx on private.lottery_import_runs (imported_by) where imported_by is not null;
create index analysis_model_versions_created_by_idx on public.analysis_model_versions (created_by) where created_by is not null;
create index dream_favorites_interpretation_idx on public.dream_favorites (interpretation_id);
create index post_media_owner_idx on public.post_media (owner_id);
create index posts_related_prediction_idx on public.posts (related_prediction_id) where related_prediction_id is not null;
create index reports_reviewed_by_idx on public.reports (reviewed_by) where reviewed_by is not null;
create index ticket_wins_prize_idx on public.ticket_wins (lottery_prize_id);
create index user_predictions_dream_interpretation_idx on public.user_predictions (dream_interpretation_id) where dream_interpretation_id is not null;

drop policy dreams_owner_read on public.dreams;
drop policy dreams_public_read on public.dreams;
create policy dreams_anon_read on public.dreams for select to anon using (visibility = 'public');
create policy dreams_authenticated_read on public.dreams for select to authenticated
  using ((select auth.uid()) = user_id or visibility = 'public');

drop policy interpretations_owner_read on public.dream_interpretations;
drop policy interpretations_public_read on public.dream_interpretations;
create policy interpretations_anon_read on public.dream_interpretations for select to anon
  using (exists (select 1 from public.dreams d where d.id = dream_id and d.visibility = 'public'));
create policy interpretations_authenticated_read on public.dream_interpretations for select to authenticated
  using ((select auth.uid()) = user_id or exists (select 1 from public.dreams d where d.id = dream_id and d.visibility = 'public'));

drop policy interpretation_numbers_owner_read on public.interpretation_numbers;
drop policy interpretation_numbers_public_read on public.interpretation_numbers;
create policy interpretation_numbers_anon_read on public.interpretation_numbers for select to anon
  using (exists (select 1 from public.dream_interpretations i join public.dreams d on d.id = i.dream_id where i.id = interpretation_id and d.visibility = 'public'));
create policy interpretation_numbers_authenticated_read on public.interpretation_numbers for select to authenticated
  using ((select auth.uid()) = user_id or exists (select 1 from public.dream_interpretations i join public.dreams d on d.id = i.dream_id where i.id = interpretation_id and d.visibility = 'public'));

drop policy lottery_draws_public_read on public.lottery_draws;
drop policy lottery_draws_admin_all on public.lottery_draws;
create policy lottery_draws_anon_read on public.lottery_draws for select to anon using (status in ('published', 'verified'));
create policy lottery_draws_authenticated_read on public.lottery_draws for select to authenticated
  using (status in ('published', 'verified') or (select private.is_admin()));
create policy lottery_draws_admin_insert on public.lottery_draws for insert to authenticated with check ((select private.is_admin()));
create policy lottery_draws_admin_update on public.lottery_draws for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy lottery_draws_admin_delete on public.lottery_draws for delete to authenticated using ((select private.is_admin()));

drop policy lottery_prizes_public_read on public.lottery_prizes;
drop policy lottery_prizes_admin_all on public.lottery_prizes;
create policy lottery_prizes_anon_read on public.lottery_prizes for select to anon
  using (exists (select 1 from public.lottery_draws d where d.id = draw_id and d.status in ('published', 'verified')));
create policy lottery_prizes_authenticated_read on public.lottery_prizes for select to authenticated
  using ((select private.is_admin()) or exists (select 1 from public.lottery_draws d where d.id = draw_id and d.status in ('published', 'verified')));
create policy lottery_prizes_admin_insert on public.lottery_prizes for insert to authenticated with check ((select private.is_admin()));
create policy lottery_prizes_admin_update on public.lottery_prizes for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy lottery_prizes_admin_delete on public.lottery_prizes for delete to authenticated using ((select private.is_admin()));

drop policy predictions_owner_read on public.user_predictions;
drop policy predictions_public_read on public.user_predictions;
create policy predictions_anon_read on public.user_predictions for select to anon using (is_public and status = 'submitted');
create policy predictions_authenticated_read on public.user_predictions for select to authenticated
  using ((select auth.uid()) = user_id or (is_public and status = 'submitted'));

drop policy prediction_numbers_owner_read on public.prediction_numbers;
drop policy prediction_numbers_public_read on public.prediction_numbers;
create policy prediction_numbers_anon_read on public.prediction_numbers for select to anon
  using (exists (select 1 from public.user_predictions p where p.id = prediction_id and p.is_public and p.status = 'submitted'));
create policy prediction_numbers_authenticated_read on public.prediction_numbers for select to authenticated
  using ((select auth.uid()) = user_id or exists (select 1 from public.user_predictions p where p.id = prediction_id and p.is_public and p.status = 'submitted'));

drop policy prediction_matches_owner_read on public.prediction_matches;
drop policy prediction_matches_public_read on public.prediction_matches;
create policy prediction_matches_anon_read on public.prediction_matches for select to anon
  using (exists (select 1 from public.prediction_numbers n join public.user_predictions p on p.id = n.prediction_id where n.id = prediction_number_id and p.is_public and p.status = 'submitted'));
create policy prediction_matches_authenticated_read on public.prediction_matches for select to authenticated
  using ((select auth.uid()) = user_id or exists (select 1 from public.prediction_numbers n join public.user_predictions p on p.id = n.prediction_id where n.id = prediction_number_id and p.is_public and p.status = 'submitted'));

drop policy posts_public_read on public.posts;
drop policy posts_owner_read on public.posts;
create policy posts_anon_read on public.posts for select to anon using (status = 'published');
create policy posts_authenticated_read on public.posts for select to authenticated
  using ((select auth.uid()) = author_id or status = 'published');

drop policy post_media_public_read on public.post_media;
drop policy post_media_owner_all on public.post_media;
create policy post_media_anon_read on public.post_media for select to anon
  using (exists (select 1 from public.posts p where p.id = post_id and p.status = 'published'));
create policy post_media_authenticated_read on public.post_media for select to authenticated
  using ((select auth.uid()) = owner_id or exists (select 1 from public.posts p where p.id = post_id and p.status = 'published'));
create policy post_media_owner_insert on public.post_media for insert to authenticated
  with check ((select auth.uid()) = owner_id and exists (select 1 from public.posts p where p.id = post_id and p.author_id = (select auth.uid())));
create policy post_media_owner_update on public.post_media for update to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy post_media_owner_delete on public.post_media for delete to authenticated using ((select auth.uid()) = owner_id);

drop policy reactions_public_read on public.post_reactions;
drop policy reactions_owner_all on public.post_reactions;
create policy reactions_read on public.post_reactions for select to anon, authenticated using (true);
create policy reactions_owner_insert on public.post_reactions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy reactions_owner_update on public.post_reactions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy reactions_owner_delete on public.post_reactions for delete to authenticated using ((select auth.uid()) = user_id);

drop policy follows_public_read on public.user_follows;
drop policy follows_owner_all on public.user_follows;
create policy follows_read on public.user_follows for select to anon, authenticated using (true);
create policy follows_owner_insert on public.user_follows for insert to authenticated with check ((select auth.uid()) = follower_id);
create policy follows_owner_delete on public.user_follows for delete to authenticated using ((select auth.uid()) = follower_id);

drop policy model_versions_public_read on public.analysis_model_versions;
drop policy model_versions_admin_all on public.analysis_model_versions;
create policy model_versions_anon_read on public.analysis_model_versions for select to anon using (status in ('active', 'retired'));
create policy model_versions_authenticated_read on public.analysis_model_versions for select to authenticated
  using (status in ('active', 'retired') or (select private.is_admin()));
create policy model_versions_admin_insert on public.analysis_model_versions for insert to authenticated with check ((select private.is_admin()));
create policy model_versions_admin_update on public.analysis_model_versions for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy model_versions_admin_delete on public.analysis_model_versions for delete to authenticated using ((select private.is_admin()));

drop policy analysis_runs_public_read on public.analysis_runs;
drop policy analysis_runs_admin_all on public.analysis_runs;
create policy analysis_runs_anon_read on public.analysis_runs for select to anon using (status = 'completed');
create policy analysis_runs_authenticated_read on public.analysis_runs for select to authenticated
  using (status = 'completed' or (select private.is_admin()));
create policy analysis_runs_admin_insert on public.analysis_runs for insert to authenticated with check ((select private.is_admin()));
create policy analysis_runs_admin_update on public.analysis_runs for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy analysis_runs_admin_delete on public.analysis_runs for delete to authenticated using ((select private.is_admin()));

drop policy analysis_predictions_public_read on public.analysis_predictions;
drop policy analysis_predictions_admin_all on public.analysis_predictions;
create policy analysis_predictions_anon_read on public.analysis_predictions for select to anon
  using (exists (select 1 from public.analysis_runs r where r.id = run_id and r.status = 'completed'));
create policy analysis_predictions_authenticated_read on public.analysis_predictions for select to authenticated
  using ((select private.is_admin()) or exists (select 1 from public.analysis_runs r where r.id = run_id and r.status = 'completed'));
create policy analysis_predictions_admin_insert on public.analysis_predictions for insert to authenticated with check ((select private.is_admin()));
create policy analysis_predictions_admin_update on public.analysis_predictions for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy analysis_predictions_admin_delete on public.analysis_predictions for delete to authenticated using ((select private.is_admin()));

drop policy analysis_metrics_public_read on public.analysis_metrics;
drop policy analysis_metrics_admin_all on public.analysis_metrics;
create policy analysis_metrics_read on public.analysis_metrics for select to anon, authenticated using (true);
create policy analysis_metrics_admin_insert on public.analysis_metrics for insert to authenticated with check ((select private.is_admin()));
create policy analysis_metrics_admin_update on public.analysis_metrics for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy analysis_metrics_admin_delete on public.analysis_metrics for delete to authenticated using ((select private.is_admin()));

commit;
