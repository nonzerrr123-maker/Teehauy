# Teehuay Supabase

Production project: `duepvvpuonoqzeskpwrn`.

Applied migrations:

- `20260909100229_supabase_foundation`: Auth profiles, dreams, lottery draws/prizes, predictions, tickets/wins, community, analysis, notifications, storage buckets and RLS.
- `20260909100546_security_and_index_hardening`: explicit grants, RLS consolidation, private-table protection and foreign-key indexes.
- `20260909102117_prediction_submission_and_schedule`: atomic prediction submission and scheduled draw visibility.
- `20260909103625_official_lottery_import`: service-role-only verified result import, checksum/audit and result matching.
- `20260909152444_mobile_product_workflows`: atomic community post + prediction creation and dream-to-draw prediction locking.
- `20260909201352_light_theme_community_profile_and_matching`: light/system themes, community profile fields and ticket matching support.
- `20260909203726_harden_manual_prediction_submission`: validated manual prediction submission and stricter write paths.
- `20260910002247_add_analysis_subset_lottery_history`: verified historical draw subset used by statistics and analysis.
- `20260910042527_social_comments_follow_visibility`: comments, follows, public profiles and ticket visibility with RLS.
- `20260910042933_allow_authenticated_scheduled_draws`: scheduled draw visibility for signed-in users.
- `20260910043227_fix_dream_publication_prediction_reference`: corrected prediction references during public dream publishing.
- `20260910043550_harden_dream_publication_idempotency`: idempotent public dream and community post creation.
- `20260910043906_consolidate_ticket_visibility_policies`: one consolidated read policy for ticket visibility.
- `20260910105614_default_theme_system`: system theme default plus migration of untouched legacy defaults.

Both Edge Functions require a valid JWT and an `admin` row in `user_roles`. Anonymous Auth and manual identity linking must be enabled in Auth settings; Google additionally needs the Google OAuth client credentials.

## Official lottery provider

The primary source is the Government Lottery Office (GLO) public dataset. Browser clients must not call it directly. From an authenticated admin account, use the `ingest-lottery-results` Edge Function with `{ "mode": "fetch_latest" }` for a complete draw, or `{ "mode": "fetch_history", "dates": ["2026-09-01"] }` to import the first, front-three, last-three, and last-two prizes used by statistics and analysis.

- Latest draw catalog: <https://gdcatalog.glo.or.th/dataset/dataset_c4-9_01/resource/0846af20-af93-498c-91d9-644a885733f7>
- Draw by date catalog: <https://gdcatalog.glo.or.th/dataset/dataset_c4-9_01/resource/64b39af8-fd9a-4eab-87d4-9193768c3812>
- Check ticket catalog: <https://gdcatalog.glo.or.th/dataset/dataset_c4-9_01/resource/a4d750a4-f8a0-41f3-b62f-99ad97cd680a>
- Latest endpoint: `POST https://www.glo.or.th/api/lottery/getLatestLottery`

The importer rejects incomplete payloads unless all 173 prize entries and the draw date validate. It stores the raw payload checksum, then evaluates predictions/tickets only after the draw becomes `verified`. If GLO is unavailable or changes its response contract, normalize data from the official GLO PDF and submit it as an admin-verified payload; never fall back to an unverified third-party scraper.
