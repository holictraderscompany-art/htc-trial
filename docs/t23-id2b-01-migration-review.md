# T23-B-ID2B-01 — Local additive migration candidate review

**CANDIDATE ONLY — NOT APPROVED FOR EXECUTION.** Local review artifacts only,
1 November 2026. No SQL, migration, appointment or activation was executed.
Repository `holictraderscompany-art/htc-trial`, branch `codex/group04-t18`,
baseline `826ca05b28014511ea23bb1c028722a11c94c235`. Preflight found matching
local/remote HEAD, tracking 0/0 and clean existing Group 04 worktree.

## 1. Exact scope and contract mapping

New artifacts only:

- `validation/t23-id2b-01/community-delegation-CANDIDATE.sql`.
- This review document.

The candidate remains outside all active/archived migration directories, is not
registered with a runner, and retains `BEGIN`, an unconditional abort before DDL,
and a final `ROLLBACK`. Do not execute it, remove its abort or copy fragments into
a live editor. A future executable migration needs a new separately reviewed
artifact and explicit Founder authorization; no execution command is supplied.

| Read-only source | Mapping |
| --- | --- |
| [ID1 identity/delegation contract](t23-moderator-identity-delegation-contract.md) | USER-only moderators, separate scoped grants, private data, human/Founder boundaries, revocation and independent-review requirements |
| [ID1 55-scenario plan](t23-moderator-authorization-test-plan.md) | Integration acceptance obligations remain distinct from static review |
| [ID2A local report](t23-id2a-local-foundation.md) | Existing pure fixture evaluator, 63/63 local tests and explicitly absent live guard |
| [Protected ID2A draft](../validation/t23-id2a/community-delegation-DRAFT.sql) | Three-table design and deferred RPC/Auth dependencies; preserved byte-for-byte |
| [T03 Auth/role contract](auth-role-foundation.md), [T04 API contract](api-release-foundation.md) | Unchanged USER/FOUNDER enum, database-controlled Founder identity and server/RLS authorization |
| [TEST history archive](../validation/test-db/README.md) | Provenance only; never a deployment workdir or source of migrations to replay |

No application, role enum, existing Auth table/trigger, profile policy, Founder
function, API, workflow, dependency, migration history or closed file changes.
Private data-model trigger functions in this candidate constrain the new tables
only; they are not appointment/revocation RPCs, identity validators or API routes.

## 2. Reused TEST reconciliation — no new project queries

The completed ID2B preflight used trusted read-only metadata against
`HTC-Trial-Test-DB` (`uzhkzhmncxjplrdtdzgd`), not production. It confirmed:

- Project ACTIVE_HEALTHY; project engine package 17.11.0.003, server 17.11.
- All ten migration versions/names/source hashes match the retained TEST archive.
- USER/FOUNDER remain the only core enum values; three T03 function body hashes
  match repository source. Relevant signup/profile triggers remain enabled.
- `community_private` did not exist at that readback. Future object collisions
  or drift must stop migration; the candidate does not adopt existing objects.
- `anon`/`authenticated` have no CREATE on public/auth or direct Auth-table DML.
  Profile access remains RLS-controlled with display-name-only column updates.
- Default privileges are owner-specific: postgres hardening does not imply
  another creator's defaults are safe. The retained supabase_admin defaults are
  broader. Review the actual migration creator/owner and revoke explicit grants.

Exposed-schema configuration was NOT established: available database settings
were null, not proof of an exposure list. Auth/session columns were visible as
metadata, not evidence of configured freshness, provider controls or behavior.
No new Supabase project/API/catalog query, record access or SQL occurred in
ID2B-01. These retained observations are not a promise that remote state cannot
change between approvals.

## 3. Proposed object and field inventory

One new private schema, three new tables, their indexes/constraints, two private
SECURITY INVOKER trigger functions and two new-table triggers are proposed.
No new database role or SECURITY DEFINER function is introduced.

| Object | Important fields / constraints |
| --- | --- |
| `community_private.delegations` | Opaque ID; subject Auth UUID FK; exact platform/community; pending-default status; finite ordered validity; approval/email-binding/identity-generation metadata; positive version; controlled reason/revocation fields |
| `community_private.delegation_capabilities` | Delegation FK and exact ID1 capability; composite key prevents duplicates; five allowed capabilities only |
| `community_private.delegation_audit` | Event/operation IDs, grant/version reference, nullable actor/subject Auth references, scope/status/capability deltas and server time; no message, token or transcript |
| Current-scope unique index | At most one non-revoked binding per subject/platform/community; pending and suspended records also reserve that binding |
| Scope/audit indexes | Support scoped lookup and restricted chronological grant audit; never imply an authorized public listing |
| Delegation row guard | Initial pending/version 1, immutable ID/subject/platform/community, exact version progression, terminal revoked UPDATE and controlled reapproval transitions |
| Capability-set guard | Parent-row locking, pending-only edits and version bump; freezes activated/suspended/revoked capability sets |

The schema models future verified Auth UUID binding, not email-only authority.
No real account IDs, email addresses, JWTs, credentials or seed rows are included.
Subject core USER and actual Founder approval are requirements for future trusted
RPCs; a UUID/FK or completed approval field is not evidence of either fact.
The identity-generation field is proposed community state, not an existing Auth
field. Its authoritative source remains an unresolved lifecycle dependency.

## 4. Data-model transitions and permission versions

The new delegation guard constrains row transitions, not the human authority
to request them. Any permitted active status still requires later trusted RPC,
identity, session and lifecycle controls before live use.

| Current state | Permitted next state |
| --- | --- |
| New row | pending only, initial version 1 |
| pending | pending, active, revoked |
| active | suspended, revoked |
| suspended | suspended, active with fresh approval, revoked |
| revoked | No UPDATE, including self-transition |

Updates keep the identity/destination binding immutable and require exactly the
next version. Server timestamps and approval/validity constraints must remain
consistent. Reapproval after suspension needs new approval evidence; changing
status alone cannot silently restore rights. The guard cannot authenticate that
evidence, so actual human approval remains a future trusted boundary.

Capability changes lock the parent and are restricted to pending grants. They
advance the parent version, so a later approval cannot silently rely on an old
permission-set version. Activation requires a non-empty allowed capability set.
Activated capability changes require revoking the old grant and creating a new
pending proposal; no in-place expansion shortcut is supplied. A failed child
statement must roll back its parent version change in PostgreSQL; this must be
proved in TEST, not inferred from the local policy suite.

The unique index is intended to serialize competing current-scope inserts through
PostgreSQL uniqueness enforcement. Parent locks align capability mutation with
activation; future RPCs must use a common lock order and expected versions for
case/grant changes. Transaction isolation, multi-row deadlocks, retry/idempotency,
committed-before-revocation ordering and read/dispatch revalidation are NOT TESTED.
There is no claim of atomic external cancellation or a trusted case ledger.
Each changed capability row advances the parent version once: a multi-row
capability statement can advance several versions. Future expected-version and
audit rules must account for every intermediate change, not assume one version
per request. A child UPDATE/DELETE may lock its row before taking the parent lock,
while Auth/delegation deletion can lock parent before child. This inversion can
deadlock; PostgreSQL failure/rollback and cleanup must be tested with the actual
execution roles. No successful concurrency or Auth-cascade behavior is claimed.

## 5. RLS, grants, ownership and privacy

The candidate enables RLS and explicitly revokes schema/table/sequence/function
access from PUBLIC, anon, authenticated and service_role. No permissive policy,
browser CRUD grant, facade EXECUTE grant, public roster or API exposure is added.
The new schema must remain outside the Data API exposed-schema list, which needs
separate configuration evidence before any executable migration approval.

The two zero-argument RETURNS trigger functions are private SECURITY INVOKER
constraints with fixed empty search_path and qualified object references. Their
EXECUTE privileges are explicitly revoked; they do not authenticate a caller or
grant a privilege. Trigger behavior/privilege checks must be validated using the
actual intended roles. No callable appointment/session/platform RPC is supplied.

Object ownership initially follows the migration execution role; that role and
its existing/default privileges are not approved by this candidate. A future
non-login least-privilege function owner remains a separate decision, not a role
created here. RLS does not constrain an owner/BYPASSRLS role by itself, and an
owner can disable guards or change grants. Do not present these controls as
protection against a privileged DBA or as verified live authorization.

Auth subject deletion cascades eligibility/capability records; audit references
to deleted Auth users become null while grant-history references remain. There
is no blanket delegation DELETE guard or audit UPDATE/DELETE guard that silently
breaks those paths. A capability DELETE with an already absent parent is allowed
for parent cleanup; insertion/reassignment cannot use that exception. The actual
Auth-deletion execution-role/cascade path remains a mandatory compatibility test.

Terminal revoked applies to guarded UPDATE, not a guarantee against privileged
DELETE/reinsert, TRUNCATE or ALTER. Future trusted RPCs must disallow grant-ID
reuse against retained history, never delete/revive grants, and expose no direct
DELETE/TRUNCATE path. No tombstone or new retention infrastructure is invented.
Audit is minimal restricted data, not an unforgeable append-only trail: atomic
audit coupling, verified actors, immutable intent, retention/deletion/backup and
approved cleanup remain future implementation and policy requirements. No actual
email binding or audit payload is collected by creating these files.

## 6. Differences from the protected ID2A draft

- A new separately located candidate; the original guarded draft remains unchanged.
- Explicit row-transition/version/immutable-binding checks on new delegations.
- Pending-only locked capability edits, parent version progression and non-empty
  activation rule, with a cleanup-safe parent-absent DELETE path.
- Additional scoped indexes and stronger bounded/approval/data consistency rules.
- New private invoker trigger functions with explicit revokes; no public RPC,
  SECURITY DEFINER bridge, Auth lifecycle trigger or database role creation.

Both artifacts retain a protective abort and transaction/rollback boundary.
Neither is registered for automatic execution. Founder appointment/revocation,
real session checks, email-change suspension/reapproval, live case assignment and
platform dispatch remain dependencies. No existing function/role/policy is changed.

## 7. Original 55 acceptance scenarios and static evidence

The accepted ID2A 63/63 local synthetic tests are reused without rerunning them.
No runtime input to that module changed. No new PostgreSQL, RLS, Auth, API,
concurrency, migration or provider test was executed. Static review of candidate
SQL/PLpgSQL is not parser/server compatibility proof; PostgreSQL 17 compatibility
is the design target, not a reported execution PASS.

| IDs | Count | Current classification / next proof |
| --- | --- | --- |
| I01–I09, I11–I13 | 12 | Existing partial local predicates; real Auth/session/email behavior unexecuted |
| I10, I14 | 2 | Not locally executed; pending-email/session-control decisions required |
| D01–D08, D12 | 9 | Existing partial predicates; candidate adds design constraints only; actual Founder/RPC/version/uniqueness proof still required |
| D09–D11 | 3 | Not locally executed; native locking, atomic audit, rollback and replay tests required |
| C01–C09 | 9 | Existing partial predicates; actual case/assignment/lifecycle and independent human authorization absent |
| R01–R06 | 6 | Metadata/design review only; actual grant/RLS/RPC/owner abuse tests remain unexecuted |
| W01–W04 | 4 | Workspace/API/SSR/CSRF tests unexecuted |
| P01–P06 | 6 | Deferred platform verification; no provider connection or activation |
| M01–M04 | 4 | Migration/Auth-trigger/rollback/privacy execution untested |

All 55 remain NOT FULLY EXECUTED: 30 have partial local predicates, 25 have no
local execution; **0/55 complete integration acceptance scenarios verified PASS**.
The recent catalog reconciliation is provenance/metadata evidence, not a test
of row visibility, genuine authentication or concurrent enforcement.

Local checks for these two new files cover exact inventory, unchanged predecessor
and protected-draft hashes, static object/transition/privilege inspection, lexical
SQL structure, abort-before-DDL, no runner reference, local document links,
credential/email-pattern scan, whitespace and git diff --check. No dependency,
parser or database runtime was installed. Static results do not validate SQL
semantics, trigger execution or PostgreSQL behavior.

## 8. Rollback, failures and next approval gates

No rollback is performed or runnable command generated. If a future separately
approved migration fails, its transaction must leave no partial new objects;
prove that in isolated TEST. Never remove/replay the protected abort as a shortcut.
For rollback after deployment, first disable only new community surfaces and
grants, suspend relevant delegations with reviewed audit/version handling and
reconcile in-flight work. Restore/remove only the specifically approved new
objects in dependency order after checking incoming/outgoing FKs and retained
audit obligations. No DROP CASCADE on shared schemas, database reset, role-enum
rewrite, old migration replay, owner bypass or restoration of revoked rights.
Destructive data cleanup and removal of native platform rights need separate
approval/evidence. Neither operation is supplied here.

Before TEST execution approval, require all of:

1. Review acceptance and authorization to create a fresh executable migration
   artifact, distinct from this protected candidate; exact source/object manifest.
2. Target-bound current drift/collision and migration-history checks; actual Data
   API exposure and execution-role/default-grant/owner evidence. No production.
3. Approved grant validity/assurance, scopes/capabilities and identity-generation
   design; no inferred durations, appointments or new core role.
4. Separately reviewed trusted Founder-only RPCs/session controls and persistent
   email invalidation, or an explicit table-only test scope with no live activation.
5. Approval for synthetic TEST fixtures/owned identities, legitimate Founder
   testing, audit/privacy/retention/deletion and cleanup. Do not reuse real TEST
   accounts as disposable fixtures without consent or fake a Founder core role.
6. Controlled execution and rollback approval, least-privilege access, assertions
   for FK cascade/trigger roles, unauthorized direct access, terminal updates,
   capability/activation races and transactional failures. Stop on unexplained
   drift, denied prerequisites, malformed approval or uncertain execution outcome.

Actual appointments, enabled accounts, native platform permissions, APIs and
automation require later independent gates. No T23-C, T24 or Group 05 work occurs.

Official guidance used for new design decisions: [PostgreSQL 17 triggers](https://www.postgresql.org/docs/17/trigger-definition.html),
[PL/pgSQL trigger functions](https://www.postgresql.org/docs/17/plpgsql-trigger.html),
[row locks](https://www.postgresql.org/docs/17/explicit-locking.html),
[constraints](https://www.postgresql.org/docs/17/ddl-constraints.html), and
[Supabase API security](https://supabase.com/docs/guides/api/securing-your-api).
These describe mechanisms; they do not establish current TEST exposure or certify
the candidate's runtime behavior. No new Supabase query/mutation was made here.
