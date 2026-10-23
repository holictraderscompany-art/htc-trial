# Authorized HTC Cloudflare TEST deployment continuation

Founder authorization now includes TEST CI configuration, task-scoped commits,
normal pushes and the isolated Worker deployment. Earlier preparation reports
remain immutable historical evidence; their previous approval gates do not
cancel this later authorization. Production and paid-service activation remain
outside scope.

## Verified source and target

- Migration baseline: `3967a520a330577d8b1f5931361839dfeb28a46c`.
- Branch: `codex/cloudflare-workers-preparation`.
- Preserved Group 03: `4e8e07b18c1040722169223196add2112751cfeb`.
- Protected main: `6df86a0e630f38b933d5e269c54ef20906d6bcf5`.
- Cloudflare account: `2e93ece77ccb74920f7b995f6d48996b`.
- Worker: `htc-trial-workers-test`.
- Proposed HTTPS URL: `https://htc-trial-workers-test.holictraderscompany.workers.dev`.
  This is a derived target, **not evidence of a deployed service**.
- Supabase TEST: `uzhkzhmncxjplrdtdzgd` only.

Official authenticated Cloudflare MCP GET requests confirmed the account, empty
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

## Future deployment gate

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
The cloud commands, **not executed by this preflight**, are:

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
and API keys are not evidence of actual Google login on the future Worker host.

## Exact-SHA cloud packaging and deployment gate

`cloudflare-test-deploy.yml` accepts `[HTC-TEST-PACKAGE]` or
`[HTC-TEST-DEPLOY]` only on the migration branch and first run attempt. The
environment variable `HTC_TEST_APPROVED_WORKFLOW_SHA` must match the checkout.
Package mode requires `HTC_TEST_DEPLOYMENT_ENABLED=false` and cannot schedule
the upload step. Deploy mode additionally requires both enablement and
`HTC_TEST_REDIRECT_ALLOWLIST_VERIFIED=true`. Those variables are evaluated inside
steps after the protected environment is available.

The controller verifies the sealed source and lockfile, exact account and
subdomain, absence of an existing Worker, TEST key and Google Provider. It builds
on GitHub-hosted Linux with all live credentials removed from subprocess
environments. An actual deployment writes the runtime key only to a 0600 file
under runner temporary storage, removes it on exit, and records its one-shot
submission before invoking OpenNext. A failed/ambiguous result never causes a
deployment retry. Sixteen HTTPS/anonymous security probes follow a successful
upload; genuine Google/Founder/User checks stay explicitly pending.

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
file are absent. Current callback allowlisting remains **NOT VERIFIED**.

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

Deployment stays disabled until that configuration gate is verified. A later
normal-browser login by the account owner is still required to prove real
Google OAuth on the new HTTPS hostname; automated Google login is not retried.

Founder subsequently confirmed that the exact requested TEST callback entry
was saved. This satisfies the configuration gate using direct owner evidence;
it is not represented as a Management API verification or an actual login.
The next exact-SHA workflow may therefore run its cloud guard tests, build and
one TEST deployment under the existing authorization. Genuine new-host Google
and Founder/User validation remains pending after deployment.

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
pass. The reproduction uses only public TEST Auth health GETs and no credential
or fixture. The generated configuration changes main to the approved custom
entrypoint; all generated default/named exports remain preserved.

A submitted repair is never retried automatically. Passed same-job HTTP probes
are reused by the public database/UI probe. Real normal-browser Google OAuth
and authenticated Founder/USER checks remain separate final gates.
