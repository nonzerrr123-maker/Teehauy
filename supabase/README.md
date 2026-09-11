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
- `20260910162323_support_dream_two_rankings`: stores six ranked two-digit dream numbers without changing locked historical predictions.
- `20260911015513_add_ranlotto_primary_import`: RANLOTTO provenance fields and service-role-only full/subset imports.
- `20260911021834_support_repeated_prize_slots`: preserves repeated historical winning numbers as separate prize slots.
- `20260911022521_remove_unused_lottery_provider_index`: removes a provider-status index not used by the product query paths.

Both Edge Functions require a valid JWT and an `admin` row in `user_roles`. Anonymous Auth and manual identity linking must be enabled in Auth settings; Google additionally needs the Google OAuth client credentials.

## Lottery result provider

The primary import source is [RANLOTTO Public API v1](https://www.ranlotto.com/developers). Browser clients call the Teehauy route handler rather than RANLOTTO directly. `RANLOTTO_API_KEY` is optional and must remain server-side.

From an authenticated admin account, call `ingest-lottery-results` with:

- `{ "mode": "fetch_latest" }` for the latest complete 173-entry result.
- `{ "mode": "fetch_history", "dates": ["2026-09-01"] }` for up to 12 complete historical draws.
- `{ "mode": "fetch_years", "years": [2023, 2024, 2025, 2026] }` for up to four years of analysis subsets per call.

The importer validates schema-aware prize counts, digit lengths, the draw date, and a SHA-256 checksum. Provider provenance is preserved in `source_record_id` and `provider_verification_status`. Only `issuer_verified` full draws are promoted to `verified` and evaluated against saved tickets. Lower-assurance archive rows remain `published`; they never overwrite a stronger verified row.

The manual normalized GLO payload path remains available as an emergency, admin-reviewed fallback. The RANLOTTO OpenAPI currently documents no QR/barcode endpoint or payload contract, so QR scanning is intentionally not implemented.
