> Historical dated record. Current T14 FULL PASS acceptance: `t14-final-acceptance-20261018.md`. Earlier failures and blockers below are preserved history.

# T14 signed direct upload prerequisite review

Historical prerequisite review, retained for provenance. Founder subsequently
approved the minimal policy migration; it was applied once on TEST as
20261015220202_t14_signed_direct_upload_policy. See validation/t14 for execution,
readback and runtime evidence. Sections describing pending approval below record
the pre-approval state, not the current database status.

## Preserved baselines

- Repository: holictraderscompany-art/htc-trial.
- Isolated branch: codex/t14-signed-direct.
- Base: 3b3417d8b7b273fb1b60b10c37c2ea437711a0aa (completed T13).
- Existing T14/T15/T16 source remains in the reconciliation worktree at
  9a2e766ddf0a40201249776122e357ca7f44d422, including its uncommitted changes.
- No existing source was copied over, modified or discarded. Product/hunk
  reconciliation remains pending the prerequisite gate.

## Verified TEST database evidence

Read-only Supabase connector inspection confirmed project
uzhkzhmncxjplrdtdzgd = HTC-Trial-Test-DB, ACTIVE_HEALTHY, PostgreSQL 17.11.
All eight expected migration versions remain present:
20261012061832, 20261012062050, 20261012062052, 20261012062053,
20261012062054, 20261012062323, 20261012062809, 20261014232339.
This was a version/name readback, not a fresh SQL-body integrity audit.

The trial-assets bucket is private, file_size_limit=6000000, with the six
existing MIME types: image/jpeg, image/png, image/webp, video/mp4, audio/mpeg,
application/pdf. No bucket changes are proposed.

The only INSERT policy for storage.objects is trial_assets_upload, TO
authenticated, with predicate:

    storage.allow_only_operation('object.upload')
    AND public.trial_asset_upload_allowed(bucket_id, name)

The existing predicate function requires auth.uid(), database is_founder(),
the exact private bucket, an unexpired PENDING reservation and a matching path,
holding a shared asset lock. Signing uses a different Storage operation, so the
current policy does not authorize it. No authentication probe or signed token
was generated to reach this conclusion.

## Minimum proposed correction - NOT APPLIED

Review SQL: validation/t14/signed-upload-policy-review.sql. It is deliberately
outside migration directories and must not be treated as an approved migration.

Change only the operation allowlist of trial_assets_upload to:

    storage.allow_any_operation(ARRAY['object.upload', 'object.sign_upload_url'])
    AND public.trial_asset_upload_allowed(bucket_id, name)

This permits Founder-authorized signing for an existing exact reservation. It
does not grant anon/USER access, UPDATE/upsert, object listing, download signing,
public access, or arbitrary paths. Existing Founder, expiry and private-bucket
checks remain mandatory. SELECT/DELETE policies, functions, triggers, schemas,
grants and existing migration history are not changed by the proposed SQL.

The SQL includes BEGIN/COMMIT and aborting pre/postcondition checks. Its syntax
and assertions have not been executed; no PostgreSQL runtime PASS is claimed.
Permission to create/apply a new migration is required by the latest Founder
instruction. Do not change existing migration files or replay any migration.

## Signed capability and reservation safety

Official API documentation states signed upload URLs require no further
authentication and last two hours. This does not extend HTC's existing ten-minute
reservation or imply revocation on logout. Treat the URL/token as an ephemeral,
path-scoped secret: no logs, persisted browser state, traces or evidence exports.

Existing guard_trial_asset_object was inspected on TEST. It rejects catalog
insertion when the reservation is missing, expired or not PENDING, and rejects
MIME/size mismatch and immutable-object changes. This is essential because the
official signed-upload route verifies the capability and uploads as a superuser;
caller INSERT RLS is not a per-use revocation guarantee. Do not weaken the guard
or extend reservation expiry to match the token TTL. READY, DELETING and deleted
reservations must remain protected against token reuse and late completion.

Signing itself probes INSERT permission. The deployed signer must be tested for
compatibility with the catalog trigger and its temporary metadata. Current
upstream accepts metadata hints, but this does not establish deployed-version
behavior. If the signer fails the trigger after the approved policy correction,
STOP and report the exact error; trigger changes are not covered by this proposal.
Do not bypass with a service-role key or disable RLS/triggers.

## Pending continuation after approval

1. Recheck target and unchanged policy baseline, then apply the separately
   approved additive migration once, atomically, with no automatic retry.
2. Verify actual signed URL issuance with the existing Founder HttpOnly session,
   publishable key and no upsert; verify USER/anonymous signing denial.
3. Reconcile only existing T14 source/hunks. Replace binary proxy transport with
   server-side signing JSON control and browser-to-TEST-Storage binary transfer.
   Never expose the primary session or accept a client-selected storage path.
4. Keep Foundation finalize/signature checks, guarded DRAFT relations and secure
   deletion. Retain reservation identity during ambiguous outcomes; no blind retry.
5. Validate live upload/finalize/delete, invalid MIME/size/path, stale/expired
   reservations, overwrite/replay denial, lifecycle/relationship conflicts,
   session expiry, direct USER/anonymous access, responsive UI and no binary
   delivery through Next.js. Preserve OAuth accounts and unrelated objects.
6. Run scoped tests, full regression, production build and browser acceptance;
   report LOCAL versus LIVE evidence distinctly. No commit/push/deploy/T15-T17.

## Official supporting sources

- https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl
- https://github.com/supabase/storage/blob/master/src/http/routes/object/getSignedUploadURL.ts
- https://github.com/supabase/storage/blob/master/src/http/routes/operations.ts
- https://github.com/supabase/storage/blob/master/src/storage/object.ts
- https://github.com/supabase/storage/blob/master/src/storage/uploader.ts
- https://github.com/supabase/storage/blob/master/src/http/routes/object/uploadSignedObject.ts

Upstream master is supporting implementation evidence, not proof of the deployed
Storage version. Changelog markdown fetch was unavailable; no compatibility PASS
is inferred from that unsuccessful fetch. All cloud reads targeted TEST only.
