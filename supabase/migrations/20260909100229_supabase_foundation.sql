-- Applied to teehuay as remote migration 20260909100229.
begin;

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated, service_role;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'นักตีเลข',
  username text,
  avatar_path text,
  account_kind text not null default 'guest' check (account_kind in ('guest', 'google')),
  bio text check (char_length(bio) <= 280),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (char_length(display_name) between 1 and 60),
  constraint profiles_username_format check (username is null or username ~ '^[a-z0-9_]{3,30}$')
);

create unique index profiles_username_lower_uidx on public.profiles (lower(username)) where username is not null;

create table public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('member', 'moderator', 'admin')),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  notify_draw_reminder boolean not null default true,
  notify_results boolean not null default true,
  notify_matches boolean not null default true,
  responsible_play_reminder boolean not null default true,
  theme text not null default 'dark' check (theme in ('dark', 'system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.dreams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dream_text text not null,
  occurred_on date,
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dreams_text_length check (char_length(dream_text) between 2 and 300)
);

create index dreams_user_created_idx on public.dreams (user_id, created_at desc);
create index dreams_public_created_idx on public.dreams (created_at desc) where visibility = 'public';

create table public.dream_interpretations (
  id uuid primary key default gen_random_uuid(),
  dream_id uuid not null references public.dreams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  meaning text not null,
  lucky_element text not null check (lucky_element in ('ทอง', 'น้ำ', 'ไฟ', 'ดิน', 'ลม')),
  engine_version text not null,
  numbers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint dream_interpretations_numbers_array check (jsonb_typeof(numbers) = 'array')
);

create index dream_interpretations_user_created_idx on public.dream_interpretations (user_id, created_at desc);
create index dream_interpretations_dream_idx on public.dream_interpretations (dream_id);

create table public.interpretation_numbers (
  id bigint generated always as identity primary key,
  interpretation_id uuid not null references public.dream_interpretations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  number_kind text not null check (number_kind in ('derived_top_two', 'last_two', 'dream_three', 'highlight_digits')),
  number_value text not null,
  position smallint not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  constraint interpretation_numbers_digits check (number_value ~ '^[0-9]{1,6}$'),
  constraint interpretation_numbers_length check (
    (number_kind in ('derived_top_two', 'last_two') and char_length(number_value) = 2)
    or (number_kind = 'dream_three' and char_length(number_value) = 3)
    or (number_kind = 'highlight_digits' and char_length(number_value) between 1 and 6)
  )
);

create index interpretation_numbers_interpretation_idx on public.interpretation_numbers (interpretation_id, position);
create index interpretation_numbers_user_value_idx on public.interpretation_numbers (user_id, number_kind, number_value);

create table public.dream_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  interpretation_id uuid not null references public.dream_interpretations(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, interpretation_id)
);

create index dream_favorites_user_created_idx on public.dream_favorites (user_id, created_at desc);

create table public.lottery_draws (
  id uuid primary key default gen_random_uuid(),
  draw_date date not null unique,
  status text not null default 'scheduled' check (status in ('scheduled', 'published', 'verified', 'cancelled')),
  source_name text not null default 'สำนักงานสลากกินแบ่งรัฐบาล',
  source_url text,
  source_checksum text,
  published_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lottery_draws_verified_state check (status <> 'verified' or verified_at is not null)
);

create index lottery_draws_status_date_idx on public.lottery_draws (status, draw_date desc);

create table public.lottery_prizes (
  id bigint generated always as identity primary key,
  draw_id uuid not null references public.lottery_draws(id) on delete cascade,
  prize_type text not null check (prize_type in ('first', 'second', 'third', 'fourth', 'fifth', 'adjacent_first', 'front_three', 'last_three', 'last_two')),
  winning_number text not null,
  prize_amount numeric(12,2) not null check (prize_amount >= 0),
  sequence_number smallint not null default 1 check (sequence_number > 0),
  created_at timestamptz not null default now(),
  constraint lottery_prizes_digits check (winning_number ~ '^[0-9]+$'),
  constraint lottery_prizes_number_length check (
    (prize_type in ('first', 'second', 'third', 'fourth', 'fifth', 'adjacent_first') and char_length(winning_number) = 6)
    or (prize_type in ('front_three', 'last_three') and char_length(winning_number) = 3)
    or (prize_type = 'last_two' and char_length(winning_number) = 2)
  ),
  unique (draw_id, prize_type, winning_number)
);

create index lottery_prizes_draw_type_idx on public.lottery_prizes (draw_id, prize_type);
create index lottery_prizes_number_idx on public.lottery_prizes (winning_number, prize_type);

create table private.lottery_import_runs (
  id bigint generated always as identity primary key,
  draw_id uuid references public.lottery_draws(id) on delete set null,
  source_url text not null,
  raw_payload jsonb not null,
  payload_checksum text not null,
  status text not null check (status in ('received', 'validated', 'imported', 'failed')),
  error_message text,
  imported_by uuid references auth.users(id) on delete set null,
  fetched_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (payload_checksum)
);

create index lottery_import_runs_draw_idx on private.lottery_import_runs (draw_id, fetched_at desc);

create table public.user_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  draw_id uuid not null references public.lottery_draws(id) on delete restrict,
  source_type text not null check (source_type in ('dream', 'manual', 'model', 'post')),
  dream_interpretation_id uuid references public.dream_interpretations(id) on delete set null,
  title text,
  note text,
  is_public boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'cancelled')),
  submitted_at timestamptz,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_predictions_title_length check (title is null or char_length(title) <= 100),
  constraint user_predictions_note_length check (note is null or char_length(note) <= 1000),
  constraint user_predictions_submit_state check (
    (status = 'draft' and submitted_at is null and locked_at is null)
    or (status = 'submitted' and submitted_at is not null and locked_at is not null)
    or status = 'cancelled'
  )
);

create index user_predictions_user_created_idx on public.user_predictions (user_id, created_at desc);
create index user_predictions_draw_status_idx on public.user_predictions (draw_id, status, created_at desc);
create index user_predictions_public_draw_idx on public.user_predictions (draw_id, created_at desc) where is_public and status = 'submitted';

create table public.prediction_numbers (
  id bigint generated always as identity primary key,
  prediction_id uuid not null references public.user_predictions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  number_kind text not null check (number_kind in ('six_digit_ticket', 'front_three', 'last_three', 'last_two', 'derived_top_two', 'dream_two', 'dream_three')),
  number_value text not null,
  rank smallint check (rank is null or rank > 0),
  confidence_score numeric(6,5) check (confidence_score is null or confidence_score between 0 and 1),
  created_at timestamptz not null default now(),
  constraint prediction_numbers_digits check (number_value ~ '^[0-9]+$'),
  constraint prediction_numbers_length check (
    (number_kind = 'six_digit_ticket' and char_length(number_value) = 6)
    or (number_kind in ('front_three', 'last_three', 'dream_three') and char_length(number_value) = 3)
    or (number_kind in ('last_two', 'derived_top_two', 'dream_two') and char_length(number_value) = 2)
  ),
  unique (prediction_id, number_kind, number_value)
);

create index prediction_numbers_prediction_idx on public.prediction_numbers (prediction_id, rank nulls last);
create index prediction_numbers_user_value_idx on public.prediction_numbers (user_id, number_kind, number_value);

create table public.prediction_matches (
  id bigint generated always as identity primary key,
  prediction_number_id bigint not null references public.prediction_numbers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  lottery_prize_id bigint references public.lottery_prizes(id) on delete cascade,
  match_kind text not null,
  matched_number text not null,
  evaluated_at timestamptz not null default now(),
  unique (prediction_number_id, lottery_prize_id, match_kind)
);

create index prediction_matches_user_created_idx on public.prediction_matches (user_id, evaluated_at desc);
create index prediction_matches_prize_idx on public.prediction_matches (lottery_prize_id);

create table public.user_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  draw_id uuid not null references public.lottery_draws(id) on delete restrict,
  ticket_number text not null,
  quantity smallint not null default 1 check (quantity between 1 and 100),
  purchase_price numeric(10,2) check (purchase_price is null or purchase_price >= 0),
  purchased_at timestamptz,
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_tickets_number check (ticket_number ~ '^[0-9]{6}$'),
  unique (user_id, draw_id, ticket_number)
);

create index user_tickets_user_draw_idx on public.user_tickets (user_id, draw_id);
create index user_tickets_draw_number_idx on public.user_tickets (draw_id, ticket_number);

create table public.ticket_wins (
  id bigint generated always as identity primary key,
  ticket_id uuid not null references public.user_tickets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  lottery_prize_id bigint not null references public.lottery_prizes(id) on delete cascade,
  prize_amount numeric(12,2) not null check (prize_amount >= 0),
  verification_status text not null default 'system_matched' check (verification_status in ('system_matched', 'user_confirmed', 'verified', 'claimed')),
  matched_at timestamptz not null default now(),
  unique (ticket_id, lottery_prize_id)
);

create index ticket_wins_user_created_idx on public.ticket_wins (user_id, matched_at desc);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  related_prediction_id uuid references public.user_predictions(id) on delete set null,
  body text not null,
  status text not null default 'published' check (status in ('draft', 'published', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint posts_body_length check (char_length(body) between 1 and 2000)
);

create index posts_feed_idx on public.posts (created_at desc) where status = 'published';
create index posts_author_created_idx on public.posts (author_id, created_at desc);

create table public.post_media (
  id bigint generated always as identity primary key,
  post_id uuid not null references public.posts(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  media_type text not null check (media_type in ('image', 'video')),
  position smallint not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  unique (post_id, storage_path)
);

create index post_media_post_idx on public.post_media (post_id, position);

create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  status text not null default 'published' check (status in ('published', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint post_comments_body_length check (char_length(body) between 1 and 1000)
);

create index post_comments_post_created_idx on public.post_comments (post_id, created_at);
create index post_comments_author_idx on public.post_comments (author_id, created_at desc);

create table public.post_reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null check (reaction in ('like', 'insightful', 'lucky')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index post_reactions_user_idx on public.post_reactions (user_id, created_at desc);

create table public.saved_posts (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index saved_posts_user_created_idx on public.saved_posts (user_id, created_at desc);

create table public.user_follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint user_follows_not_self check (follower_id <> following_id)
);

create index user_follows_following_idx on public.user_follows (following_id, created_at desc);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('post', 'comment', 'profile')),
  target_id text not null,
  reason text not null check (reason in ('spam', 'harassment', 'misinformation', 'illegal_gambling', 'other')),
  details text check (details is null or char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index reports_status_created_idx on public.reports (status, created_at);
create index reports_reporter_idx on public.reports (reporter_id, created_at desc);

create table public.analysis_model_versions (
  id uuid primary key default gen_random_uuid(),
  model_key text not null,
  version text not null,
  algorithm_name text not null,
  parameters jsonb not null default '{}'::jsonb,
  code_sha text,
  status text not null default 'draft' check (status in ('draft', 'active', 'retired')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (model_key, version),
  constraint analysis_model_parameters_object check (jsonb_typeof(parameters) = 'object')
);

create index analysis_model_versions_active_idx on public.analysis_model_versions (model_key, created_at desc) where status = 'active';

create table public.analysis_runs (
  id uuid primary key default gen_random_uuid(),
  model_version_id uuid not null references public.analysis_model_versions(id) on delete restrict,
  target_draw_id uuid not null references public.lottery_draws(id) on delete restrict,
  training_start date not null,
  training_end date not null,
  input_checksum text not null,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  constraint analysis_runs_training_range check (training_start <= training_end),
  unique (model_version_id, target_draw_id, input_checksum)
);

create index analysis_runs_target_status_idx on public.analysis_runs (target_draw_id, status, created_at desc);

create table public.analysis_predictions (
  id bigint generated always as identity primary key,
  run_id uuid not null references public.analysis_runs(id) on delete cascade,
  number_kind text not null check (number_kind in ('last_two', 'derived_top_two', 'front_three', 'last_three')),
  number_value text not null,
  score numeric(12,8) not null,
  rank smallint not null check (rank > 0),
  explanation jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint analysis_predictions_digits check (number_value ~ '^[0-9]+$'),
  constraint analysis_predictions_length check (
    (number_kind in ('last_two', 'derived_top_two') and char_length(number_value) = 2)
    or (number_kind in ('front_three', 'last_three') and char_length(number_value) = 3)
  ),
  unique (run_id, number_kind, number_value),
  unique (run_id, number_kind, rank)
);

create index analysis_predictions_run_rank_idx on public.analysis_predictions (run_id, number_kind, rank);

create table public.analysis_metrics (
  id bigint generated always as identity primary key,
  model_version_id uuid not null references public.analysis_model_versions(id) on delete cascade,
  metric_name text not null,
  metric_value numeric(14,8) not null,
  sample_size integer not null check (sample_size >= 0),
  evaluated_through date not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (model_version_id, metric_name, evaluated_through)
);

create index analysis_metrics_model_date_idx on public.analysis_metrics (model_version_id, evaluated_through desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_type text not null check (notification_type in ('draw_reminder', 'results_published', 'prediction_match', 'ticket_win', 'comment', 'reaction', 'system')),
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_title_length check (char_length(title) between 1 and 120),
  constraint notifications_body_length check (char_length(body) between 1 and 500)
);

create index notifications_user_unread_idx on public.notifications (user_id, created_at desc) where read_at is null;

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_secret text not null,
  user_agent text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

create table private.audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_entity_idx on private.audit_logs (entity_type, entity_id, created_at desc);
create index audit_logs_actor_idx on private.audit_logs (actor_user_id, created_at desc);

create table private.api_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  operation text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 1 check (request_count > 0),
  primary key (user_id, operation, window_started_at)
);

create index api_rate_limits_window_idx on private.api_rate_limits (window_started_at);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function private.set_updated_at();
create trigger user_preferences_set_updated_at before update on public.user_preferences for each row execute function private.set_updated_at();
create trigger dreams_set_updated_at before update on public.dreams for each row execute function private.set_updated_at();
create trigger lottery_draws_set_updated_at before update on public.lottery_draws for each row execute function private.set_updated_at();
create trigger user_predictions_set_updated_at before update on public.user_predictions for each row execute function private.set_updated_at();
create trigger user_tickets_set_updated_at before update on public.user_tickets for each row execute function private.set_updated_at();
create trigger posts_set_updated_at before update on public.posts for each row execute function private.set_updated_at();
create trigger post_comments_set_updated_at before update on public.post_comments for each row execute function private.set_updated_at();
create trigger push_subscriptions_set_updated_at before update on public.push_subscriptions for each row execute function private.set_updated_at();

create or replace function private.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_name text;
begin
  requested_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')), '');

  insert into public.profiles (id, display_name, avatar_path, account_kind)
  values (
    new.id,
    left(coalesce(requested_name, case when new.is_anonymous then 'Guest-' || left(new.id::text, 8) else 'นักตีเลข' end), 60),
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    case when new.is_anonymous then 'guest' else 'google' end
  )
  on conflict (id) do update set
    display_name = case when public.profiles.account_kind = 'guest' and requested_name is not null then left(requested_name, 60) else public.profiles.display_name end,
    avatar_path = coalesce(excluded.avatar_path, public.profiles.avatar_path),
    account_kind = excluded.account_kind,
    updated_at = now();

  insert into public.user_roles (user_id, role) values (new.id, 'member') on conflict do nothing;
  insert into public.user_preferences (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create or replace function private.handle_auth_user_updated()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set
    display_name = case
      when coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name') is not null
        then left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), 60)
      else display_name
    end,
    avatar_path = coalesce(nullif(new.raw_user_meta_data ->> 'avatar_url', ''), avatar_path),
    account_kind = case when new.is_anonymous then 'guest' else 'google' end,
    updated_at = now()
  where id = new.id;
  return new;
end;
$$;

revoke all on function private.handle_auth_user_created() from public, anon, authenticated;
revoke all on function private.handle_auth_user_updated() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_auth_user_created();

create trigger on_auth_user_updated
  after update of raw_user_meta_data, raw_app_meta_data, is_anonymous on auth.users
  for each row execute function private.handle_auth_user_updated();

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated, service_role;

create or replace function private.enforce_prediction_lock()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_date date;
begin
  select draw_date into target_date from public.lottery_draws where id = new.draw_id;
  if target_date is null then raise exception 'Target draw not found'; end if;

  if tg_op = 'UPDATE' and old.locked_at is not null and row(new.user_id, new.draw_id, new.source_type, new.dream_interpretation_id, new.title, new.note, new.status)
    is distinct from row(old.user_id, old.draw_id, old.source_type, old.dream_interpretation_id, old.title, old.note, old.status) then
    raise exception 'Submitted predictions are immutable';
  end if;

  if new.status = 'submitted' and (tg_op = 'INSERT' or old.status <> 'submitted') then
    if target_date < (now() at time zone 'Asia/Bangkok')::date then raise exception 'Cannot submit a prediction for a past draw'; end if;
    new.submitted_at = now();
    new.locked_at = now();
  end if;
  return new;
end;
$$;

create trigger user_predictions_enforce_lock
  before insert or update on public.user_predictions
  for each row execute function private.enforce_prediction_lock();

create or replace function private.enforce_prediction_number_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  prediction_owner uuid;
  prediction_locked_at timestamptz;
begin
  select user_id, locked_at into prediction_owner, prediction_locked_at
  from public.user_predictions where id = new.prediction_id;
  if prediction_owner is null or prediction_owner <> new.user_id then raise exception 'Prediction owner mismatch'; end if;
  if prediction_locked_at is not null then raise exception 'Submitted prediction numbers are immutable'; end if;
  return new;
end;
$$;

create trigger prediction_numbers_enforce_owner
  before insert or update on public.prediction_numbers
  for each row execute function private.enforce_prediction_number_owner();

create or replace function private.enforce_post_prediction_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.related_prediction_id is not null and not exists (
    select 1 from public.user_predictions
    where id = new.related_prediction_id and user_id = new.author_id and status = 'submitted'
  ) then
    raise exception 'Post prediction must be a submitted prediction owned by the author';
  end if;
  return new;
end;
$$;

create trigger posts_enforce_prediction_owner
  before insert or update on public.posts
  for each row execute function private.enforce_post_prediction_owner();

create or replace function public.save_dream_result(
  p_dream_text text,
  p_meaning text,
  p_lucky_element text,
  p_engine_version text,
  p_numbers jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  new_dream_id uuid;
  new_interpretation_id uuid;
  number_item jsonb;
  normalized_value text;
  normalized_kind text;
  item_position smallint := 0;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if char_length(trim(p_dream_text)) not between 2 and 300 then raise exception 'Dream text must be 2-300 characters'; end if;
  if jsonb_typeof(p_numbers) <> 'array' then raise exception 'Numbers must be an array'; end if;

  insert into public.dreams (user_id, dream_text)
  values (current_user_id, trim(p_dream_text))
  returning id into new_dream_id;

  insert into public.dream_interpretations (dream_id, user_id, meaning, lucky_element, engine_version, numbers)
  values (new_dream_id, current_user_id, p_meaning, p_lucky_element, p_engine_version, p_numbers)
  returning id into new_interpretation_id;

  for number_item in select value from jsonb_array_elements(p_numbers)
  loop
    normalized_value := regexp_replace(coalesce(number_item ->> 'value', ''), '[^0-9]', '', 'g');
    normalized_kind := case number_item ->> 'type'
      when '2top' then 'derived_top_two'
      when '2bot' then 'last_two'
      when '3top' then 'dream_three'
      when 'run' then 'highlight_digits'
      else null
    end;
    if normalized_kind is not null and normalized_value <> '' then
      insert into public.interpretation_numbers (interpretation_id, user_id, label, number_kind, number_value, position)
      values (new_interpretation_id, current_user_id, coalesce(number_item ->> 'label', normalized_kind), normalized_kind, normalized_value, item_position);
    end if;
    item_position := item_position + 1;
  end loop;

  return new_interpretation_id;
end;
$$;

revoke all on function public.save_dream_result(text, text, text, text, jsonb) from public, anon;
grant execute on function public.save_dream_result(text, text, text, text, jsonb) to authenticated;

create or replace function public.check_rate_limit(p_operation text, p_limit integer default 20, p_window_seconds integer default 60)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_window timestamptz;
  current_count integer;
begin
  if current_user_id is null then return false; end if;
  if p_limit < 1 or p_limit > 500 or p_window_seconds < 10 or p_window_seconds > 86400 then return false; end if;
  current_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  insert into private.api_rate_limits (user_id, operation, window_started_at, request_count)
  values (current_user_id, left(p_operation, 80), current_window, 1)
  on conflict (user_id, operation, window_started_at)
  do update set request_count = private.api_rate_limits.request_count + 1
  returning request_count into current_count;
  return current_count <= p_limit;
end;
$$;

revoke all on function public.check_rate_limit(text, integer, integer) from public, anon;
grant execute on function public.check_rate_limit(text, integer, integer) to authenticated;

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
    or (pn.number_kind in ('last_three', 'dream_three') and lp.prize_type = 'last_three' and pn.number_value = lp.winning_number)
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

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.dreams enable row level security;
alter table public.dream_interpretations enable row level security;
alter table public.interpretation_numbers enable row level security;
alter table public.dream_favorites enable row level security;
alter table public.lottery_draws enable row level security;
alter table public.lottery_prizes enable row level security;
alter table public.user_predictions enable row level security;
alter table public.prediction_numbers enable row level security;
alter table public.prediction_matches enable row level security;
alter table public.user_tickets enable row level security;
alter table public.ticket_wins enable row level security;
alter table public.posts enable row level security;
alter table public.post_media enable row level security;
alter table public.post_comments enable row level security;
alter table public.post_reactions enable row level security;
alter table public.saved_posts enable row level security;
alter table public.user_follows enable row level security;
alter table public.reports enable row level security;
alter table public.analysis_model_versions enable row level security;
alter table public.analysis_runs enable row level security;
alter table public.analysis_predictions enable row level security;
alter table public.analysis_metrics enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;

create policy profiles_public_read on public.profiles for select to anon, authenticated using (true);
create policy profiles_owner_update on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy user_roles_owner_or_admin_read on public.user_roles for select to authenticated using ((select auth.uid()) = user_id or (select private.is_admin()));

create policy preferences_owner_read on public.user_preferences for select to authenticated using ((select auth.uid()) = user_id);
create policy preferences_owner_update on public.user_preferences for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy dreams_owner_read on public.dreams for select to authenticated using ((select auth.uid()) = user_id);
create policy dreams_public_read on public.dreams for select to anon, authenticated using (visibility = 'public');
create policy dreams_owner_insert on public.dreams for insert to authenticated with check ((select auth.uid()) = user_id);
create policy dreams_owner_update on public.dreams for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy dreams_owner_delete on public.dreams for delete to authenticated using ((select auth.uid()) = user_id);

create policy interpretations_owner_read on public.dream_interpretations for select to authenticated using ((select auth.uid()) = user_id);
create policy interpretations_public_read on public.dream_interpretations for select to anon, authenticated using (exists (select 1 from public.dreams d where d.id = dream_id and d.visibility = 'public'));
create policy interpretations_owner_insert on public.dream_interpretations for insert to authenticated with check ((select auth.uid()) = user_id and exists (select 1 from public.dreams d where d.id = dream_id and d.user_id = (select auth.uid())));
create policy interpretations_owner_delete on public.dream_interpretations for delete to authenticated using ((select auth.uid()) = user_id);

create policy interpretation_numbers_owner_read on public.interpretation_numbers for select to authenticated using ((select auth.uid()) = user_id);
create policy interpretation_numbers_public_read on public.interpretation_numbers for select to anon, authenticated using (exists (select 1 from public.dream_interpretations i join public.dreams d on d.id = i.dream_id where i.id = interpretation_id and d.visibility = 'public'));
create policy interpretation_numbers_owner_insert on public.interpretation_numbers for insert to authenticated with check ((select auth.uid()) = user_id);

create policy favorites_owner_all on public.dream_favorites for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy lottery_draws_public_read on public.lottery_draws for select to anon, authenticated using (status in ('published', 'verified'));
create policy lottery_draws_admin_all on public.lottery_draws for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy lottery_prizes_public_read on public.lottery_prizes for select to anon, authenticated using (exists (select 1 from public.lottery_draws d where d.id = draw_id and d.status in ('published', 'verified')));
create policy lottery_prizes_admin_all on public.lottery_prizes for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

create policy predictions_owner_read on public.user_predictions for select to authenticated using ((select auth.uid()) = user_id);
create policy predictions_public_read on public.user_predictions for select to anon, authenticated using (is_public and status = 'submitted');
create policy predictions_owner_insert on public.user_predictions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy predictions_owner_update on public.user_predictions for update to authenticated using ((select auth.uid()) = user_id and locked_at is null) with check ((select auth.uid()) = user_id);
create policy predictions_owner_delete on public.user_predictions for delete to authenticated using ((select auth.uid()) = user_id and locked_at is null);

create policy prediction_numbers_owner_read on public.prediction_numbers for select to authenticated using ((select auth.uid()) = user_id);
create policy prediction_numbers_public_read on public.prediction_numbers for select to anon, authenticated using (exists (select 1 from public.user_predictions p where p.id = prediction_id and p.is_public and p.status = 'submitted'));
create policy prediction_numbers_owner_insert on public.prediction_numbers for insert to authenticated with check ((select auth.uid()) = user_id and exists (select 1 from public.user_predictions p where p.id = prediction_id and p.user_id = (select auth.uid()) and p.locked_at is null));
create policy prediction_numbers_owner_update on public.prediction_numbers for update to authenticated using ((select auth.uid()) = user_id and exists (select 1 from public.user_predictions p where p.id = prediction_id and p.locked_at is null)) with check ((select auth.uid()) = user_id);
create policy prediction_numbers_owner_delete on public.prediction_numbers for delete to authenticated using ((select auth.uid()) = user_id and exists (select 1 from public.user_predictions p where p.id = prediction_id and p.locked_at is null));

create policy prediction_matches_owner_read on public.prediction_matches for select to authenticated using ((select auth.uid()) = user_id);
create policy prediction_matches_public_read on public.prediction_matches for select to anon, authenticated using (exists (select 1 from public.prediction_numbers n join public.user_predictions p on p.id = n.prediction_id where n.id = prediction_number_id and p.is_public and p.status = 'submitted'));

create policy tickets_owner_all on public.user_tickets for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy ticket_wins_owner_read on public.ticket_wins for select to authenticated using ((select auth.uid()) = user_id);
create policy ticket_wins_owner_update on public.ticket_wins for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and verification_status in ('system_matched', 'user_confirmed'));

create policy posts_public_read on public.posts for select to anon, authenticated using (status = 'published');
create policy posts_owner_read on public.posts for select to authenticated using ((select auth.uid()) = author_id);
create policy posts_owner_insert on public.posts for insert to authenticated with check ((select auth.uid()) = author_id);
create policy posts_owner_update on public.posts for update to authenticated using ((select auth.uid()) = author_id) with check ((select auth.uid()) = author_id);
create policy posts_owner_delete on public.posts for delete to authenticated using ((select auth.uid()) = author_id);

create policy post_media_public_read on public.post_media for select to anon, authenticated using (exists (select 1 from public.posts p where p.id = post_id and p.status = 'published'));
create policy post_media_owner_all on public.post_media for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id and exists (select 1 from public.posts p where p.id = post_id and p.author_id = (select auth.uid())));

create policy comments_public_read on public.post_comments for select to anon, authenticated using (status = 'published' and exists (select 1 from public.posts p where p.id = post_id and p.status = 'published'));
create policy comments_owner_insert on public.post_comments for insert to authenticated with check ((select auth.uid()) = author_id);
create policy comments_owner_update on public.post_comments for update to authenticated using ((select auth.uid()) = author_id) with check ((select auth.uid()) = author_id);
create policy comments_owner_delete on public.post_comments for delete to authenticated using ((select auth.uid()) = author_id);

create policy reactions_public_read on public.post_reactions for select to anon, authenticated using (true);
create policy reactions_owner_all on public.post_reactions for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy saved_posts_owner_all on public.saved_posts for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy follows_public_read on public.user_follows for select to anon, authenticated using (true);
create policy follows_owner_all on public.user_follows for all to authenticated using ((select auth.uid()) = follower_id) with check ((select auth.uid()) = follower_id);

create policy reports_owner_insert on public.reports for insert to authenticated with check ((select auth.uid()) = reporter_id);
create policy reports_owner_read on public.reports for select to authenticated using ((select auth.uid()) = reporter_id or (select private.is_admin()));
create policy reports_admin_update on public.reports for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

create policy model_versions_public_read on public.analysis_model_versions for select to anon, authenticated using (status in ('active', 'retired'));
create policy model_versions_admin_all on public.analysis_model_versions for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy analysis_runs_public_read on public.analysis_runs for select to anon, authenticated using (status = 'completed');
create policy analysis_runs_admin_all on public.analysis_runs for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy analysis_predictions_public_read on public.analysis_predictions for select to anon, authenticated using (exists (select 1 from public.analysis_runs r where r.id = run_id and r.status = 'completed'));
create policy analysis_predictions_admin_all on public.analysis_predictions for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy analysis_metrics_public_read on public.analysis_metrics for select to anon, authenticated using (true);
create policy analysis_metrics_admin_all on public.analysis_metrics for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

create policy notifications_owner_read on public.notifications for select to authenticated using ((select auth.uid()) = user_id);
create policy notifications_owner_update on public.notifications for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy push_subscriptions_owner_all on public.push_subscriptions for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

grant select on public.profiles, public.lottery_draws, public.lottery_prizes, public.posts, public.post_media,
  public.post_comments, public.post_reactions, public.user_follows, public.analysis_model_versions,
  public.analysis_runs, public.analysis_predictions, public.analysis_metrics to anon;

grant select, update on public.profiles, public.user_preferences to authenticated;
grant select on public.user_roles to authenticated;
grant select, insert, update, delete on public.dreams, public.dream_interpretations, public.interpretation_numbers,
  public.dream_favorites, public.user_predictions, public.prediction_numbers, public.user_tickets, public.posts,
  public.post_media, public.post_comments, public.post_reactions, public.saved_posts, public.user_follows,
  public.reports, public.push_subscriptions to authenticated;
grant select, update on public.ticket_wins, public.notifications to authenticated;
grant select on public.prediction_matches, public.lottery_draws, public.lottery_prizes, public.analysis_model_versions,
  public.analysis_runs, public.analysis_predictions, public.analysis_metrics to authenticated;

grant usage, select on all sequences in schema public to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('post-media', 'post-media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'video/mp4'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy storage_public_read_teehuay on storage.objects for select to anon, authenticated
  using (bucket_id in ('avatars', 'post-media'));
create policy storage_owner_insert_teehuay on storage.objects for insert to authenticated
  with check (bucket_id in ('avatars', 'post-media') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy storage_owner_update_teehuay on storage.objects for update to authenticated
  using (bucket_id in ('avatars', 'post-media') and owner_id = (select auth.uid())::text)
  with check (bucket_id in ('avatars', 'post-media') and owner_id = (select auth.uid())::text);
create policy storage_owner_delete_teehuay on storage.objects for delete to authenticated
  using (bucket_id in ('avatars', 'post-media') and owner_id = (select auth.uid())::text);

insert into public.analysis_model_versions (model_key, version, algorithm_name, parameters, status)
values (
  'frequency_recency_gap_ensemble',
  '1.0.0',
  'Position frequency + recency weighting + gap score ensemble',
  '{"history_draws":24,"recency_decay":0.92,"frequency_weight":0.5,"recency_weight":0.3,"gap_weight":0.2,"disclaimer":"Historical analysis only; not a guarantee of future results."}'::jsonb,
  'active'
)
on conflict (model_key, version) do nothing;

commit;
