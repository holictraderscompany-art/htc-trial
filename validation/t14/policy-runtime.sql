-- T14 PostgreSQL policy tests. Synthetic metadata only; NOT binary Storage PASS.
-- Existing OAuth identities are referenced, never modified. All fixtures roll back.
BEGIN;
DO $policy_tests$
DECLARE a uuid:=gen_random_uuid(); path text; f uuid; u uuid; op text;
BEGIN
 SELECT id INTO STRICT f FROM public.user_profiles WHERE role='FOUNDER';
 SELECT id INTO STRICT u FROM public.user_profiles WHERE role='USER';
 path:='image/'||a||'/asset.png';
 INSERT INTO public.trial_assets(id,request_id,asset_type,storage_path,mime_type,original_filename,byte_size)
 VALUES(a,gen_random_uuid(),'IMAGE',path,'image/png','t14-policy-synthetic.png',8);
 PERFORM set_config('request.jwt.claim.sub',f::text,true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 FOREACH op IN ARRAY ARRAY['storage.object.upload','storage.object.sign_upload_url'] LOOP
   PERFORM set_config('storage.operation',op,true);
   BEGIN
     INSERT INTO storage.objects(bucket_id,name,metadata) VALUES('trial-assets',path,'{"mimetype":"image/png","size":8}');
     RAISE EXCEPTION 'Rollback successful permission probe' USING ERRCODE='P0014';
   EXCEPTION WHEN SQLSTATE 'P0014' THEN NULL;
   END;
 END LOOP;
 FOREACH op IN ARRAY ARRAY['storage.object.sign','storage.object.list','storage.s3.upload','storage.object.upload_update',''] LOOP
   PERFORM set_config('storage.operation',op,true);
   BEGIN
     INSERT INTO storage.objects(bucket_id,name,metadata) VALUES('trial-assets',path,'{"mimetype":"image/png","size":8}');
     RAISE EXCEPTION 'Unexpected extra operation permission: %',op;
   EXCEPTION WHEN insufficient_privilege THEN NULL;
   END;
 END LOOP;
 PERFORM set_config('storage.operation','storage.object.sign_upload_url',true);
 PERFORM set_config('request.jwt.claim.sub',u::text,true);
 BEGIN
   INSERT INTO storage.objects(bucket_id,name,metadata) VALUES('trial-assets',path,'{"mimetype":"image/png","size":8}');
   RAISE EXCEPTION 'USER signing permitted';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 EXECUTE 'RESET ROLE';
 PERFORM set_config('request.jwt.claim.sub','',true);
 EXECUTE 'SET LOCAL ROLE anon';
 BEGIN
   INSERT INTO storage.objects(bucket_id,name,metadata) VALUES('trial-assets',path,'{"mimetype":"image/png","size":8}');
   RAISE EXCEPTION 'Anonymous signing permitted';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 EXECUTE 'RESET ROLE';
 -- Signed transfers run with privileged Storage identity. The catalog guard must
 -- still reject MIME/size mismatch and stale/non-PENDING reservations.
 BEGIN
   INSERT INTO storage.objects(bucket_id,name,metadata) VALUES('trial-assets',path,'{"mimetype":"audio/mpeg","size":8}');
   RAISE EXCEPTION 'MIME mismatch permitted';
 EXCEPTION WHEN raise_exception THEN
   IF SQLERRM<>'Object does not match reservation' THEN RAISE; END IF;
 END;
 BEGIN
   INSERT INTO storage.objects(bucket_id,name,metadata) VALUES('trial-assets',path,'{"mimetype":"image/png","size":9}');
   RAISE EXCEPTION 'Size mismatch permitted';
 EXCEPTION WHEN raise_exception THEN
   IF SQLERRM<>'Object does not match reservation' THEN RAISE; END IF;
 END;
 FOREACH op IN ARRAY ARRAY['READY','DELETING'] LOOP
   UPDATE public.trial_assets SET status=op WHERE id=a;
   BEGIN
     INSERT INTO storage.objects(bucket_id,name,metadata) VALUES('trial-assets',path,'{"mimetype":"image/png","size":8}');
     RAISE EXCEPTION 'Non-PENDING upload permitted';
   EXCEPTION WHEN raise_exception THEN
     IF SQLERRM<>'No active asset reservation' THEN RAISE; END IF;
   END;
 END LOOP;
 UPDATE public.trial_assets SET status='PENDING',expires_at=now()-interval '1 second' WHERE id=a;
 BEGIN
   INSERT INTO storage.objects(bucket_id,name,metadata) VALUES('trial-assets',path,'{"mimetype":"image/png","size":8}');
   RAISE EXCEPTION 'Expired upload permitted';
 EXCEPTION WHEN raise_exception THEN
   IF SQLERRM<>'No active asset reservation' THEN RAISE; END IF;
 END;
END;
$policy_tests$;
ROLLBACK;
