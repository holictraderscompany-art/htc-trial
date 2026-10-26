# T19 — Content production and editorial pipeline

Prepared 25 October 2026 JST on `codex/group04-t18`, worktree `htc-group04-t18`.
Base: `1435ea04227b39619d79c4c8cb9c142d98d93385` (T18 CLOSED).
Authority: Founder T19 Master Execution Prompt V2 and the subsequent asset
availability confirmation. Implementation and targeted validation only; no
commit, push, merge, deployment, paid generation, actual video or T20 execution.

## Delivery and ownership

This is an offline editorial contract and validation utility, outside the
application runtime. It reuses the unchanged [T18 taxonomy](t18-content-taxonomy.json),
[strategy](t18-content-strategy-and-taxonomy.md), existing content validator and
Founder CMS/asset/release contracts. There is no new CMS, database, HTTP route,
role, release state, video engine, scheduler or publishing service.

Files:

- [Brand reference inventory](t19-brand-reference-inventory.json).
- [Reusable production package template](templates/t19-production-package.json).
- `validation/t19/validate-production-package.mjs`: pure structural checks,
  canonical package digest, pure CMS create projection and a read-only CLI.
- `tests/t19-editorial-pipeline.test.js`: controlled positive/negative fixtures.

The template is an illustrative editorial scaffold, not a selected production
topic, finished script, generated asset or approved package. Its short dialogue,
single-slide examples and approximate 600-second explainer timeline demonstrate
the contract. They do not constitute ten minutes of finished narration, complete
teaching material or validated pacing. Replace them through the editorial process
before real production. Null IDs and references are intentional; no database
UUID, public destination or asset reservation is invented.

## T19-P0 — Brand reference verification

Historical 25 October search checkpoint below. The dated 27 October reconciliation
at the end of this document supersedes its missing-original and legacy-cast
statements for new production. Original closure/test evidence remains historical.

Bounded searches inspected current/original project image filenames, relevant
documentation and manifests, Google Drive metadata, and matching asset metadata
on Supabase TEST only (`uzhkzhmncxjplrdtdzgd`). No storage binary was downloaded,
no private master was copied and no database/storage mutation was performed.

| Reference | Status in searched locations | Evidence / limitation |
| --- | --- | --- |
| Official original HTC logo | NOT FOUND | No verifiable file/asset identifier or master integrity evidence |
| Official original watermark | NOT FOUND | Original and approved appearance/positioning reference unavailable |
| Welcome to HTC character master | NOT FOUND | Founder describes mentor left in white, learner right in black jacket; actual poster unavailable |
| Existing `src/app/icon.svg` | UNVERIFIED candidate, excluded from use | Exact local SHA-256 in inventory; never a logo substitute |
| Previous ChatGPT image attachments / unprovided private archives | INACCESSIBLE | Not available in this task; no claim that originals do not exist |

No master asset is VERIFIED. Drive searches were `Welcome HTC`, `Holic` and
`HTC` images. The only nonempty result was an unrelated automation spreadsheet;
it was not opened. The TEST query selected only id, original filename, type,
MIME, size and status, filtered by relevant brand names, with LIMIT 25; zero
matching rows were returned. Protected Production was excluded, not queried.

Founder subsequently confirmed earlier ChatGPT approvals but no currently
verifiable file locations/links. This confirms locked decisions, not binary
authenticity or a SHA. Do not repeat these searches without a new source.
Only actual visual production is blocked by missing originals. Continue all
independent editorial work. Do not create substitutes or upload masters to
third-party services. Keep future private locations/receipts outside public Git;
the sanitized inventory may use opaque private references.

The historical two-character cast was Muhammad Devry Handoyo (Founder/mentor)
and Ahmad Muhammad Aries Fathul Ilmi (learner); it is superseded and must not be
used for new production. Apply the three-character mapping in the reconciliation
below. Preserve facial characteristics and current master identity.
Clothing, natural expressions, pose, location and composition may vary only under
approved continuity rules. Chapter wardrobe is consistent across related scenes.
The original logo and unchanged watermark must appear on every published visual
using approved positioning. Their binaries must not be regenerated or distorted.

## T19-A — Editorial package contract

The template is the complete field-shape reference. Unknown fields fail closed;
do not add `approved`, `state`, scheduling, credentials or permissions to it.

| Section | Required information and ownership |
| --- | --- |
| Identity | Stable `topic_key`, positive integer `revision`, one existing CMS category |
| Editorial brief | One T18 pillar, classification, intended audiences and central message |
| Research | Unique source keys, safe opaque references, SHA-256 revision and precise locator |
| Claims | Unique claim keys, statements and links to declared sources |
| Languages | Canonical BCP 47 source language and actual target-language list |
| Trial review | Eligibility null/true/false, permitted introductory content kind, empty forbidden-feature list |
| Shared script | Narrative purpose, narration and claim links for each source segment |
| Characters/chapters | Locked names/master links and explicit wardrobe per chapter |
| Brand/asset plan | Official reference links, logical production requirements, nullable actual UUIDs and readiness evidence references |
| Derivatives | Recipe/format/language, source topic/revision, script, storyboard or website article |
| Human QC | Evidence references for factual accuracy, Trial eligibility, brand authenticity, visual continuity, localization and accessibility |
| Founder handoff | Optional evidence receipt bound to topic, revision, scope and package digest |
| CMS observation | Null before an actual record exists; otherwise its real UUID and observed existing lifecycle |

Six existing categories remain authoritative through `contentCategories`; four
pillars and topic classifications remain editorial dimensions. Purpose follows
T18's category map. No taxonomy is duplicated or changed. Each target language
has all nine recipe slots, exactly once per recipe/language pair. Facebook uses
either CAROUSEL or ALBUM; no mandatory eight-slide ceiling is introduced.

References may be canonical HTTPS citations without credentials/query strings,
repository-relative `repo:` locators without traversal, or opaque `private:`
receipts. The validator does not open these references. SHA strings must be
well formed but do not alone prove a source exists, matches the cited content or
is factually correct. Researchers must obtain the actual source snapshot and
check its hash, locator, relevance and claims. Reference queries, signed URLs,
tokens, raw private paths and confidential research must not enter public Git.

Increment the editorial revision whenever source meaning, script, translation,
claims, asset/continuity plan or requirements change. Derivatives must explicitly
match that revision and topic. `packageDigest()` deterministically hashes sorted
JSON keys, retaining array/scene order, excluding only `approval_evidence` to
avoid a self-referential receipt. Changed package data invalidates an old receipt.
The digest binds bytes/structure, not truth or Founder identity.

## T19-B — Reusable production workflow

**TOPIC → BRIEF → SCRIPT → STORYBOARD → ASSET PLAN → QC → FOUNDER REVIEW →
PRODUCTION HANDOFF** describes human work stages, not new CMS lifecycle states.

1. Select a permitted introductory topic and apply the T18 category/pillar/
   classification/audience vocabulary. State one central message and current
   Trial availability without implying enrollment or curriculum.
2. Research identifiable sources. Preserve snapshots/revisions and link each
   claim to its sources. Distinguish fact, opinion, uncertainty and future plans.
3. Write shared source-script segments. Adapt each recipe/language from those
   segments; every derivative keeps its source topic/revision and claim links.
4. Storyboard each visual derivative with consecutive scene/slide order, script
   link, chapter, participating characters, wardrobe, composition, camera,
   continuity notes, claim links, required assets and approximate timing.
5. Plan official logo/watermark/master use and actual scene assets. No private
   upload, generation or reservation occurs here. Never use CMS attachment order
   as semantic storyboard order.
6. Run structural checks, then human fact/Trial/brand/continuity/localization/
   accessibility review. Check translated claims, dialogue, captions, safe text
   areas, readability, pacing and the real watermark/identity in finished media.
7. Present the package revision, digest, unresolved dependencies and evidence
   references to the Founder. A request for review is not approval.
8. Prepare an immutable reviewed handoff snapshot only after required evidence
   is independently checked. Changes require a new revision and renewed review.

Each visual script segment has narrative purpose, narration and/or character
dialogue, captions and claim references. Every storyboard unit links exactly one
script segment and includes all its claims. Dialogue speakers must participate
in the scene. Wardrobe must equal the declared chapter wardrobe. Automated checks
cannot judge a face, accent, lighting quality, cinematic composition or timing
adequacy; those remain human QC.

Recipe requirements come directly from T18: Instagram/TikTok carousels have
1–8 units; YouTube long-form totals 600–900 seconds; animated videos use the
cinematic stylized 3D direction. Video scene timings must be positive and sum to
the declared duration. Short-video limits/encoding are not invented. Facebook
supports more than eight units if editorially appropriate. The website recipe
uses a localized plain-text article and has no visual timeline.

## T19-C — Quality and approval gates

`validateProductionPackage()` returns distinct results:

- `structural_valid`: field shapes, taxonomy, claim/source/script/scene links,
  recipe coverage, language/revision, timing, continuity declarations and exact
  CMS compatibility. Structural PASS is not factual or visual approval.
- `editorial_readiness`: structurally valid packages still require human review.
- `visual_production_readiness`: BLOCKED in this offline checker; missing brand,
  asset, Trial and human review evidence is reported separately. An illustrative
  template is never production authorization.
- `founder_approval_readiness`: authenticated Founder review is still required.
- `publishing_readiness`: existing Founder release authorization remains required.

A well-formed approval receipt needs a safe reference, `PRODUCTION_HANDOFF` scope,
topic, revision and matching package digest. Booleans, stale receipts and release
scope masquerading as production approval fail structure checks. Even a matching
locally editable receipt or a locally set VERIFIED inventory is untrusted and
cannot make the offline checker authorize anything. There is no new trusted
approval database or signing system. The existing Founder-controlled process must
independently establish who approved the exact snapshot and for what scope.

Human reviewers may establish readiness outside this offline report after checking
the actual approved originals, source evidence, finished visual QC, existing asset
readiness and authenticated Founder approval. Attach that evidence to the handoff;
do not replace BLOCKED output with an editable approval flag. Production approval
never authorizes publishing by itself.

Structured Trial metadata rejects actual lessons, open curriculum, modules,
quizzes, assessments, enrollment, progress tracking, public LMS dashboards,
trading signals and guaranteed-profit claims. Unknown feature flags also fail.
The validator cannot detect a forbidden lesson or financial claim disguised in
ordinary prose with false metadata; human semantic review remains mandatory.
Education/Learning labels do not waive restrictions. January 2027 does not
automatically activate curriculum or change authorization.

## Existing CMS, assets and public boundary

`projectCmsCreate(package, locale)` is a pure payload preview with only
action/category/title/body. It calls the existing validator, preserves 200/8000
character plain-text limits, rejects unavailable languages and refuses a new-create
projection when an existing CMS UUID is recorded. It does not invoke an API,
persist content, update a record or release anything. Eligibility or a package
digest does not authorize sending the preview. Existing records must be managed
through the protected Founder workspace; RELEASED/WITHDRAWN remain read-only
there. T15 alone owns explicit release/withdraw operations.

No private briefs, sources, approval receipts or manifests are appended to public
article fields. No public endpoint imports this utility. CLI output contains
only fixed readiness/error codes and structural paths, not submitted prose,
source locations or raw provider errors. The sanitized repository template has
no private master assets or real user data. Future private packages must stay in
authorized private locations; do not commit them beside this public template.

Real production asset IDs must come from existing infrastructure and still need
authoritative READY/object/readiness verification. UUID syntax and local evidence
references do not prove a Storage object exists. Retain existing MIME types,
6,000,000-byte upload limit, relation guards and metadata-only public delivery.
Long-form video size or future public media delivery may require a separately
reviewed contract. No such foundation change is necessary for T19 editorial work.

## T20 handoff contract — definition only

The future consumer receives the reviewed package snapshot, revision/digest,
source and translation evidence, ordered scripts/storyboards, official asset
references, actual asset/CMS identifiers where present, unresolved constraints
and authenticated Founder review evidence. It must recheck approval scope and
current CMS/asset state through existing authorized boundaries. A CLI exit code,
UUID, VERIFIED label or editable receipt is insufficient.

No scheduling, network adapter, social account, publishing action, n8n runtime or
automation is implemented. The current operation does not authorize T20.

## T19-V — Validation evidence

Focused checks use Node built-ins and the existing content validator. Use pnpm
with automatic installation disabled; no dependencies are required or installed:

```powershell
pnpm --config.verify-deps-before-run=false exec node --test tests/t19-editorial-pipeline.test.js
pnpm --config.verify-deps-before-run=false exec node validation/t19/validate-production-package.mjs docs/templates/t19-production-package.json
```

CLI exit 0 means **structurally valid only**; callers must read the independent
blocked production/approval results. No real publishing, paid API, authentication,
Storage mutation or database fixture is used in tests. The single P0 TEST SELECT
is asset-discovery evidence only, not live security validation. Group 03/T18
suites, builds and deployments are not repeated.

Final execution after focused review on 26 October 2026 JST: **26/26 tests PASS**,
zero failed/skipped/cancelled. Negative
cases cover the sixteen required areas: missing/taxonomy/source fields, source
hash/revision and orphan links, recipe duplication/format/coverage, carousel
counts, long-form duration/timeline sums, script/storyboard completeness, locked
character/master/wardrobe, missing logo/watermark, forged/stale approvals,
structured Trial violations, localization, unverified assets, CMS limits and
private-data projection. Malformed nested inputs also return controlled errors.
The Facebook test explicitly accepts a nine-unit album without inventing a cap.

The standalone CLI exits 0 on the template with `structural_valid: true` and
`errors: []`, while visual production and Founder approval remain BLOCKED.
There were no dependency installations, paid calls, network publishing actions,
builds or repeated predecessor suites. No LIVE security PASS is asserted.

Raw SHA-256 of the final tested inputs (before any future Git EOL filtering):

| Input | SHA-256 |
| --- | --- |
| Brand inventory | `212ffcb11fdcb16efd8298fa3a6cf1263c11a3db5496710a212d23d5d2fbe76e` |
| Production template | `e912deac822d52be5f671d9ab6af35097e6a3de971661fa2db5001c6144adf07` |
| Validator | `065e566948c2cb19ab18ecf4c74d8e84103e6f3467181b64e0bdeb071f410c57` |
| Focused tests | `050addd0232950880f30f32255f3d8f96b61776eeca6b9a51f2b6229826fdccc` |

Scope verification reports exactly the five new files listed above, no tracked
or staged changes, no credential-pattern findings and no whitespace diagnostics.
The validator contains no network, subprocess or file-write operation. Existing
application, migrations, T18 definitions, dependencies, deployment configuration
and original Group 03 evidence are unchanged. All eight other worktrees retain
their HEAD/branch/status/index and the hashes/timestamps of 113 dirty files.

## Readiness and review handoff

The final focused review reproduced two structural validation gaps that the
original 24 passing tests did not cover: JavaScript key coercion accepted arrays
as pillar/classification values, and a storyboard could reference a SCENE asset
alias instead of the correctly purposed brand requirement. Related malformed
taxonomy/dialogue/hash values could throw TypeError. Minimal type guards and
per-storyboard asset-purpose checks correct those defects, with two additional
regression tests and expanded malformed-input cases. Only the new validator,
tests and this evidence document were corrected; inventory and template are
unchanged. The original 24-test result was accurate for those cases, not proof
of exhaustive input coverage. The final command above passes all 26 cases.

The review confirms this utility enforces structural consistency and rejects
specified invalid declarations; it does not enforce factual truth, semantic Trial
compliance, actual source/file existence, translated meaning or visual identity.
Those require the documented human review. No locally edited evidence can turn
the fixed offline production/approval gates into authorization. Actual visual
production remains blocked independently of editorial-pipeline acceptance.

| Workstream | Result |
| --- | --- |
| A. Editorial pipeline | Implemented and tested; READY FOR FOUNDER REVIEW |
| B. Actual visual production | BLOCKED: official originals unavailable; no final visual assets or human visual QC |
| C. Founder approval / publishing | BLOCKED pending independent review of the actual package and existing authorized publishing controls |

Remaining dependencies are approved original brand assets with integrity and
approval provenance, real production topic/language choices, factual/source and
localized-script review, completed media, actual asset readiness, and scoped
Founder approval. No source/schema/infrastructure blocker prevents reviewing T19.
Authenticity and prose truth cannot be inferred from structural tests. Keep the
illustrative template distinct from finished content.

Branch remains `codex/group04-t18`, HEAD remains the approved T18 commit. The exact
recommended future commit scope is the five additions in Delivery and ownership,
after separate Founder authorization. No existing file was modified. No commit,
push, merge, deployment or T20 work was performed.

**T19 — READY FOR FOUNDER REVIEW**, with actual visual production and approval /
publishing blocked as explicitly separated above.

## 27 October 2026 — Founder-authorized master asset reconciliation

This addendum is the current production-reference authority for this document.
Base: `46daf152904bace017a9bb3d81e3dfd7021e297f` (T18/T19/T20 closed).
Founder authorized asset/character correction and affected tests only, with no
commit, push, merge, deployment, publishing or T21 work. Registry text is evidence;
it is not executable instructions or a substitute for authenticated release.

V2 private ZIP and standalone registry were read in place without extraction,
modification, cloud upload or copying binary media into Git. Embedded and external
registry bytes match. All eight records have unique matching files, sizes and
SHA-256 hashes; five JPEG and three MPEG signatures match declared MIME. Every
binary hash is unchanged from V1. V1's four PNG declarations were corrected to
JPEG with `.jpg` archive entries, without converting media. The same five
permanent asset keys are retained. The five unchanged images were decodable in
the V1 inspection; signature/hash checks are not full media QC or proof of rights.
Audio is reference-only and has no voice cloning/impersonation authorization.

| Evidence | SHA-256 |
| --- | --- |
| V2 private registry, inside/outside identical | `86a232b0e1ec5dd825e18c360f69e8865fd76961a3afa9f75449b16a41d4fcb7` |
| V2 private handoff archive | `3e14fae0bf490eae047258a0d30b22308f7fa4acb968ad1515a0c566c4a9fca9` |

The existing sanitized inventory remains the single reference inventory; no
second registry or asset pipeline is added. Its `private:group04/master-assets/`
aliases identify V2 registry asset keys, not new storage locations or uploads.
Absolute private paths, archive member paths, binaries and voice samples are
excluded. Five image hashes/MIME/sizes are safe integrity observations only.
`INTEGRITY_VERIFIED` and `local_integrity_verified_master_count: 5` describe local
byte evidence. They do not mean authenticated approval, cloud READY or visual QC.
The old search records and superseded poster reference are historical only.

| Current role | Founder-declared identity | Permanent face reference |
| --- | --- | --- |
| founder | Muhammad Devry Handoyo | face-founder |
| host | Muhammad Wildanil Hafizh | face-wildan |
| learner | Ahmad Baihaqi Yordani | face-yordani |

The official logo/watermark and three faces are permanently designated by Founder.
Never recreate the logo/watermark. Faces preserve identity; wardrobe, pose,
accessories and environments may vary while related scenes retain chapter
continuity. Host participation in any particular scene is optional, but the
package declares all three current character masters and chapter wardrobes.
Every scene must reference its actual participating characters' face assets,
alongside original logo/watermark requirements. A SCENE alias cannot substitute
for a CHARACTER_MASTER, LOGO or WATERMARK requirement.

Root cause: T19 version 1 hardcoded two roles, a legacy learner and one shared
poster master; it had no way to bind the current host and three individual faces.
Minimum correction: version 2 retains the same top-level editorial fields but
uses exact founder/host/learner character records and logo/watermark/founder/host/
learner brand references. Names/master links derive from the existing inventory.
Wrong/swapped identities, missing roles and legacy cast cannot validate for new
production. Asset-purpose and wardrobe checks cover each participant.

Backward compatibility is deliberately explicit: historical version 1 evidence
remains in Git history, while new production must be reviewed and migrated to
version 2, with an incremented editorial revision, updated derivative revisions
and renewed approval. The illustrative template is now revision 2. No automatic
migration of real content occurs. The T20 reference is regenerated from this
snapshot, changing its source digest, bundle/distribution identities and face
asset requirements. Old distribution manifests/receipts cannot match the new
source. T20 derivation code and publishing boundaries remain unchanged.

T18's six categories, four pillars and nine recipes, existing CMS create/release,
asset MIME/size limits, authentication and database/runtime contracts are intact.
No approved identity is inferred from an editable status flag. Injected inventory
hash/MIME/size substitutions retain BRAND_UNVERIFIED blockers. Even the actual
local evidence cannot clear fixed production/human-QC/Founder-authorization gates.

Affected regression command (existing dependencies, automatic install disabled):

```powershell
pnpm --config.verify-deps-before-run=false exec node --test tests/t19-editorial-pipeline.test.js tests/t20-distribution-package.test.js
```

Final review result: **68/68 PASS** (T19 32, T20 36), zero failed/skipped/cancelled. Eight added
tests cover current roles/masters, legacy rejection, host continuity, version 1
rejection, evidence separation, metadata substitution, malformed participating
roles and T20 handoff/invalidation.
Existing Trial, provenance, recipe, privacy, malformed-input and approval tests
remain in the affected suites. No Group 03/T18/full build was repeated.

Resolved: original-reference availability, V1 MIME mismatch, local file integrity
and legacy/two-role future-template assumptions. Unresolved: authoritative private
storage READY/object identity, finished media, human visual/localization QC,
scoped Founder production approval and independent publishing authorization.
External social integration/Meta verification and automation remain deferred.
T21 is not started; these asset corrections await Founder review.

Final scope is exactly eight modified tracked text files: this document, the
existing brand inventory, T19 production template/validator/tests, T20 production
template/tests and `docs/t20-distribution-foundation.md`. No new or staged files
exist. T20 derivation code, T18, runtime, migrations, dependencies and deployment
files are unchanged. Secret/private-path checks and `git diff --check` pass.
All eight other worktrees retain HEAD/branch/status/index and the hashes/timestamps
of 113 dirty files. Private V1/V2 archive and V2 registry hashes remain unchanged.
HEAD stays at the approved T20 baseline; remote tracking stays 0 ahead/0 behind.

| Final affected tested input | Raw SHA-256 |
| --- | --- |
| Brand inventory | `876e07ab6b85bb888647b9af11c90518b7be086546c6632679df7cbff2bb318d` |
| T19 template | `e79ae2a1cf3b76f07ebcf89f41f5801e2cb68a0be0aeba4dc3c183ec1c407001` |
| T19 validator | `5574ad4b2508e3c3ccd725a2ce4e19cf2d9227cb9d3f1d887e4a82052f7aa75b` |
| T19 tests | `387501a5afa6ecb14138996e303c188cd9fdb4a252842a004630798248242420` |
| T20 template | `429f8b970ed1b6e0d4e0b601a3247ab5a0088c3a0f833b989d20368644abd994` |
| T20 tests | `8d8603291284ccb289a2516b550e60a9fb9bfc289cd35a7118b71e66adce723d` |

Both standalone T19/T20 validation CLIs return exit 0 and structural validity,
while visual production and Founder approval/publishing remain blocked; T20
handoff remains non-executable. Full audio decode, actual content production,
independent visual QC, cloud READY and live platform compatibility were not tested.

Focused final review reproduced one defect after the initial 67 passing tests:
an invalid object in a scene's participating-role list could reach the new
per-face lookup and trigger JavaScript property-key coercion/TypeError. The
validator now records the original invalid-reference error and filters unknown
or non-string roles before downstream wardrobe/master lookups; invalid input
does not become structurally valid. One regression test covers malformed role
types and confirms a legitimate scene may omit the host with matching wardrobe
and asset requirements. Only this validator, its tests and reconciliation
documentation were corrected during final review. Both affected suites were
rerun because the shared T19 dependency changed; no unrelated suite was run.
