# T18 — Trial content strategy and taxonomy

Prepared 25 October 2026 JST for Founder review. Authority: the Founder T18
execution request, unchanged Master Task Map v3.0, DESIGN.md and the approved
Group 03 handover. Base: `266b5612c493201ff2b271d87b52ee625cbaaece` on
`codex/group04-t18`, including the verified Workers implementation. Group 03
remains CLOSED. This document grants no commit, publishing or deployment authority.

## Decision and scope

T18 establishes an editorial contract. Existing CMS, database, API, asset and
release contracts already support introductory website articles. No schema,
runtime, configuration, dependency, role or lifecycle change is necessary to
define the remaining editorial dimensions. The companion
[taxonomy reference](t18-content-taxonomy.json) is documentation read by focused
tests, not a runtime configuration or a second CMS. It stores no live records.

The goal is international HTC awareness through useful, accessible introductory
content. Each topic communicates one central idea, supports a website article
and can be adapted to every approved platform. Preserve **Educate → Empower →
Elevate** and **Learn → Grow → Rise** as brand framing, without turning the
journey into a curriculum or tracked progression.

## Classification model

Keep the existing six values exported as `contentCategories` by
`src/server/content-release.js` authoritative. Category describes the editorial
purpose; the companion `category_purpose` map explains each existing value and
derives purpose without introducing a second stored purpose field.

| Existing category | Editorial use | Required boundary |
| --- | --- | --- |
| INTRODUCTION | HTC identity, orientation, Trial context | Truthful current availability |
| INFORMATION | Introductory definitions and explanation | Sources and limits distinguish fact from opinion |
| EDITORIAL | Context, reflection and a clear point of view | No disguised lesson or unsupported certainty |
| DISCOVERY | Finding available introductory resources | Link only to real RELEASED public destinations |
| FUTURE_JOURNEY | Explain future direction | January 2027 curriculum is future context, never currently available |
| VALIDATION | Explain Trial scope or substantiated status | No private operations, fabricated metrics or internal evidence dumps |

Four primary pillars provide the brand lens. They are editorial annotations,
not new category values, database columns, permissions or learning levels.

| Pillar | Distinct job | Example topic angle, not produced content |
| --- | --- | --- |
| Education | Make one introductory concept understandable | What the HTC Trial offers today |
| Learning | Encourage informal reflection and independent reading | How to reflect on a public article without a prescribed sequence |
| Knowledge | Clarify definitions, evidence and uncertainty | Distinguishing a source from an opinion |
| Community | Communicate shared values and respectful participation | What constructive educational discussion looks like |

Choose one primary pillar, one primary classification and one category per
topic. Any pillar can use any existing category when its actual purpose fits;
there is no forced one-to-one conversion. Audience describes intent only.
Initial classification and audience vocabularies are in the companion reference.
They are proposed T18 editorial definitions for review, not claims that a content
library exists. Additional vocabulary needs an explicit editorial rationale and
reference update, not a database migration or a new permission.

## One topic, multiple representations

Use one stable editorial `topic_key` for a central claim, audience, evidence and
Trial review. This key is not a `trial_content.id`, public URL or new database
entity. An article anchors the explanation; social forms adapt its substance
and evidence. A condensed video cannot silently broaden the claim or lose its
qualification. Do not paste identical copy across all destinations.

| Platform | Required representation capacity | Adaptation rule |
| --- | --- | --- |
| Instagram | Carousel, 1–8 slides; animated 3D Reels | One idea with a clear visual sequence and readable qualification |
| Facebook | Carousel or album; animated 3D Reels | Choose carousel or album per brief; preserve the same source topic |
| TikTok | Photo carousel, 1–8 slides; animated video | Adapt pacing, captions and narration while retaining meaning |
| YouTube | Explanatory video, 10–15 minutes; Shorts | Long form develops the same idea; Shorts preserve the source claim and limits |
| HTC Website | Supporting article for every topic | Readable plain-text explanation with appropriate public source attribution |

The JSON recipes express representation capacity, not scheduled deliverables
or a production queue. The nine-entry illustrative bundle creates no content,
asset or approval. Its eligibility is unreviewed, identifiers are null and slide/
shot sequences are empty. Facebook has no additional hard slide limit defined
by this T18 contract. Short-video durations, aspect ratios and delivery encoding
are decisions for the approved T19 brief/T20 platform integration, not invented
platform specifications here.

For future production, preserve a source-topic link for every derivative and
translation. Record the actual BCP 47 source and output language tags; `en` in
the example is illustrative, not an English-only policy or automatic localization.
Use a new topic key when the central subject changes, and preserve the key when
only format, language or wording changes. Maintain explicit source/version
provenance in the future editorial handoff; do not infer identity from matching
titles. Translation must preserve risk language, names, brand terms and Trial
availability. A qualified human reviews localized claims before release.

## Metadata ownership and current compatibility

| Information | Existing owner / representation | T18 treatment |
| --- | --- | --- |
| Content identity | `trial_content.id`, server-generated UUID | Reuse after actual creation; never substitute `topic_key` |
| Category and purpose | Existing `category` allowlist | Store category once; derive purpose from the map |
| Title and article | Existing `title` and `body` | Plain text, 1–200 / 1–8000 Unicode characters; no angle brackets |
| Release state/timestamps | Existing `state`, `created_at`, `updated_at`, `released_at` | Read server values; no editorial state override |
| Pillar, topic, classification, audience | Editorial-only annotations | Document in the T19 brief; no current CMS persistence field |
| Source/derivative links and localization | Editorial-only topic key, language and provenance | No new relational table or API field in T18 |
| Trial eligibility and claim sources | Human editorial review | Null/unreviewed or rejected is not ready for release; a true annotation grants no permission |
| Media | Existing `trial_assets`, `trial_content_assets` | Reuse real UUIDs, READY guards and PRIMARY/THUMBNAIL/ATTACHMENT roles |
| Slide/shot order | Future editorial sequence | Never infer it from attachment creation order or relation IDs |

The existing Founder create payload remains exactly action/category/title/body;
update adds the existing content UUID. Do not send the whole topic bundle to
the endpoint. Do not put JSON front matter, private review notes, topic keys,
source manifests or credentials inside public `body`. Use only the normal
public-facing article prose and safe citations. Do not add hidden metadata to
title or abuse asset filenames as a registry.

| Editorial format | Existing asset representation, when needed |
| --- | --- |
| Carousel / photo carousel / album | Distinct IMAGE assets using existing JPEG, PNG or WebP support; order stays in the editorial brief |
| Reels / animated video / explainer / Shorts | Existing VIDEO asset with video/mp4; editorial format does not create another asset type |
| Supporting article | Existing plain-text body; no mandatory binary asset |
| Preview thumbnail | Existing image-compatible THUMBNAIL relation, subject to uniqueness and READY guards |

The website recipe references the supporting article's actual content UUID;
it does not create a second article. A media derivative can reuse its article's
existing asset relations where appropriate; do not create extra CMS records
just to imitate social posts. Real alternative articles/localizations may use
independent existing records later, with their actual UUIDs explicitly linked
in the editorial handoff. There is no persisted topic-bundle API today.

An 8,000-character article is a supporting explanation, not necessarily a full
10–15-minute video transcript. Full scripts and ordered carousels are future
editorial outputs, not oversized CMS bodies or a reason to relax validation.
Asset relations support one PRIMARY, one THUMBNAIL and multiple ATTACHMENTs;
their deterministic metadata order is not semantic slide order. Retain the
existing 6,000,000-byte upload cap and approved MIME/type rules. Long-form media
may not fit; identify actual encoding/size requirements during T19 and obtain
separate approval before changing any storage/delivery contract.

## Lifecycle and access boundaries

T13 Founder content editing remains DRAFT-only. RELEASED and WITHDRAWN records
are read-only there. T15 owns explicit release and withdraw operations:
DRAFT or WITHDRAWN may become RELEASED, and RELEASED may become WITHDRAWN,
subject to the existing authoritative guards. T14 guarded relation changes
remain DRAFT-only. The retained legacy T06/T07 edit/reset-to-DRAFT contract is
unchanged; it is not a new editorial route around T13/T15 controls.

Editorial eligibility is a human check before an authorized release, not a
replacement release state or an automatic classifier. Selecting a category
cannot establish the meaning or safety of prose. There is no automatic
curriculum activation in January 2027.

Public T09/T10 discovery still accepts only existing category filters and
returns RELEASED article projections: id/category/title/body. Optional assets
remain safe metadata only. Public paths expose no topic briefs, internal
review decisions, private paths, binaries or signed capabilities. DRAFT and
WITHDRAWN remain unavailable publicly. Neither logged-in USER status nor
editorial audience labels grant Founder privileges. All existing server/database
authorization, HttpOnly session, Origin, RLS and no-store behavior is retained.

## Trial editorial gate

Founder review must establish all of the following before later publication:

- The content is introductory and educational during September–December 2026.
- It contains no actual lesson, ordered curriculum, learning module, quiz,
  assessment, enrollment, progress tracking or public LMS dashboard, including
  those disguised under Learning, EDITORIAL or FUTURE_JOURNEY.
- Facts have identifiable sources; opinion, uncertainty and future plans are
  explicit. Do not imply guaranteed returns or guaranteed financial outcomes.
- Claims and qualifications stay consistent across article, carousel, video
  and localization. Do not invent testimonies, evidence, performance or activity.
- Internal evidence, user data, private asset references and authorization data
  are excluded from public-facing prose.
- Published visual assets use the approved original HTC logo and the unchanged
  required watermark. No recreated logo or replacement watermark is acceptable.
- Cinematic stylized 3D storytelling preserves the approved master identities:
  Founder **Muhammad Devry Handoyo** and learner **Ahmad Muhammad Aries Fathul Ilmi**.
  Faces remain consistent; clothing, environments and poses vary only under
  existing continuity rules. Approved reference assets control the result.

This is an editorial checklist, not a new approval system or automated prose
moderator. T18 generates no characters, logos, watermark files, scripts or media.
The repository icon is not evidence of the approved master logo. No canonical
logo/watermark/character master asset identifiers were established by this
targeted repository inspection. T19 must obtain the existing approved originals
and continuity references before asset production; it must not invent them.

## VOICE PROFILE

Author: HTC institutional brand, not a personal Founder imitation.
Goal: Clear international educational communication within Trial scope.
Confidence: Explicit brand rules are confirmed; stylistic detail is limited by
the absence of a reviewed corpus of published HTC examples in this task.

Source Set: Founder T18 request; DESIGN.md; Master Task Map v3.0.
Rhythm: Natural sentences with a concrete opening and a clear explanation.
Compression: One central idea per output; expand only for understanding.
Capitalization: Conventional, preserving HTC names and approved brand phrases.
Parentheticals: Brief qualifications only; no distracting asides.
Question Use: Ask only when it helps understanding, never as engagement bait.
Claim Style: Evidence-backed facts, explicit opinion and honest uncertainty.
Preferred Moves: Concrete introductory examples and a consistent visual story.
Banned Moves: Generic AI phrasing, hype, fake authority, fabricated outcomes.
CTA Rules: Only truthful, available public destinations; no implied enrollment
or promised outcomes. Publication requires separate authorization.
Channel Notes: Instagram/Facebook/TikTok use the approved visual forms;
YouTube develops the source idea; the website provides the supporting article.

## T19 and later dependencies

T18 supplies classification, metadata ownership, adaptation constraints and a
reviewable reference example. T19 can design a production/editorial handoff
after Founder accepts T18. It still needs approved topic selection, actual
audience/language choices, source review and approved brand master references.
No production schedule, pipeline automation or publishing integration is built.

If future work needs structured metadata inside the CMS, public topic/locale
filters, semantic carousel ordering or public binary/video delivery, propose
the exact missing contract, security impact and smallest change for separate
Founder authorization. The current plain-text fields and metadata-only public
media boundary cannot be described as already supporting those features.
T20 distribution, T21 SEO, T22–T23 community operations, T24 monetization and
T25 analytics may consume this editorial vocabulary later; none is implemented.

## Targeted validation

See `tests/t18-content-taxonomy.test.js`. Only the T18 reference and its mappings
are new; existing runtime/security sources remain unchanged. New checks use the
actual existing content validators/projections and controlled in-memory public
responses, with no real network, database, authentication or Storage operations.
They do not repeat the Group 03 suite or prove live RLS/concurrency enforcement.
Human semantic/brand approval and future production readiness remain separate.

Executed in the isolated Group 04 worktree:

```powershell
pnpm --config.verify-deps-before-run=false exec node --test tests/t18-content-taxonomy.test.js
```

Result: **7/7 PASS**, zero failures. Coverage: existing category/purpose mapping
and public category parsing; approved platform/format/length coverage; topic,
language and source-reference integrity; exact CMS payload compatibility and
metadata rejection; lifecycle projection; public field projection and rejection
of nonreleased upstream rows; anonymous/USER denial and Founder payload rejection
with no mutation RPC reached. The public/Founder cases use injected responses,
not actual authentication or database calls. No Group 03 test suite was rerun.

The initial ordinary `pnpm exec` invocation initiated pnpm 11's automatic
dependency verification/install and was interrupted before tests ran. A first
focused test run then caught a test-fixture configuration error (missing explicit
TEST target and an obsolete Authorization expectation); only the new test fixture
was corrected to match the existing anonymous transport contract. The command
above disables automatic installation for this invocation and needs only Node
built-ins. No dependency declaration, lockfile, pnpm configuration, application
source or environment setting was changed. An ignored partial `node_modules`
scaffold from the interrupted attempt is not a deliverable or evidence of a
completed installation.

The runtime, migrations, dependency declarations, Workers/deployment configuration
and original closure evidence are unchanged. Their approved retained evidence is
reused through the Group 03 handover; no fresh LIVE role, RLS, Storage, concurrency,
browser, build or production-readiness PASS is claimed. No semantic content
classifier is implemented: human Trial and brand review remains mandatory.

Final scope checks: `git status --short --untracked-files=all` reports exactly
this document, `docs/t18-content-taxonomy.json` and
`tests/t18-content-taxonomy.test.js` as untracked additions. Both
`git diff --name-only` and `git diff --cached --name-only` are empty. Per-file
`git -c core.autocrlf=false diff --no-index --check -- NUL <file>` emits no
whitespace diagnostics (the no-index difference exit status is expected for
new files). Both closure files remain byte-identical to HEAD. Eight previous
worktrees retain their HEAD, branch, status, index hash and all 113 dirty-file
hashes/timestamps from the preserved snapshot. No existing work was overwritten.

Recommended future commit scope is exactly these three additions, after explicit
Founder approval. Suggested message: `docs(content): define T18 trial strategy and taxonomy`.
No commit, push, deployment or T19 work was performed.

**T18 — READY FOR FOUNDER REVIEW.** No schema or infrastructure prerequisite
blocks this editorial contract. T19 production prerequisites are listed above;
T18 does not assert they have been fulfilled.
