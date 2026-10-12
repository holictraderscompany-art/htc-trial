> Update 12 October 2026: remote test schema/RPC execution has progressed. See
> `group3-cloud-continuation.md` for current evidence and remaining gates. Earlier
> NOT EXECUTED / missing-RPC notes below are historical. Do not replay DB1.

# T13 Founder content workspace

## Authority and scope

The Founder authorized the remaining T13 work on 2026-10-11. Baseline is `main`,
`6df86a0e630f38b933d5e269c54ef20906d6bcf5`. The five existing T13-P0A changes
were retained. The full approved PRD/Master Task Map is absent from this checkout;
scope comes from the supplied T13/T13-P0A instructions and existing contracts.
Route names, labels, UUID pagination and form layout are implementation choices.

The workspace lists private content, reads all existing lifecycle states, creates
DRAFT records and updates DRAFT records only. RELEASED and WITHDRAWN are read-only.
No revision system, delete, publishing control, release scheduling, media operation,
lesson, curriculum or quiz is added. T14 and T15 remain separate.

## Architecture and security

`/founder/content` has its own server authorization check and uses the existing
T12 Founder layout. The L3 POST endpoint `/api/founder/content` consumes the existing
HttpOnly session parser and unchanged L1 `authorize(..., 'founder')`. Every request
revalidates Supabase Auth identity and requires `is_founder()` to be exactly true.
Client email, role claims and Authorization headers cannot replace the cookie identity.
Exact same-origin Origin is required before any cookie operation, including private
reads. Missing/expired sessions return 401, USER returns 403, and uncertain upstream
failures return a redacted 500. Responses and transport are no-store.

Allowed JSON contracts are:

- List: `{ "action": "list", "cursor": null }` (or a UUID cursor).
- Read: `{ "action": "read", "id": "<uuid>" }`.
- Create: `{ "action": "create", "category": "INFORMATION", "title": "Trial", "body": "Plain text" }`.
- Update: `{ "action": "update", "id": "<uuid>", "category": "INFORMATION", "title": "Trial", "body": "Plain text" }`.

The adapter reuses T06's input validation. Requests are bounded at 32,768 bytes;
unrecognized fields/actions are rejected. Only the eight existing internal content
fields are returned. Upstream identifiers, lifecycle, text and timestamps are checked.
Missing records return 404; non-DRAFT saves return 409 without a content payload.

Create/read delegate only to fixed existing T06 actions. Update delegates exclusively
to `update_trial_content_draft(jsonb)`, whose row lock covers the DRAFT guard and save.
There is no application read-then-legacy-update fallback. Existing bearer-only APIs,
legacy publishing contracts, public APIs, RLS, role synchronization and Foundation
configuration remain unchanged. T06 exports its existing category/validation helpers;
no Foundation import of L3 is introduced.

The new `list_trial_content_for_founder(uuid)` RPC authorizes inside PostgreSQL,
uses SECURITY DEFINER with an empty search_path, returns at most 51 rows ordered
by UUID and revokes PUBLIC/anon EXECUTE. Authenticated EXECUTE still requires the
database Founder check. The adapter returns 50 items plus an optional continuation
cursor. Table privileges and RLS are not broadened. This is live keyset pagination,
not a multi-page snapshot; concurrent inserts with earlier UUIDs require a reload.

The UI renders plain text, exposes no session token, prevents overlapping requests
and performs no automatic retries. After an ambiguous save or conflict, saving is
disabled until reload. Session denial clears delivered content from the client view.
An already-delivered page is not a substitute for server authorization. DRAFT writes
remain last-writer-wins: no version token or optimistic conflict detection is added.

## Database dependency and validation status

Required order:

1. DB1: the previously reviewed atomic four-migration batch, unchanged.
2. DB2: actual PostgreSQL DB-01 through DB-15 security/transaction validation.
3. Apply `20261011100000_founder_content_list.sql` to the isolated test database.
4. Execute `tests/founder-content.sql` and verify catalog privileges/RLS/history.
5. Production-build application runtime validation with isolated synthetic transport.

Live Google/Supabase sessions remain NOT VERIFIED. Foundation transport is locked
to the protected production project, so this work does not change its configuration
or contact that project to obtain live authentication evidence.

Authorized test project is `uzhkzhmncxjplrdtdzgd`; protected production project
`vzkbcgfywyhtvprxpwfb` was not accessed. Read-only inspection found PostgreSQL 17.11,
no migration-history schema, no application tables, no custom auth triggers, and
zero auth users. DB1 has not been submitted and no schema/data mutation occurred.

The external review file remains 26,820 bytes with SHA-256
`c5d358d852df38a0663b1a33423086ad4b8d93dbf1ada6ea54b90138cc220802`.
The SQL Editor is accessible at the exact test project. Copying its contents back
produced CRLF (27,434 bytes, hash
`98b8f1cb1ed9d093af468a7573ffb124dfa18e6e08c35bd82dc1d05d5441bce6`), while the
approved file uses LF. Text matches after newline normalization, but this does not
prove byte-identical submitted SQL. No Run was pressed. The pending editor text
was cleared rather than submitting uncertain bytes. The approved file was untouched.
Deployed end-to-end no-retry behavior also remains unverified. Do not bypass these gates.

DB-01 through DB-15 are NOT TESTED, including concurrent lifecycle/draft writes,
rollback, migration repetition and effective PostgreSQL privileges. Static inspection
and mocked transport are not runtime PostgreSQL PASS. `tests/content-draft-only.sql`
and `.spec` remain unchanged; the new listing fixture uses synthetic identities,
normal auth triggers, an empty disposable database precondition and final ROLLBACK.
No real user data or weakened Founder checks are used.

## Local evidence

- `pnpm test`: 195/195 PASS, zero failures/skips (182 existing plus 13 T13 checks).
- `pnpm build`: PASS; existing routes retained, both new routes dynamic.
- Sandbox initially rejected node_modules realpath; reruns used existing dependencies
  with the approved command execution path. No package installation occurred.
- The first regression run failed solely on T12's exact navigation destination list;
  the assertion now includes the real T13 route and retains its denial checks.
- `tests/founder-content.fixture.mjs` is a localhost-only production-build fixture.
  All outgoing transport is intercepted, and unhandled calls are rejected. It is
  synthetic application validation, never live Supabase authentication or PostgreSQL.
- Runtime UI testing was stopped before browser interactions: read-only Windows
  diagnostics reported 3,919 MiB physical RAM and only 136 MiB available, below the
  prior 512 MiB safety target. Only the fixture created for this validation was
  stopped. No unrelated process was terminated. UI interactions/responsive behavior
  remain NOT VERIFIED; SSR markup checks do not replace browser validation.
- After fixture termination and closing the task's SQL Editor tab, available RAM
  was rechecked at 191 MiB (still below 512 MiB). Port 3103 was confirmed closed.
  A final read-only test-project query confirmed the unchanged empty DB1 baseline,
  including zero public functions. The approved SQL file and original P0A SQL
  migration hashes remain unchanged. Pending SQL was cleared from the editor.

Final T13 end-to-end completion is BLOCKED until DB1/DB2 and application runtime gates
pass. Local test/build success does not authorize production access or deployment.

## Change manifest

Existing T13-P0A files preserved: `package.json` (test registration extended),
`supabase/migrations/20261011090000_trial_content_draft_only.sql`,
`tests/content-draft-only.test.js`, `tests/content-draft-only.sql`,
`tests/content-draft-only.spec`.

Modified: `src/server/content-release.js` (export existing helpers),
`src/components/founder-views.js` (workspace navigation), `src/app/globals.css`
(scoped form styling), `tests/founder-access.test.js` (exact navigation assertion),
`package.json` (test registration only).

Added: `src/server/founder-content.js`, `src/app/api/founder/content/route.js`,
`src/app/founder/content/page.js`, `src/components/founder-content-workspace.js`,
`supabase/migrations/20261011100000_founder_content_list.sql`,
`tests/founder-content.test.js`, `tests/founder-content.sql`,
`tests/founder-content.fixture.mjs`, and this report.

No dependency/lockfile/auth configuration changes, staging, commit, push or deployment.

## Cloud access follow-up (2026-10-11)

Read-only project access again confirmed `uzhkzhmncxjplrdtdzgd`, HTC-Trial-Test-DB,
ACTIVE_HEALTHY, ap-southeast-1, PostgreSQL 17.11. Actual catalog queries returned
no history schema, no profiles/content tables, zero auth users, zero custom auth
triggers and zero public functions. DB1 remains unapplied.

A single `execute_sql` read-only probe submitted BEGIN READ ONLY, a transaction-local
backend PID marker, a DO assertion, a SELECT and COMMIT. PostgreSQL returned
`read_only=on` and `same_session=true`. The probe created no persistent object or
data. This verifies that particular read-only multi-statement request, not the DDL
migration interface, all retry layers, DB1 migration success or DB-01 through DB-15.
The connector explicitly directs DDL to apply_migration; its migration endpoint
and automatic tracking cannot be assumed equivalent to this approved four-record
batch. Required unchanged-batch/no-retry verification still blocks DB1 execution.

The review export SHA-256 and four original migration hashes match the earlier
verified values. No migration, fixture data insertion or production access occurred.

The Founder clarified that the intended cloud may be a Codex execution environment.
Available project inventory lists local HTC projects and ChatGPT projects; it does
not establish a published HTC Codex Cloud environment. Accessible durable chat
histories show scratch workspaces, not evidence of a prepared T13 checkout/runtime.
This desktop task's shell remains local Windows. Available tools can inspect cloud
chat history but expose no remote shell/file transfer or published-environment
inventory for that cloud runtime. Native desktop UI control is disabled. Therefore
the account's Settings > Codex Cloud > Environments configuration is NOT VERIFIED,
and no claim is made that the account has no cloud environment.

Secondary hosting checks: Vercel searches by HTC name and exact repository URL
returned no projects in the current account scope. Netlify twice returned an
authentication-request-accepted response instead of a project listing. Those
results do not prove absence of a Codex execution environment.

Minimum cloud validation path: select the existing published private HTC environment
in Settings > Codex Cloud > Environments; verify repository access, existing Node,
pnpm, browser tooling and PostgreSQL tooling. Transfer the complete current T13
working snapshot (including untracked files) through an approved private artifact
mechanism and verify hashes. A checkout of main alone contains T12, not these T13
changes. Do not commit/push merely to transfer the validation snapshot. If the
environment is absent, prepare a private isolated environment for this repository;
report missing tools instead of installing them automatically.

Within that cloud VM, run pnpm test and pnpm build against the verified snapshot,
then `node tests/founder-content.fixture.mjs` and use the cloud browser on the VM's
localhost:3103. All upstream transport must remain intercepted; no public hosting
or production auth is needed. Exercise Founder create/read/update/pagination,
USER/anonymous/expired denial, released/withdrawn read-only behavior, lifecycle
conflict, ambiguous save and session expiration; retain screenshots and results.
The existing fixture is synthetic transport, not PostgreSQL or live Auth evidence.

Separately establish an authorized test-only one-session DB1 execution path that
preserves the approved file and four migration-history records and has no automatic
retry. Verify state after any ambiguous response, never replay automatically. Then
run the existing DB2 SQL/concurrency fixtures, apply the scoped listing migration
and run tests/founder-content.sql. Concurrent DB cases require independently
controllable database sessions. Cloud setup alone does not satisfy these gates.

UI cloud runtime and DB-01 through DB-15 remain NOT TESTED. Existing local evidence
is still 195/195 tests and build PASS; those commands were not rerun in this follow-up.
Only this report changed during the cloud investigation. T13 remains BLOCKED.
