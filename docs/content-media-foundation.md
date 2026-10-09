# T08 content asset and media foundation

MASTER v2 T01–T39, Group 02. Re-baseline, not rebuild.

## Verified starting point

The clean local main branch, origin/main and live remote main were aligned at
`733e7d6f3b106199713996a8f3b557d9bddef38b` in
`holictraderscompany-art/htc-trial`. This is the completed T07B commit.
Group 01, T06, T07A and T07B remain the authoritative implementation.

Read-only inspection of HTC Trial Supabase project `vzkbcgfywyhtvprxpwfb`
confirmed the existing private bucket, T07A catalog and T07B relation/functions.
Asset rows, relation rows and Storage objects were zero. The T07A catalog matched
the captured validation baseline. Foundation/T06 and unrelated Storage
fingerprints matched the previous runtime cleanup snapshot. No remote writes,
test sessions, uploads or new runtime fixtures were used in T08.

## Requirement matrix established before implementation

SATISFIED means the required behavior already exists. PARTIAL identifies a gap in
coverage or documentation, rather than a missing runtime architecture.

| ID | T08 requirement | Starting classification | Existing evidence / T08 gap |
| --- | --- | --- | --- |
| A | Asset storage | SATISFIED | T07A trial_assets reservation and private direct upload |
| B | Asset metadata | SATISFIED | Canonical UUID, type, MIME, filename, byte size, lifecycle and nullable dimensions/duration |
| C | Media type contract | SATISFIED | IMAGE, VIDEO, AUDIO, THUMBNAIL, DOCUMENT; SQL and server allowlists |
| D | Content-asset relation | SATISFIED | T07B trial_content_assets with restrictive UUID foreign keys |
| E | Primary media | SATISFIED | PRIMARY role, partial unique index, duplicate rejection |
| F | Thumbnail media | SATISFIED | THUMBNAIL role, image-only attachment and partial unique index |
| G | Attachments | SATISFIED | Multiple distinct ATTACHMENT relations, deterministic ordering |
| H | Private storage | SATISFIED | One private trial-assets bucket; authenticated Founder binary reads |
| I | Public released resolution | SATISFIED | Existing assets=1 safe metadata expansion and anonymous batch RPC |
| J | Draft/withdrawn privacy | SATISFIED | RELEASED database filter, lifecycle recheck, no public binary capability |
| K | Founder mutation | SATISFIED | Existing server authorize plus authoritative is_founder RPC checks |
| L | USER/anon restriction | SATISFIED | Management denial and no direct API-role table rights; safe public metadata only |
| M | Delete integrity | SATISFIED | Linked status guard, restrictive foreign keys, explicit detach and retryable deletion |
| N | MIME / size safety | SATISFIED | Six MIME values, matching extensions, 6,000,000-byte cap, bounded signature recognition |
| O | Path safety | SATISFIED | Server UUID path, unique path, no client path or overwrite |
| P | RLS | SATISFIED | Canonical tables enable RLS; narrow definer RPC grants and empty search paths |
| Q | Storage policies | SATISFIED | Founder-only scoped upload/read/delete operations, no UPDATE/upsert policy |
| R | Consistency / race protection | SATISFIED | Content then asset row locks, unique constraints, actual object checks and catalog/status guards |
| S | Test coverage | PARTIAL | Existing 101 tests and approved runtime gates; missing mixed-MIME public composition and full batch-boundary cases |
| T | Documented contract | PARTIAL | Existing separate T07A/T07B contracts; missing one MASTER v2 T08 mapping |

MISSING: none. CONFLICT: none against the supplied MASTER v2 T08 contract.
The T08 additions close S and T without changing runtime behavior.

## Reused contract

Canonical tables remain `public.trial_content`, `public.trial_assets` and
`public.trial_content_assets`. Storage remains the single private `trial-assets`
bucket. There is no separate media table, bucket, API or upload system.

| Logical type | Accepted MIME | Filename extension |
| --- | --- | --- |
| IMAGE / THUMBNAIL | image/jpeg | jpg / jpeg |
| IMAGE / THUMBNAIL | image/png | png |
| IMAGE / THUMBNAIL | image/webp | webp |
| VIDEO | video/mp4 | mp4 |
| AUDIO | audio/mpeg | mp3 |
| DOCUMENT | application/pdf | pdf |

Binary size remains 1 through 6,000,000 bytes. Vercel receives bounded JSON
control requests; upload binaries go directly to Supabase under the existing
Founder session. `/api/assets/manage` retains reserve/finalize/read/delete.
`/api/content/assets/manage` retains attach/detach/list. `/api/content/manage`
retains the authoritative T06 create/update/read/release/withdraw lifecycle.

Asset states remain PENDING, READY and DELETING. Only READY assets with matching
actual private objects may attach. Content states remain DRAFT, RELEASED and
WITHDRAWN. Successful relation mutation is a content edit: it resets to DRAFT and
clears released_at through the existing T06 update function. Release is explicit.
There is at most one PRIMARY and one THUMBNAIL per content, no duplicate pair,
and multiple distinct ATTACHMENT relations are allowed. Detach linked assets
before deleting; failed physical cleanup retains retryable DELETING metadata.

`GET /api/content` retains its original four-field response by default.
`assets=1` adds only asset id, role, mime_type, width, height and duration_seconds
for currently RELEASED content with READY consistent assets. Both content and
metadata batches are bounded to 100 content IDs. Empty assets remain valid for a
released record. A record absent from the lifecycle recheck is omitted, rather
than returned with stale metadata. Caller JWTs do not elevate public resolution.

Safe metadata resolution satisfies this T08 contract. Public binary delivery,
signed URLs, transcoding, metadata extraction, galleries, playlists and UI are
not required. Dimensions/duration remain null unless populated by separately
approved trusted logic. Signature checks recognize file headers; they are not
full decoding, malware scanning or PDF sanitization. No LMS/curriculum concept is
introduced. Previously returned metadata cannot be recalled after withdrawal.

## Evidence and implementation boundary

Existing sources: `src/server/media-assets.js`, `src/server/content-assets.js`,
`src/server/content-release.js`, their existing routes and the T06/T07A/T07B
migrations. Detailed contracts remain in `docs/media-assets.md`,
`docs/content-assets.md` and `docs/content-release.md`; their task-era statements
describe the respective gates and do not replace this current T08 mapping.

T08 adds only `tests/content-media-foundation.test.js`, this document and the
minimum package.json test-command extension. No production code or migration is
changed. The eight focused tests cover mixed approved MIME types and roles,
three thumbnail MIME variants, safe projection without credentials/paths, the
100-content anonymous batch, lifecycle omissions, atomic rejection of inconsistent
later metadata and rejection of an oversized upstream content batch.

These are local handler tests with controlled upstream responses. They do not
execute PostgreSQL, upload binaries or prove every concurrent interleaving.
Existing T07A/T07B remote runtime evidence remains applicable because their code,
SQL, policies and architecture are unchanged. No fresh live upload/concurrency
validation is claimed. New behavior requiring remote changes would need a
separate explicit approval gate.

Validation completed on 2026-10-09: `pnpm test` passed all 109 tests (T08 8,
Group 01 15, T06 41, T07A 24, T07B 21). `pnpm build` passed with exit code 0.
All A–T requirements are satisfied after the coverage/documentation additions;
no remaining partial, missing or conflicting requirement was identified.
No commit, push, deployment, remote apply or T09 work is authorized by this gate.
