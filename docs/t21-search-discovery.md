# T21 — SEO, discoverability and organic traffic foundation

Prepared 27 October 2026 JST; handoff reconciled during Final Review on
28 October 2026 JST. Base:
`108b39a4295c281011b755b23b7e943d3eb3226f`, `codex/group04-t18`, clean and
synchronized with origin before implementation. T18, T19, T20 and the master
asset reconciliation remain closed. Implementation/testing only: no commit,
push, merge, deployment, live publishing, paid integration or T22 work.

## Focused gap analysis

The existing App Router already has public home/discovery/UUID article pages,
plain-text content rendering and generic root metadata. Article metadata was
generic; robots/sitemap and canonical/environment controls were absent.
Repository configuration identifies a TEST Worker, not a verified canonical
production domain. No production hostname is inferred from account names,
request/forwarded headers, Supabase, Google Drive, a preview deployment or an app
icon. No remote account, production secret or domain configuration was accessed.

T09 remains the sole anonymous discovery authority; T06/T07B provide safe public
projection and current RELEASED/READY/object rechecks. T15 retains all explicit
Founder release/withdraw permissions. T18 taxonomy and T19/T20 packages are not
new public metadata sources: internal editorial/manifests/asset inventories are
not imported into public SEO. No CMS, database, auth, storage or release changes.

## Implemented search metadata

- Home and discovery have distinct titles and accurate Trial descriptions.
- Article title and description come only from the existing anonymous detail
  response, with matching UUID and success checks. Excerpts collapse whitespace
  and retain at most 160 Unicode code points; Next metadata rendering owns escaping.
- Open Graph and summary-card metadata use public text only. URLs are emitted
  only when the canonical policy passes. No private master/logo/voice, signed
  media URL, fake publisher identity, author, timestamp or image is invented.
- Existing missing/private/withdrawn detail responses still call `notFound()`.
  Unavailable responses receive generic noindex metadata with no article title.
- React request memoization is used for metadata/body reads; it is not a durable
  public cache or permission mechanism. Full framework behavior still needs the
  approved cloud integration build described below.
- Root metadata defaults to noindex/nofollow. Protected Founder and sign-in
  pages inherit that without modifying their authentication/layout behavior.
  Verified public pages alone override indexability. Filter/cursor/unknown
  discovery query variants and unavailable discovery responses are noindex.

No JSON-LD was added: the public contract has no verified author/publication
timestamp, media or language attribution, and no canonical production domain is
available. Unsupported rich-result claims, curriculum/LMS schema and fake media
would be misleading. Existing internal content links and UUID identities remain.

## Canonical and environment policy

The server-only helper reads two optional settings; neither was provisioned or
added to deployment files by this task:

| Setting | Required evidence and use |
| --- | --- |
| `HTC_SEO_CANONICAL_ORIGIN` | Founder-verified production HTTPS origin only, with no credentials/path/query/fragment/port; optional terminal slash |
| `HTC_SEO_INDEXING=enabled` | Explicit deployment/operator activation after domain and build verification; absence keeps indexing closed |

These are configuration prerequisites, not a new authentication/approval system.
Parsing a URL or setting a flag does not establish ownership or approval. Trusted
operators must first verify domain ownership/routing/TLS and the exact deployment.
No actual HTC value is present in source, tests or this document; test origins
under example.org and test UUIDs are synthetic, never actual public destinations.

Indexability additionally requires production NODE_ENV, the existing production
Supabase configuration guard, no TEST target, no known preview/development label,
and an exact request Host match to the configured origin. Host can only veto; it
cannot supply a canonical. Forwarded-host and caller query values are ignored.
Local/IP/reserved development and hosted-preview origins fail closed. Cloudflare
Pages requires a separately verified environment policy; the existing Workers
TEST target always remains noindex. No provider environment/account state was
verified live and no environment variable was modified.

Only `/`, `/content` and actual public `/content/<uuid>` paths can be canonical.
Query strings, API/auth/Founder routes and internal manifests never become
canonical destinations. Without prerequisites, public copy remains usable,
canonicals/OG URLs are absent, and the sitemap is empty.

## Robots and sitemap

Both App Router GET handlers are force-dynamic and return no-store/nosniff.
Their own responses carry X-Robots-Tag noindex. robots permits public crawling
so bots can read HTML noindex, excludes Founder/API/auth/sign-in surfaces and
advertises the sitemap only under verified production configuration. A blanket
Disallow-all was rejected during source verification because it prevents reading
noindex. robots is a voluntary crawler instruction, never access control.

The sitemap calls existing `discoveryContent` with anonymous T09/T07B checks.
It includes only home, discovery and returned RELEASED UUID pages. No titles,
bodies, asset metadata, credentials or private identifiers are serialized.
Every request rescans current public visibility without a stored sitemap cache.
Withdrawal between existing content/asset reads excludes the item; a subsequent
request rechecks state. A completed response/search-engine copy cannot be recalled
after a later withdrawal; no absolute real-time erasure guarantee is claimed.

Continuation uses at most 20 pages of the existing 12-item discovery query
(240 returned items). Invalid IDs/state, duplicate IDs, repeated/invalid cursor,
upstream failure or an unfinished scan at the cap returns redacted HTTP 503 with
an empty URL set, never a partial inventory claimed complete. More than that
requires a separately reviewed scaling approach, not an unbounded query/new API.
Missing canonical configuration returns HTTP 200 with an empty URL set and does
not query the database. No DRAFT/WITHDRAWN record is read through privileged APIs.

Noindex depends on crawler compliance and recrawling; it is not a retroactive
removal or guaranteed ranking mechanism. Existing private authorization is the
security boundary. No Search Console submission or removal action occurred.

## Organic traffic and T20 handoff

The approved path remains a separately authorized social post pointing to an
actual RELEASED website article represented by T20's private destination binding.
Resolve that binding through an approved public delivery contract, check current
release state and publishing authority, and use the existing UUID destination.
Never substitute a Drive master, private Storage path, preview hostname, draft
article or fabricated URL. T20 remains non-executable; this task publishes nothing.

Optional offline planning labels may use source (the approved channel), medium
`organic_social`, campaign `trial-awareness-2026`, and content recipe/variant/
language. These are internal editorial conventions only: no collector, cookie,
script, pixel, analytics event, attribution database or advertising integration.
Do not append UTM parameters automatically: the existing discovery query contract
rejects unknown parameters. Parameter acceptance/analytics and T22–T25 behavior
require their own approved scope. No guaranteed traffic or trading outcome claim.

## Validation evidence and limits

Existing pnpm and Node built-ins only, with automatic dependency checks/install
disabled for these lightweight focused tests:

```powershell
pnpm --config.verify-deps-before-run=false exec node --test tests/t21-search-metadata.test.js tests/content-discovery.test.js
```

Initial run: **43/43 PASS** (T21 21, directly reused T09 22), zero failed/skipped/
cancelled. After correcting robots/noindex interaction from official guidance,
only the affected T21 suite was rerun:

```powershell
pnpm --config.verify-deps-before-run=false exec node --test tests/t21-search-metadata.test.js
```

Final T21 rerun: **21/21 PASS**, zero failed/skipped/cancelled. Together with the
unchanged T09 result, applicable targeted evidence is **43/43 PASS**. T09 evidence remains applicable:
the correction changes only T21 robots serialization/tests, not T09 code.
Fixtures exercise actual existing public handlers with mocked upstream responses,
including current release/withdraw and Founder/USER boundaries. They do not execute
live SQL/RLS or prove a live crawler/provider integration. Wiring assertions are
source checks, not Next.js rendered-head/404 or React memoization integration tests.

The worktree has no resolvable Next.js/React dependencies; a resolution probe
confirmed this and a Next SWC module probe returned MODULE_NOT_FOUND. No dependency
installation or build was attempted. Prior approved execution policy in
`docs/cloudflare-workers-migration.md` reserves heavy compilation/build for cloud
Linux. The historical Workers workflows remain unchanged and target another
branch. Founder subsequently authorized one new validation-only workflow:
`.github/workflows/t21-seo-cloud-validation.yml`. It checks out the exact pushed
SHA on `codex/group04-t18`, checks HTC repository/branch identity and the approved
11-path scope against this baseline, and preserves package/lockfile bytes.

The workflow reuses existing pinned Actions, Ubuntu 24.04, Node 24.21.0 and pnpm
11.25.0. It has only `contents: read`, disables persisted checkout credentials
and dependency caching, installs with `--frozen-lockfile --ignore-scripts`, then
runs `pnpm run build`. Its temporary loopback custom server uses the built Next
application with a synthetic, deny-by-default transport. Four scenarios cover
missing domain, TEST, Preview and a reserved-example production configuration.
Assertions cover rendered metadata, canonical/robots/sitemap, paged discovery,
private/withdrawn content, protected noindex, withdrawal between requests and
malformed upstream responses. No real credentials, live database/storage calls,
deployment, publication or artifact/cache upload is configured.

Local YAML, guard, shell/JavaScript syntax and nine lightweight harness
compatibility/negative checks passed. These are not Next build/SSR evidence.
**Cloud Build/SSR: NOT RUN.** Commit and push still require separate Founder
authorization. Creating or reviewing the workflow does not close that gate.

**Outstanding integration gate:** after separately approved commit/push, inspect
the new workflow's actual build/SSR results for that exact SHA. Failures must be
reported, not treated as PASS from local syntax checks. The React-dependent
public-experience suite was not rerun locally; the new workflow directly probes
built Next SSR rather than claiming that suite ran. Its synthetic transport does
not verify live SQL/RLS, actual domain ownership, cloud deployment adapters,
browser hydration, production QC or publishing approval. Domain verification/
activation is independently missing; do not fabricate a canonical to hide it.

## Change scope and handoff

Four modified files: root layout, public home, discovery and UUID article pages.
Seven new files: `src/server/search-metadata.js`, `src/server/search-context.js`,
`src/app/robots.txt/route.js`, `src/app/sitemap.xml/route.js`,
`tests/t21-search-metadata.test.js`, this document, and
`.github/workflows/t21-seo-cloud-validation.yml`. No existing discovery,
Founder, auth, asset, migration, dependency, deployment or T18–T20 file is edited.
Only this 11-file T21 scope is proposed for commit review; nothing is staged.

Final preservation snapshot: all eight other worktrees, including their 113 dirty
files, remain identical to the preflight snapshot (HEAD, branch, status, index and
dirty-file hashes/size/mtime). Baseline HEAD remains
`108b39a4295c281011b755b23b7e943d3eb3226f`, tracking 0 ahead / 0 behind.

Source and focused tests are ready for Founder review with the cloud integration
gate explicitly BLOCKED. Production indexing is BLOCKED until verified canonical
configuration and deployment checks exist. No T21 closure, commit approval,
publishing permission or authority to begin T22 is implied.

References checked 27 October 2026 (read-only official documentation):

- [Next metadata API](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
- [Next robots convention](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots)
- [Next sitemap convention](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap)
- [Google noindex and robots interaction](https://developers.google.com/search/docs/crawling-indexing/block-indexing)

## 2026-10-29: production SSR root correction checkpoint

This section supersedes the earlier NOT RUN integration status for the private
cloud experiment only. No new GitHub Actions execution, commit, push, deployment
or indexing activation is claimed.

The Next 16.4.1 request-time not-found recovery builds an empty
`__next_error__` HTML document while the Not Found tree exists only in the
original Flight stream. Restoring the content loading boundary also lets
Suspense flush a loading response before the page-level notFound reaches root
recovery. Reproductions distinguished both paths: recovery alone fixes HTML
without loading, but is insufficient with the restored loading component.

`validation/t21/next-not-found-backport.mjs` applies a temporary local backport
inspired by [Next.js PR #100648](https://github.com/vercel/next.js/pull/100648);
this is not an official released framework fix. For the exact HTC dynamic
content-detail route, request-time 404 recovery renders the nearest existing
Not Found tree through the framework component-tree builder. Initial HTML
documents omit the automatic loading data until content resolution completes;
RSC requests and other routes retain their loading data. Initial HTML and its
initial Flight agree. The original accessible loading.js remains unchanged.

The build invokes this helper explicitly before the existing webpack build.
Next/React versions and the lockfile are unchanged. Unknown runtime bytes or
Next versions stop the build. Same-directory atomic replacement preserves file
mode and leaves pnpm shared hardlinks/store untouched; parent/global Next
resolution is rejected. There is no install hook. The source guard allows only
this exact build-command change in package.json; all other package fields and
the original lockfile remain locked. SSR assertions and the final integrity
step are byte-identical to the preceding checkpoint.

Verified runtime SHA-256 values:

- Original: `76557c74ce6f2e8a592ef8c0810c58b8563f1e8b6e86aa71ca933eafc87902a4`
- Patched: `3f86228bcdb279e219f78fc1c7482a9f1ef85d36e2530990390ecfbddac97e95`
- Lockfile: `f3dd0c9c7f92f8cec9ebacaf0912b8144ac1f773800771f90ea661db82cc89d6`
- Restored loading Git blob: `df07ff6cc9266a59a98f9826e33c2fa3ffadde4a`

### Rollback runbook — separate Founder authorization required

This runbook is documentation only. Do not execute it under the current
documentation approval. Rollback is incomplete if the build script is restored
while `node_modules` still contains the patched Next runtime.

1. **Approve and restore the source configuration.** Record the rollback target,
   branch/HEAD, dirty and staged inventory, file hashes and the other worktree
   states. Verify the pre-backport checkpoint
   `53801312bca32f9400d8ff44b8aee09eecbaf4a1` against Git history before using it
   as a source reference. Use a separately reviewed, explicit-path Git patch or
   revert for the backport changes: restore `build` to `next build --webpack`,
   remove the helper invocation and backport-only helper from the approved source,
   and reconcile the paired CI package guard/tests with that restored command.
   Keep the SSR/security assertions, restored loading boundary, historical evidence
   and unrelated changes. Do not reset, clean, switch branches, stash or revert
   unrelated history automatically; committing/pushing a rollback needs its own
   Founder approval.
2. **Remove residual patched artifacts only in disposable isolation.** Stop only
   the processes belonging to the authorized rollback sandbox. Resolve and inspect
   the absolute paths of its local `node_modules` and generated `.next` output
   before removing/recreating those directories. Reject paths outside that
   disposable root, shared installations, symlinks/junctions and mounts that could
   reach another checkout or store. Do not overwrite the vendor file in place or
   delete/prune the shared pnpm store; its hardlinks may serve other worktrees.
   Remove any owned partial patch temporary file only after identifying its exact
   path. Prefer a fresh disposable checkout with no inherited `node_modules` or
   build output if isolation cannot be proven. This clears the installed patched
   runtime and generated artifacts, rather than merely disabling its build hook.
3. **Restore official dependencies from the verified lockfile.** Confirm the
   restored package configuration and `pnpm-lock.yaml` agree with the approved
   source; retain the lockfile SHA-256 recorded above. In that isolated root, use
   the approved Node 24.21.0/pnpm 11.25.0 toolchain and run
   `pnpm install --frozen-lockfile --ignore-scripts`. Do not upgrade Next/React,
   regenerate the lockfile, enable install hooks or copy vendor files from another
   worktree. Stop on an installation or package-integrity error.
4. **Verify the restored package before building.** Resolve Next from the isolated
   project and confirm it stays inside that project's installation. Verify Next
   is exactly `16.4.1` and the official
   `next/dist/compiled/next-server/app-page.runtime.prod.js` SHA-256 equals
   `76557c74ce6f2e8a592ef8c0810c58b8563f1e8b6e86aa71ca933eafc87902a4`,
   not the patched hash above. Confirm pnpm's frozen install verified package
   integrity, the lockfile bytes/hash are unchanged, the original build command
   contains no helper, and no backport install hook remains. Stop on any mismatch;
   do not hand-edit bytes or substitute another framework version to pass a hash.
5. **Rebuild and validate only after rollback execution is separately approved.**
   Use the restored `pnpm run build` in the isolated cloud environment, then the
   relevant unchanged SSR/security verifier and affected T10/T21 regressions.
   Recheck HTTP 400/404, server Not Found HTML without hydration, RELEASED access,
   DRAFT/WITHDRAWN privacy, metadata/noindex and actual navigation. Compare the
   recorded worktree inventories afterward; no other checkout may be changed.
   The official 16.4.1 runtime still has the known SSR limitation: a rollback does
   not inherit the patched runtime's PASS. Retain existing results as historical
   evidence for their exact tested hash; report any rollback failure as BLOCKED
   without weakening assertions. Domain activation, merge, deployment and
   publishing require separate authorization and are not part of this procedure.

Private cloud evidence: Vercel Hobby sandbox
`htc-t21-framework-acceptance-20261029`, session
`sbx_LkZG1DpZ07608s9WPYgwIUE5QQbc`, Ubuntu 26.04.1 LTS. Validation shells
selected the downloaded Node 24.21.0 toolchain and pnpm 11.25.0. The separate
report-probe command used the image's default Node 24.22.1; its process.version
is not a build-runner version attestation. Chromium system libraries were
installed only in the disposable sandbox. No project dependency was added.

The cloud Git transport checkout was 13d6e9b, overlaid with the actual uncommitted
source from local checkpoint `53801312bca32f9400d8ff44b8aee09eecbaf4a1`.
All 69 executable/configuration/test manifest entries matched local canonical
bytes, manifest SHA-256
`6e7d4865305ad3b13797fa0f076f778425728b2d76024c747fbde59d25964a3f`.
The overlay is not represented as a committed cloud revision.

Actual results:

- Frozen install and production `pnpm run build`: PASS.
- Unchanged workflow SSR verifier: all four modes PASS (missing domain, TEST,
  Preview, reserved synthetic production), including withdrawal lifecycle,
  RELEASED-only discovery, Founder access, robots/sitemap and fail-closed
  malformed upstream handling. Verifier regressions: 8 positive/42 negative;
  diagnostic regressions: 34 PASS.
- Additional unavailable matrix: 16/16 PASS: DRAFT, WITHDRAWN, missing and invalid
  IDs across all four modes. Page HTTP 404, API HTTP 400 for invalid IDs and 404
  for other unavailable IDs, actual Not Found HTML, full HTML/decoded Flight
  private-canary exclusion, effective noindex, no canonical/OG URL.
- Real Chromium with JavaScript disabled: 404 Not Found UI and Browse Content
  navigation PASS. With JavaScript enabled: RELEASED, WITHDRAWN 404, Browse
  Content/Home and back/forward navigation PASS; zero page/hydration errors.
  These are HTC's actual anchor navigations, not arbitrary SPA cache parity.
- `pnpm exec node --test tests/t21-framework-backport.test.js
  tests/t21-search-metadata.test.js tests/content-discovery.test.js
  tests/public-experience.test.js`: 76/76 PASS (10 backport, 22 T21, 22 T09,
  22 T10). Independent source-guard tests: 1 positive/9 negative PASS;
  YAML, all three embedded JS blocks, all five shell blocks and diff check PASS.

Cloud commands: build/initial acceptance `cmd_18c75fc4f8f248f2916f0818ffca`;
final unchanged SSR/regressions `cmd_1376e17c95334368b28bb0d734a2`;
completed browser/matrix `cmd_c6ee109ca225404faafab688a367`;
source/result attestation `cmd_c3f63518d58349aaaae03b122ec3`.
Only synthetic fixture transports and loopback servers were used. The sandbox
subsequently expired and stopped; no public service remains running.

Technical SSR validation PASS is limited to this tested standard production
webpack runtime. Development/Turbopack, Edge, Cache Components and deployment
adapters are not validated by this backport. Production domain verification and
indexing activation remain separate prerequisites. Founder final review and
separate commit/push approval remain required; T22 is not authorized.
