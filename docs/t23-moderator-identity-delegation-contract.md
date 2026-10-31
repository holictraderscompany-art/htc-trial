# T23-B-ID1 — Moderator identity and community delegation contract

Status: architecture for Founder review, 1 November 2026. Implementation NOT
AUTHORIZED. The personal-email identity direction is approved; appointments,
capabilities, schema, RLS, routes, accounts and activation below are proposals.
Baseline: `98cbdc8b7bc53d3bd89b0bb1fe3aa350c26fa61a`, repository
`holictraderscompany-art/htc-trial`, branch `codex/group04-t18`, existing Group 04
worktree. Local/remote HEAD match, tracking 0/0, clean before this documentation.

## 1. Existing contracts and implementation findings

| Read-only source | Reused guarantee / limitation |
| --- | --- |
| `docs/auth-role-foundation.md`, `supabase/migrations/20261005_auth_role_foundation.sql` | T03 core enum is exactly `USER`, `FOUNDER`; profile UUID references `auth.users.id`; database synchronization owns Founder role; clients can update only allowed profile fields |
| `validation/test-db/supabase/migrations/20261012061832_htc_group3_core_auth_content_draft.sql` | Consolidated Group 03 migration carries the same auth bodies, RLS, grants and protected content functions; do not replay legacy migrations against it |
| Other `validation/test-db/supabase/migrations/` files | Existing Founder content/asset RPCs explicitly check database Founder authority and restrict grants; not reusable as moderator endpoints |
| `src/server/api-foundation.js` | Server validates bearer with `/auth/v1/user`, rejects anonymous identity, calls database `is_founder()` for Founder boundary; only `authenticated` and `founder` protected boundaries exist |
| `src/server/trial-session.js`, `session-token.js` | Existing Google PKCE, bounded HttpOnly SameSite cookie, expiring access token, no persisted refresh token, local signout; reuse without another provider |
| `src/server/founder-access.js`, `founder-content.js` | Founder cookie adapters retain server authorization, no-store and exact-Origin protections; moderator must not pass through them |
| T23-A operations/platform documents; T23-B workflow/module | Proposed governance, advisory AI and independent human review; frozen synthetic tokens are not authentication, verified identities or live delegation |

These observations concern repository source, not a fresh audit of live Supabase
settings or database state. No project/user listing, SQL or account data was read.
Existing `authorize(..., 'authenticated')` does not establish confirmed moderator
email, current delegation, strict session revocation, assignment or independence.
ID1 adds a design for a future separate community guard, not changes to that helper.

## 2. Locked identity and authorization invariants

1. Preserve only `USER` and `FOUNDER` in `public.user_role`. Every moderator
   remains `USER`. Never add `MODERATOR`, change existing Founder identity rules,
   reuse Founder credentials, or encode community powers in client metadata.
2. Authentication uses existing HTC Supabase Auth and Google OAuth. A verified
   personal email proves control of an account, not employment, appointment,
   community scope or independence. Do not enable email/password, OTP, SSO or a
   new provider as a side effect of this contract.
3. Derive the actor UUID from a server-validated access token and current Auth
   user, matching database `auth.uid()`. Never accept actor/approver UUID, email,
   role, appointment status or approval booleans from the action body as authority.
4. Require current non-anonymous user, valid session, authoritative confirmed
   email, profile core role `USER`, active delegation, exact scope/capability and
   case assignment. A valid JWT, visible navigation or matching email alone fails.
5. Founder-only appointment/revocation uses the unchanged database Founder check.
   The requester cannot appoint, expand, approve or restore their own delegation.
   Client `user_metadata`, display names, screenshots and synthetic tokens grant
   no authority. Even server-managed JWT metadata is not the live grant ledger.

## 3. Verified identity lifecycle

Future guard order: reuse existing token validation -> current Auth user ->
current verified session -> database identity/profile -> delegation -> case scope
and independence -> atomic operation. No optimistic UI result authorizes access.

| Condition | Required behavior before any moderator operation |
| --- | --- |
| Unknown, anonymous, expired, wrong-project or malformed token | Deny; no account enumeration, role fallback or report data |
| Missing profile, Auth UUID mismatch or missing/unconfirmed email | Deny; never infer confirmation from user-editable `email_verified` metadata |
| Confirmed identity | Require authoritative `auth.users.email_confirmed_at` and non-empty current email; this is separate from phone confirmation and generic metadata |
| Email changed or verification removed | Suspend community delegation for identity revalidation; require confirmed new email and explicit Founder reapproval; changing back must not silently reactivate |
| User deleted | Deny even with an unexpired JWT; remove active eligibility through the Auth UUID relationship; a new account with the same email does not inherit grants |
| Signout/revoked session | Reject sensitive operations when verified JWT `session_id` has no matching current `auth.sessions` row for this UUID; deleting browser cookies alone is not proof of revocation |
| Auth/database unavailable or session status uncertain | Fail closed; no cached positive grant, offline token or service-role fallback |

For current request integrity, recheck identity/confirmation/binding inside the
database operation as well as at the server boundary. Match `session_id` only
from verified Auth context, never a request header/body override; validate expiry,
issuer/project and audience before trusting it. A session-row check detects
deleted sessions but does not itself guarantee all configured inactivity/timebox
limits are applied immediately. Those settings and any extra freshness/MFA rule
need explicit review; no paid session feature is assumed.

Proposed email-change implementation dependency: a separately reviewed additive
community-only Auth lifecycle invalidation trigger must suspend active grants
and increment their versions on effective email changes or verification loss.
It must not edit/reorder/replace existing T03 role triggers or mutate Auth user
fields. Test transactional rollback and signup/email-change failure modes first.
This persistent invalidation prevents change-away/change-back from restoring
access. Comparison with a current email snapshot alone is insufficient. If that
mechanism cannot be approved safely, email-change-sensitive activation is blocked;
do not substitute an unverified webhook or background polling guarantee.

## 4. Proposed minimum data model — no objects created

Use an unexposed schema, proposed name `community_private`. Confirm actual exposed
schemas/default grants in the intended TEST project before writing a migration.
Do not expose `auth` or this private schema, disable the existing Data API, or
restructure existing public tables. These are logical field contracts, not SQL.

**Delegation record:** one immutable identity/scope binding per grant version.

| Minimum field | Purpose / constraint |
| --- | --- |
| `id` | Opaque database-generated delegation UUID |
| `subject_user_id` | FK to `auth.users.id` primary key; never email as FK or client-submitted identity proof |
| `platform`, `community_scope_id` | Allowlisted WhatsApp/Telegram/Discord plus one verified internal destination reference; no wildcard or invitation URL |
| `capabilities` | Explicit unique allowlisted capabilities below; never arbitrary roles/SQL/function names |
| `status` | Proposed pending, active, suspended or revoked; revoked is terminal; expiry is additionally derived from database time |
| `valid_from`, `expires_at` | Required bounded authorization window for activation; no default duration; UNSET means pending/denied |
| `appointed_by`, `approved_at`, `approval_ref` | Database-derived Founder UUID/time and minimal trusted decision reference; requester differs from subject; no editable approval receipt |
| `verified_email_binding`, `identity_checked_at` | Restricted normalized confirmed email at appointment and check time; email is personal data, never public or sole authority |
| `version`, `created_at`, `updated_at` | Monotonic server-controlled authorization version, concurrency and audit ordering |
| `revoked_at`, `revoked_by`, `change_reason_code` | Controlled suspension/revocation reason and authorized actor; no free-text private report |

`subject_user_id` uses deletion cascade for active eligibility records. Store
historical delegation changes separately with restricted audit references, rather
than using cascading grants as the only audit trail. On deletion, audit actor
references must be nullable/pseudonymized under the approved retention/deletion
decision; never copy raw emails or message bodies into an append-only forever log.
The email binding is a justified minimal duplicate only if approved; protect and
delete it with delegation data, no case-by-case email copies. Case evidence,
reports, storage and a public moderator roster are not introduced by ID1.

**Audit record minimum:** event ID, delegation ID/version, event/reason code,
verified actor reference, subject reference, capability/scope delta, approved
decision reference and server time. Append transactionally with grant changes;
failure rolls back permission changes. No token, session cookie, credential,
message body, complete profile, phone number or raw platform payload. Audit
immutability applies to ordinary app writes, not overriding approved deletion.

**Separate future platform binding:** verified HTC UUID, provider stable account
ID, exact community/server/chat reference, verification status/method/reference,
verified time, revalidation state. Personal platform IDs are restricted data.
No access tokens in delegation rows; future credential custody is a separate
approval. No actual identifiers are collected in this documentation task.

## 5. Capability and separation-of-duties contract

Proposed internal allowlist: `case.read_assigned`, `case.review_assigned`,
`case.escalate_assigned`, `case.appeal_review_assigned`,
`case.correction_review_assigned`. All are **PROPOSED / FOUNDER APPROVAL REQUIRED**;
none currently exists. Capability lists never imply appoint/revoke rights,
Founder APIs, content release, finance, member exports or platform enforcement.
No delete/mute/ban/publish capability is granted by this initial proposal.

Each operation needs the relevant active grant for its exact platform AND
community, plus explicit case assignment. Reading one assigned case does not
allow listing all reports, reporter identities or evidence. Project only the
minimal authorized fields; signing an evidence URL needs the same current check.

Appeal and correction decisions require an independently assigned human UUID
different from the challenged decision-maker. Compare stable HTC UUIDs across
all platform aliases; changing a display name, token or platform account cannot
reset the conflict. Distinct UUIDs alone cannot prove two humans are independent;
Founder appointment and conflict declarations must address shared-account,
duplicate-account and personal-conflict risks without inventing identity-document
collection. If no eligible independent human is available, pause and escalate
for appointment; do not self-approve or relabel an appeal as an ordinary correction.
Record an appeal/correction request separately from authority to decide it.
AI remains advisory and cannot appoint, approve, override, resolve appeals or
elevate itself. T23-B remains an unchanged offline model, not this live guard.

## 6. Future database, RLS and transaction boundary

- **Tables:** enable RLS as defense in depth on private tables; explicitly revoke
  table/sequence privileges from `PUBLIC`, `anon`, `authenticated`. No direct
  browser CRUD, self-owned insert/update or blanket authenticated policy. Row
  ownership alone must never permit self-appointment or reassignment.
- **Transport:** retain the existing user bearer/publishable-key pattern through
  new narrowly scoped community RPCs in an already exposed schema. Do not expose
  the private schema. RPCs must independently authorize; bypassing Next.js and
  calling RPC directly cannot bypass authority. No database/session checks may
  exist solely in a route wrapper.
- **Definer review:** because callers have no direct private-table grants, a
  narrow privileged function is a proposed necessary bridge. Use a dedicated
  non-login least-privilege owner, fixed empty search path, fully qualified names,
  parameterized/static queries, no dynamic identifiers and no broad Auth reads
  returned to clients. Revoke default function EXECUTE from PUBLIC/anon before
  granting authenticated only the intended facade. Prefer invoker where direct
  privileges suffice; never add SECURITY DEFINER just to silence permission errors.
- **Trusted context:** facade derives `auth.uid()`, validated session, current Auth
  user and profile role. A subject UUID is accepted only as a Founder appointment
  target after independent identity verification; it never replaces the actor.
  Founder grant-management calls must check unchanged `public.is_founder()` in
  the database, no self-target, exact target USER and verified identity. Fail
  closed on unknown subject, unknown capability, inconsistent approval or drift.
- **Read isolation:** optional future own-grant summary is separately authorized
  and redacted, not direct table SELECT. Future case RLS/RPC checks assignment,
  current grant and scope for every object; return uniform non-enumerating denial
  for unrelated case IDs. Any views must be invoker-safe or inaccessible. Functions
  require explicit EXECUTE checks; table RLS alone does not secure RPCs.
- **Revocation:** check current database grant/version on EVERY read and mutation,
  never solely JWT/app_metadata/navigation/cache. Revoke/suspend plus version bump
  and audit commit atomically; do not wait for token expiry. Resume requires a new
  Founder approval/version, not a client status update. Revoked grants are not
  reused. Record identity change invalidation durably, including changes back.
- **Concurrency:** case mutation, current assignment, independence and grant check
  must run in one transaction with expected case/delegation versions and a defined
  lock order. Serialize authorization-dependent writes with revocation using the
  same grant-row lock; after revocation commits no new operation may authorize.
  A transaction committed before revocation may already have completed; do not
  promise retroactive erasure. Test interleavings and deadlock/rollback behavior.
- **External effects:** future adapters must revalidate at dispatch, stop queued
  work after revocation and reconcile uncertain outcomes. A database transaction
  cannot atomically undo an external action. No executor or queue is implemented.

The actual DB engine version, exposed schemas, grants, function ownership,
Auth/session field compatibility and hook feasibility are UNVERIFIED for the
future target until a separately approved read-only pre-migration check. No new
service-role credential, direct DB connection or unrestricted Auth Admin tool
should be introduced to solve this design. Existing privileged keys stay isolated.

## 7. Proposed workspace and API boundaries — not implemented

| Proposed surface | Boundary |
| --- | --- |
| `/community/moderation` | Server-authorized USER with active delegation; no-store, noindex; navigation is convenience only |
| `/api/community/moderation/*` | Narrow assigned-case operations; authenticate and authorize on every operation, strict method/schema/size checks |
| Proposed Founder-only delegation management API | Separate new management handler using unchanged Founder authority; not a moderator permission |
| Existing `/founder/*`, `/api/founder/*` | Unchanged; moderator USER remains denied regardless of community delegation |

Reuse the approved cookie parser and exact-Origin mutation protection for future
cookie adapters; no credentials in query parameters, HTML, Flight, errors, logs or
browser storage. A hidden link or an outer layout check cannot replace API/RPC
checks. No public roster, profile lookup by email or unrelated report search.
Unknown/deleted identity -> authentication denial; absent/expired/revoked scope ->
authorization denial; unavailable trusted dependencies -> controlled unavailable
response with no private payload; stale versions -> conflict without mutation.
Exact route names and denial envelopes require implementation review; no route
or status behavior of closed tasks is changed here. T21 indexing is not expanded.

## 8. Four independent platform identity gates

1. Website authentication proves the HTC Auth UUID/session only.
2. Platform ownership verification must later bind the UUID to the provider's
   stable account ID through an approved possession challenge/provider-authenticated
   event; screenshot, nickname, email match and phone string are insufficient.
3. Platform-native permissions must be verified for the exact destination.
4. Active HTC delegation and case responsibility must independently permit the
   requested internal action. Passing any one gate does not imply the others.

WhatsApp route/eligibility remains UNVERIFIED under the T23-A matrix. Telegram
chat rights and Discord guild/channel permissions are destination-specific and
not interchangeable. No platform OAuth scope, phone collection, bot registration
or transport is authorized. Internal revocation immediately blocks HTC operations;
it does NOT remove a person's native platform administrator rights. Founder must
own a separate human platform-permission removal/reconciliation procedure and
emergency access termination. Do not claim all external access terminated until
provider/human evidence confirms it. Missing confirmation blocks live readiness.

## 9. Approval register and dependency graph

All rows: **PROPOSED / FOUNDER APPROVAL REQUIRED**; architectural approval is not
approval of individual capabilities or their activation.

| Decision | Required before dependent implementation/activation |
| --- | --- |
| Appointment and scope | Named verified USER subjects, independent reviewers, exact communities, capability subset, conflict review, no self-approval |
| Validity and assurance | Grant expiry/renewal interval, acceptance and reauthentication/MFA requirements; no durations or paid features assumed |
| Email identity lifecycle | Minimal email binding, invalidation trigger feasibility, explicit reapproval process and regression approval |
| Private data and audit | Processing basis/notice, recipients, minimal fields, retention/deletion/backup exceptions; no numeric defaults |
| Emergency authority | Founder custodian, approved termination route, compromised-session response, platform-rights removal and restart approval |
| Operations | Staffed report/appeal contacts and coverage; stop if unavailable, no invented SLA |
| Implementation | Target TEST environment, migration owner, function owner/grants, API/RLS design, controlled rollback and test approval |
| Platform activation | Ownership, eligibility, permissions, account linking, provider terms and separate live activation authorization |

Dependency graph:

`ID1 contract + Founder decisions -> separate identity/delegation implementation
approval -> isolated TEST schema/guard/workspace verification -> independent
security review -> migration/activation gates`.

`Verified HTC authorization + platform ownership/permissions + privacy/operations
readiness -> separately approved platform adapter work -> separate activation`.

`Those contracts -> T26 Automation Foundation / T27 Content & Operational
Automation / T28 Observability / T29 Security Hardening under Group 05`.

T23-C, T24 and Group 05 implementation are not started. No automation task can
create authority missing from this contract or replace Founder appointment.

## 10. Controlled migration, rollback and acceptance

Future approval sequence: inventory intended TEST state read-only -> review exact
additive migration, grants and helper ownership -> isolated synthetic application
and direct-DB/API tests -> Founder review -> separately approved migration and
deployment. No migration in ID1 and no assurance that source migrations equal
current production state. Preserve original role enum, role-sync bodies, profile
RLS, Founder API behavior and public RELEASED-only contracts byte-for-byte.

Install table controls/grants before exposing a callable function; begin all
delegations pending, no seed appointments, real emails or activated endpoints.
Validate invalidation-trigger failure cannot damage existing signup/role sync.
Require synthetic tests from the [authorization test plan](t23-moderator-authorization-test-plan.md).

Rollback needs separate approval. First disable new community entry/operations,
revoke new function EXECUTE grants and suspend new delegations. Stop/reconcile
future queued work and native permissions separately. Restore only the new
community functions/triggers/config through reviewed migrations; never reset the
database, cascade-drop shared schemas, restore an old role enum, overwrite other
worktrees or use service-role fallback. Preserve audit evidence under approved
privacy/deletion rules; any destructive data removal requires its own review.
Revalidate existing Auth/Founder/public boundaries and no residual callable new
RPC, permissive grants, cached pages or active native permissions. Rollback must
not reactivate revoked privileges or claim external termination without evidence.

## 11. Official evidence reviewed

Reviewed 1 November 2026 via official Supabase documentation, not live project
inspection. These support the design; none establishes HTC deployment readiness.

- [Auth getUser](https://supabase.com/docs/reference/javascript/auth-getuser): server Auth lookup provides authenticated user data; HTC currently uses REST `/auth/v1/user`, no SDK dependency is proposed.
- [Users](https://supabase.com/docs/guides/auth/users) and [Google sign-in](https://supabase.com/docs/guides/auth/social-sign-in/auth-google): user identity/verification and existing provider contract.
- [User management](https://supabase.com/docs/guides/auth/managing-user-data): UUID linkage, Auth-schema privacy and deletion does not immediately expire JWTs.
- [Sessions](https://supabase.com/docs/guides/auth/sessions): signed session identifier, logout/session existence caveat, delayed session-limit cleanup and paid-tier limitations.
- [Row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security): row predicates, editable metadata, stale JWT metadata, service-key bypass and view/definer cautions.
- [Securing the API](https://supabase.com/docs/guides/api/securing-your-api): grants and RLS are distinct; defaults/exposure must be inspected; function EXECUTE is separate.
- [Changelog](https://supabase.com/changelog.md), including [TLS notice](https://supabase.com/changelog/cbc-tls-ciphers-deprecated): future client/runtime compatibility check; no TLS/settings change made. Do not weaken transport requirements to accommodate an obsolete client.

ID1 validation is source/document consistency and whitespace/scope review only.
No executable authorization, RLS, session, migration or provider test is claimed
PASS. Existing T23-B 58/58 evidence is preserved, not evidence for this future
authorization system. No existing tests/builds are rerun.
