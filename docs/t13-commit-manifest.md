# T13 pre-commit manifest — 15 October 2026

Candidate branch: codex/t13-precommit-candidate. Base HEAD: 6df86a0e630f38b933d5e269c54ef20906d6bcf5. Authoritative validated source HEAD: 9a2e766ddf0a40201249776122e357ca7f44d422. No commit exists for this candidate. Original main and Group 3 worktrees are preserved.

## Included file paths

All paths below are relative to this candidate repository root. File SHA-256 values and source classifications are in validation/t13/commit-manifest.json; its own hash is recorded externally to avoid self-reference. Generated logs/build output, dependencies, browser profiles and databases are excluded.

- .gitattributes
- .gitignore
- docs/founder-content-workspace.md
- docs/group3-cloud-continuation.md
- docs/local-sqlite-mode.md
- docs/t13-commit-manifest.md
- package.json
- src/app/api/founder/content/route.js
- src/app/founder/content/page.js
- src/app/globals.css
- src/components/founder-content-workspace.js
- src/components/founder-views.js
- src/server/api-foundation.js
- src/server/content-release.js
- src/server/founder-content.js
- src/server/trial-session.js
- supabase/migrations/20261011090000_trial_content_draft_only.sql
- supabase/migrations/20261011100000_founder_content_list.sql
- tests/content-draft-only.spec
- tests/content-draft-only.sql
- tests/content-draft-only.test.js
- tests/founder-access.test.js
- tests/founder-content.fixture.mjs
- tests/founder-content.sql
- tests/founder-content.test.js
- tests/local-sqlite-adapter.js
- tests/local-sqlite.test.js
- tests/t13-target.test.js
- validation/t13/commit-manifest.json
- validation/t13/evidence/db1-provenance.json
- validation/t13/evidence/live-oauth.json
- validation/t13/evidence/original-final-acceptance.json
- validation/t13/evidence/postgres-concurrency.json
- validation/t13/preservation.json
- validation/t13/reconciliation-results.json
- validation/t13/source-equivalence.json
- validation/t13/verify-candidate.mjs
- validation/test-db/README.md
- validation/test-db/history.json
- validation/test-db/remote-history-20261015.json
- validation/test-db/source-scope.json
- validation/test-db/supabase/migrations/20261012061832_htc_group3_core_auth_content_draft.sql
- validation/test-db/supabase/migrations/20261012062050_trial_assets.sql
- validation/test-db/supabase/migrations/20261012062052_trial_content_assets.sql
- validation/test-db/supabase/migrations/20261012062053_public_content_discovery.sql
- validation/test-db/supabase/migrations/20261012062054_founder_content_list.sql
- validation/test-db/supabase/migrations/20261014232339_t13_approved_default_acl_hardening.sql
- validation/test-db/verify-history.mjs

## Shared-file hunk exclusions

- **src/components/founder-views.js**: exclude Three Founder navigation links: /founder/assets, /founder/publishing, /founder/operations. Retain Validated T13 Content workspace link and unchanged T12/public/logout boundary.
- **tests/founder-access.test.js**: exclude Three corresponding T14-T16 destinations in the exact navigation assertion. Retain All access-denial checks; exact T13-only destination list.
- **package.json**: exclude tests/founder-media.test.js registration (7 media/config cases). Retain All Foundation/Public/T12/T13 test registrations; one isolated TEST-target config test extracted into tests/t13-target.test.js.
- **tests/local-sqlite.test.js**: exclude founder-operations import, operationFixture helper and five subsequent T14-T16 tests. Retain First 12 existing Foundation/T13 regression tests unchanged.
- **tests/local-sqlite-adapter.js**: exclude checked operation transition branch, DRAFT asset-operation wrapper and RPC routes manage_trial_content_asset_draft, transition_trial_content_checked, read_trial_assets_for_founder, founder_operation_counts, delete_trial_asset_for_founder. Retain T13 transport, auth fixtures, transaction semantics, DRAFT guard and existing Foundation T06/T07 regression fixtures.
- **tests/founder-content.fixture.mjs**: exclude T16 unavailable/empty read-model controls and unavailable flag. Retain Shared T13 UI launcher, mode header, synthetic session, transition and ambiguous-save controls.
- **validation/test-db**: exclude 20261012062323_founder_operation_workspaces.sql, 20261012062809_founder_asset_delete_bridge.sql, CLI config/link and operation validation suites. Retain All 8 actual history records; 6 exact SQL bodies, explicit exclusion hashes and read-only verifier.
- **docs**: exclude founder-operation-workspaces.md; full Group 3 implementation task documentation and historical contradictory pending statements. Retain Current T13-only docs and references to preserved approved authority; no changes to original specification documents.

## Whole files excluded and preserved in the original Group 3 worktree

- docs/HTC-GROUP3-IMPLEMENTATION-CONTRACT.md
- docs/HTC-TRIAL-PRD-TASK-MAP-v3.0.md
- docs/founder-operation-workspaces.md
- docs/sql/db1-managed-review.sql
- docs/sql/migration-history-alignment.sql
- src/app/api/founder/assets/route.js
- src/app/api/founder/assets/upload/route.js
- src/app/api/founder/operations/route.js
- src/app/founder/assets/page.js
- src/app/founder/operations/page.js
- src/app/founder/publishing/page.js
- src/components/founder-operation-workspace.js
- src/server/founder-media.js
- src/server/founder-operations.js
- supabase/migrations/20261012062323_founder_operation_workspaces.sql
- supabase/migrations/20261012062809_founder_asset_delete_bridge.sql
- tests/founder-media.test.js
- tests/founder-operations.sql
- validation/test-db/evidence-20261012.json
- validation/test-db/supabase/config.toml
- validation/test-db/supabase/migrations/20261012062323_founder_operation_workspaces.sql
- validation/test-db/supabase/migrations/20261012062809_founder_asset_delete_bridge.sql

## Proof and review commands

15 core T13 files are byte-identical to the validated snapshot. Explicit per-file line endings preserve the hashes after checkout; immutable original proof JSON uses no Git text conversion. Shared navigation, fixture routing and test registration were isolated, so complete fresh regression and build are required.

Run pnpm test, pnpm test:local:sqlite, pnpm build, node validation/test-db/verify-history.mjs and node validation/t13/verify-candidate.mjs. The last two are offline checks; they never execute SQL. See validation/t13/reconciliation-results.json for actual candidate outcomes, historical/live evidence and known limitations.

Database: eight recorded TEST migrations matched read-only. Six exact historical SQL bodies included, two existing operation sources excluded by version/hash; this archive is not a CLI deployment workdir. Never replay migrations or rewrite history.

Known contract: concurrent valid DRAFT saves serialize last-writer-wins; lifecycle-stale saves are denied. SQLite/browser fixture evidence is LOCAL PASS only. Actual Google OAuth and native PostgreSQL evidence are retained separately for unchanged core T13 sources. No T14–T17 implementation, production access, commit, push or deployment.

## Fresh candidate results — 15 October 2026

pnpm test: **196/196 PASS**; SQLite regression: **12/12 LOCAL PASS**; local production build: **PASS**; headed browser: **21/21 LOCAL PASS**, including exact T13-only navigation. The initial browser action timeout and foreground/readiness recovery are retained in reconciliation-results.json; assertions and product source were not weakened or changed. These counts belong to this reduced T13 candidate, separate from the historical 202/17/20 broader snapshot.
