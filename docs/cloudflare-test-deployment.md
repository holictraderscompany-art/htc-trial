# Authorized HTC Cloudflare TEST deployment continuation

Founder authorization now includes TEST CI configuration, task-scoped commits,
normal pushes and the isolated Worker deployment. Earlier preparation reports
remain immutable historical evidence; their previous approval gates do not
cancel this later authorization. Production and paid-service activation remain
outside scope.

## Current verified checkpoint — 24 October 2026 JST

TEST is deployed at the HTTPS URL below. Hosted run
[39900017186](https://github.com/holictraderscompany-art/htc-trial/actions/runs/39900017186)
completed successfully at `946c4e7ac17ff9fef2c82a69995c58f17b93a0e1`, version
`f2897ae4-6133-4614-aaa8-257e3f5c6216`. Its 9 controller guards, 14 adapter
tests, native workerd proof, frozen build, 17 HTTPS checks and 8 public
desktop/mobile views passed. The earlier failed runs below remain failed.

The owner completed genuine Google FOUNDER login in normal Chrome and reported
`/founder/operations` loaded a Supabase database snapshot with all six counts
zero. Sanitized TEST gateway logs corroborate the callback code exchange
(HTTP 200 at `2026-10-23T22:00:03.092Z`), successful user verification and
`is_founder` RPC requests (HTTP 200 at 22:03:16, 22:03:18 and 22:03:24 UTC).
The FOUNDER role and visible dashboard result are owner browser evidence;
HTTP 200 RPC logs alone do not establish the returned role boolean.

The 24 October JST read-only audit found TEST `ACTIVE_HEALTHY`, Google Provider
enabled (settings HTTP 200), public Worker content HTTP 200 with zero items,
all six database counters zero, zero relations, zero Storage objects and ten
migration records. No fixture or migration was created for this audit.
The targeted malformed-session probe passed 3/3 at
`2026-10-23T22:10:15.737Z`: session HTTP 200 with `authenticated=false`,
summary API HTTP 401 `UNAUTHENTICATED` and operations route HTTP 307 to the
same-origin sign-in page, all with no-store. This uses only a synthetic
malformed cookie and does not prove natural token expiry on the new hostname.

The owner also completed real USER Google login and observed Access denied at
`/founder/operations`. This is a server-rendered denial, consistent with the
unchanged server `founderAccess` authorization check and Founder layout/page
boundaries, not merely hidden client controls. The owner then used official
Sign out and reported the sign-in page and home visible. Sanitized gateway
logs in the 22:06:16–22:19:06 UTC window include a code exchange HTTP 200 at
22:11:49.885, user verification HTTP 200 at 22:12:22.220, `is_founder` HTTP 200
at 22:12:22.422 and official logout HTTP 204 at 22:16:33.438 on 23 October.
Multiple logins/logouts occurred in that window: these status-only events do
not uniquely identify an account/session, prove a role boolean or reveal
the protected application's HTTP responses.

**USER server-rendered access denial and official logout/visual navigation are
PASS with those evidence limits. USER API HTTP 403 and post-logout browser
`authenticated=false`/API HTTP 401 remain pending. Overall deployment acceptance
is PARTIAL, not FULL PASS.** Historical Worker observability is unset, logpush
is disabled and a read-only event-count query returned zero events; no missing
application HTTP status is inferred from those logs. The earlier
Auth R2B natural-expiry evidence remains preserved; no passed build or LIVE test
was repeated during recovery. Sections below retain dated provisioning,
failure and correction history.

## Console-free TEST verification preparation

Chrome's Console paste warning remains enabled. Network inspection alone cannot
create the missing authenticated summary request: denied USER pages never mount
the dashboard. A small diagnostic document is therefore prepared at
`/__htc-test-access-check`, restricted in the migration wrapper to the exact
HTTPS TEST hostname and TEST Supabase bindings. It has no automatic requests.
Explicit buttons read the existing session and POST only the existing summary
read operation. A standard existing sign-out form is enabled only after genuine
USER API denial passes. The page displays only HTTP status, booleans, approved
error codes and no-store evidence; it never reads cookies or browser storage.

Hosted validation run
[40036957197](https://github.com/holictraderscompany-art/htc-trial/actions/runs/40036957197)
at `97850a7c4a7677b7a8bc6d28b89941a72608bf3d` passed **42/42** focused tests
(13 controller, 14 adapter and 15 diagnostic tests), frozen installation and
**4/4** synthetic browser cases (desktop/mobile and two failure cases).
The browser confirmed CSP execution, strict same-origin headers for summary
and native sign-out, preserved proof and fail-closed behavior. Synthetic
results are not LIVE USER proof. The deployment workflow for that commit was
skipped; this validation workflow has no deployment step or live credentials.
The single guarded TEST upload remains pending.
The new `accesscheck` deployment mode pins the existing two deployment IDs and
current version `f2897ae4-6133-4614-aaa8-257e3f5c6216`; it does not relax or replay
the previous one-shot repair mode. Application source, Auth, SQL and security
policies remain unchanged. No diagnostic page is claimed deployed yet.

At preparation, the official Cloudflare connector rejected refresh with
`invalid_client: Client not found`; the default login then showed client metadata
temporarily unavailable. Read-only inspection confirmed the configured official
`https://mcp.cloudflare.com/mcp` endpoint. Its public authorization-server
discovery returned 200 and advertised DCR and PKCE S256. The explicitly selected
native DCR flow registered a non-metadata client and completed successfully
(CLI exit 0 and owner confirmation), without changing the MCP endpoint or
requesting custom scope overrides.
No API token was created. This connection recovery is separate from HTC login.

At that checkpoint, the chat's MCP transport reported **MCP authentication
required; reconnect to continue** after successful native authorization. No
credential store was manually read or copied. The previous CI token expired
at `2026-10-23T14:31:40Z` and is not reused.

Subsequent permission reviews on 24 October JST completed through official DCR
and PKCE S256. A fresh native client initialized OAuth and four tools, but its
isolated read-only TEST deployment query returned HTTP 403 `INSUFFICIENT_SCOPE`.
After the owner completed a further Requested-scopes review, a new nonpersisted
native context stopped with `AUTHENTICATION_REQUIRED` before any Cloudflare HTTP
response. Its final catalog-only check timed out. These results do not prove the
latest effective scope set or a specific client/provider defect. Source review
ruled out a scopes-versus-config credential-key mismatch; a possible stale-client
write path was not established as the runtime cause. No global reload, existing
Desktop-thread resume, credential extraction or further OAuth retry is used.

Independent public checks found existing Worker health 200/no-store and the new
diagnostic path 404, consistent with no new upload. After connection recovery,
reuse the cloud PASS evidence when source is unchanged; do not replay deployment
or require Console pasting. No browser protection is disabled.

## Narrow CI credential recovery while MCP is blocked

The supported alternative is an account-owned CI token provisioned privately by
the owner in Cloudflare and saved directly into the existing GitHub environment
`cloudflare-test` as `CLOUDFLARE_TEST_ACCESSCHECK_API_TOKEN`. The token belongs only
to account `2e93ece77ccb74920f7b995f6d48996b` and has exactly **Workers Scripts
Write** and **Account Settings Read**, with an expiration within 12 hours. It
has no API-token-management, billing, DNS or other resource permissions. Do not
replace the expired historical secret, copy an MCP OAuth credential, send a token
through chat, or persist a plaintext token locally.

Cloudflare's documented account-token template can prefill the two permissions:
`workers_scripts` / `edit` and `account_settings` / `read`. The owner still checks
the account, permissions and expiry before creating it, then pastes its value
directly into GitHub's environment-secret field. Account API tokens are intended
for CI/CD; see [Cloudflare's account-token documentation](https://developers.cloudflare.com/fundamentals/api/get-started/account-owned-tokens/)
and [GitHub environment secrets](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets).

The access-check controller verifies account-token metadata and a remaining
validity greater than five minutes and no longer than 12 hours. A separate
read-only token-list authorization probe must return exactly HTTP 403; a 200,
400, 404 or ambiguous result stops execution before build/upload. This checks
that the CI credential cannot manage account tokens. Existing exact-SHA,
first-attempt, TEST target, two historical deployments, five bindings, private
build environment and one-upload safeguards remain mandatory. No fixture,
application authorization or database security changes are introduced.

Until the new credential exists and these LIVE preflight checks pass, no new
upload or real USER API proof is claimed. Controller changes receive a fresh
GitHub-hosted validation run; unchanged LIVE OAuth results remain preserved.

## CI credential guard validation — 24 October 2026 JST

Hosted run [40046284640](https://github.com/holictraderscompany-art/htc-trial/actions/runs/40046284640)
at `c6fa1486aa3a10f93a57d8582c1c81161794c560` passed **58/58** focused
controller/adapter/diagnostic tests, sealed 23-file and lockfile verification,
frozen installation with the existing dependency policy, and **4/4** synthetic
browser cases. The associated deployment workflow `40046284646` was skipped.
No live credentials, Supabase requests, Auth operations, fixture mutations,
OpenNext build or Worker upload occurred in this validation-only run.

A repository-scoped official Windows curl read, using normal certificate
verification, returned **5/5 HTTP 200** for repository administration and the
exact GitHub environment metadata. The environment allows only the migration
branch; all six expected variables match, and exact-SHA deployment approval
remains pinned to the previously deployed `946c4e7...`. The new
`CLOUDFLARE_TEST_ACCESSCHECK_API_TOKEN` secret is absent. Existing secret names
were present; no secret values were read. Earlier identity-endpoint timeouts
are preserved and are not classified as permission denial or proven IPv6 failure.

The narrow CI credential is the remaining owner provisioning step. Its private
creation and direct GitHub storage do not require another HTC Google login,
MCP credential extraction, Console pasting or changes to application security.
After provisioning, exact-SHA approval and normal branch push remain controlled;
fresh account-token, TEST Worker/version/binding preflight must pass before
the next cloud build and one authorized upload. Genuine USER API403 and
browser post-logout API401 remain pending until the helper is deployed.

## Verified source and target

- Migration baseline: `3967a520a330577d8b1f5931361839dfeb28a46c`.
- Branch: `codex/cloudflare-workers-preparation`.
- Preserved Group 03: `4e8e07b18c1040722169223196add2112751cfeb`.
- Protected main: `6df86a0e630f38b933d5e269c54ef20906d6bcf5`.
- Cloudflare account: `2e93ece77ccb74920f7b995f6d48996b`.
- Worker: `htc-trial-workers-test`.
- Verified deployed TEST URL: `https://htc-trial-workers-test.holictraderscompany.workers.dev`.
  Current deployment evidence is run `39900017186` above.
- Supabase TEST: `uzhkzhmncxjplrdtdzgd` only.

Initial authenticated Cloudflare MCP GET requests confirmed the account, then-empty
Worker inventory, workers.dev subdomain and account Workers settings. The
settings value `default_usage_model=standard` does not prove a billing plan.
The subscriptions endpoint rejects OAuth connections (403/code 10000); do not
repeat it or infer a Free/Paid subscription. No subscription was changed.

## Access bootstrap: no deployment

`cloudflare-test-preflight.yml` references GitHub Environment `cloudflare-test`.
GitHub creates an absent environment when a job first references it. This does
not create secrets or branch protection rules. The job accepts only the exact
repository/branch, first attempt and commit marker `[HTC-TEST-PREFLIGHT]`.

This workflow has no installation, build, external API mutation or deployment
step. It verifies all 23 sealed migration files using Git blob bytes, checks the
unchanged lockfile and disabled-routing base configuration, and reports only
boolean presence of these encrypted environment secret bindings:

- `CLOUDFLARE_TEST_API_TOKEN`: narrowly scoped Cloudflare TEST CI credential.
- `HTC_SUPABASE_TEST_PUBLISHABLE_KEY`: actual publishable key designated for the
  authorized TEST project. A key present in an unrelated local process is not
  accepted as provenance.

Missing bindings fail before any dependency installation. Presence does not
prove validity, correct scope, Supabase provenance or deployment readiness.
The OAuth authorization available to Codex is distinct from a GitHub runner's
credential binding; do not extract or transfer its OAuth token.

## Historical deployment preparation gate

Reuse cloud run [39867242940](https://github.com/holictraderscompany-art/htc-trial/actions/runs/39867242940)
for the unchanged application, dependencies and protected evidence. Runtime
HTTP/security 16/16, UI comparisons 6/6 and configuration 4/4 passed there. That
run retained no build artifact, so deployment packaging must run again on a
GitHub-hosted Linux runner; no heavy Windows work is permitted.

Use a complete generated TEST Wrangler configuration preserving the reviewed
base, adding the verified account, enabling only this Worker's workers.dev URL,
and requiring the encrypted `SUPABASE_PUBLISHABLE_KEY` binding. Do not use an
unconfigured `--env test`, add public routes, preview URLs, paid resources or
plaintext key variables. Keep the original `wrangler.jsonc` intact.

Pinned OpenNext 1.20.13 forwards unknown CLI options through its deploy wrapper
to the repository's pinned Wrangler 4.151.3 and sets `OPEN_NEXT_DEPLOY=true`.
The cloud commands used by the later hosted build/deployment are:

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm exec opennextjs-cloudflare build --config=wrangler.test.generated.jsonc
pnpm exec opennextjs-cloudflare deploy --config=wrangler.test.generated.jsonc --secrets-file="$runtime_secret_file"
```

The secret file must exist only in private runner temporary storage with mode
0600, never in Git/artifacts/logs, and be removed on exit. Never deploy the
synthetic runtime key used by the earlier loopback validation.

Before uploading: independently verify CI authority, key provenance, no paid
activation, exact TEST host/target and the TEST Supabase OAuth redirect allowlist.
After uploading: prove actual HTTPS, protected API denial, HttpOnly session,
real Google sign-in, Founder/User separation and responsive UI. Previous local
OAuth evidence does not establish Google login on a new hostname.

## Primary evidence and documentation

- [GitHub environment creation](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)
- [Cloudflare account API tokens](https://developers.cloudflare.com/fundamentals/api/get-started/account-owned-tokens/)
- [Worker secrets and deployment](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Pinned OpenNext deploy source](https://github.com/opennextjs/opennextjs-cloudflare/blob/adb4f68c7c957be53412fba0c1d8266e81b27d28/packages/cloudflare/src/cli/commands/deploy.ts)

No application source, SQL, Auth, Storage, Production resource or Group 03
evidence is changed by this access bootstrap. No background retry is scheduled.

## Authorized access provisioning — 23 October 2026 UTC

The bootstrap commit `001df12f705d0ece520f3aa73b711f223da9780c` was pushed
normally and verified remotely. [Run 39885303269](https://github.com/holictraderscompany-art/htc-trial/actions/runs/39885303269)
passed all four new guard tests and all 23 sealed-file checks, then deliberately
failed before installation because both environment-secret bindings were absent.
This is a successful fail-closed access check, not a successful deployment run.

The environment now permits only the exact migration branch. Four non-secret
variables bind its Cloudflare account, Worker name, Supabase TEST project and
deployment enable switch. Git Credential Manager's documented noninteractive
API verified the authorized GitHub identity and repository administration;
credential output remained in process memory. No browser session was transferred.

Both encrypted environment secrets were subsequently provisioned. The existing
TEST-designated T16 runner configuration was verified against the exact TEST Auth
gateway (HTTP 200); Google Provider was enabled. Its publishable key was supplied
privately through stdin to the official GitHub CLI. The key was never placed in
a command argument, repository, report or new plaintext file.

A separate account-owned Cloudflare CI token permits only Workers Scripts Write
and Account Settings Read in the verified account, with a 12-hour expiry. The
account initially had no Workers; this account-level creation permission is
needed to create the absent TEST Worker. No zone, DNS, billing, token-management
or user-management permission was granted to CI. The token expires at
`2026-10-23T14:31:40Z`; it must not be treated as a permanent CI credential.
That CI credential is now expired; provisioning verification below is historical,
not a claim of current deployment authority.

The token was RSA-OAEP SHA-256 encrypted inside the official Cloudflare MCP
sandbox and returned only as ciphertext. Its one-use private key stayed in local
process memory. After synthetic round-trip validation, the relay verified token
identity, scope metadata and account access, then used GitHub CLI stdin to store
the encrypted environment secret once. Private keys and plaintext token values
were never written to disk or returned to model output. The relay then exited.

Cloudflare initially rejected a millisecond-form expiry with HTTP 400. An exact
name lookup proved that no token had been created before correcting the date to
the documented seconds-only format. No ambiguous creation request was replayed.

The official portable GitHub CLI 2.103.0 control client was verified against the
upstream release asset SHA-256
`80c846a5b8432672ca6373b34ce9de998c9686aaa1885c845f2e1ee81f713726`.
No application dependency installation or build ran on Windows. Account, Auth
and API keys alone are not evidence of actual Google login on the Worker host.

## Exact-SHA cloud packaging and deployment gate

`cloudflare-test-deploy.yml` accepts `[HTC-TEST-PACKAGE]`,
`[HTC-TEST-DEPLOY]` or `[HTC-TEST-REDIRECT-FIX]` only on the migration branch
and first run attempt. The
environment variable `HTC_TEST_APPROVED_WORKFLOW_SHA` must match the checkout.
Package mode requires `HTC_TEST_DEPLOYMENT_ENABLED=false` and cannot schedule
the upload step. Deploy mode additionally requires both enablement and
`HTC_TEST_REDIRECT_ALLOWLIST_VERIFIED=true`. Those variables are evaluated inside
steps after the protected environment is available.

The controller verifies the sealed source and lockfile, exact account and
subdomain, absence of an existing Worker for initial deployment (or the exact
approved existing version for the corrective upload), TEST key and Google Provider. It builds
on GitHub-hosted Linux with all live credentials removed from subprocess
environments. An actual deployment writes the runtime key only to a 0600 file
under runner temporary storage, removes it on exit, and records its one-shot
submission before invoking OpenNext. A failed/ambiguous result never causes a
deployment retry. Sixteen HTTPS/anonymous security probes follow a successful
upload; genuine Google/Founder/User checks were separate pending gates at that
stage. The current checkpoint above records subsequent owner FOUNDER evidence.

No artifact storage is enabled: its shared account quota was not verified.
Package-only execution validates the new complete TEST configuration, but a
later upload requires fresh cloud packaging because no transferable build
artifact was retained. Existing application, SQLite, security and UI test proof
is reused where source and dependencies are unchanged.

The deployed TEST Auth health endpoint reports version **v2.197.0** (HTTP 200).
Its exact tagged source shows `/authorize` creates flow state and uses a UUID,
so merely following a Google redirect cannot prove the requested callback was
allowlisted. No authorize request was sent as part of the read-only inspection.
The available Supabase connector lacks Auth URL configuration endpoints; the
Supabase CLI, native management-token environment bindings and legacy CLI token
file were absent. At that initial inspection, callback allowlisting was
**NOT VERIFIED**; later owner confirmation is preserved below.

The sole required owner configuration action is in the authorized TEST project's
[Auth URL Configuration](https://supabase.com/dashboard/project/uzhkzhmncxjplrdtdzgd/auth/url-configuration):
preserve Site URL and existing entries, and save this narrowly scoped entry if
not already covered:

```text
https://htc-trial-workers-test.holictraderscompany.workers.dev/auth/callback\?attempt=????????????????????????????????
```

This is glob syntax: the escaped question mark is literal and the remaining 32
question marks match the nonce length. HTC independently verifies its 32-hex
nonce and HttpOnly flow cookie. The Google provider redirect URI remains the
existing `https://uzhkzhmncxjplrdtdzgd.supabase.co/auth/v1/callback`; changing
Google Cloud configuration is not established as necessary.

Deployment stayed disabled until that configuration gate was verified. A later
normal-browser login by the account owner was still required at that stage to prove real
Google OAuth on the new HTTPS hostname; automated Google login is not retried.

Founder subsequently confirmed that the exact requested TEST callback entry
was saved. This satisfies the configuration gate using direct owner evidence;
it is not represented as a Management API verification or an actual login.
The next exact-SHA workflow may therefore run its cloud guard tests, build and
one TEST deployment under the existing authorization. Genuine new-host Google
and Founder/User validation was still pending at that checkpoint.

## Actual TEST deployment and targeted compatibility correction

Run [39894081617](https://github.com/holictraderscompany-art/htc-trial/actions/runs/39894081617)
at `8203ce62ce4a3859270cd3736d9c0b62cb02be51` passed seven controller tests,
read-only preflight, frozen installation and the OpenNext build. The upload
exited zero and created version `a101e9e0-d84f-4473-9867-1475126b0c9e` at the
exact TEST hostname. Its immediate health check returned 404, so the historical
workflow remains failed. An independent later health GET returned 200/no-store;
no upload was retried. Cloudflare confirmed one 100% deployment, exact TEST
bindings and disabled preview URLs.

Read-only cloud run
[39895394918](https://github.com/holictraderscompany-art/htc-trial/actions/runs/39895394918)
then passed all 16 HTTPS/security checks, but public discovery returned 500.
No UI result or real OAuth success is claimed. The owner subsequently reported
Google returning to `error=failed`. TEST read-only SQL and a private direct
gateway request proved the existing anonymous page RPC returns an empty page
with HTTP 200. Sanitized TEST logs showed no Worker page RPC or token exchange
reaching the gateway during these failures.

The [official Workers Request contract](https://developers.cloudflare.com/workers/runtime-apis/request/)
and [pinned workerd implementation](https://github.com/cloudflare/workerd/blob/7caf6dee5bfe9af1b7710ddf66222900007af080/src/workerd/api/http.c%2B%2B#L481)
confirm that `redirect: 'error'` throws before outbound I/O. Both HTC upstream
paths use that Fetch option. The correction is restricted to the Workers
entrypoint: opt in to a compatibility adapter before evaluating OpenNext,
translate only error mode to manual, and reject 301/302/303/307/308 without
following or exposing Location. No application, SQL, Auth, RLS, grants,
historical migration, package lock or original Wrangler configuration changes.

The dedicated `[HTC-TEST-REDIRECT-FIX]` cloud job requires the exact approved SHA,
existing sole active version above, original TEST bindings and routing, and
the original sealed 23-file manifest. Before the single corrective upload,
14 adapter tests, controller guards and a real local workerd reproduction must
pass. The reproduction uses only public TEST JWKS GETs and no credential
or fixture. The generated configuration changes main to the approved custom
entrypoint; all generated default/named exports remain preserved.

A submitted repair is never retried automatically. Passed same-job HTTP probes
are reused by the public database/UI probe. Real normal-browser Google OAuth
and authenticated Founder/USER checks remain separate final gates.

The first repair preparation run `39899047131` passed 9 controller and 14 adapter
tests, then stopped before build/upload because its keyless health probe failed.
Independent requests established that `/auth/v1/health` requires a key (401),
while `/auth/v1/.well-known/jwks.json` is public (200 with a key-set JSON shape).
The probe now uses that existing public endpoint and reports only booleans and
statuses, never public-key contents or credentials. Failed native proof remains
failed; no corrective upload was attempted by that failed preparation run.
Run `39900017186` subsequently passed the corrected proof and uploaded the
verified version recorded at the top of this report. Safe native-proof fields
are retained in the parent report even when the child exits unsuccessfully.
