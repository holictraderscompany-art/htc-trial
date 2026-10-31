# T23-B-ID1 — Moderator authorization test plan

Status: proposed tests, NOT EXECUTED. All implementation, schema, appointments
and activation require separate Founder authorization. Baseline:
`98cbdc8b7bc53d3bd89b0bb1fe3aa350c26fa61a` / `codex/group04-t18`.
Read with the [identity/delegation contract](t23-moderator-identity-delegation-contract.md).
T18–T23-A remain unchanged; T23-B is offline and its 58/58 results are not live
authentication/authorization evidence. No test in this plan is reported PASS.

## 1. Prerequisites and fixtures

Before execution, obtain approval for an isolated TEST project/source snapshot,
exact additive migrations, data processing and synthetic Auth users. Use existing
Supabase Auth/Google OAuth only; mock external provider exchanges in unit tests,
and use approved test identities for separately authorized integration tests.
No production credentials, real member reports, billing or public deployment.
No second provider, real moderator appointment or platform connection in ID1.

Fixture labels only (not created): Founder F, USER A/B/C, unknown/deleted U,
two synthetic community destinations per approved platform. All moderator grants
belong to USER accounts. A/B are independent humans by fixture declaration; test
shared/duplicate identity conflicts too. Synthetic case X belongs to A's assigned
scope; Y belongs to another user/community. Inject a controllable test clock and
explicit grant/session versions only in the test harness, never live API inputs.
Founder authorization must be real database role checking in integration tests,
not a test role string accepted by production code.

Capture exact commit/tree or working-snapshot digest, migration hashes, toolchain,
target TEST identity, Auth settings, DB version, exposed schemas, grants and
function owners. Save sanitized assertion outcomes/IDs, no emails, JWTs, raw HTML,
cookies, signed URLs, platform tokens or personal payloads. Evidence retention
and cleanup require approval. Any unavailable prerequisite is BLOCKED, not PASS.

## 2. Acceptance matrix — future executable tests

Every row is PLANNED / NOT RUN. Allow means only the specified internal operation,
never native platform enforcement. All denied writes must leave case, grant,
version and audit state unchanged except a separately approved minimal denial
event. No partial permission changes if an audit write fails.

| ID | Scenario | Expected result / evidence |
| --- | --- | --- |
| I01 | Valid Google-authenticated USER, confirmed current email, matching UUID/session, active exact delegation and assigned case | Only granted operation allowed; minimal projected fields; core role remains USER |
| I02 | Missing, forged, expired, wrong-issuer/audience/project token or malformed cookie | Authentication denial; no private data; direct RPC also denies invalid context |
| I03 | Anonymous Auth user carrying authenticated DB role | Denied; authenticated role alone never authorizes |
| I04 | Verified email string in body/header with no valid HTC session | Denied; no lookup/enumeration or email-only authorization |
| I05 | UUID differs between server identity and DB actor context | Denied; no actor substitution |
| I06 | Missing/unconfirmed email, phone-only confirmation, metadata email_verified=true | Denied; authoritative email confirmation required |
| I07 | Deleted Auth user with still-unexpired access JWT | Denied; no delegation inheritance after same-email re-registration |
| I08 | Completed email change or loss of verification | Delegation durably suspended/version increased; explicit reapproval required |
| I09 | Email changes away then back before next operation | Still suspended; no automatic resurrection based on matching snapshot |
| I10 | Pending email-change request not yet effective | Current verified identity rules remain explicit; no trust in requested email; execute separately approved policy |
| I11 | Missing profile, malformed Auth response, Auth/DB outage | Controlled denial/unavailable without data or cached-positive fallback |
| I12 | Local logout then replay old unexpired JWT | Sensitive operation denied when session row removed; no reliance on cleared cookie alone |
| I13 | Revoked/missing/wrong-user/malformed session_id | Denied even if JWT signature/expiry alone pass |
| I14 | Configured session timebox/inactivity threshold with row still present | Verify configured trusted freshness rule; row existence alone cannot mark acceptance; unavailable feature/config is BLOCKED |
| D01 | Founder F appoints verified USER A for one exact scope/capability/window | Pending then explicitly approved version; server derives approver/time; audit and grant atomic |
| D02 | USER A self-appoints or directly calls delegation RPC | Denied in server and DB; no self-owned table INSERT policy |
| D03 | Moderator adds capability, extends expiry, changes subject or restores revoked grant | Denied; no self-promotion; protected fields unchanged |
| D04 | Client sends role FOUNDER/MODERATOR, approvedBy, receipt, user_metadata or stale app_metadata | No authority gained; strict schema/current DB checks |
| D05 | Founder request targets self, unknown/unverified user, another Founder or wrong UUID | Denied; moderator subjects must be verified USER distinct from requester |
| D06 | Missing approved expiry, reversed time interval, unknown/wildcard capability/scope or duplicate active binding | Denied/pending, never silently defaulted to active; schema constraints verified |
| D07 | Pending, suspended, revoked, not-yet-valid or expired delegation | Denied using current database time, no JWT-refresh requirement |
| D08 | Founder revokes active grant while user session remains valid | Subsequent reads/mutations denied immediately after commit; version/audit consistent |
| D09 | Concurrent grant update, revoke and case mutation | Controlled shared lock order; stale operations conflict; no authorization after revoke commits; no partial audit/grant state |
| D10 | Previously committed operation racing revoke | Record ordering honestly; do not claim retroactive cancellation of completed operation |
| D11 | Audit failure, transaction failure, retry or duplicated operation ID | Rollback atomically; no duplicate decision or privilege expansion |
| D12 | Revoked grant reactivation or stale grant/version replay | Denied; new approved grant/version required; old snapshot is not trusted |
| C01 | A reads/reviews assigned case X | Allowed only within exact capability/scope; reporter/private fields minimized |
| C02 | A lists other cases or guesses case/evidence/delegation IDs | Uniform non-enumerating denial; no counts, signed links or unrelated metadata |
| C03 | Same platform, different community; same community label, different provider | Denied; scope is not a display-name match |
| C04 | Review capability used for appeal/correction/export/ban/release | Denied; no implication of wider capability |
| C05 | Original decision-maker reviews own appeal or correction through another session/platform alias | Denied using stable HTC UUID and conflict checks; case unchanged |
| C06 | Independently assigned B with exact appeal/correction capability | Allowed non-enforcing decision; original decision retained; missing capability/assignment denies |
| C07 | Missing independent reviewer, shared account, declared personal conflict or humans unavailable | Pause/escalate; no AI/Founder-token fallback or new delegation inferred |
| C08 | AI/synthetic T23-B token or caller approval boolean used against protected operation | Denied; recommendations never become human authorization |
| C09 | Reopen/escalate/request-correction used to bypass active appeal independence | Denied; conflict history preserved across paths |
| R01 | anon/authenticated direct table, sequence or private-schema REST access | Denied; private schema unexposed, explicit grants/RLS inspected |
| R02 | USER direct RPC call bypassing Next.js | Same identity/session/grant/assignment checks; no wrapper-only protection |
| R03 | anon/PUBLIC EXECUTE of privileged functions or overloads | Denied; inspect effective grants and default privileges, no forgotten overload |
| R04 | Function search_path/object shadowing, dynamic identifier or arbitrary actor parameter | Rejected; fixed path/qualified objects, no caller-controlled SQL/context |
| R05 | Owner/service-key bypass, unsafe view or broad definer | No client possession or public exposure; review actual owners/grants; invoker-safe view or inaccessible |
| R06 | Assignment/subject changed during update, missing WITH CHECK where relevant | Denied by constraints/atomic authorization; no cross-user ownership transfer |
| W01 | Delegated USER manually requests /founder or existing Founder APIs | Existing denial preserved; no new navigation or role shortcut |
| W02 | Future workspace valid page followed by revoked API call | API/RPC denies; no cached/private SSR or Flight leak |
| W03 | Cookie request missing/wrong Origin, bad method/schema or excessive body | Controlled rejection, no mutation; preserve existing CSRF/session conventions |
| W04 | Private response/error/cache/HTML/Flight inspection | No credential, private email roster, unrelated report or signed evidence URL; no-store/noindex |
| P01 | HTC-authenticated A has no verified platform binding/native permission | External operation blocked; internal authentication is not platform ownership |
| P02 | Verified Telegram/Discord/WhatsApp account or admin badge but no HTC grant | HTC operation denied; platform permission is not Founder delegation |
| P03 | Spoofed nickname, email, phone string, screenshot or unauthenticated platform event | No binding; approved ownership-verification contract required |
| P04 | Scope revoked or ownership/native rights changed after initial check | Deny at future dispatch; cancel/reconcile queued work without blind replay |
| P05 | HTC grant revoked but human still native platform admin | Report external permission removal PENDING until independently confirmed; no false termination claim |
| P06 | Provider account deletion/link replacement, duplicate or shared identity | Suspend dependent use and reverify; no transfer by matching display name/email |
| M01 | Additive migration preflight sees unexpected schema/grants/version/role bodies | Stop before DDL; no automatic repair/replay of historical migrations |
| M02 | New email invalidation trigger fails or conflicts with role sync/signup | Transaction behavior verified; activation BLOCKED until safe; existing roles/signup protected |
| M03 | Controlled rollback after grants exposed | New surface disabled first, residual grants/functions/cache removed safely, no shared-schema deletion or role reset |
| M04 | Retention/deletion/user removal and audit handling | Approved minimization honored without orphaned active grants or indefinite personal-data copies |

## 3. Execution layers and limits

1. Pure guard tests with synthetic identity/session/grant fixtures prove logic
   only, not JWT validation or actual RLS. No production fixture injection.
2. Isolated TEST Auth + database tests prove real UUID/session binding, role
   preservation, effective grants/RLS/function checks, email invalidation,
   concurrency and rollback; run both allowed and denied direct API paths.
3. Future workspace/API tests prove SSR/Flight privacy, noindex/no-store, CSRF,
   assignment boundaries, auth failures and revocation. Expand predecessor tests
   only when approved implementation demonstrably affects those contracts.
4. Provider ownership, native permission and external termination tests remain
   a separately approved platform-adapter gate. Simulated provider tests cannot
   certify account ownership or native permissions. Group 05 delivery/automation
   tests belong to their mapped tasks, not ID1.

No fixed sanction duration, retention, grant expiry interval, staffing SLA or paid
session control is supplied by the harness. Missing Founder values block the
relevant activation tests. Revocation evidence must distinguish database commit,
session rejection, in-flight transaction ordering and external acknowledgement.
Never equate absence of logs, an empty CI list or UI denial with complete security.

## 4. Review exit gate

ID1 can be reviewed when the two documents match existing source and official
Supabase guidance, preserve the two core roles and list unresolved decisions.
This is documentation readiness only. Actual implementation cannot pass until
all applicable rows have reproducible evidence against the exact approved source,
TEST configuration and migrations; waived/blocked/not-run rows remain explicit.
Use the contract's Founder decision register and dependency graph for subsequent
authorization. No ID1 test run, migration, moderator appointment, external link,
data collection, account activation, commit or deployment has been performed.
