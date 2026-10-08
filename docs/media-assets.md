# T07A asset metadata and private storage foundation

The reviewed migration and private bucket/policies are applied to HTC Trial.
Remote migration version: `20261008223248` (`trial_assets`).
No content integration, UI, public media access, Foundation change or T07B work.

## Contract

Vercel handles bounded JSON control messages, never upload binaries. The sole
POST `/api/assets/manage` route uses the existing Foundation `authorize` helper
before reading input. Its JSON cap is 2,048 bytes; Supabase requests use the
original Founder session and existing publishable key. No service-role secret,
new dependency, custom identity system or signed upload credential is used.

Allowed logical types are IMAGE, VIDEO, AUDIO, THUMBNAIL and DOCUMENT. Exact MIME
allowlist: JPEG/PNG/WebP for IMAGE/THUMBNAIL; MP4 for VIDEO; MPEG audio for AUDIO;
PDF for DOCUMENT. Maximum binary size is 6,000,000 bytes, minimum one byte.
SVG, HTML, other formats, invalid extensions and traversal filenames are denied.
Original filenames must be ASCII letters/digits/dot/underscore/hyphen, begin with
a letter/digit, have at most 120 characters, and contain no `..` or separators.
The filename remains metadata only: paths use `<type>/<server-uuid>/asset.<ext>`.
No user filename, identity, email or credential enters the storage path.

## Requests and lifecycle

Reserve with exactly `action: reserve`, `request_id` (client retry UUID),
`asset_type`, `mime_type`, `original_filename` and integer `byte_size`.
Database-generated asset UUID and unique request_id enforce reservation retry
identity. Retrying with changed fields is rejected by SQL. Retries do not extend
the original ten-minute reservation. The response contains PENDING identity,
expiry and one upload URL, publishable headers, POST method and no-overwrite flag.
The client adds its existing Founder Authorization header and sends raw bytes
directly to Supabase Storage. It must reuse this reservation after transfer errors,
not silently create another reservation. No upload UI is provided.

Storage INSERT is limited to the standard `object.upload` operation, exact
reserved path, private trial-assets bucket, authoritative Founder identity and
unexpired PENDING reservation. No UPDATE/upsert, listing, copy/move, URL signing,
S3 or resumable capability is granted. Expiry and operation restrictions are SQL
policies, not instructions trusted to the client. A shared row lock serializes
the insertion check against cleanup. A trial-assets-only catalog guard rechecks
the reservation on actual insertion: Supabase checks RLS before transfer, then
completes its catalog write as an internal superuser. Without this guard a late
completion could recreate an object after reservation cleanup. The guard rejects
late/expired/unreserved objects and changed object identity/version/metadata;
unrelated buckets are untouched. Bucket MIME restrictions and 6,000,000-byte
limit remain authoritative even when the client ignores its declared size.

Finalize, read and delete accept exactly `action` and asset UUID `id`.
Finalization first inspects the exact stored object, private bucket, recorded
size and MIME. It requires declared size to equal stored size, then downloads
at most 512 bytes via a validated byte range to check recognizable file headers.
RPC finalization locks and rechecks the durable object metadata and reservation
expiry before READY. Repeated READY finalization preserves updated_at and returns
the same completed metadata; missing objects fail closed. The SQL RPC independently
verifies existence/size/MIME; byte-signature inspection runs in the HTC route.
Founder is the trusted publisher, and direct authorized Founder RPC calls are
not a separate hostile-client security boundary. USER/anonymous direct calls are
denied. Signature checks are format recognition, not full decoding, antivirus,
PDF active-content sanitization or proof that arbitrary bytes are harmless.

Only READY assets are returned as completed. Width, height and duration remain
null because no trusted parser/processing requirement is approved. No client
dimension/duration/status fields are accepted. Pending/deleting retry responses
are recovery records, not completed assets. An expired reservation retry returns
its identity with upload=null so a lost initial response can still be cleaned up.

Private read returns a fixed authenticated Storage download address requiring
the existing Founder session and publishable key. It is not a public URL and does
not proxy a binary response through Vercel. No signed URLs or T06 visibility rules.
Storage download/info access is Founder-only; PENDING download is permitted solely
for private inspection, while the HTC completed-read action requires READY.

## Failure recovery

PENDING reserves an upload; READY records a verified completed asset. DELETING
is necessary to prevent new uploads during cleanup and retain a retryable record
after physical deletion or metadata deletion fails. It is not moderation state.

- Reservation without upload: retry request_id to recover the asset ID; delete it.
- Upload with unavailable verification/finalization: retain PENDING; retry finalize
  before expiry, otherwise delete. Do not delete blindly after an ambiguous RPC
  timeout because finalization may already have committed.
- Size/MIME/signature mismatch: mark DELETING, remove exact object via Storage API,
  then remove metadata. Any failed compensation returns failure and retains the
  recovery row; retry delete with the same ID.
- Missing object: read/finalize returns not-found, never completed metadata; delete
  the reservation to recover. Repeated deletion of absent metadata succeeds.
- Delete: lock/mark DELETING; Storage delete; SQL confirms object absence before
  deleting metadata. Storage failure never reports success. Metadata removal
  failure leaves DELETING and a retry does not grant upload again.
- Unknown objects: never adopt them or accept caller paths. They cannot be created
  through the scoped upload policy. Out-of-band privileged objects require a
  separately reviewed recovery action; no broad destructive cleanup is included.
- Collision/overwrite: fixed UUID path plus unique database path; no UPDATE policy
  and no upsert. Retry finalization after an already-exists transfer outcome.

No queues or workers. Operators explicitly delete abandoned reservations by ID.

## Remote approval and validation

Review `supabase/migrations/20261008090000_trial_assets.sql` in full before approval.
It creates trial_assets, three narrow Founder functions, one private bucket,
three bucket-scoped policies and one bucket-scoped catalog guard trigger/function.
No existing migration, profile, role, auth helper or
trial_content object is changed. Direct table privileges remain revoked.

After explicit approval to apply the migration, validate actual private bucket
configuration, policy operation names and reservation lock behavior; raw Founder,
USER and anonymous Storage/RPC requests; all MIME/size boundaries; range support;
duplicate reservation races; upload/finalize/delete races; partial failure recovery
and exact agreement between objects and metadata. Runtime tests must use approved
disposable assets and clean them up through the Storage API. Local unit tests and
SQL contract inspection are not proof of deployed SQL/Storage enforcement.

Local verification: `pnpm test` and `pnpm build`. No separate TypeScript checker
exists in this JavaScript project. Commit, push and deployment need separate approval.

## Completed validation

All 80 local tests passed: 24 T07A, 15 Group 01 and 41 T06. The production build
passed again after controlled runtime validation using existing Founder and USER
Google OAuth sessions, held only in memory and cleared when the callback stopped.

The 68-byte PNG lifecycle passed reservation, direct private upload, signature
verification, READY finalization, deterministic repeat finalization, private read
and deletion. USER/anonymous management requests were denied. Invalid type, MIME,
oversize declarations, traversal filenames, missing objects, collisions and
overwrite attempts were rejected. Invalid signatures triggered compensation.

Ordered uploads after cleanup or in DELETING state were rejected, as were catalog
size/MIME mismatches. Guard exceptions surface as Storage HTTP 500/P0001. Concurrent
reservation retries retained one identity; simultaneous in-flight upload/cleanup
timing was not exercised. These checks do not prove every possible interleaving.

Four temporary reservation rows and two uploaded files were removed. Final counts
were zero asset rows and zero Storage objects. Foundation/T06 and unrelated Storage
fingerprints remained unchanged. No deployment or T07B work occurred.
