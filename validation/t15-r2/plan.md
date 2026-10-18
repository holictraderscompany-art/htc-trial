# T15-R2 native concurrency plan

Target: `uzhkzhmncxjplrdtdzgd` only. No migrations or product changes.
Branch: `codex/t15-r1-reconciliation`; baseline
`94981054f4fa2493205b44919e37802322312c3c`.
R1 manifest: all 23 recorded file hashes matched before R2.

## Execution gate

The recovered psql 17.11 worker uses the approved session pooler on 5432,
project-qualified user, verify-full and pinned trusted CA/client hashes.
Each worker requires private native console password entry. It first runs a
read-only transaction and checks ten migration records/core-source hash, TLS,
database/role and project_ref when available. No password is read by the runner,
placed in arguments/environment/files or logged. No automatic authentication
retry. A is opened first; B is opened only after A authenticates successfully.

Two fresh ready records, distinct backend PIDs and local process IDs, backend
start times, overlapping xact_start/statement timestamps, pg_blocking_pids and
wait_event_type=Lock are required before any contention case can be PASS.
Do not replay the failed historical connector matrix or count historical T13
sessions as current T15 execution.

## Deterministic matrix (not yet executed)

Each case uses separately inventoried UUIDs and a unique T15-R2 ownership tag.
Setup must assert UUID absence and the unchanged baseline before committing.
All privileged RPC calls run as authenticated with an existing TEST profile
subject and verify is_founder(), not as postgres. This is native database caller
context testing, not OAuth/browser authentication. Do not mutate auth/profiles.

| Case | Initial state | A holds | B attempts | Required serialized outcome |
| --- | --- | --- | --- | --- |
| A1/G1 | DRAFT | checked release, COMMIT | checked release | B waits then invalid_transition; one release |
| B1 | RELEASED | checked withdraw, COMMIT | checked release | B waits then saved/RELEASED |
| B2/F1 | RELEASED | checked withdraw, ROLLBACK | checked withdraw | B waits then saved/WITHDRAWN |
| D1 | DRAFT | checked release, COMMIT | T13 draft edit | B waits then not_draft; original text preserved |
| D2 | DRAFT | T13 draft edit, COMMIT | checked release | B waits then releases edited text |
| F2 | DRAFT | checked release, ROLLBACK | T13 draft edit | B waits then saved/DRAFT |
| F3 | DRAFT | T13 edit, ROLLBACK | checked release | B waits then releases original text |
| C1/E1 | two DRAFTs, common READY assets | release first DRAFT | release second DRAFT | compatible sorted SHARE locks; both valid releases |
| C2/D3 | DRAFT linked to READY asset | release holding asset SHARE | guarded asset delete | wait then linked_asset; no deletion |
| C3/D4 | DRAFT linked to READY asset | guarded delete holding asset UPDATE | release | wait then saved; linked asset remains READY |
| C4 | DRAFT | release, COMMIT | DRAFT relation attach | content lock then not_draft; no new relation |
| C5 | DRAFT | DRAFT attach, COMMIT | release | waits, validates committed relation and releases |
| D5/F4 | DRAFT | asset state operation/ROLLBACK | release | appropriate asset lock wait; no partial state change |
| E2/F5 | DRAFT with two assets | asset locks in documented order | checked release with lock_timeout | record 55P03 and rollback; no published row or partial edits |
| G2 | WITHDRAWN | checked release, COMMIT | checked release retry | serialized invalid_transition; immutable result |
| H1 | DRAFT | existing USER caller | checked release/withdraw | 42501, unchanged content |
| H2 | DRAFT | anonymous caller | checked release/withdraw | EXECUTE denial 42501, unchanged content |

Use explicit BEGIN/COMMIT/ROLLBACK. Submit B only after A's RPC/lock completes.
While B is blocked, A resets role temporarily for read-only pg_stat_activity
and pg_locks observation, records both xact_start/backend_start/PIDs/blockers,
then restores authenticated role and commits/rolls back. No polling query may
commit the holder transaction. Bound statement/lock/idle timeouts; never leave
transactions open while waiting for human input.

Capture JSON RPC outcomes and SQLSTATE (including expected 55P03/42501), server
timestamps, client dispatch/completion, final state/text/released_at, relation
counts, public RELEASED visibility, and connection identity per case. A timeout
or unknown result must trigger state inspection, not blind rerun.

## Storage fixture prerequisite and cleanup

The current TEST database has zero content/assets/relations/trial-assets objects.
Storage protect_delete() forbids raw SQL deletion. Never disable this trigger,
set storage.allow_delete_query, weaken RLS or create committed Storage metadata
before a supported cleanup route is available. Ready/shared-asset cases require
valid metadata and a proven approved Storage API cleanup path; catalog-only
fixtures are not LIVE binary proof. If this prerequisite is unavailable, mark
those cases BLOCKED rather than inventing ready assets or leaving orphans.

Content-only fixtures can be removed by exact owned IDs plus ownership-tag
assertions after rollback/reset of both sessions. For assets, first detach owned
relations through the DRAFT-only checked RPC while legitimate; do not invent
WITHDRAWN-to-DRAFT transitions for cleanup. Release fixtures with relations need
a pre-reviewed synthetic-data teardown respecting constraints and guards.
Use the existing delete bridge, actual Storage API delete and finish_delete.
No arbitrary users or Storage objects may be removed.

Before final PASS compare migration hashes, definitions/ACLs/policies/default
ACLs, profile hash, bucket settings and nonfixture data with security-before.json.
Confirm all inventoried content/assets/relations/Storage objects absent and
close both owned sessions. Any cleanup uncertainty is a stop condition.

## Evidence/status

R1 tests/build remain previous LOCAL PASS evidence; no product changes warrant
repeating them in R2. Native runtime cases above are NOT TESTED until actual
fresh session evidence exists. R3 LIVE authenticated publishing remains separate.
