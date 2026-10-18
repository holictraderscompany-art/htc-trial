-- T14 relation/security SQL. Synthetic object catalog metadata; NOT live Storage.
-- Only owned random fixtures, all rolled back. Existing OAuth users unchanged.
BEGIN;
DO $relations$
DECLARE c uuid:=gen_random_uuid(); a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid();
 f uuid; u uuid; p jsonb; r jsonb; target_state text;
BEGIN
 SELECT id INTO STRICT f FROM public.user_profiles WHERE role='FOUNDER';
 SELECT id INTO STRICT u FROM public.user_profiles WHERE role='USER';
 INSERT INTO public.trial_content(id,category,title,body) VALUES(c,'INFORMATION','T14 synthetic relation fixture','Rolled back');
 INSERT INTO public.trial_assets(id,request_id,asset_type,storage_path,mime_type,original_filename,byte_size)
 VALUES(a,gen_random_uuid(),'IMAGE','image/'||a||'/asset.png','image/png','t14-a.png',8),
 (b,gen_random_uuid(),'IMAGE','image/'||b||'/asset.png','image/png','t14-b.png',8);
 p:=jsonb_build_object('action','attach','content_id',c,'asset_id',a,'role','PRIMARY');
 PERFORM set_config('request.jwt.claim.sub',f::text,true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 IF public.manage_trial_content_asset_draft(p)->>'outcome'<>'asset_not_ready' THEN RAISE EXCEPTION 'PENDING attached'; END IF;
 EXECUTE 'RESET ROLE';
 INSERT INTO storage.objects(bucket_id,name,metadata)
 VALUES('trial-assets','image/'||a||'/asset.png','{"mimetype":"image/png","size":8}'),
 ('trial-assets','image/'||b||'/asset.png','{"mimetype":"image/png","size":8}');
 UPDATE public.trial_assets SET status='READY' WHERE id IN(a,b);
 EXECUTE 'SET LOCAL ROLE authenticated';
 r:=public.read_trial_assets_for_founder(null,a);
 IF jsonb_array_length(r->'items')<>1 OR (r->'items'->0) ? 'storage_path' THEN RAISE EXCEPTION 'Private asset projection'; END IF;
 IF public.manage_trial_content_asset_draft(p)->>'outcome'<>'saved' THEN RAISE EXCEPTION 'READY attach rejected'; END IF;
 IF public.manage_trial_content_asset_draft(p)->>'outcome'<>'relation_conflict' THEN RAISE EXCEPTION 'Duplicate attach accepted'; END IF;
 IF public.manage_trial_content_asset_draft(p||jsonb_build_object('asset_id',b))->>'outcome'<>'relation_conflict' THEN RAISE EXCEPTION 'Duplicate PRIMARY accepted'; END IF;
 IF public.delete_trial_asset_for_founder(jsonb_build_object('action','delete_asset','id',a))->>'outcome'<>'linked_asset' THEN RAISE EXCEPTION 'Linked delete accepted'; END IF;
 EXECUTE 'RESET ROLE';
 FOREACH target_state IN ARRAY ARRAY['RELEASED','WITHDRAWN'] LOOP
   UPDATE public.trial_content SET state=target_state,released_at=now() WHERE id=c;
   EXECUTE 'SET LOCAL ROLE authenticated';
   IF public.manage_trial_content_asset_draft(p)->>'outcome'<>'not_draft'
     OR public.manage_trial_content_asset_draft((p-'role')||jsonb_build_object('action','detach'))->>'outcome'<>'not_draft'
   THEN RAISE EXCEPTION 'Non-DRAFT relation mutation accepted'; END IF;
   EXECUTE 'RESET ROLE';
 END LOOP;
 UPDATE public.trial_content SET state='DRAFT',released_at=null WHERE id=c;
 EXECUTE 'SET LOCAL ROLE authenticated';
 IF public.manage_trial_content_asset_draft((p-'role')||jsonb_build_object('action','detach'))->>'outcome'<>'saved' THEN RAISE EXCEPTION 'DRAFT detach rejected'; END IF;
 IF public.delete_trial_asset_for_founder(jsonb_build_object('action','delete_asset','id',a))->>'outcome'<>'storage_delete_required' THEN RAISE EXCEPTION 'Real deletion bypassed'; END IF;
 BEGIN
   PERFORM public.manage_trial_asset(jsonb_build_object('action','finish_delete','id',a));
   RAISE EXCEPTION 'Object still exists but metadata deletion accepted';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Deletion incomplete' THEN RAISE; END IF; END;
 PERFORM set_config('request.jwt.claim.sub',u::text,true);
 BEGIN PERFORM public.read_trial_assets_for_founder(null,a); RAISE EXCEPTION 'USER listed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.manage_trial_content_asset_draft(p); RAISE EXCEPTION 'USER relation'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.delete_trial_asset_for_founder(jsonb_build_object('action','delete_asset','id',a)); RAISE EXCEPTION 'USER deleted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 EXECUTE 'RESET ROLE';
END;
$relations$;
ROLLBACK;
