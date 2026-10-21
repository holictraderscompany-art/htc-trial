# T16-R2 — LIVE validation checkpoint

Verdict: **PARTIAL**. No FULL LIVE PASS is claimed. Scope is T16 only; no T17.

## A. Baseline and worktree — PASS

Worktree: `C:/Users/ASUS/.codex/worktrees/htc-t16-r1/FOUNDER HTC GRUP ( M.DEVRY HANDOYO )`.
Branch: `codex/t16-r1-reconciliation`; HEAD remains
`510d94473d9ddd42f774472f6ebd2423764a66b1`.
All 19 R1 files are preserved. Six original worktrees and 112 original dirty
files retain their heads, branches, statuses and checksums. No files are staged.

## B. TEST preflight — PASS

Supabase MCP confirmed `uzhkzhmncxjplrdtdzgd`, HTC-Trial-Test-DB,
ACTIVE_HEALTHY, PostgreSQL 17.11. All ten migration identities and exact recorded
SQL bytes match the archived sources, independently hashed in PostgreSQL with
SHA-256. No migrations were replayed. The counts function body matches its source,
is STABLE SECURITY DEFINER, has an empty search_path and checks auth.uid/is_founder.
Anonymous EXECUTE is false; authenticated EXECUTE is true with the function guard.
Authenticated/anonymous cannot UPDATE the profile role column. Existing RLS,
table grants, policies and default ACLs were inspected without modification.
See db-before.json, preflight.json and history-sha256-acls.json.

## C. FOUNDER LIVE — PASS

Initial browser check was genuinely anonymous (401). Private manual TEST OAuth
then completed: token exchange 200, auth/user 200, authoritative is_founder=true,
session check 200. No credential was printed, copied between browsers or exported.
The actual Next dashboard returned 200 and actual operations summary API returned
200. Official Chrome DOM observation confirmed the snapshot and navigation.
The runner uses the existing production build and unchanged application handlers;
its outbound allowlist permits only TEST identity/profile/count reads and the
normal private PKCE exchange. It prohibits personal signout/revocation and blocks
all content, asset and Storage mutation transports.

## D. USER LIVE — PASS

The legitimate USER session is independently correlated with server requests
55–57: auth/user 200, is_founder=false, session 200; summary API 403 FORBIDDEN
with no-store; dashboard 200 renders the approved Access denied state, as manually
observed in Chrome. Neither rejected request invokes the counts RPC. No aggregate
data is exposed. See user-live.json. These are current T16 LIVE results, not reused
synthetic or prior T15 authorization results.

## E. Anonymous LIVE — PASS

Requests without cookies: summary API 401 UNAUTHENTICATED with no-store;
dashboard 307 to /sign-in; no count/source/timestamp exposure. See anonymous.json.

## F. Independent SQL / API / UI comparison — PASS for current empty dataset

| Indicator | PostgreSQL | API | Chrome UI |
| --- | ---: | ---: | ---: |
| Content DRAFT | 0 | 0 | 0 |
| Content RELEASED | 0 | 0 | 0 |
| Content WITHDRAWN | 0 | 0 | 0 |
| Asset PENDING | 0 | 0 | 0 |
| Asset READY | 0 | 0 | 0 |
| Asset DELETING | 0 | 0 | 0 |

SQL inspected the tables independently of the aggregation RPC. Content, asset,
relation and Storage totals were also zero. API source SUPABASE_DATABASE and
captured_at `2026-10-19T03:10:38.551091+00:00` matched the displayed timestamp.
UI explicitly says no service health claim. Reload returned a new timestamp.
Nonempty LIVE filtering/aggregation is NOT VERIFIED: no dataset exists and this
phase prohibits creation of LIVE fixtures. Local nonempty coverage remains local.

## G. Expiry and revocation LIVE — NOT VERIFIED

No safe disposable session for these tests was available. No personal session
was revoked and no cookie/token, TTL or Auth setting was manipulated. Existing
synthetic expiry/denial checks remain LOCAL evidence. Foundation performs live
identity verification and persists no refresh token; this is not by itself
runtime proof of revocation. Supabase session documentation also distinguishes
JWT expiry from immediate session revocation, so no stronger guarantee is assumed.

## H. Resilience — PASS / NOT VERIFIED as distinguished

With genuine Founder authorization, normal reload showed Working and a disabled
reload button, then loaded a fresh snapshot. A tab-scoped official CDP Fetch
interception replaced exactly one successful localhost summary response with
500. The UI retained the old timestamp/counts with explicit stale/unavailable
warning and safe error, then recovered after the interception was cleared.
This is controlled response fault injection, not an actual Supabase outage.

The original timeout attempt lost its browser binding and remains unverified
historically. Founder manually closed that tab; official inventory confirmed its
absence. A distinct resumed test in a new task tab observed a 20-second response
stall, net::ERR_ABORTED, enabled Reload and explicit stale/unavailable UI. Raw
interception was cleared in finally. Normal reload recovered with a fresh timestamp.
See timeout-live.json. The new task tab was closed through the official API and
independently absent from the tab inventory; legitimate session tabs remain open.

A separate opt-in local harness hook exercised the unchanged Foundation upstream
deadline after genuine Supabase Founder authorization. The counts call was not
forwarded; its AbortSignal fired after 10,008 ms. The actual application API returned
500/no-store with INTERNAL_ERROR and a generic safe message. The browser observed
12,106 ms overall including live authentication. The next normal request returned
200 and a genuine SUPABASE_DATABASE snapshot. See upstream-timeout.json. The
anonymous fault-control request still returned 401 without entering the hook.

These are controlled resilience faults with live TEST authorization, not actual
Supabase outages. No TTL, Auth, database or application source was changed. The
runner was restored without --summary-timeout-probe; its final readiness event
records summary_timeout_probe_enabled=false and its probe button is disabled.

## I. Regression and build — PASS

Fresh R2 executions: T16-focused 7/7; application 223/223; T13 SQLite 12/12;
T14 SQLite 3/3; production build PASS. T15 B1 validator PASS for all 23 historical
snapshots in its preserved checkout. Existing R1 browser 36/36 LOCAL PASS is
retained, not described as a fresh or LIVE run. No standalone lint/typecheck script
is configured; Next build's TypeScript phase completed. See checks.json and logs.

## J. Security — PASS for inspected boundaries, remaining gates unverified

No authorization, SQL, RLS, grants, session implementation, dependencies, lockfile
or application source was changed in R2. No service-role credentials are used by
the runner or exposed in browser bundles. Log projections contain only paths,
statuses, role booleans and aggregate counts; query strings, credentials and
private identifiers are excluded. Pattern scans are supporting evidence and are
not a universal secret-detection guarantee. See integrity.json.

## K. Integrity and cleanup — PASS

Independent BEGIN READ ONLY snapshots before and after match totals, history,
table grants/RLS, policies, and counts function privileges/body. All application
and Storage totals remain zero; no LIVE fixtures were created. No Storage API
upload/delete occurred. OAuth login naturally establishes a TEST Auth session;
no direct database mutation was executed. Both task timeout tabs are closed and
interception is disposed; the server-side fault hook is disabled. Original login
and session-check tabs remain preserved. The final resumed read-only snapshot also
matches all original totals, history, table security, policies and function checks.
Loopback TEST runner remains available without automatic jobs or background monitoring.

## L. Files changed

R2 adds only test harness/evidence under validation/t16-r2. All existing R1 source,
configuration and evidence bytes remain unchanged. Logs are ignored outputs and
not commit candidates. server-http.json is a live append-only projection;
server-http-snapshot.json is the captured checkpoint. No commit, push, merge,
deployment or modification of main occurred.

## M–N. Remaining blockers and verdict

PARTIAL: safe expiry/revocation runtime tests remain NOT VERIFIED. This scope
does not permit revoking a personal session, manipulating credentials/TTL, or
creating synthetic LIVE database fixtures. An explicitly disposable session and
actual post-expiry/revocation denial are still needed. No time elapsed, static
inspection, or synthetic response is treated as live expiry/revocation proof.
Nonempty LIVE comparison also has no authorized dataset. No mandatory gate is
replaced by SQLite evidence. Founder, USER, anonymous, empty counts, controlled
failure/timeouts/recovery, regression, build and cleanup are now PASS.
Continue only these missing checks from this checkpoint; do not restart R1,
replay migrations, rerun publishing mutations, access production or start T17.
