alter table public.user_preferences
  alter column theme set default 'system';

-- Rows that still have the original timestamp have never been changed by the user.
-- Move only those legacy defaults to system and preserve explicit light/dark choices.
update public.user_preferences
set theme = 'system'
where theme = 'dark'
  and updated_at is not distinct from created_at;
