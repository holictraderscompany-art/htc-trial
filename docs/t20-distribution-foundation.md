# T20 — Content distribution and social publishing foundation

Prepared 26 October 2026 JST. Authority: Founder T20 Master Execution Prompt V1,
Master Task Map v3.0 and unchanged T18/T19 contracts. Base on
`codex/group04-t18`: `676726f9de2174ec6d69e2e5d05a5167cf2b34de`, synchronized
with origin before implementation. T18 is CLOSED; T19 code/editorial pipeline is
CLOSED. This document grants no publishing, commit, push or deployment authority.

## P0: reuse and scope

The clean `htc-group04-t18` worktree is reused. No branch, worktree, dependencies,
credentials, external social account or private brand master is created/accessed.
No further brand search is needed without new evidence. Preserved predecessors:

| Owner | Existing contract reused |
| --- | --- |
| T18 | Six categories, four editorial pillars, nine recipes, languages and Trial restrictions in `docs/t18-content-taxonomy.json` |
| T19 | Exact production package, source/claim/script/storyboard links, source revision, `packageDigest()` and `validateProductionPackage()` |
| T07/T14 | Existing private assets and Founder-managed READY verification |
| T15 | Existing protected Publishing workspace, explicit checked release/withdraw and public RELEASED-only discovery |
| Group 05 | Future jobs, scheduling, retries, webhooks and automation; none implemented here |

The genuine gap was an offline distribution representation and validator, not a
missing second CMS. T20 adds derivation, public-copy preparation slots, ordered
finished-media requirements, deterministic identities and a review-only handoff.
No existing application, database, API, lifecycle, authentication or deployment
file is changed. External integration and actual finished media are prerequisites
for future publication, not defects in this offline foundation.

## A: manifest contract and provenance

`docs/templates/t20-distribution-package.json` is the illustrative deterministic
output from the existing T19 template. It contains no actual media, accounts,
destinations, CMS reservations or published records. Keep real private packages
outside public Git. The generation utility returns a fresh object and does not
mutate its input. Canonical sorted-object JSON retains array/media ordering.

| Manifest field | Meaning |
| --- | --- |
| `source` | Actual T19 topic key, editorial revision, package digest and source language |
| `variant` / `package_id` | Explicit intentional variant; deterministic bundle hash of source snapshot plus variant |
| `trial` / `brand_requirements` | Unchanged T19 declarations and official logical reference requirements |
| `items` | One item per actual T19 recipe/language derivative, retaining the input derivative order |
| `distribution_id` | SHA-256 identity over topic, revision, platform, recipe, selected format, language and variant |
| `content_ref` / `caption_description_ref` | JSON pointers into the supplied T19 snapshot, not file/URL fetching instructions |
| `claim_refs` / `qualification_claim_refs` | Preserve all claims carried by the source derivative, including qualifications; no silent subset removal |
| `attribution` | Claim-to-source-key links plus nullable, separately reviewed public attribution text |
| `media_sequence` | Explicit ordered finished-media slots linked to source storyboard units and required asset keys |
| `metadata` | Platform-specific title/caption/description slots; null means pending copy, never ready-to-publish |
| `accessibility` / `thumbnail` | Per-image alt text, video caption/transcript review and private subtitle/thumbnail evidence requirements |
| `destination` | Nullable opaque private references to account binding, approved public destination and delivery contract |
| `cms_content_id` | Existing T19 website CMS ID only when actually present, otherwise null |
| `approval_requirement` / `approval_evidence` | Separate distribution review requirement and optional untrusted, digest-bound receipt |
| `tracking` | Offline PREPARED status only; attempt ID, external result and error remain null |

Generation uses all nine T18 recipes without a tenth podcast recipe. Facebook
retains the source CAROUSEL or ALBUM choice, including more than eight images.
Instagram/TikTok photo recipes retain 1–8 slides. YouTube long form retains
600–900 seconds. Video uses one compiled finished-media slot covering all source
units; image carousels use one slot per source unit. Website articles have no
visual-media slot or invented URL. Languages remain canonical BCP 47 tags from
T19. New language/format/creative variants must first have a valid T19 derivative.

`validateDistributionPackage(currentSource, manifest)` must receive the current
authoritative T19 snapshot. Source mismatch, stale revision/digest, wrong recipe,
format, order, claim links or unknown fields fail structure checks. Comparing an
old manifest against an old source cannot detect a newer real revision: a future
trusted consumer must obtain the current source and retain revision/digest
history. Hashes prove consistency, not authority, freshness or factual truth.

`distributionDigest()` seals the full manifest except its approval receipt. It
binds copy, media, destinations, source digest, variant and ordering. Any such edit
invalidates the prior receipt. A source revision change invalidates the manifest
and changes distribution identities. Editing source at the same revision changes
its digest and must trigger reconciliation/rejection of revision reuse in the
future trusted registry; it must not be a new permission to republish.

## B: publishing preparation and existing assets

Instagram/Facebook/TikTok use a caption slot; YouTube uses title/description;
website uses title and the existing T19 article pointer. These are HTC editorial
preparation fields, not claims that every provider accepts matching API fields.
All visual items preserve asset ordering and alt/caption review requirements.
YouTube thumbnail slots are review requirements; Short thumbnail delivery and
provider/account-specific support remain unverified. See the separate
[capability matrix](t20-platform-capabilities.md).

Public copy and attribution are deliberately not auto-copied from private source
research, scripts, human-review receipts or internal metadata. Known internal
reference/credential patterns, common absolute/relative filesystem and Storage
paths, URLs, markup and extra public-copy fields are rejected. These pattern
checks are not exhaustive DLP; encoded or disguised private text still requires
human review. CTA is NONE or READ_APPROVED_PUBLIC_ARTICLE with an opaque approved
destination binding. No raw media/public/signed URL enters this manifest.
Actual public source URLs/attribution and destination resolution belong to the
future approved delivery/public-copy contract. Human review must establish that
bindings resolve to genuine RELEASED public content and copy is truthful.

This is structural leakage prevention, not a semantic privacy classifier.
Ordinary prose can still contain confidential or misleading information. Required
human checks cover privacy, factual/source accuracy, language, accessibility,
qualifications, risk and truthful Trial availability. No automated PASS proves
those qualities or that an asset/reference actually exists.

Asset UUID and `private:` evidence syntax never prove READY. Finished media must
be verified using existing authorized interfaces: Founder ownership, READY state,
private `trial-assets` bucket, exact object identity, matching stored MIME/size,
relation guards and human inspection. Existing maximum is 6,000,000 bytes, with
JPEG/PNG/WebP images, MP4 video, MPEG audio and PDF documents as defined by
`src/server/media-assets.js`; T20 changes none of these restrictions. Existing
width/height/duration metadata may remain null and must not be fabricated.

Public discovery exposes metadata, not binary capabilities. No raw storage path,
signed URL, public media URL, transfer or upload is generated. Long-form finished
media may exceed the current storage cap. That requires a separately approved
delivery/storage decision before actual use, not a silent cap change here.

Website publishing stays entirely within T15: real CMS record, existing Founder
session and checked explicit release. T20 neither creates a second website API
nor releases an article. Empty asset relations remain legal for the existing
website contract; social/media requirements do not change T15 acceptance.

## C: authorization and fail-closed readiness

Returned readiness separates structural validity, external integration, actual
media and publishing authority. Every output has `executable: false`; actual
media and publishing stay BLOCKED even if locally editable evidence is complete.
The optional receipt requires DISTRIBUTION_HANDOFF scope, manifest digest,
source digest/revision and ordered distribution IDs. Even an exact matching
receipt remains untrusted. No editable boolean, VERIFIED label, checksum or T19
production approval authorizes publishing. CLI exit zero means structure only.

The future trusted consumer must independently establish:

1. Authenticated current Founder authority via existing HTC controls; no client
   role claim, new auth mechanism or browser credential storage.
2. Actual package, source topic, current revision/digest, media identity and
   exact manifest digest, plus all intended distribution IDs and variant.
3. Approved platform and exact authorized account/destination binding, copy,
   asset-delivery method and separate PUBLICATION scope. T20 receipt scope is
   review handoff only and never grants PUBLICATION.
4. Trusted issuance time, expiry/freshness policy and an authoritative audit
   reference. None is inferred from locally supplied timestamps.
5. Revocation, current source changes, media/copy/destination changes, withdrawn
   website content, role/session expiry and provider authorization revocation.

Any changed/revoked condition blocks dispatch and requires renewed approval.
No policy duration, signing system, approval database or account connection is
invented. Existing Founder/Public boundaries and T15 release permissions remain.

Trial remains September–December 2026; January 2027 curriculum is future context,
not automatic authorization. Structured T19 restrictions are revalidated before
every derivation/validation. Lessons, modules, curriculum, quizzes, assessments,
enrollment, progress/LMS, guarantees and fabricated performance remain forbidden.
Claim/qualification link preservation does not prove captions preserve meaning;
semantic Trial and localization review is required for every platform.

## D: operational identity, results and future adapter handoff

`prepareDistributionHandoff()` returns a cloned internal REVIEW_ONLY snapshot,
digest and computed readiness, not an executable provider request. It contains
no transport credentials or dispatch method. No external adapter executes.
Unknown fields or locally invented PUBLISHED status/attempt/results are rejected.

Future operational records, in existing approved infrastructure after separate
design approval, must bind distribution ID, current manifest digest, destination,
attempt ID, timestamps, trusted approval reference and genuine provider evidence.
Attempt IDs must come from the actual operation, not template reservations.
Keep external post/result identifiers in private evidence until verified; expose
only an explicitly approved public projection. A prepared manifest is no proof
of an upload, and provider acceptance is not proof of public availability.

| Observation / condition | Required future behavior |
| --- | --- |
| Same identity and digest/destination | Reuse durable operation/idempotency record; do not dispatch twice |
| Same identity, different digest/destination | Conflict/manual reconciliation; require scoped approval, never silently overwrite |
| Intentional new variant | Explicit variant and separate review; not a loophole for duplicate publication |
| Ambiguous timeout or lost response | Reconcile provider result first; no blind retry/new attempt |
| Explicit transient rejection | Retry eligibility only after no-side-effect confirmation and fresh authorization; backoff remains future policy |
| Permanent rejection or authorization revoked | Stop; manual intervention/re-authorization, no automatic retry |
| Provider-confirmed result | Require actual result evidence and public-status reconciliation; editable receipt still unverified |
| Partial platform failure | Keep each item independent; preserve genuine successes and reconcile uncertain items; no blanket replay |
| Unsupported provider idempotency | Trusted single-flight reservation and result reconciliation required before retry |

`classifyAttemptObservation()` is a pure classifier for deterministic/mock future
observations. It does not create attempts, verify provider evidence, authorize a
retry, wait, reconcile or mutate state. No provider idempotency capability is
assumed. Durable duplicate prevention across processes is NOT implemented by an
in-memory validator; it requires the future approved adapter/registry contract.
Scheduling, webhooks, jobs and automation remain Group 05 work.

## Validation and delivery inventory

Only these five new T20 files are intended for future review/commit:

- `docs/t20-distribution-foundation.md`: ownership, security and future handoff.
- `docs/t20-platform-capabilities.md`: editorial/provider capability matrix.
- `docs/templates/t20-distribution-package.json`: sanitized generated reference.
- `validation/t20/distribution-package.mjs`: offline pure preparation/validation.
- `tests/t20-distribution-package.test.js`: focused deterministic negative tests.

Run with existing pnpm and Node built-ins, disabling dependency auto-install:

```powershell
pnpm --config.verify-deps-before-run=false exec node --test tests/t20-distribution-package.test.js
pnpm --config.verify-deps-before-run=false exec node validation/t20/distribution-package.mjs validate docs/templates/t19-production-package.json docs/templates/t20-distribution-package.json
```

For a private local source, CLI `prepare <source.json>` prints the manifest and
validation to stdout; it never saves a file. `validate <source.json> <manifest.json>`
prints only fixed structural paths/codes and readiness, with no source prose or
raw error echo. Missing/unreadable/malformed input returns exit 1. Preparation is
an internal review artifact and must not be treated as a public API response.

Final execution after focused review on 26 October 2026 JST:
**34/34 focused tests PASS**, zero failed,
skipped or cancelled. The standalone validation command returned exit 0,
`structural_valid: true`, `errors: []`, `executable: false`, external integration
NOT_IMPLEMENTED, actual media BLOCKED and publishing authorization BLOCKED.

Tests cover all twenty requested areas, including stale source and locally forged
approvals, exact nine-recipe mapping, invalid metadata/order/claim links, private
reference leakage, structured Trial restrictions, safe errors and no network or
publication side effects. Facebook's nine-image album passes; Instagram/TikTok
nine-image inputs fail; source long-form duration remains constrained. Fixtures
with synthetic UUIDs/receipts are explicitly tests, not discovered live assets.
Pending public-copy, media and review fields are structurally represented as null
and produce blockers; their presence is not content completion.

Raw SHA-256 of tested inputs before future Git EOL filtering:

| Input | SHA-256 |
| --- | --- |
| T18 taxonomy, unchanged | `9d93a7577e1e4c9851c2aaa9f041b4d19965ff5874ec7d04629771178f8a6401` |
| T19 template, unchanged | `e912deac822d52be5f671d9ab6af35097e6a3de971661fa2db5001c6144adf07` |
| T20 template | `2b4c391c7791806c1227e711eccef835acc167fd59e081635c32bf393de81dd9` |
| T20 utility | `fc927ac4a9ada58338300320ddbab0f075a621cac0911c0c387103d72a9dd449` |
| T20 tests | `14466e80b9c562aea1c3766cd6fc91445fa1c7186d66b8e4b0d8aa385dca29b5` |

The focused final review reproduced three defects missed by the original 31
tests: visual claim derivation omitted qualifications declared only on storyboard
units; the public-copy pattern guard accepted common POSIX/Windows/UNC/Storage
paths; and null helper arguments raised raw TypeError. Corrections are limited
to the new T20 utility, tests and this evidence document. Claim derivation now
unions script and storyboard claims, the same public-copy guard checks common
path forms in metadata/attribution/alt text, and malformed helper inputs return
fixed controlled errors. Handoff hashes and returns the same cloned snapshot it
validates. Three added regression tests cover those cases. The template and
platform matrix remain byte-identical, and prior 31/31 evidence describes its
tested cases rather than exhaustive correctness. No remaining material defect
was found within the offline JSON contract.

Scope checks found exactly the five additions listed above, no tracked or staged
changes and no credential-pattern findings. Eight other worktrees retain their
HEAD, branch, status, index and hashes/timestamps for 113 dirty files. No live
integration, OAuth, upload, platform compatibility or human approval is claimed
by these offline tests. Predecessor suites/builds are not repeated. There was no
dependency installation, account connection, commit, push, merge, deployment,
publication or T21 work.

## Deferred dependencies and readiness

- Official logo/watermark and Founder/Learner master characters: unverified or
  inaccessible as already recorded by T19; no substitutes or repeated searches.
- Actual finished media, visual QC and authoritative asset readiness: BLOCKED.
- External platform adapter, account consent, provider capability verification
  and approved private media delivery: NOT IMPLEMENTED.
- Trusted Founder publication approval for actual content/destinations: BLOCKED.
- Future automation: Group 05, outside T20.

Foundation review can proceed independently of those dependencies. Stop after
targeted validation and return to Founder: no commit, push, merge, deployment,
publication or T21 work is authorized by this task.
