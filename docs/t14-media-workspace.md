# T14 isolated continuation - 16 October 2026 JST

Current acceptance: **FULL PASS**, see `t14-final-acceptance-20261018.md`.
The dated implementation/recovery narrative below is retained as history.

Scope: T14 only, based on T13 commit
3b3417d8b7b273fb1b60b10c37c2ea437711a0aa. Existing integration checkpoint
9a2e766ddf0a40201249776122e357ca7f44d422 remains untouched. No commit/push/deploy.

## Reconciled existing work

Reused the existing /founder/assets page, media/operations routes, operation
handler, asset presentation, and guarded relation SQLite fixture from the Group 3
worktree. Removed publishing/count actions, UI and navigation from this isolated
candidate. The original T15/T16 files and shared hunks remain in that worktree.
T14 loads asset and content metadata without depending on the T16 counts RPC.

The Founder navigation now includes only the additional Asset workspace link.
T13 content behavior, OAuth/session integration and Public/User media restrictions
remain unchanged. Tests retain all previous T13/Foundation/Public checks.

## Signed direct upload

Founder approved signed direct upload in place of the previous T14 binary proxy.
The /api/founder/assets cookie bridge authorizes via existing Foundation, reserves
the exact generated asset path and requests a scoped signed capability with
upsert disabled. The primary session and publishable header stay server-side.
The capability is returned with no-store, kept in local operation memory only,
and never intentionally logged or persisted. Binary PUT goes directly from the
browser to the exact private Supabase Storage path, with credentials omitted and
no referrer. No Next.js/Vercel binary upload route is included.

Signed capabilities last two hours. This does not extend the existing reservation
or revoke a capability on application logout. The unchanged catalog trigger must
continue rejecting expired/non-PENDING/deleted reservations, mismatching MIME or
size, and immutable-object changes. Finalize still verifies actual object
metadata and at most 512 signature bytes through Foundation before READY.

The signing request supplies reservation MIME for Storage's permission-probe
metadata. Actual TEST signing, direct PNG upload and finalization now PASS.
Strict mismatched-capability and replay tests exposed the existing guard's
P0001-to-Storage500 classification. Founder-approved correction20261016084813
adds42501 only at the two existing rejection sites. Actual MIME/size/replay
rechecks now PASS; natural reservation and signed-token expiry remain unverified.
See t14-acceptance-20261016.md for the current gate and cleanup status.
Do not relax the catalog trigger or use service credentials to force success.

Confirmed integration defect fixed: media-assets.js used a hardcoded Foundation
Storage origin despite the existing explicit TEST target selector. It now uses
supabaseConfiguration(env), as authorization already does. This keeps existing
default behavior and fail-closed target validation while permitting TEST-only
Storage requests. No production network request was made. Transport validation
must block all non-TEST hosts.

## Recovery

UI prevents duplicate in-flight operations and retains reservation request_id
after an ambiguous reserve result. Once an asset identity is known it must be
inspected/finalized or deleted before another upload. Pending recovery identity
is shown, never the signed URL. Finalize-selected and guarded delete use existing
Foundation operations. A transfer response alone never implies READY. Conflict,
authorization failure or ambiguous mutation blocks further mutations until an
explicit reload. No automatic upload retry or overwrite is performed.

## Database history

Only approved operation permission object.sign_upload_url was added to the
existing INSERT allowlist. Founder/private bucket/generated path/PENDING/expiry
predicate, RLS, other policies, functions and triggers were preserved. Migration
20261015220202 was applied once, in one atomic DO with aborting pre/postcondition
assertions. Migration tracking was owned by Supabase apply_migration.

Current readback contains ten records. The approved SQLSTATE correction is the
tenth record; all nine prior statement hashes remain unchanged.
validation/test-db archives all ten exact sources; the two shared
operation sources are previously applied history, not new T15/T16 implementation
or permission to replay migrations. The original T13 worktree/archive is intact.

## Evidence boundaries

validation/t14 records migration execution/readback and runtime SQL suites.
Policy/relationship SQL uses synthetic catalog metadata in transactions that
roll back; it does not prove actual binary delivery or live OAuth.
SQLite metadata operations and browser fixtures are LOCAL evidence only.
T13's earlier live Google validation is preserved, not substituted for T14 live
Storage acceptance. T14 remains incomplete until its current live/browser gates
and final acceptance checkpoint explicitly pass.
