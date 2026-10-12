> Update 12 October 2026: remote test schema/RPC execution has progressed. See
> `group3-cloud-continuation.md` for current evidence and remaining gates. Earlier
> NOT EXECUTED / missing-RPC notes below are historical. Do not replay DB1.

# T14–T16 local workspaces and live prerequisites

Authority: `HTC-GROUP3-IMPLEMENTATION-CONTRACT.md`, supplied 12 October 2026,
SHA-256 `a74fd929920d61f2167cdaf20fc259bc8419661f1661ece6091e8436012d0730`.
This extends local development while T13 native PostgreSQL authentication remains
blocked. It does not close T14–T17 or replace DB1/DB2 evidence.

Paths:

- `/founder/assets`: bounded metadata list/detail, existing role selection,
  attach/detach to DRAFT, guarded deletion of unlinked synthetic metadata.
- `/founder/publishing`: existing release/withdraw states, readiness rejection,
  readback after confirmed operations; no scheduling or lifecycle field editor.
- `/founder/operations`: read-only grouped content/asset counts, captured timestamp,
  explicit source, unavailable/stale states and links to actual workspace routes.
- `/api/founder/operations`: narrow POST cookie adapter with exact Origin, existing
  Foundation authorization on every request, bounded JSON, exact action fields,
  safe projection and redacted failures. No role/email checks in client code.

Each page independently checks Founder access and uses the existing protected
layout. `founder-operation-workspace.js` provides shared presentation and request
handling. Duplicate operations are blocked while pending. Conflicts, authorization
failures and ambiguous operations require explicit reload; validation failures
allow correction. Session denial clears private client data. Summary queries use
SQLite GROUP BY and asset listing uses LIMIT 51; no binary/object enumeration.

## Local evidence and boundaries

`pnpm local:sqlite` opts in explicitly to the shared production-build UI with
synthetic server identity/roles and a fresh disposable SQLite file. Seeded asset
metadata includes READY, PENDING and DELETING states; no binary object exists.
Public discovery uses the existing T09 contract against RELEASED-only local data.
All server transport is intercepted; unknown RPC/storage and external hosts fail
closed. Fixture controls are separate `/__fixture/*` launcher paths, never
application exports. Normal start/dev does not enable fixtures.

The LOCAL label is visible in T14–T16 and HTTP fixture headers. Upload is explicitly
unavailable. Metadata deletion does not validate private-object deletion or
storage consistency. No upload URL, access token or service credential is exposed.

Local tests exercise actual SQLite files and independent database connections.
Browser checks exercise actual UI forms, protected routes, invalid input, lifecycle
conflict, uncertain saves, local publishing visibility and grouped snapshots.
Results and limitations belong in the external Group 3 checkpoint, not live PASS.

## Required live work, not supplied by the SQLite adapter

The operation endpoint intentionally calls narrow RPC contracts instead of falling
back to unsafe legacy mutations. These new contracts currently exist only in the
SQLite test adapter; their Supabase implementation/catalog is NOT VERIFIED:

- `read_trial_assets_for_founder(after_id, asset_id)`: bounded Founder metadata.
- `founder_operation_counts()`: bounded grouped counts and explicit source.
- `manage_trial_content_asset_draft(payload)`: lock content and asset; enforce
  DRAFT-only, READY/object consistency, uniqueness and existing relation guards.
- `transition_trial_content_checked(payload)`: lock content/relations/assets as
  required; enforce existing transitions and asset readiness atomically.
- `delete_trial_asset_for_founder(payload)`: the LOCAL implementation deletes only
  unlinked synthetic metadata. Live integration must reuse T07A's begin-delete,
  authenticated private storage deletion and finish-delete consistency workflow;
  it must not implement table-only asset deletion.

Until those prerequisites are implemented and verified on the approved test
project, the Supabase-backed operation routes fail unavailable. No PostgreSQL
migration or existing function/policy was changed for this local UI work.

Existing T07B relation edits deliberately use T06 legacy update and reset released
content to DRAFT. T14's contract instead requires RELEASED/WITHDRAWN read-only.
An application pre-read plus legacy attach/detach is insufficient: another session
could change lifecycle between check and mutation. The local guarded operation
uses one SQLite write transaction. A distinct atomic PostgreSQL guard is mandatory
before live T14 relation editing; existing T07B behavior is preserved.

Direct upload also requires a safe bridge from the existing HttpOnly session to
the existing private-storage authorization contract without revealing that session
to browser JavaScript. Local metadata fixtures cannot prove OAuth, Storage RLS,
MIME-byte checks, real READY transitions or cleanup. These remain live T14 gates.

Dependency order remains: native auth PASS → reviewed DB1 once → actual DB2 and
Founder SQL → test-only authorized integration/read models and atomic guards →
live T14 upload/relations → live T15 transitions/concurrency/public visibility →
live T16 query sanity → T17. Protected production is excluded. No deployment,
commit or push is performed merely to label these local results complete.
