# T23-B-ID2A — Local moderator authorization foundation

Status: LOCAL IMPLEMENTATION FOR FOUNDER REVIEW, 1 November 2026. No migration,
real authorization, appointment, platform integration or activation is approved.
Baseline: `069b2eb5e62603d57cc5c45460902ddb5431c2c3`, repository
`holictraderscompany-art/htc-trial`, branch `codex/group04-t18`.
Preflight: existing Group 04 worktree clean, exact HEAD matches remote, tracking
0/0. T18–T23-B-ID1 remain unchanged. No other worktree is used or changed.

## Contract and trust boundary

Reuse the approved [ID1 contract](t23-moderator-identity-delegation-contract.md),
[55-scenario plan](t23-moderator-authorization-test-plan.md), T03/T04 role and API
foundations, T23-A advisory rules and T23-B independent-review boundaries.
This module does not replace or integrate those closed implementations.

`evaluateCommunityDelegationPolicy(context, request, nowMs)` is a synchronous,
deterministic **synthetic policy evaluator**, not a live authorization guard.
No public route may use it as proof of authentication or moderator permission.
It makes no requests, imports no runtime dependencies, retains no state, and
performs no storage, logging, timers, account changes or enforcement.

All identifiers in tests are artificial UUID constants. There are no email
strings, JWTs, Google accounts, provider tokens or actual member records. Anyone
can construct an accepted fixture: `synthetic`, confirmation, current-session,
Founder-approval and independence flags are test assertions, not trusted receipts.
Passing validation of their shape does not validate their truth. Core-role strings
inside fixtures are not real authorization claims. A future adapter must derive
identity and current data from trusted Auth/database sources, never client input.

Inputs are exact own-data-property objects; extra/missing fields, accessors and
malformed structures fail closed. UUIDs are canonical lowercase strings, numeric
versions positive safe integers, timestamps non-negative safe-integer milliseconds.
`nowMs` is explicitly supplied; no wall clock is read. Live time must later come
from a trusted execution/database context, not a browser. Limits bound fields and
the five-item capability set, not arbitrary hostile JavaScript execution. A proxy
trap itself is caller code; this module is not a sandbox for such code.

### Explicit fixture interface

All fields below are required; the only nullable fields are noted.

| Input | Fields / meaning |
| --- | --- |
| `context` | `synthetic: true`, `identity`, `session`, `delegation`, `resource`, `humanOversightAvailable` boolean |
| `identity` | `userId`, `coreRole`, `emailConfirmed`, `exists`, `anonymous`, `identityVersion`, `revalidationRequired`; current-shaped fixture state, not client identity |
| `session` | `id`, `subjectUserId`, `current`, `revoked`, `expiresAtMs`; no actual token/session lookup |
| `delegation` | Nullable (non-moderator); otherwise `id`, `subjectUserId`, `appointedByUserId`, `founderApprovalVerified`, `platform`, `communityId`, `capabilities`, `status`, `validFromMs`, `expiresAtMs`, `version`, `identityVersion`, `emailBindingMatches` |
| `resource` | `id`, `platform`, `communityId`, nullable `assignedUserId`, `version`, nullable `challengedDecisionMakerUserId`, `independenceConfirmed` |
| `request` | `caseId`, `platform`, `communityId`, `capability`, `expectedDelegationVersion`, `expectedCaseVersion`; no actor, email, role or approval field |

Platforms are exactly `whatsapp`, `telegram`, `discord`. The capability allowlist
is exactly ID1's `case.read_assigned`, `case.review_assigned`,
`case.escalate_assigned`, `case.appeal_review_assigned`,
`case.correction_review_assigned`; no wildcards, sanctions, appointments,
revocation/admin commands, exports or Founder privileges are accepted operations.
Grant capability entries must be unique and known, even if not requested.

All moderator operations require core role USER, existing non-anonymous identity,
confirmed email, no pending identity revalidation, current matching unrevoked
session, available human oversight and a non-self-appointed approved active grant.
Session expiry and delegation expiry are exclusive boundaries; grant start is
inclusive. Grant subject/session subject/assignment must match the actor UUID.
Grant platform/community, current resource and request must match exactly.
Expected/current delegation and case versions must agree; identity generation and
email-binding fixtures must also match. FOUNDER does not inherit moderator access.

Appeal/correction capabilities require a known different challenged decision-maker
and verified-shaped independent assignment. Whenever the resource identifies a
challenged decision, the same independence check applies even to ordinary read,
review or escalation capability requests. This conservative local rule prevents
a weaker requested capability bypassing a known conflict. It is not approval of
a live read-access policy. Ordinary cases may have no challenged decision-maker.
A future adapter must derive the required capability and review context from the
actual operation/current case lifecycle; an attacker must not choose or erase it.
There is no case lifecycle engine, live assignment ledger or trusted actor adapter
in ID2A; full ID1 scenario C09 therefore remains NOT EXECUTED.

Output is fixed and frozen, contains no input identifiers or private values:

```js
{
  prototype: true, simulationOnly: true, liveAuthorization: false,
  enforcementAuthorized: false, policyStatus: 'PROPOSED',
  decision: 'permit', reasonCodes: ['POLICY_SATISFIED']
}
```

`permit` means only that this fixture satisfied local predicates. Denial returns
`decision: 'deny'` with one exported `DELEGATION_DENIAL_CODES` entry. Unknown
exceptions return `INVALID_INPUT`, never raw input or exception text. A thrown
success-code string cannot fabricate a permit. Inputs are not mutated; outputs
are independent, bounded and immutable. No result can execute a platform action.

## SQL draft architecture and limitations

`validation/t23-id2a/community-delegation-DRAFT.sql` is **NOT EXECUTED / NOT
APPROVED FOR MIGRATION**. It is outside both root and archived Supabase migration
directories. `BEGIN` and an unconditional exception precede proposed DDL; the
file ends with `ROLLBACK`. No runner/import is added. Do not execute even the
guarded file, strip its abort, or copy its fragments into a live SQL editor.

The design sketches private delegations, normalized capabilities and restricted
audit records, Auth UUID linkage, pending-default/validity/version/uniqueness
constraints, RLS and explicit privilege revokes. No permissive browser policies
or executable appointment/revocation RPC, trigger, role creation or seed exists.
The normalized capability child table represents ID1's logical capability set.
The proposed identity-generation binding is not an existing Supabase Auth field.
Its authoritative source remains a separate BLOCKED lifecycle dependency.

Founder-only RPC algorithms, restricted non-login function ownership, deliberate
EXECUTE grants, atomic grant/audit changes, version checks, common locking and
rollback are design comments, not working guarantees. Table-owner/service-role
bypass is explicitly not solved by merely enabling RLS. Database time, constraints,
function ownership and effective grants need actual TEST verification later.
No PostgreSQL parser/server was used, so SQL syntax, DDL and RLS behavior are NOT
TESTED against the target. Static design review does not make this a migration.

Email-change/verification invalidation is deliberately not implemented as an Auth
trigger. Persistently suspend/increment on change, including away-and-back, only
after a separately reviewed design proves preservation of T03 signup/role-sync
semantics. Snapshot equality alone cannot establish it. Until then, live identity
delegation and activation remain BLOCKED.

## TEST preflight evidence carried forward

Approved TEST project `uzhkzhmncxjplrdtdzgd` differs from protected production
`vzkbcgfywyhtvprxpwfb`; the existing transport requires the exact TEST URL and
explicit target. Historical TEST Auth/DB evidence is not current ID2 validation.
The ten-record [history archive](../validation/test-db/README.md) is inspection
evidence only, not a migration deployment workdir; root migrations have a different
lineage. Neither may be replayed to TEST. No remote SQL, project/user query or
database connection occurred in this local implementation.

Fresh TEST catalog/history, exposed schemas, effective/default grants, DB engine,
function ownership, Auth fields and session controls remain UNVERIFIED. Existing
Google TEST accounts are not disposable synthetic fixtures. Genuine Auth tests
need explicitly approved owned identities, lawful processing and cleanup, plus
a legitimate TEST Founder session under the unchanged Founder mapping. Never
manufacture Founder proof using role edits or synthetic SQL/JWT claims.

## Local validation and all 55 original scenarios

Executed: `node --test tests/t23-moderator-delegation-policy.test.js` — **63/63
PASS**, 0 failed, skipped or cancelled. This is a new unit suite, not 63 completed
ID1 integration scenarios. It covers valid scope/capabilities, denied roles and
self-appointment, status/clock/version/identity predicates, assigned independent
reviewers, capability downgrade, malformed inputs, immutability and no side effects.
Only this new suite was rerun after its in-scope hardening. Existing SSR and
T23-A/T23-B suites were not repeated; no runtime/dependency inputs changed there.

Classification: **L** = local fixture predicate exercised, not full scenario
acceptance. **N** = no corresponding unit behavior executed. All original 55
scenarios remain **NOT EXECUTED at their required integration acceptance layer**.

| Original IDs | Count | Local evidence | Outstanding required evidence |
| --- | --- | --- | --- |
| I01–I09, I11–I13 | 12 | L: identity/session-shaped fields, mismatch, confirmation, expiry, revalidation/generation and fail-closed errors | Actual Google/Auth/JWT/session lookup, deletion, logout, durable email invalidation and failures |
| I10, I14 | 2 | N | Approved pending-email-change policy and configured real session freshness/timebox |
| D01–D08, D12 | 9 | L: approval denial, no self-appointment/admin capability, valid scope/time/status/version constraints | Founder appointment/revocation RPCs, authoritative approval, duplicate active-record constraints, committed revocation and no resurrection |
| D09–D11 | 3 | N | Native transactions/locks, race ordering, audit failure, atomic rollback and replay/idempotency |
| C01–C09 | 9 | L: assignment, exact scope, capabilities, independent UUID and no downgrade of known conflict | Trusted case/assignment lifecycle, independent human identity, data projection, context integrity and real endpoints |
| R01–R06 | 6 | N; SQL design inspected only | Actual private-schema exposure, RLS/grants/owners/EXECUTE, direct RPC, definer and ownership-transfer tests |
| W01–W04 | 4 | N | Real protected workspace/API, Founder denial, CSRF/method/body limits, SSR/Flight/noindex/no-store privacy |
| P01–P06 | 6 | N / deferred future platform gate | Platform ownership/native permissions, authenticated events, dispatch revalidation and external termination acknowledgement |
| M01–M04 | 4 | N; rollback plan only | Approved current TEST readback/migration, Auth trigger safety, controlled rollback and retention/deletion tests |

Totals: 30 scenario IDs have partial local predicate evidence, 25 have no local
execution; **0/55 complete integration acceptance scenarios are claimed PASS**.
I02 tests an expired session fixture, not JWT verification; D01 tests missing
approval denial, not actual appointment; D08/D12 do not prove revocation against
a shared database; C09 does not prove the real lifecycle. Unit fixture flags,
SQLite or static SQL cannot substitute for those layers.

## Revocation, rollback and Founder gates

The module remembers no history, cannot know whether a snapshot is current, cannot
atomically serialize with revocation, and cannot prevent a caller manufacturing
a different fixture. Versions/flags compare only supplied values. Future trusted
database transactions must validate current assignment/grant/identity and lock in
a common order with revocation, append audit atomically and reconcile unknown
outcomes. Internal revocation does not remove native platform administrator rights.

No rollback is executed. Future rollback requires separate approval: disable only
new community surfaces/dispatch, revoke new facade grants, suspend delegations
with version/audit, reconcile any external work, restore only reviewed new objects,
preserve privacy-controlled audit evidence and verify no residual access. Never
reset shared schemas, alter USER/FOUNDER, replay historical migrations, overwrite
other worktrees or fall back to a service credential.

Remaining Founder decisions: verified appointments and conflict-reviewed scopes;
capability subsets, expiry/renewal and assurance requirements; email lifecycle and
identity-generation design; privacy notice/processing/retention/deletion and audit;
staffing/report/appeal routes; emergency custodian and platform termination;
exact TEST migration/grants/ownership/rollback approval; separate platform activation.
No numeric durations, SLAs, paid features or appointments are inferred.

Recommended ID2B next action: separately authorize a narrowly scoped read-only
inventory of the identified TEST project's current configuration/catalog/history
without member payloads. Reconcile against retained evidence, verify Auth/session
and invalidation feasibility, approve controlled test identities and review the
exact additive migration/rollback before any SQL execution. ID2A readiness does
not authorize ID2B, migration, workspace, T23-C or Group 05 implementation.

Official Supabase references checked through documentation search on 1 November
2026: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[API security](https://supabase.com/docs/guides/api/securing-your-api),
[sessions](https://supabase.com/docs/guides/auth/sessions). They support the trust
boundary and separate grants/RLS/EXECUTE review; no current live-project settings
or provider readiness are inferred from them.
