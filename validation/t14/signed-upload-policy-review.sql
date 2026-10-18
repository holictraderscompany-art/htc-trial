-- REVIEW ONLY. NOT A MIGRATION. NOT EXECUTED.
-- Requires separate Founder approval before migration creation/application.
-- Authorized target: uzhkzhmncxjplrdtdzgd ONLY.
-- The executor must verify project identity outside SQL before submission.
-- Submit atomically, once; no automatic retry. Never replay existing migrations.
BEGIN;

DO $precondition$
DECLARE p record;
BEGIN
  SELECT polcmd, polpermissive, polroles,
    pg_get_expr(polwithcheck, polrelid) AS predicate
  INTO STRICT p FROM pg_policy
  WHERE polrelid = 'storage.objects'::regclass AND polname = 'trial_assets_upload';
  IF p.polcmd <> 'a' OR NOT p.polpermissive
    OR p.polroles IS DISTINCT FROM ARRAY['authenticated'::regrole::oid]
    OR p.predicate IS DISTINCT FROM
      '(storage.allow_only_operation(''object.upload''::text) AND trial_asset_upload_allowed(bucket_id, name))'
  THEN RAISE EXCEPTION 'Unexpected upload policy baseline; stop'; END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='storage.objects'::regclass)
    OR NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id='trial-assets'
      AND NOT public AND file_size_limit=6000000)
  THEN RAISE EXCEPTION 'Storage protection baseline mismatch; stop'; END IF;
END;
$precondition$;

ALTER POLICY trial_assets_upload ON storage.objects
WITH CHECK (
  storage.allow_any_operation(ARRAY['object.upload', 'object.sign_upload_url'])
  AND public.trial_asset_upload_allowed(bucket_id, name)
);

DO $postcondition$
DECLARE p record;
BEGIN
  SELECT polcmd, polpermissive, polroles,
    pg_get_expr(polwithcheck, polrelid) AS predicate
  INTO STRICT p FROM pg_policy
  WHERE polrelid='storage.objects'::regclass AND polname='trial_assets_upload';
  IF p.polcmd <> 'a' OR NOT p.polpermissive
    OR p.polroles IS DISTINCT FROM ARRAY['authenticated'::regrole::oid]
    OR p.predicate IS DISTINCT FROM
      '(storage.allow_any_operation(ARRAY[''object.upload''::text, ''object.sign_upload_url''::text]) AND trial_asset_upload_allowed(bucket_id, name))'
  THEN RAISE EXCEPTION 'Unexpected upload policy result; rollback'; END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='storage.objects'::regclass)
    OR NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id='trial-assets'
      AND NOT public AND file_size_limit=6000000)
  THEN RAISE EXCEPTION 'Storage protection changed; rollback'; END IF;
END;
$postcondition$;

COMMIT;
