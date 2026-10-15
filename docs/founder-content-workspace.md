# T13 Founder Content Workspace — reconciled candidate

## Authority and scope

Validated source: existing Group 3 worktree HEAD 9a2e766ddf0a40201249776122e357ca7f44d422. Candidate base: T12 6df86a0e630f38b933d5e269c54ef20906d6bcf5. Original main and Group 3 worktrees, including uncommitted/out-of-scope work, remain unchanged. Approved PRD v3.0 and Group 3 contract originals remain there; no approved decision is rewritten.

T13 lists/reads private content, creates DRAFT and updates DRAFT only. RELEASED/WITHDRAWN are read-only. No delete, publishing UI, upload, asset workspace, operations dashboard, lessons, quizzes or curriculum is added. T14–T17 are excluded.

## Architecture and security

Validated T13 UI, content route, API handler, DRAFT/list RPC sources and content validation helper are preserved byte-for-byte. L3 reuses T12 layout/session parsing and L1 authorization. Every operation revalidates Supabase Auth and trusted is_founder() exactly true. No frontend email/role grant exists. Same-origin Origin and HttpOnly cookie checks precede payload handling; errors are redacted, responses no-store. Only list/read/create/update are allowed. Unknown fields, lifecycle overrides, oversized JSON and publishing actions are denied.

update_trial_content_draft(jsonb) holds a row lock across lifecycle guard and update; no read-then-legacy-update fallback. Private SECURITY DEFINER RPCs use empty search_path, deny PUBLIC/anon EXECUTE and authorize internally. Existing bearer/public contracts and trusted role synchronization remain. TEST transport requires explicit HTC_SUPABASE_TARGET=test and exact approved TEST URL. OAuth reuses the validated Google PKCE configuration. No secrets or deployment configuration are copied.

Candidate Founder navigation contains home, Content workspace, Public content and logout. T14–T16 links and matching exact-navigation expectations are excluded. Existing Foundation T06/T07 fixtures remain only for lifecycle/public/relation regression; no L3 operation API or operation RPC is supplied by the local adapter.

## Database status — 15 October 2026

**DB1 PASS** under approved combined-foundation history amendment, with four-source provenance and approved default ACL hardening already applied. **Eight existing migration records** match fresh recorded TEST hashes. Do not replay DB1, RPCs or hardening, or rewrite history.

**DB2 PASS**: retained authorization/payload/RLS/grant/rollback/public-isolation suites plus eight native concurrency cases. Distinct PIDs 425911/425976 and actual Lock/blocking waits cover save/release/withdrawal races and rollback. Owned PostgreSQL fixtures removed; content/profile/history fingerprints unchanged; sessions closed exit 0. Client TLS verify-full is separate from pooler/backend SSL metadata. Synthetic SQL identity context does not substitute for login.

## Auth and validation evidence

**OAuth LIVE PASS** against TEST: actual Google Founder/USER login, callback, HttpOnly/SameSite session, Founder access, USER denial, logout and old-cookie API rejection. Secure=false was confined to HTTP loopback; HTTPS policy unchanged. Two approved TEST Google accounts remain. Original OAuth proof says T13 PARTIAL because concurrency was then pending; later concurrency proof closes it.

Historical full Group 3 snapshot: tests **202/202 PASS**, build PASS, SQLite **17/17 LOCAL PASS**, headed browser **20/20 LOCAL PASS**. Those counts include excluded tests and are not the reduced candidate's fresh counts. Candidate-specific results are in validation/t13/reconciliation-results.json. Exact live T13 runtime sources are preserved, so live OAuth/DB evidence is reused; navigation, fixture and registration changes require fresh regression/build.

## Known limitations

Concurrent valid DRAFT saves serialize with **last-writer-wins**, without optimistic version/stale-DRAFT detection. Lifecycle-stale saves return 409. Ambiguous saves block writes until explicit reload; no automatic retry. UUID keyset pagination is not a cross-page snapshot: earlier concurrent inserts require reload. Delivered content never replaces server authorization.

SQLite is **LOCAL PASS** only: explicit standalone launcher, synthetic auth, fresh disposable data, no live Storage/OAuth. PostgreSQL/RLS/live auth have separate evidence. A previously retained synthetic temp SQLite file stays outside Git; reconciliation does not delete it.

## Review

docs/t13-commit-manifest.md and validation/t13/commit-manifest.json enumerate candidate files, source hashes and excluded hunks. Curated proof JSON is in validation/t13/evidence. Raw logs, browser profiles, databases, dependencies and generated output are excluded; original external evidence/checksums remain preserved.

No commit/push/deployment, production access, SQL execution/history rewrite or T14–T17 implementation occurs in reconciliation.

## Fresh candidate results — 15 October 2026

pnpm test: **196/196 PASS**; SQLite regression: **12/12 LOCAL PASS**; local production build: **PASS**; headed browser: **21/21 LOCAL PASS**, including exact T13-only navigation. The initial browser action timeout and foreground/readiness recovery are retained in reconciliation-results.json; assertions and product source were not weakened or changed. These counts belong to this reduced T13 candidate, separate from the historical 202/17/20 broader snapshot.
