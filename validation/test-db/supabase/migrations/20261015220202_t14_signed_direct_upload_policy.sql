-- T14 approved TEST-only signed direct upload policy correction.
-- Project identity must be verified by the executor: uzhkzhmncxjplrdtdzgd.
-- One atomic statement; migration history is managed by apply_migration.
DO $t14_policy$
DECLARE p record;
BEGIN
  SELECT polcmd,polpermissive,polroles,pg_get_expr(polwithcheck,polrelid) AS predicate
  INTO STRICT p FROM pg_policy
  WHERE polrelid='storage.objects'::regclass AND polname='trial_assets_upload';
  IF p.polcmd<>'a' OR NOT p.polpermissive
    OR p.polroles IS DISTINCT FROM ARRAY['authenticated'::regrole::oid]
    OR p.predicate IS DISTINCT FROM
      '(storage.allow_only_operation(''object.upload''::text) AND trial_asset_upload_allowed(bucket_id, name))'
  THEN RAISE EXCEPTION 'Unexpected upload policy baseline'; END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='storage.objects'::regclass)
    OR NOT EXISTS(SELECT 1 FROM storage.buckets WHERE id='trial-assets' AND NOT public
      AND file_size_limit=6000000 AND allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp','video/mp4','audio/mpeg','application/pdf']::text[])
  THEN RAISE EXCEPTION 'Storage protection baseline mismatch'; END IF;
  IF (SELECT count(*) FROM supabase_migrations.schema_migrations)<>8
    OR (SELECT md5(string_agg(row(version,name,statements)::text,'' ORDER BY version)) FROM supabase_migrations.schema_migrations)<>'0741971c95577bbe43f7754ed54dba88'
  THEN RAISE EXCEPTION 'Migration history baseline mismatch'; END IF;

  ALTER POLICY trial_assets_upload ON storage.objects WITH CHECK (
    storage.allow_any_operation(ARRAY['object.upload','object.sign_upload_url'])
    AND public.trial_asset_upload_allowed(bucket_id,name)
  );

  SELECT polcmd,polpermissive,polroles,pg_get_expr(polwithcheck,polrelid) AS predicate
  INTO STRICT p FROM pg_policy
  WHERE polrelid='storage.objects'::regclass AND polname='trial_assets_upload';
  IF p.polcmd<>'a' OR NOT p.polpermissive
    OR p.polroles IS DISTINCT FROM ARRAY['authenticated'::regrole::oid]
    OR p.predicate IS DISTINCT FROM
      '(storage.allow_any_operation(ARRAY[''object.upload''::text, ''object.sign_upload_url''::text]) AND trial_asset_upload_allowed(bucket_id, name))'
  THEN RAISE EXCEPTION 'Unexpected upload policy result'; END IF;
  IF (SELECT md5(coalesce(string_agg(row(policyname,roles,cmd,qual,with_check)::text,'' ORDER BY policyname),'')) FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname<>'trial_assets_upload')<>'1d4c20a5c6a4c6221b02deac744af8be'
    OR md5(pg_get_functiondef('public.guard_trial_asset_object()'::regprocedure))<>'c1d2b94e8a70ac41649f70f6a65ad7bd'
    OR md5(pg_get_functiondef('public.trial_asset_upload_allowed(text,text)'::regprocedure))<>'743855b05523b214ce6880cfb4e3056f'
    OR (SELECT md5(string_agg(row(version,name,statements)::text,'' ORDER BY version)) FROM supabase_migrations.schema_migrations)<>'0741971c95577bbe43f7754ed54dba88'
  THEN RAISE EXCEPTION 'Unrelated policy/function/history changed'; END IF;
END;
$t14_policy$;
