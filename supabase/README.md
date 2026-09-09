# Teehuay Supabase

Production project: `duepvvpuonoqzeskpwrn`.

Applied migrations:

- `20260909100229_supabase_foundation`: Auth profiles, dreams, lottery draws/prizes, predictions, tickets/wins, community, analysis, notifications, storage buckets and RLS.
- `20260909100546_security_and_index_hardening`: explicit grants, RLS consolidation, private-table protection and foreign-key indexes.
- `20260909102117_prediction_submission_and_schedule`: atomic prediction submission and scheduled draw visibility.
- `20260909103625_official_lottery_import`: service-role-only verified result import, checksum/audit and result matching.

Both Edge Functions require a valid JWT and an `admin` row in `user_roles`. Anonymous Auth and manual identity linking must be enabled in Auth settings; Google additionally needs the Google OAuth client credentials.
