# T23-B-ID2B-02 — TEST migration security and rollback review

**LOCAL REVIEW ONLY — NOT APPROVED FOR EXECUTION.** 1 November 2026.
Repository `holictraderscompany-art/htc-trial`, branch `codex/group04-t18`.
Git-reported baseline: `86713f82b2706d00513b2052f9bf3898e7e6273a`.
Preflight found a clean existing Group 04 worktree, matching local/remote HEAD
and tracking 0 ahead / 0 behind. No remote database access occurs in this task.

## 1. Scope, provenance and execution protection

Exactly two new review artifacts:

- [Protected SQL proposal](../validation/t23-id2b-02/community-delegation-MIGRATION-REVIEW.sql).
- This security, rollback and TEST design document.

The SQL is outside active and archived migration directories, unregistered with
any runner. Its transaction retains an unconditional exception before DDL and a
final ROLLBACK. Do not run it, bypass its abort or paste selected statements into
Supabase. A separately authorized release must produce a distinct reviewed
executable artifact; this file remains protected even after review acceptance.

| Preserved source | SHA-256 |
| --- | --- |
| [ID2B-01 candidate](../validation/t23-id2b-01/community-delegation-CANDIDATE.sql) | `c3965addbb1eba7fcdd323201087379c4f1a7aea249d7de2214a76c7c56ac486` |
| [ID2B-01 review](t23-id2b-01-migration-review.md) | `8a8a0bb2c46202f866bdc564635944836b34f6af2190606180c4860a164a4297` |
| [ID2A protected draft](../validation/t23-id2a/community-delegation-DRAFT.sql) | `6e400c682d9f3199a2736ce11fc108407434dcd8378e42069abfd4fc90088044` |

Read-only authorities: [ID1 identity contract](t23-moderator-identity-delegation-contract.md),
[55-scenario plan](t23-moderator-authorization-test-plan.md),
[ID2A local foundation](t23-id2a-local-foundation.md),
[T03 Auth](auth-role-foundation.md) and [T04 API](api-release-foundation.md).
USER and FOUNDER remain the only core roles. Moderators remain USER; no role,
Auth/profile trigger, RPC, API, session guard, account or appointment is created.

## 2. Retained TEST evidence and unverified conditions

Reuse the prior trusted metadata reconciliation for `HTC-Trial-Test-DB`
(`uzhkzhmncxjplrdtdzgd`): PostgreSQL server 17.11, engine package 17.11.0.003;
ten migration versions/names/source hashes matched the retained TEST archive;
the T03 role/function/trigger foundation matched source; `community_private`
was absent. No inventory queries or member/session records are read again here.
These are dated observations, not a current no-drift guarantee. The
[TEST archive](../validation/test-db/README.md) is provenance, never a deployment
workdir; do not replay it or substitute the different root migration lineage.

Data API exposure remains **UNVERIFIED**: null database settings did not reveal
an authoritative exposure list. The proposed private schema must remain outside
that list, with separate configuration evidence before release. Retained Auth
column metadata does not prove provider configuration, active sessions, timebox,
inactivity controls, verified email or revocation behavior. Production is excluded.

## 3. Additive model and differences from ID2B-01

The proposal preserves one private schema, three tables, three explicit indexes,
two private SECURITY INVOKER trigger functions and two new-table triggers.
Constraint-backed indexes are additional implicit PostgreSQL objects.

| Object / rule | Preserved contract |
| --- | --- |
| `delegations` | Auth subject FK, exact platform/community, pending/version-1 initial state, immutable ID/subject/destination binding, finite ordered validity, bounded approval/identity metadata |
| Current-scope unique index | One non-revoked binding per subject/platform/community, including pending and suspended; expired active records still reserve the binding |
| `delegation_capabilities` | Exact five ID1 capabilities, composite key, parent FK; edits only while parent is pending; nonempty set required for activation |
| Parent guard | Exact next version; pending to pending/active/revoked, active to suspended/revoked, suspended to suspended/active/revoked; revoked UPDATE always denied |
| Approval / reapproval | Distinct approval reference on activation, bounded current timestamp and future expiry; shape checks do not authenticate Founder approval |
| `delegation_audit` | Restricted operation/version/event/scope/delta metadata, no message/transcript/token; unique operation ID and delegation/version pair |

New hardening is confined to these new objects:

1. Capability mutation acquires its parent row with `FOR UPDATE NOWAIT`, returning
   a fixed `55P03` conflict when unavailable. It does not wait on the known
   child-to-parent row-lock edge; no automatic retry or permission fallback.
2. Audit capability deltas require canonical bounded sets: no null members,
   duplicates, multidimensional/nonstandard-bound nonempty arrays, unknown codes
   or overlap. Guarded shape checks avoid applying one-dimensional-only helpers
   to malformed dimensions.
3. Audit event/status/version combinations and approval-reference presence are
   constrained to coherent shapes. These validate a proposed record, not its
   factual actor, trusted clock, approval provenance or relationship to a write.
4. Approval metadata must be complete or absent; suspended grants retain prior
   approval. Updated/approval/revocation times cannot precede creation, and the
   identity check cannot follow its recorded approval. No duration is invented.
5. Ownership, default privileges, lock limits and deferred lifecycle/audit gates
   are explicit. No actual creator/owner or privilege change is executed.

Revoked is terminal for guarded UPDATE, not protection against a privileged
DELETE/reinsert, TRUNCATE, trigger disable or ALTER. Future trusted writers must
forbid grant-ID reuse and restoration of revoked rights. No indefinite tombstone
store or new retention policy is invented here.

## 4. Ownership, grants, RLS and trigger execution

Ownership follows the future migration creator. The actual creator, membership,
default ACLs and owner/BYPASSRLS behavior must be reviewed before release. Prior
postgres defaults were hardened; broader supabase_admin defaults cannot be
assumed corrected by another owner's ACL changes. Defaults are owner-specific.
No new role or ALTER DEFAULT PRIVILEGES statement is silently supplied.
Review every actual ACL recipient, inherited membership and grant option, not
only the known API principals. An unexplained effective grant blocks release.

The proposal explicitly revokes schema/table/sequence/function privileges from
PUBLIC, anon, authenticated and service_role, enables RLS on all three tables,
and creates no permissive policy. Each new trigger function has an explicit
EXECUTE revoke after creation. Future objects require their own reviewed ACLs;
schema-local assumptions do not replace checking creator-wide function defaults.
No direct browser CRUD or public RPC is intended. A private schema does not imply
catalog object names are confidential. RLS alone does not restrain
owners/BYPASSRLS; this is not protection against a privileged database operator.

Both zero-argument trigger functions use SECURITY INVOKER, empty fixed
search_path and qualified private objects. An approved future writer needs the
appropriate schema USAGE and table/column permissions: parent SELECT and UPDATE
for locking, child visibility for activation, and parent version/reason/time
updates from capability changes. Trigger creation, invocation, nested updates,
RLS and FK cleanup must be tested as the actual execution roles. No grants to
make those paths usable are issued by this review; no DEFINER shortcut is added.

Subject deletion proposes cascading eligibility/capability cleanup and nullable
Auth actor/subject references in retained audit. Historical approver/revoker UUIDs
are not Auth FKs and can remain identifying metadata: minimization/deletion must
be decided explicitly. The absent-parent capability DELETE path permits FK
cleanup, not general deletion authority. With future RLS, NOT FOUND could mean
an invisible parent rather than a deleted parent. Therefore arbitrary child
write grants are forbidden; the reviewed writer/cascade context must have true
parent visibility and prove that active capability removal cannot bypass its
guard through row hiding. This is a blocking integration requirement.

## 5. Concurrency, versioning and audit limits

| Risk | Local proposal / remaining TEST proof |
| --- | --- |
| Child/parent lock inversion | NOWAIT breaks the parent-row waiting edge for this trigger; table locks, unique/FK waits, multi-row ordering and other deadlocks remain possible; test actual roles and rollback |
| Multi-row capability edits | Each child BEFORE trigger invocation advances parent version once; even no-op UPDATE or an INSERT skipped by ON CONFLICT can invoke it; future RPC must reconcile increments with audit, not assume one version per committed row/request |
| Competing current-scope proposals | Partial unique index provides a conflict boundary; prove concurrent insert/commit/rollback outcomes, including pending/suspended records |
| Approval versus capability change | Parent lock and exact version serialize local changes; test both orderings and failed child statement rollback; no stale approval of a changed set |
| Revoke races | Parent transitions do not authorize case actions; future RPC/case ledger needs common lock order, current expected version and commit-order evidence |
| Audit consistency | Shape, unique operation ID and unique delegation/version are constrained; atomic append, complete intermediate versions, actor/intent and replay checks are NOT implemented |
| Auth deletion | FK actions and new triggers interact; test missing-parent cleanup, role visibility, concurrent edits and complete rollback without breaking signup/profile sync |

A row-lock conflict is denial/conflict, never success. An operation encountering
55P03 or another transaction failure must abort/reconcile the whole unit; a
later separately authorized writer may retry only after rereading current state
and verifying the same immutable operation intent. No blind retry is proposed.
An already committed operation cannot be retroactively cancelled by revocation.
External native rights and queued dispatch are outside this schema's guarantees.

Audit remains restricted proposed data, not a tamper-proof append-only ledger.
No trigger atomically appends it; no session or human identity is authenticated.
Future trusted RPCs must couple permission/version/audit writes in one transaction
and fail the whole operation on audit failure. Approval references are not local
receipts that grant authority. Solving these gaps requires separately approved
RPC/case/lifecycle work, not silently expanding this subtask.

## 6. Auth and human-authority prerequisites

Release/activation remains BLOCKED pending current server/DB identity binding,
genuine Founder-only appointment/revocation, verified USER subject, exact scope,
capability/window, active trusted session, configured freshness and expiry checks.
No verified email string, JWT role snapshot, service key, caller role or simulated
ID2A authority may substitute for these controls.

Email change, loss of verification and change-away-then-back need durable
suspension/version invalidation and explicit reapproval. The proposed identity
generation is not an existing Auth column or implemented event source. Independent
appeal/correction reviewers need stable human identity, assignment and conflict
history; a different session/alias is insufficient. Missing lifecycle/oversight
evidence must fail closed. No Auth trigger or live guard is added here.

## 7. Rollback plan — separate authorization required

This is a reviewed plan, not executable rollback SQL. Record exact release hashes,
target, object/owner/ACL manifest, dependency inventory and sanitized outcomes
before a separately authorized TEST execution. Stop on collisions, drift, unknown
target or uncertain transaction state; never automatically repair shared objects.

**A. Failed or interrupted deployment before approved data exists.** The distinct
release artifact must use an atomic transaction. On error/disconnection, establish
whether it committed or rolled back using approved metadata-only verification;
do not infer success from a disconnected client or rerun blindly. Prove failed
deployment leaves no partial new objects in TEST. If an unexpected partial state
exists, quarantine access and reconcile the exact manifest before any cleanup;
do not drop a same-named object whose provenance is uncertain. The guarded review
file itself must abort before DDL and cannot serve as that release artifact.

**B. Rollback after new data or grants exist.** Disable only the new entry points
and revoke their newly granted facade privileges first; stop/reconcile in-flight
transactions and any future external dispatch. Preserve revocation/version/audit
evidence under the approved privacy/retention decision, without reactivating old
rights. Native platform permission removal requires independent confirmation.
Take only an approved minimal recovery snapshot, never an unapproved member dump.

Review incoming/outgoing FKs and object dependencies before removal. New-table
triggers depend on private trigger functions; capabilities depend on delegations;
the new subject/actor references depend on Auth; audit intentionally keeps a
logical grant reference without a parent FK. Remove only individually identified
new objects after their dependents and retention obligations are resolved, then
the now-empty new schema. If retention requires keeping audit, do not drop its
table/schema. Revoke/check residual ACLs, functions and future cache/session
state. Actual SQL, data destruction and backup disposal need separate approval.

Both paths preserve T03/T04 signup, profile/role synchronization, USER/FOUNDER,
existing policies and migration lineage. Prove retained function definitions and
trigger behavior in the approved rollback test. No database reset, broad DROP
CASCADE, shared-schema removal, enum reset or historical migration replay. Do not
restore an earlier active grant snapshot and resurrect revoked authority.

## 8. Minimal TEST design and stop conditions

All checks below are **PLANNED / NOT EXECUTED**. No fixture is created here.

| Stage | Concrete checks | Required approval / limits |
| --- | --- | --- |
| S0: configuration/catalog, no fixture rows | Exact TEST identity/version/lineage; collision stop; authoritative exposed-schema list; actual creator/default ACLs/owners; schema USAGE/CREATE, table/column/sequence and every function-overload EXECUTE; RLS flags/policies and object manifest | Trusted target-bound access and separately approved release; metadata can inspect flags, not prove effective row authorization |
| S0: empty-schema denial | As anon/authenticated, direct schema/table/sequence/function and Data API denial; owner/service bypass documented | Separate TEST execution authorization; empty-table denial is not positive row-isolation evidence |
| S1: table/constraint tests | Pending/version-1, immutable binding, allowed transitions, terminal revoked UPDATE, canonical audit deltas/event shapes, finite timestamps, duplicates/overlap and malformed inputs rejected | Approved isolated data fixtures and Auth FK targets; arbitrary invented UUIDs cannot replace required auth.users rows |
| S1: transaction tests | Two sessions for competing proposals, capability/approval/revoke/cascade orderings; multi-row/no-op/speculative-insert version delta; forced child/audit error and full rollback; NOWAIT conflict and actual-role FK cleanup | Approved Auth identities, execution roles and cleanup; no actual case action or Founder RPC acceptance claimed |
| S1: migration/rollback | Inject failure before commit; verify no partial objects; rehearse exact-object rollback both before and after synthetic data, preserving T03/T04 | Distinct release/rollback artifacts, execution and retention approval; review SQL's abort remains intact |
| A: Auth/RPC integration | Real trusted Founder/USER context, direct-RPC denial, session replay/revocation/freshness, email-away-and-back suspension, atomic audit/idempotency, case scope/independent reviewer | Separate implementation and account/consent approval; missing RPC/case/lifecycle remains BLOCKED |
| W/P: application/provider | Private response/SSR/CSRF/cache and dispatch revalidation; ownership/native privilege reconciliation | Later approved app work and T23-C platform gate; no connections or activation here |

Schema-only catalog/empty-object checks need no member fixtures. Data-model tests
with subject/actor FKs require separately approved Auth targets even when OAuth
and live authorization are not under test. Do not disable FKs or insert directly
into auth.users to manufacture a supposedly account-free PASS. Use owned approved
synthetic identities and a genuine Founder test boundary only after authorization.
Any failed prerequisite, unexplained denial, exposure, cascade, stale grant or
partial transaction stops that stage; no privilege escalation to continue.

## 9. All 55 original acceptance scenarios — evidence unchanged

The existing **63/63 ID2A synthetic tests PASS** are reused; no tested module
changed and none were rerun. Static proposal review adds design evidence only.

| Original IDs | Count | Retained status / next layer |
| --- | --- | --- |
| I01-I09, I11-I13 | 12 | Partial local predicates only; A proves identity/session/email behavior |
| I10, I14 | 2 | Not locally executed; A needs pending-email and configured freshness decisions |
| D01-D08, D12 | 9 | Partial local predicates; S1 covers constraints, A proves genuine Founder/RPC authority and immediate revocation |
| D09-D11 | 3 | Not locally executed; S1 concurrency/rollback plus A case/audit/intent atomicity |
| C01-C09 | 9 | Partial local predicates; A needs real assignment/capability/conflict checks across lifecycle |
| R01-R06 | 6 | Not locally executed; S0/S1 grants/RLS/owner tests, A direct-RPC and atomic assignment checks |
| W01-W04 | 4 | Not locally executed; W requires real protected app/API implementation |
| P01-P06 | 6 | Not locally executed, deferred to separately approved T23-C platform verification |
| M01-M04 | 4 | Not locally executed; S0/S1 migration/rollback/privacy and A Auth-lifecycle compatibility |

Total: **30 partial local evidence + 25 without local execution = 55**.
**Full integration acceptance: 0/55 verified PASS.** No new SQL, RLS, Auth,
concurrency, rollback, application or provider execution result is asserted.

## 10. Static validation boundary and Founder gates

Local validation covers exact two-file inventory, protected-source hashes,
abort-before-DDL/final ROLLBACK, new-object dependency order, invoker/revoke/RLS
shape, lexical SQL structure, documentation links/mapping, whitespace and
credential/private-data patterns. No PostgreSQL parser/server execution, syntax
certification, dependency install or live security PASS is implied.

Before further work, Founder approval must separately identify:

1. Final target-bound release artifact and execution/rollback scope; no production.
2. Actual creator/owner/default-ACL plan and authoritative schema-exposure evidence.
3. Approved platforms/opaque scopes, capabilities, expiry/identity assurance and
   moderator appointment/delegation/independent-review responsibilities.
4. Trusted RPC, expected-version/atomic audit/idempotency and case-lock design;
   current session/freshness and durable email-change invalidation implementation.
5. Synthetic owned Auth identities, legitimate Founder test context, permitted
   fixture data, collection basis, access, retention/deletion and recovery custody.
6. Operational revocation, emergency owner/kill switch, staffing and later native
   platform removal verification. No real appointment or activation follows from
   accepting these review artifacts.

Current official mechanism references, not proof of TEST configuration:
[PostgreSQL 17 locking clauses](https://www.postgresql.org/docs/17/sql-select.html#SQL-FOR-UPDATE-SHARE),
[function security/default EXECUTE](https://www.postgresql.org/docs/17/sql-createfunction.html),
[trigger/FK behavior](https://www.postgresql.org/docs/17/trigger-definition.html),
[RLS limits](https://www.postgresql.org/docs/17/ddl-rowsecurity.html),
[owner-specific defaults](https://www.postgresql.org/docs/17/sql-alterdefaultprivileges.html),
and [Supabase grants/RLS/API exposure](https://supabase.com/docs/guides/api/securing-your-api).
NOWAIT concerns row locks, not all table-lock waits; FK actions can fire triggers;
owner privileges and API exposure require independent evidence. No Supabase query,
database/configuration mutation, commit, push, deployment or account action occurs.
