DO $t14_review$
DECLARE
  before_p pg_catalog.pg_proc%rowtype;
  after_p pg_catalog.pg_proc%rowtype;
  expected_body text;
  before_triggers text;
  before_policies text;
  before_bucket text;
BEGIN
  IF current_user <> 'postgres' OR current_database() <> 'postgres' THEN
    RAISE EXCEPTION 'Unexpected execution role or database';
  END IF;
  SELECT * INTO STRICT before_p FROM pg_catalog.pg_proc
    WHERE oid='public.guard_trial_asset_object()'::regprocedure;
  IF md5(pg_get_functiondef(before_p.oid)) <> 'c1d2b94e8a70ac41649f70f6a65ad7bd'
    OR md5(before_p.prosrc) <> '097b5cf3a902dc85795688911a547eae'
    OR pg_get_userbyid(before_p.proowner) <> 'postgres'
    OR NOT before_p.prosecdef
    OR before_p.proconfig IS DISTINCT FROM ARRAY['search_path=""']::text[]
    OR has_function_privilege('anon',before_p.oid,'EXECUTE')
    OR has_function_privilege('authenticated',before_p.oid,'EXECUTE') THEN
    RAISE EXCEPTION 'Reviewed guard baseline or effective authorization changed';
  END IF;
  IF (SELECT count(*) FROM supabase_migrations.schema_migrations) <> 9 THEN
    RAISE EXCEPTION 'Migration baseline changed; review before proceeding';
  END IF;
  SELECT jsonb_agg(to_jsonb(t) ORDER BY t.oid)::text INTO before_triggers
    FROM pg_catalog.pg_trigger t WHERE t.tgrelid='storage.objects'::regclass;
  SELECT jsonb_agg(to_jsonb(p) ORDER BY p.policyname)::text INTO before_policies
    FROM pg_catalog.pg_policies p WHERE p.schemaname='storage' AND p.tablename='objects';
  SELECT to_jsonb(b)::text INTO STRICT before_bucket
    FROM storage.buckets b WHERE b.id='trial-assets' AND NOT b.public;
  expected_body := replace(replace(before_p.prosrc, 'raise exception ''No active asset reservation'';', 'raise exception ''No active asset reservation'' using errcode=''42501'';' ), 'raise exception ''Object does not match reservation'';', 'raise exception ''Object does not match reservation'' using errcode=''42501'';' );
  EXECUTE $t14_ddl$
CREATE OR REPLACE FUNCTION public.guard_trial_asset_object()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare a public.trial_assets%rowtype;
begin
  if tg_op = 'UPDATE' and old.bucket_id = 'trial-assets' then
    if new.bucket_id is distinct from old.bucket_id or new.name is distinct from old.name
      or new.version is distinct from old.version or new.metadata is distinct from old.metadata
      or new.owner_id is distinct from old.owner_id then raise exception 'Asset objects are immutable'; end if;
    return new;
  end if;
  if new.bucket_id <> 'trial-assets' then return new; end if;
  select * into a from public.trial_assets where storage_bucket = new.bucket_id and storage_path = new.name for share;
  if not found or a.status <> 'PENDING' or a.expires_at <= clock_timestamp() then
    raise exception 'No active asset reservation' using errcode='42501'; end if;
  if new.metadata->>'mimetype' is distinct from a.mime_type
    or (new.metadata ? 'size' and (new.metadata->>'size')::numeric is distinct from a.byte_size::numeric) then
    raise exception 'Object does not match reservation' using errcode='42501'; end if;
  return new;
end; $function$
$t14_ddl$;
  SELECT * INTO STRICT after_p FROM pg_catalog.pg_proc WHERE oid=before_p.oid;
  IF after_p.prosrc IS DISTINCT FROM expected_body
    OR after_p.proowner IS DISTINCT FROM before_p.proowner
    OR after_p.proacl IS DISTINCT FROM before_p.proacl
    OR after_p.proconfig IS DISTINCT FROM before_p.proconfig
    OR after_p.prosecdef IS DISTINCT FROM before_p.prosecdef
    OR after_p.prorettype IS DISTINCT FROM before_p.prorettype
    OR after_p.provolatile IS DISTINCT FROM before_p.provolatile THEN
    RAISE EXCEPTION 'Guard replacement changed more than reviewed SQLSTATEs';
  END IF;
  IF before_triggers IS DISTINCT FROM (SELECT jsonb_agg(to_jsonb(t) ORDER BY t.oid)::text FROM pg_catalog.pg_trigger t WHERE t.tgrelid='storage.objects'::regclass)
    OR before_policies IS DISTINCT FROM (SELECT jsonb_agg(to_jsonb(p) ORDER BY p.policyname)::text FROM pg_catalog.pg_policies p WHERE p.schemaname='storage' AND p.tablename='objects')
    OR before_bucket IS DISTINCT FROM (SELECT to_jsonb(b)::text FROM storage.buckets b WHERE b.id='trial-assets')
    OR NOT (SELECT relrowsecurity FROM pg_catalog.pg_class WHERE oid='storage.objects'::regclass)
    OR NOT (SELECT relrowsecurity FROM pg_catalog.pg_class WHERE oid='public.trial_assets'::regclass) THEN
    RAISE EXCEPTION 'Storage security boundary changed';
  END IF;
END;
$t14_review$;