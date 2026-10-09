# T09 public content delivery and discovery

PRD & Master Task Map v3.0, Group 02. Reuse the pushed T01–T08 baseline at
`7d7de26ae43c031ecbdf8bc0286cd5101966e433` on htc-trial/main.

## Re-baseline and proven gaps

| Requirement | Before T09 | Action |
| --- | --- | --- |
| A: Public list | PARTIAL | Existing RELEASED-only 100-record list cannot continue beyond its first batch |
| B: Public detail | SATISFIED | Reuse existing UUID read and uniform private/missing 404 |
| C: Identifier | SATISFIED | Keep canonical trial_content UUID; no slug model |
| D: Pagination | MISSING | Add bounded keyset continuation in the existing public route |
| E: Ordering | SATISFIED | Keep T06 creation time descending, UUID ascending |
| F: Discovery filter | PARTIAL | Reuse the existing category allowlist as an optional exact filter |
| G: Search | SATISFIED optional scope | Deferred; no required search gap or external service |
| H: Media | SATISFIED | Reuse T07B releasedAssetMetadata batch and safe projection |
| I: Response | PARTIAL | Keep legacy payloads; add a paged envelope only when requested |
| J: Access | SATISFIED | Anonymous public transport; caller JWT never elevates public reads |
| K: Lifecycle | SATISFIED | Every read filters current authoritative RELEASED state |
| L: Query safety | PARTIAL | New bounded continuation requires a narrow RPC and matching index |
| M: Errors | PARTIAL | Extend existing redacted errors to pagination and category inputs |
| N: Tests | PARTIAL | Add focused pagination/discovery cases and disposable SQL assertions |
| O: Regressions | SATISFIED baseline | Preserve all existing suites; rerun them and the build |

There is no architectural conflict. No second table, bucket, auth system, public
media library, UI, curriculum/LMS feature or T10 work is introduced.

## Public API contract

Existing requests remain unchanged:

- `GET /api/content`: up to 100 released records, existing array response.
- `GET /api/content?id=<uuid>`: existing detail response or uniform 404.
- Existing `assets=1`: optional safe metadata expansion on either request.

Paged discovery uses the same route, explicitly selected with `paged=1`:

- `GET /api/content?paged=1`
- `GET /api/content?paged=1&limit=20&category=INFORMATION&assets=1`
- Continue with the returned cursor in `cursor=<next_cursor>`.

Successful paged responses retain the Foundation wrapper:

```json
{ "ok": true, "data": { "items": [], "next_cursor": null } }
```

Items contain only id, category, title and body. With `assets=1`, each item also
has the existing asset projection: id, role, mime_type, width, height and
duration_seconds. No state, Founder identity, Storage path, original filename,
credential, download URL or release-workflow field is exposed.

Default limit is 20; allowed decimal limits are 1–100 without whitespace, leading
zeroes, fractions or coercion. Unknown/duplicate parameters, mixed detail/paged
requests, unsupported flags and malformed cursors return controlled 400 errors.
No category, limit or cursor is accepted on the legacy list/detail contract.

Optional category is exactly one existing value: INTRODUCTION, INFORMATION,
EDITORIAL, DISCOVERY, FUTURE_JOURNEY or VALIDATION. There is no invented taxonomy,
search, ranking, recommendation or personalization capability. Search/unknown
filter input is rejected rather than silently ignored.

## Ordering and cursor semantics

The canonical order is the existing `created_at DESC, id ASC`. Creation time is
stable under the T06 edit/release/withdraw flow; rerelease does not reorder a
record. This preserves existing list behavior and avoids a mutable release-time
cursor. UUID is the deterministic timestamp tie-breaker.

The versioned base64url cursor holds the last scanned record's UTC creation
timestamp, UUID and category context. PostgreSQL microseconds are preserved;
timestamps are not round-tripped through JavaScript milliseconds. Input is capped
at 512 characters, decoded canonically with strict UTF-8, validated, and sent as
typed RPC parameters. A cursor is a public position, not a secret, authorization
token or signed credential. Changing it cannot bypass the RELEASED predicate.

Continuation uses `created_at < anchor_time`, or equal time and `id > anchor_id`.
It never looks up the anchor row; withdrawal/deletion of the anchor cannot break
continuation. Category context must remain identical. The page size may change.
The SQL query fetches at most limit+1 candidate rows, returns at most limit items,
and returns a next position only when another candidate exists.

Every request sees current lifecycle state, not a frozen multi-request snapshot.
Newer records appear when refreshing the first page. A previously private record
released between page requests follows its original creation position and may
require refreshing earlier pages. This is intentional; no duplicate publication
state or snapshot-token system is created.

Media resolution performs at most one existing batch RPC after the content
query. A concurrent edit/withdrawal between those reads removes the expanded
record. The next cursor remains anchored to the scanned page even if its last
record disappears. Clients must continue while next_cursor is non-null, including
after a short/empty expanded page. There is no public binary access or N+1 query.

## Security and compatibility

Public queries always use the existing anonymous Supabase transport and
publishable key; USER/Founder request JWTs are ignored. Existing Founder mutations,
role helpers, table privileges, RLS, T06 lifecycle and T07A Storage policies remain
unchanged. Detail responses do not distinguish DRAFT, WITHDRAWN and missing IDs.
Configuration/upstream inconsistencies return redacted 500 responses. All API
responses retain no-store and nosniff headers.

The same private trial-assets bucket, asset lifecycle, relation roles, READY/object
consistency filtering and linked-asset delete guards remain authoritative.
No new dependency is required.

## Exact remote proposal and approval boundary

Local file: `supabase/migrations/20261009100000_public_content_discovery.sql`.
It adds only:

1. `trial_content_released_discovery`, a partial B-tree index on the existing
   trial_content `(created_at DESC, id ASC)` for RELEASED rows. The existing
   primary-key index does not provide this ordered continuation access path.
2. `public.read_released_content_page(integer,timestamptz,uuid,text)`, a stable
   security-definer read function with an empty search path. It validates limit,
   cursor-pair completeness/finite time and the existing category allowlist,
   filters RELEASED before bounded ordering, and projects four public fields.
3. Explicit revocation of default PUBLIC execution and execute grants to anon
   and authenticated for this narrow read function.

The existing T06/T07 RPCs are not replaced. No table, row, Storage object, bucket,
policy, role or auth function is altered. The separately approved migration was
applied and verified as remote version `20261009223612` on 2026-10-10.
The new paged mode requires this migration. It fails closed if the RPC is absent;
there is no fallback that silently truncates discovery to the first 100 records.

The implementation gate did not authorize remote mutation. A subsequent approved
database validation gate applied only this reviewed migration and authorized
temporary runtime fixtures and cleanup. No deployment or push occurred.

## Validation evidence and limits

`tests/content-discovery.test.js` exercises real handler code with controlled
upstream fixtures: public projection, private detail uniformity, deterministic
order/continuation, page bounds, invalid inputs, category context, anonymous/USER
equivalence, Founder regression, media safety and lifecycle changes. SQL source
inspection checks the additive query/grant/index contract. Fixture query behavior
is a simulation, not proof of PostgreSQL enforcement.

`tests/content-discovery.sql` is a transactional executable suite for an EMPTY
DISPOSABLE LOCAL Supabase database with repository migrations applied. It checks
actual anon/USER grants, 105-row continuation, tied ordering, microsecond precision,
category filtering, invalid parameters and lifecycle changes across an anchor.
Run only locally with psql and the explicit T09_LOCAL_DISPOSABLE acknowledgement;
never run against the linked project. All fixtures/probes roll back.

No local psql, Docker or Supabase CLI runner was found in this environment, so the
executable SQL suite has not run. Actual PostgreSQL enforcement was subsequently
validated through controlled live RPC and handler checks in the approved gate.
Validation on 2026-10-10: `pnpm test` passed all 131 local tests (T09 22, Group 01
15, T06 41, T07A 24, T07B 21, T08 8). `pnpm build` passed with exit code 0.
Remote runtime validation passed: 100+5 pagination, canonical ordering and
microsecond precision, category filtering, invalid-input rejection, anonymous/USER
public reads, Founder lifecycle, cursor-anchor withdrawal and READY media metadata.
Non-READY attachment and linked-asset deletion guards remained effective. Temporary
106 content rows, three asset rows, one relation and one uploaded file were removed;
all content/asset/relation/object counts returned to zero. Existing function,
constraint, policy and bucket fingerprints matched the baseline, excluding the
approved new discovery RPC. Temporary sessions were cleared and the callback
server stopped. Deployment and T10 remain outside this completed T09 gate.
