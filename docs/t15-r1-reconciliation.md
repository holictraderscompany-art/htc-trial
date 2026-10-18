# T15-R1 reconciliation — 18 October 2026

**R1 LOCAL PASS. T15 overall remains PARTIAL.** This report does not close native
PostgreSQL concurrency or genuine authenticated LIVE Publishing (R2/R3). Neither
phase was started. No commit, push, merge, deployment or cloud database mutation.

## Baseline and preservation

Dedicated worktree:
`C:/Users/ASUS/.codex/worktrees/htc-t15-r1/FOUNDER HTC GRUP ( M.DEVRY HANDOYO )`.
Branch `codex/t15-r1-reconciliation`, HEAD unchanged at verified T14
`94981054f4fa2493205b44919e37802322312c3c`. Local and remote T14 matched before
writing. The supplied SHA contained `2493285`; actual Git contains `2493205`.
Common ancestor of T14 and the mixed continuation is T13
`3b3417d8b7b273fb1b60b10c37c2ea437711a0aa`; T14 is one commit ahead.

Original worktrees before R1:

| Worktree | HEAD | Dirty state |
| --- | --- | --- |
| Primary main |6df86a0e630f38b933d5e269c54ef20906d6bcf5|5 modified/25 untracked|
| Group3 detached integration |9a2e766ddf0a40201249776122e357ca7f44d422|10 modified/2 untracked|
| T13 candidate |3b3417d8b7b273fb1b60b10c37c2ea437711a0aa|clean|
| T14 signed direct |94981054f4fa2493205b44919e37802322312c3c|5 previously excluded untracked artifacts|
| T15/T16 continuation |3b3417d8b7b273fb1b60b10c37c2ea437711a0aa|10 modified/55 untracked|

The sealed inventory `validation/t15-r1/baseline-inventory.json` has SHA256
`e1c8d88ff60d91a84971d273258e907c0422c0a0785d0bd4ff5febd3de4e5a1f`.
All five original HEAD/status records and112 dirty-file byte hashes match after
implementation. The mixed continuation's64 recorded manifest hashes also matched
before reconciliation. Original sources/evidence were neither overwritten nor
discarded. The corrected v2 inventory preserves leading Git status spaces; the
earlier draft inventory remains outside the repository and is not used as proof.

## Recovered T15, isolated T16

The pre-implementation file-level plan is `t15-r1-integration-manifest.md`.
Recovered only the existing protected publishing page, release/withdraw request
keys, checked-transition RPC dispatch, safe content result projection, publishing
controls/navigation, and checked SQLite fixture transition behavior. Existing
T15 tests were extracted from the mixed suite and expanded around concrete
security/failure boundaries. No new publishing feature or lifecycle was added.

T14 exact-404 reservation recovery, uncertain reservation identity handling and
all three media regression tests are retained. Shared UI was patched by hunk;
the older mixed component was never substituted wholesale. T13 editing remains
DRAFT-only; WITHDRAWN/RELEASED remain read-only there. Publishing calls only the
existing authoritative `transition_trial_content_checked` operation.

T16 operations page, summary/counts API and adapter branches, dashboard UI and
navigation, and T16 tests/evidence remain untouched in the original continuation.
The R1 candidate contains no operations dashboard route or summary action;
authenticated summary requests still return400. Historical shared SQL already
contains the RPC dependencies; it is not replayed or edited as implementation.

## Exact product/test change boundaries

Modified:

- `.gitattributes`: four LF rules for immutable T14 SQL archives.
- `package.json`: retain all regressions and add the focused publishing suite.
- `src/components/founder-operation-workspace.js`: publishing-only hunks.
- `src/components/founder-views.js`: Publishing link only.
- `src/server/founder-operations.js`: checked release/withdraw hunks only.
- `tests/founder-access.test.js`: exact navigation destinations.
- `tests/founder-assets.test.js`: retain denial checks; publishing scope now
  covered by T15 tests; T16/client-role rejection retained.
- `tests/founder-content.fixture.mjs`: isolated3104 port support only.
- `tests/local-sqlite-adapter.js`: checked publishing fixture RPC only.

Added product/test files:

- `src/app/founder/publishing/page.js` (existing source recovered).
- `tests/founder-publishing.test.js` (8 LOCAL focused cases).

Added documentation and evidence are confined to `docs/t15-r1-*.md` and
`validation/t15-r1/*`; `file-manifest.json` provides the full hashed inventory.
Auth/Foundation/Public source, T14 transport/media tests, dependencies/lockfile,
all SQL sources and migration history have no content diff against T14.

## Validation actually performed

| Validation | Result |
| --- | --- |
| Full application/Foundation/Public/T12/T13/T14/T15 suite |216/216 PASS|
| Focused T15 cases (included above) |8/8 LOCAL PASS|
| T14 SQLite regression |3/3 LOCAL PASS|
| T13 SQLite regression |12/12 LOCAL PASS|
| T14 browser regression |20/20 LOCAL PASS|
| T15 publishing browser |24/24 LOCAL PASS|
| Recorded TEST history and archived SQL SHA256 |10/10 PASS, offline verification|
| Fresh production build |PASS; Next's existing TypeScript phase completed|
| Standalone lint/typecheck |Not configured; no tools installed|

Browser validation used the installed Playwright CLI skill, a new isolated
headed Chrome session and SQLite fixture on3104. It did not attach to or move the
real Chrome session, read cookies/tokens, use Google login, or call Supabase.
Tests covered transitions/readback, duplicate/conflict/ambiguous outcomes,
session expiry, server/API USER/anonymous denial, no T16 controls and desktop/
mobile layouts. No uncaught publishing browser JavaScript errors occurred.

The strict migration verifier initially failed because fresh Git checkout
converted four new T14 archives to CRLF. Git blob hashes and LF-only comparison
proved exact approved SQL bodies. Only R1 checkout bytes were restored from
those blobs; four `.gitattributes` rules prevent recurrence. The same unchanged
verifier then passed10/10 against the18October recorded TEST snapshot. This is
not migration execution, live DB verification or a weakened assertion.

Raw local logs are ignored by existing `.gitignore`; structured results and their
hashes are retained in `validation/t15-r1/`. Production build and deps stay
ignored. Dependencies were reused read-only via an R1 node_modules junction;
no installation or lockfile change occurred.

## Security and remaining work

Foundation server is_founder authorization, exact-Origin/HttpOnly bridge, payload
allowlists, authoritative state/result validation and generic error handling
remain enforced. R1 rejection tests include client role/state injection,
wrong-origin, malformed/missing records, unavailable RPC and mismatched results.
Private Storage handlers/policies and SQL atomic guards remain unchanged. No
credential-pattern matches were found; automated pattern scanning is supporting
evidence alongside manual diff review, not an infallible guarantee.

R2 still requires genuinely independent native PostgreSQL sessions with proven
PID/lock overlap and the existing applicable11-case race/rollback matrix.
The failed connector diagnostics are not replayed or counted PASS. R3 still
requires genuine TEST Founder/USER publishing integration and public release/
withdraw visibility. LOCAL synthetic identities and metadata do not close either
gate. Further execution awaits Founder authorization after this R1 report.

Own Playwright context and fixture server3104 were stopped. Automatic approval
review rejected deletion of the task-created synthetic SQLite file with only
`blocked by policy`; it was preserved without an alternative deletion attempt:
`C:/Users/ASUS/AppData/Local/Temp/htc-sqlite-fixture-zm9BIV/fixture.sqlite`.
This file contains only synthetic test data and is outside Git. The real T14
server/session, production, T16 and T17 remain untouched.
