# T07B content and asset relations

Implementation, reviewed remote migration and controlled runtime validation are
complete. Remote migration version: `20261008234735` (`trial_content_assets`).
No push, deployment, UI, public binary delivery or T08 work is included.

## Relation and management contract

`public.trial_content_assets` relates canonical `trial_content.id` and
`trial_assets.id` through UUID foreign keys with ON DELETE RESTRICT. Fields are
id, content_id, asset_id, role and created_at. Each content/asset pair is unique.
Partial unique indexes allow at most one PRIMARY and one THUMBNAIL per content.
ATTACHMENT supports multiple resources with deterministic role/created_at/id
ordering; no editorial ordering or sort_order is required for this metadata list.
THUMBNAIL accepts IMAGE/THUMBNAIL assets; other roles accept any approved type.

POST `/api/content/assets/manage` reuses Foundation Founder authentication and the
original caller JWT. Its bounded JSON contract is:

- attach: action, content_id, asset_id, role
- detach: action, content_id, asset_id
- list: action, content_id

All identifiers must be UUIDs. No client path, email, status or security metadata
is accepted. Only READY assets in the private trial-assets bucket with an actual
matching object can attach. Invalid inputs, duplicate pairs, second PRIMARY or
second THUMBNAIL fail without changing content. Missing content/asset/relation
returns 404. Set/change a primary or thumbnail by detach then attach; there is no
speculative replacement endpoint. Failed replacement remains safely unpublished.

Successful attach/detach is a content edit. Under the same transaction/content
row lock, the existing T06 update RPC resets content to DRAFT and clears
released_at. Explicit release is still required. No T06 function is replaced.
Founder list returns safe relation fields, not storage paths or access capability.

## Public metadata resolution

The existing GET `/api/content` response is unchanged by default. Opt in with
`assets=1`, optionally with the existing `id` UUID parameter. RELEASED content
then includes assets containing id, role, mime_type, width, height and
duration_seconds. Null dimensions/duration remain null; no parser is added.

The bounded batch RPC rechecks RELEASED content, READY asset, private bucket and
matching actual object in one database snapshot. Missing/inconsistent/non-READY
objects are omitted. Empty assets are a valid result. A content edit/withdrawal
between the initial T06 read and the metadata query omits the entire record, or
returns 404 for an individual read. Rerelease restores eligibility. Every new
request rechecks the current state; previously returned metadata cannot be recalled.

Public resolution is metadata only, as permitted by the optional read-URL
contract. No download capability, signed URL, TTL, permanent public URL, storage
path or standalone public asset library is added. T07A's authenticated Founder
private-read flow remains the only binary-read mechanism. Public binary delivery
would require a separate architecture decision; this gate does not weaken Storage
policies or introduce service-role credentials. There are no stale signed URLs.

## Integrity and concurrency

Attach/detach locks content first and asset second. This serializes content edits,
relation mutations and T07A deletion against the same authoritative rows. Unique
constraints enforce pair/PRIMARY/THUMBNAIL races in the database. A new asset status
guard blocks transitions away from READY while any relation exists. The unchanged
T07A begin_delete therefore fails before physical deletion, leaving the asset
READY; its existing transport surfaces a controlled 500. Detach all relations
before deleting. Direct metadata deletion is also blocked by the asset foreign key.
Content deletion requires detaching its relations first; no blind cascade occurs.
The guard uses no content-row lock, avoiding a reverse content/asset lock order.

Relation RLS is enabled; direct PUBLIC/anon/authenticated table privileges are
revoked. Founder-only management uses the existing database is_founder helper.
Only the safe released-metadata RPC is executable by anon/authenticated. There are
no changes to Foundation roles, T06 migrations/RPCs or T07A Storage policies.

The migration creates new objects and a status trigger, but makes no immediate
changes to existing rows. Its function-body DELETE performs a future explicitly
requested detach; it is not executed during migration application.

## Validation boundary

Focused local tests cover handler authorization, projection, invalid inputs,
controlled errors and metadata visibility. SQL contract inspection checks foreign
keys, uniqueness, locks, READY guards and use of the existing T06 edit function.
These tests do not execute Postgres or establish remote concurrency behavior.
The separately authorized remote runtime gate passed actual Founder attach/detach,
release/withdraw/edit/rerelease transitions, USER/anonymous mutation denial,
uniqueness enforcement and linked-asset deletion blocking through the local route
exports with real Supabase calls. Public resolution exposed only safe metadata.
PENDING/DELETING attachment was rejected and these assets were absent from public
results; no invalid linked-state fixture was created by bypassing the guards.

One concurrent run per duplicate, PRIMARY and THUMBNAIL case produced exactly one
relation. In the attach/delete race, attach succeeded and deletion was blocked,
without an orphan. These observed executions do not establish every interleaving.
All temporary content, asset, relation and Storage object counts returned to zero.
Temporary sessions were cleared. Foundation/T06 and unrelated Storage fingerprints,
and the T07A catalog, matched the captured baseline after cleanup.

Local verification passed 101 tests: 21 T07B, 15 Group 01, 41 T06 and 24 T07A.
The production build passed. No remote mutation is authorized by the final local
review/commit gate; no deployment or further feature work has been performed.
