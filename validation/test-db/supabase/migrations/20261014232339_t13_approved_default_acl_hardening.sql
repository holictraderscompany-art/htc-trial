-- T13 approved default ACL hardening; test project uzhkzhmncxjplrdtdzgd only.
DO $t13_acl$
DECLARE
  before_objects jsonb;
  after_objects jsonb;
  before_history jsonb;
  before_other_defaults jsonb;
BEGIN
  IF current_database() <> 'postgres' OR current_user <> 'postgres' THEN
    RAISE EXCEPTION 'Unexpected database execution identity';
  END IF;
  SELECT jsonb_agg(to_jsonb(m) ORDER BY version) INTO before_history FROM supabase_migrations.schema_migrations m;
  IF jsonb_array_length(before_history) <> 7 OR
     (SELECT encode(sha256(convert_to(statements[1],'UTF8')),'hex') FROM supabase_migrations.schema_migrations WHERE version='20261012061832')
       IS DISTINCT FROM 'b7edbca78c80a41c573fb143daf93c3dba9374411a073207f3920ab7a0763185' THEN
    RAISE EXCEPTION 'Unexpected history baseline';
  END IF;
  SELECT jsonb_build_object(
    'relations',(SELECT jsonb_agg(to_jsonb(c) ORDER BY c.oid) FROM pg_class c WHERE c.relnamespace IN ('public'::regnamespace,'auth'::regnamespace,'storage'::regnamespace)),
    'functions',(SELECT jsonb_agg(to_jsonb(p) ORDER BY p.oid) FROM pg_proc p WHERE p.pronamespace IN ('public'::regnamespace,'auth'::regnamespace,'storage'::regnamespace)),
    'policies',(SELECT jsonb_agg(to_jsonb(p) ORDER BY p.oid) FROM pg_policy p),
    'triggers',(SELECT jsonb_agg(to_jsonb(t) ORDER BY t.oid) FROM pg_trigger t),
    'schemas',(SELECT jsonb_agg(to_jsonb(n) ORDER BY n.oid) FROM pg_namespace n WHERE n.nspname IN ('public','auth','storage'))
  ) INTO before_objects;
  SELECT jsonb_agg(to_jsonb(d) ORDER BY d.oid) INTO before_other_defaults FROM pg_default_acl d
    WHERE NOT (d.defaclrole='postgres'::regrole AND
      ((d.defaclnamespace='public'::regnamespace AND d.defaclobjtype IN ('r','S','f')) OR (d.defaclnamespace=0 AND d.defaclobjtype='f')));

  ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE ALL ON TABLES FROM anon, authenticated;
  ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE ALL ON SEQUENCES FROM anon, authenticated;
  ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;
  ALTER DEFAULT PRIVILEGES FOR ROLE postgres
    REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

  IF EXISTS (
    SELECT 1 FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) a
    WHERE d.defaclrole='postgres'::regrole
      AND ((d.defaclnamespace='public'::regnamespace AND d.defaclobjtype IN ('r','S','f')
            AND a.grantee IN (0,'anon'::regrole::oid,'authenticated'::regrole::oid))
        OR (d.defaclnamespace=0 AND d.defaclobjtype='f' AND a.grantee=0 AND a.privilege_type='EXECUTE'))
  ) THEN RAISE EXCEPTION 'Unsafe default ACL remains'; END IF;
  SELECT jsonb_build_object(
    'relations',(SELECT jsonb_agg(to_jsonb(c) ORDER BY c.oid) FROM pg_class c WHERE c.relnamespace IN ('public'::regnamespace,'auth'::regnamespace,'storage'::regnamespace)),
    'functions',(SELECT jsonb_agg(to_jsonb(p) ORDER BY p.oid) FROM pg_proc p WHERE p.pronamespace IN ('public'::regnamespace,'auth'::regnamespace,'storage'::regnamespace)),
    'policies',(SELECT jsonb_agg(to_jsonb(p) ORDER BY p.oid) FROM pg_policy p),
    'triggers',(SELECT jsonb_agg(to_jsonb(t) ORDER BY t.oid) FROM pg_trigger t),
    'schemas',(SELECT jsonb_agg(to_jsonb(n) ORDER BY n.oid) FROM pg_namespace n WHERE n.nspname IN ('public','auth','storage'))
  ) INTO after_objects;
  IF before_objects IS DISTINCT FROM after_objects
    OR before_history IS DISTINCT FROM (SELECT jsonb_agg(to_jsonb(m) ORDER BY version) FROM supabase_migrations.schema_migrations m)
    OR before_other_defaults IS DISTINCT FROM (SELECT jsonb_agg(to_jsonb(d) ORDER BY d.oid) FROM pg_default_acl d WHERE NOT (d.defaclrole='postgres'::regrole AND ((d.defaclnamespace='public'::regnamespace AND d.defaclobjtype IN ('r','S','f')) OR (d.defaclnamespace=0 AND d.defaclobjtype='f'))))
  THEN RAISE EXCEPTION 'Existing contracts/history/other defaults changed'; END IF;
END;
$t13_acl$;