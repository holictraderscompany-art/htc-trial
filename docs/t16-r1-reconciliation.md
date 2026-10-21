# T16-R1 — controlled recovery and local validation

Scope: T16-R1 only. No commit, push, merge, deployment, database mutation or T17.

## Authoritative inputs

- Approved T15 baseline: `510d94473d9ddd42f774472f6ebd2423764a66b1`.
- Existing source: working files on `codex/t15-t16-continuation`, based on T13
  `3b3417d8b7b273fb1b60b10c37c2ea437711a0aa`.
- Its `validation/t15-t16/file-manifest.json` records the T15/T16 hunk boundaries.
  All 64 source/evidence hashes and six ignored validation-log hashes matched
  before recovery. The original worktree and historical evidence remain untouched.
- Approved implementation contract: T16, Founder Operations Dashboard & System
  Visibility. The supplied and original repository copies match SHA-256
  `a74fd929920d61f2167cdaf20fc259bc8419661f1661ece6091e8436012d0730`.

The old continuation lacks the later T14 commit `9498105`, T15 commit `68ecb87`,
and T15 checksum correction `510d944`. Its old T14/T15 blockers, nine-migration
snapshot and pending-cleanup statements are historical, not current findings.

## Selective recovery

- Recover the existing protected `/founder/operations` page without rewriting it.
- Recover only the `summary` action and guarded six-count RPC projection in the
  existing operations handler. The API route adapter is already byte-identical
  to the approved T15 adapter and is unchanged.
- Recover summary state, clearing on access denial, summary-only loading,
  timestamp/count presentation and existing workspace navigation.
- Preserve the newer T14 `reconcileUploadAttempt`, reservation recovery and
  invalid-request handling. Do not replace the shared UI with its older copy.
- Recover only the SQLite count RPC. Preserve T15's `Invalid checked transition`
  guard and all current lifecycle/readiness behavior.
- Recover LOCAL-only unavailable/empty controls in the existing fixture launcher.
  The fixture intercepts transport, uses synthetic identities and disposable
  SQLite; it does not validate live OAuth, PostgreSQL or Storage.
- Recover the two existing T16 count/error tests into `tests/founder-overview.test.js`.
  Add focused role/Origin/input, read-only RPC, safe projection and schema checks.
- Update only obsolete summary-exclusion expectations in T14/T15 tests. All
  role-denial, invalid-input and publishing behavior checks remain.
- Add deterministic EOL for the new T16 files. Keep every existing B1 rule.

No SQL, migration archive, database policy, grant, auth implementation, public
read model, upload transport, dependency or lockfile is changed. The existing
`founder_operation_counts()` SQL remains the database dependency; no migration
is duplicated or replayed.

## Validation record

Executed results and file-level SHA-256 inventory are recorded in
`validation/t16-r1/results.json` and `validation/t16-r1/reconciliation-manifest.json`.
Run `node validation/t16-r1/verify-reconciliation.mjs` for a read-only candidate,
scope and recorded-SQL integrity check. It never regenerates historical reports.

| Executed gate | Result |
| --- | --- |
| T16 focused SQLite/API checks | 7/7 LOCAL PASS |
| Application T12-T16 regression | 223/223 PASS; includes eight T15 publishing cases |
| T13 SQLite regression | 12/12 LOCAL PASS |
| T14 SQLite regression | 3/3 LOCAL PASS |
| Production build | PASS, including the recovered operations route |
| Recovered browser scenarios | 30/30 LOCAL PASS |
| Additional browser boundary checks | 6/6 LOCAL PASS |
| Archived TEST migration source hashes | 10/10 PASS; no SQL executed |

The browser boundary checks cover pending/busy state, unverified source before
load, one summary request without record enumeration, no-store and safe response
shape, server 403 with synthetic USER plus clearing of prior data, and anonymous
401. The recovered suite covers known counts, empty/stale/error states,
navigation, expired synthetic session and widths 375/768/1440.

The recovered browser runner is the existing 30-check LOCAL SQLite scenario.
Its genuine synthetic-session tests are distinct from real Google OAuth and
Supabase authorization. It never exports or imports a live browser session.

The task-owned browser and local fixture were closed; its disposable SQLite
file was removed after verifying exact PID and file ownership. Other servers
and original worktrees were not changed. Console resource errors from deliberate
401/403/409/500 probes are expected; the local fixture also requests a missing
favicon (404). No page JavaScript error occurred in the extra boundary run.

All six original worktrees and their 112 dirty files retain their original Git
status and hashes. Existing T14 upload/finalize bodies and T15 checked-transition
guard were independently verified. No standalone lint/typecheck script is
configured; Node syntax checks and the Next production build were executed.

The historical T15 B1 validator deliberately seals T15 working bytes. It must
remain unchanged and be checked in the preserved T15 worktree. Intentional T16
application/configuration changes are inventoried separately; historical hashes
must not be rewritten to make that old candidate validator accept a new task.

## Remaining LIVE gates

R1 local results do not close T16 LIVE acceptance. A subsequent authorized phase
must use only TEST `uzhkzhmncxjplrdtdzgd`, a legitimate Founder/USER session and
the reconciled application to compare summary API/UI with authoritative database
counts; verify anonymous/USER denial, session expiry/revocation, empty/error/stale
behavior and navigation. Inspect current state before creating any separately
approved fixture. Preserve the existing users, migration history and security
boundaries. Never access the protected Foundation project.

Do not replay T14/T15 runtime suites or reopen resolved historical blockers merely
because the old continuation checkpoint predates their completion. T17 remains
under Founder control.
