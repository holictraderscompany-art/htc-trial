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
