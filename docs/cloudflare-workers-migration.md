# Cloudflare Workers preparation — separate from closed Group 03

Date: 22 October 2026. Base: `4e8e07b18c1040722169223196add2112751cfeb`.
Branch: `codex/cloudflare-workers-preparation`.

This is a hosting preparation workstream, not Group 04 or a reopening of Group
03 acceptance. The approved 54-file Group 03 commit and historical manifests are
preserved. This document does not authorize a deployment, Git connection, custom
domain, database migration, Auth change or production access.

## Adapter decision

Cloudflare currently recommends **vinext** for new Workers Next.js projects.
Its current registry version, 1.3.0, replaces the build implementation with Vite
and requires React/React DOM 19.3.1 plus Vite/RSC plugins. It is a legitimate
candidate, not dismissed as experimental on the basis of an older announcement.

For this existing, validated Next.js application, **OpenNext Cloudflare** is
selected to preserve the Next compiler, existing `next build --webpack`, route
handlers, React Server Components and runtime contracts. This is an engineering
choice for minimal behavioral change, not a claim that Cloudflare defaults to
OpenNext. The official guide still documents manual OpenNext configuration.

Exact proposed pins: Next.js **16.4.1**, `@opennextjs/cloudflare` **1.20.13**,
Wrangler **4.151.3**. The adapter's actual registry peer range is
`>=15.5.28 <16 || >=16.4.1`; generic support prose does not establish compatibility
with HTC's previous Next.js 16.3.8. Do not force an incompatible peer installation
or select an older adapter merely to avoid the minimum version.

Next.js 16.4.1 also contains security corrections identified in the official
release/advisories. An empty baseline `pnpm audit` response is not proof those
advisories are absent. HTC does not currently declare `use cache`, image
optimization or Server Actions, but that observation is not an exploitability
guarantee and is not used to waive the version requirement.

## Compatibility inventory

| Existing feature | Preparation and required proof |
| --- | --- |
| Next 16 App Router, SSR/RSC, dynamic public/Founder pages | Retain framework/compiler; new Next and Workers builds must pass |
| Node route handlers | Keep `runtime=nodejs`; Workers `nodejs_compat`, dated 2026-10-22 |
| PKCE random/hash and content cursor Buffer | Existing `node:crypto` and `node:buffer`; test in actual workerd before claiming runtime PASS |
| Google OAuth, HttpOnly cookie and exact Origin | Preserve handlers; validate headers/redirects and anonymous denial locally; genuine new-host OAuth remains a separate TEST-only gate |
| Supabase PostgREST/RPC and Storage | Existing HTTPS fetch, no database driver or schema change; TEST selected explicitly |
| Signed direct upload | Browser still uploads directly to private Supabase Storage; no Worker binary proxy |
| No-store/private Founder responses | Preserve existing dynamic routes and server authorization; all requests go through Worker routing before assets |
| Middleware, next/image, next/font, ISR/use-cache | Not found in application imports/config; no new Images, R2, D1, KV or cache architecture introduced |
| SQLite | Local test adapter only; not imported into the Worker application |
| Public delivery | Metadata-only restrictions and T13/T15 lifecycle ownership remain unchanged |

Application dependencies were Next.js 16.3.8, React and React DOM 19.3.0, with
pnpm lockfile version 9. The framework version is updated only in this migration
branch. No application source rewrite or security-policy adjustment is proposed.

## Cloud commands and boundaries

Founder MASTER EXECUTION V2 supersedes local execution: Windows is control and
lightweight source transfer only. Dependency installation, tests, compilation and
runtime emulation must run on cloud hosts. Install scripts were initially
disabled; document any required official package build step before executing it.
The commands below are for a cloud executor, not this Windows laptop.

```powershell
pnpm test:workers:config
pnpm test
pnpm test:local:sqlite
pnpm test:t14:sqlite
pnpm build:workers
pnpm dry-run:workers
pnpm preview:workers
# In a second terminal, with the LOCAL synthetic-key fixture only:
node validation/cloudflare/probe-local-worker.mjs
```

`build:workers` invokes the existing Next build, then packages it. Preview binds
only `127.0.0.1:3105`; dry-run must not upload a Worker or version. There is no
automatic deployment script, CI workflow, postinstall deployment or Git link.
The Wrangler configuration disables workers.dev, preview URLs and routes. No
account ID, domain, credential or database binding is embedded.

For an authenticated preview, put the authorized TEST publishable key privately
in ignored `.dev.vars`, following `.dev.vars.example`. The example is not a real
key. Never copy production values. Missing keys must fail closed. No configured
private browser session may be exported or transferred to a test harness.

Before live OAuth on a future TEST hostname, the account owner must configure
only the TEST provider/Supabase redirect allowlist and verify HTTPS cookie and
Origin behavior there. Local unit/fixture checks cannot prove that integration.
No OAuth redirect setting is changed by these files.

## Required validation and rollback

New dependency/runtime changes require fresh regression and build evidence;
previous Group 03 PASS results alone do not establish Workers compatibility.
Record separately: configuration tests, 223-case application regression, local
SQLite tests, Worker packaging/dry-run size, actual local workerd HTTP denial and
no-store/redirect behavior. Genuine TEST OAuth and publishing/storage results
must never be substituted by synthetic workerd tests.

Do not mark MIGRATION READY FOR DEPLOYMENT while a required build, runtime,
authentication, account, security or bundle-size gate remains unverified.
OpenNext's Windows support is qualified by its maintainers; actual errors must
be recorded, and a Linux build is a supported alternative, not a reason to
silently install WSL/Docker or change runtime semantics.

Netlify configuration/site is retained. No DNS, domain, traffic or hosting
connection is changed. Recovery is to continue using the preserved Group 03
branch; the migration checkout can remain isolated for correction. Do not reset,
clean or discard another worktree. Commit these migration changes separately
only after their validation succeeds; never amend the Group 03 commit.

Group 03 push is a separate gate: the corrected approved SHA is the base above.
GitHub webhook and Netlify Git connection safety still require verifiable access;
do not push merely because Vercel's project Git link is null.

## Primary references consulted

- [Cloudflare Next.js/vinext](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)
- [Cloudflare manual OpenNext setup](https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/)
- [OpenNext support and Windows limitations](https://opennext.js.org/cloudflare)
- [OpenNext existing-app setup](https://opennext.js.org/cloudflare/get-started)
- [Next.js 16.4.1 release](https://github.com/vercel/next.js/releases/tag/v16.4.1)
- [Next.js cache advisory](https://github.com/vercel/next.js/security/advisories/GHSA-673q-mjm6-r5xr)
- [OpenNext registry metadata](https://registry.npmjs.org/@opennextjs%2fcloudflare/1.20.13)
- [vinext registry metadata](https://registry.npmjs.org/vinext/1.3.0)

Exact execution outcomes belong in `validation/cloudflare/results.json`. A list
of proposed commands above does not mean they have run or passed.

## Checkpoint: preparation is incomplete

The four configuration checks passed; the local Worker probe passed syntax
checking only. Dependency installation failed with a timeout while installing
Wrangler's `workerd@1.20261019.1`. One controlled recovery used cached packages,
one download connection, a longer fetch timeout and no automatic fetch retries.
It was interrupted when available physical memory fell to 62 MiB. No build or
runtime validation was started. The lockfile remains the baseline lockfile and
does **not** yet resolve the proposed package changes. Top-level packages are
not linked in this preparation checkout; do not run preview as if installation
had succeeded. Other worktrees and their dependencies were not changed.

Before resuming, provide adequate free memory and complete the pinned pnpm
installation with TLS verification intact. Then execute the validation commands
above sequentially. Do not commit this partially installed preparation or claim
Workers compatibility on the basis of the configuration tests.

Founder supplied fresh evidence that GitHub has no visible webhooks and Netlify
is not Git-linked; Vercel's earlier connector response showed no Git link.
The newly connected Cloudflare Git integration is a separate unresolved push
gate. Its production branch and preview/non-production branch build settings
must prove that `codex/t16-r1-reconciliation` will not trigger deployment or
version upload. Disabling routes in this local Wrangler file cannot prove the
settings of a separately connected Worker. No push has been attempted.

See [Cloudflare build branch controls](https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/).

## MASTER V2 cloud bootstrap

No callable Codex Cloud executor is exposed to this session. GitHub's repository
API confirms that `holictraderscompany-art/htc-trial` is public. Standard
`ubuntu-24.04` GitHub-hosted runners are used; no larger runner, paid subscription,
self-hosted Windows runner, cache or artifact-storage upload is enabled.

The branch-scoped workflow is `.github/workflows/cloudflare-validation.yml`.
It runs on pushes to `codex/cloudflare-workers-preparation`, not `main` or the
closed Group 03 branch. No `workflow_dispatch` default-branch assumption is made.
Actions are pinned to verified upstream commit SHAs, checkout does not persist
credentials, and the token has only `contents: read`. It accepts no production
secrets, Cloudflare credentials or real Supabase credentials. The only runtime
key is a clearly synthetic fixture. There is no deployment, version upload,
public preview, DNS or hosting-account configuration operation.

A bootstrap commit transfers the existing preparation and hosted test harness.
Its initial dependency resolution is explicitly non-frozen because the sealed
baseline lockfile does not describe the new pins. The same cloud job must prove
a frozen replay. Before finalization, recover the generated lockfile byte-for-byte
from the job's bounded base64 log chunks, verify the emitted SHA-256, and switch
the final workflow to frozen-only installation. A bootstrap push is not a claim
of migration acceptance.

`cloud-validate.mjs` refuses execution outside the exact GitHub-hosted Linux
repository/branch and reports observed OS, RAM, CPU, Node, pnpm, run ID and commit.
It invokes focused configuration/type checks, the application and SQLite
regressions, OpenNext build, Wrangler dry-run, and loopback workerd HTTP tests.
Playwright compares unchanged public/sign-in pages at desktop and phone widths
against the same Next build, including rendered screenshot hashes, navigation,
errors and overflow. It never automates Google login or creates a public preview.
These are migration regressions, not replacement evidence for LIVE Google Auth,
database or Storage gates already closed under Group 03.

Only lockfile bytes and sanitized structured results are emitted to job logs;
no environment dump, browser credential, screenshot identity or signed upload
capability is emitted. Worker/Next child servers are stopped by their own process
groups on job exit. There are no database fixtures or Storage mutations.

Founder verified the Workers & Pages app list is empty, setup stopped before
Deploy, and no HTC Worker/build trigger exists. GitHub authorization alone is
not an HTC deployment connection. GitHub/Netlify/Vercel checks were also accepted;
Group 03 was pushed once and will not be pushed again.

Primary cloud references:
- [GitHub standard hosted runner specifications and public-repository pricing](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)
- [Push workflow events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#push)
