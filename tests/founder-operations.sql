-- Actual PostgreSQL logic tests; synthetic identities/object metadata only.
-- No binary Storage or Google OAuth PASS is implied. Everything rolls back.
begin;
do $$ begin
  if exists(select 1 from auth.users) or exists(select 1 from public.trial_content)
    or exists(select 1 from public.trial_assets) then raise exception 'Nonempty test baseline'; end if;
end; $$;
insert into auth.users(id,email) values
  ('00000000-0000-4000-8000-000000000821','holictraderscompany@gmail.com'),
  ('00000000-0000-4000-8000-000000000822','group3-user@example.invalid');
insert into public.trial_content(id,category,title,body) values
  ('00000000-0000-4000-8000-000000000823','INFORMATION','Trial','Trial presentation');
insert into public.trial_assets(id,request_id,asset_type,storage_path,mime_type,original_filename,byte_size) values
  ('00000000-0000-4000-8000-000000000824','00000000-0000-4000-8000-000000000825','IMAGE',
   'image/00000000-0000-4000-8000-000000000824/asset.png','image/png','fixture.png',8);

set local role anon;
do $$ begin
  if has_function_privilege(current_user,'public.founder_operation_counts()','EXECUTE') then raise exception 'anon EXECUTE'; end if;
end; $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000822',true);
do $$ declare name text; begin
  begin perform public.founder_operation_counts();raise exception 'USER count access';exception when insufficient_privilege then null;end;
  begin perform public.read_trial_assets_for_founder();raise exception 'USER asset access';exception when insufficient_privilege then null;end;
  begin perform public.manage_trial_content_asset_draft('{}');raise exception 'USER relation access';exception when insufficient_privilege then null;end;
  begin perform public.transition_trial_content_checked('{}');raise exception 'USER transition access';exception when insufficient_privilege then null;end;
  begin perform public.delete_trial_asset_for_founder('{}');raise exception 'USER deletion access';exception when insufficient_privilege then null;end;
end; $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000821',true);
do $$ declare r jsonb; p jsonb:=jsonb_build_object('action','attach','content_id','00000000-0000-4000-8000-000000000823',
 'asset_id','00000000-0000-4000-8000-000000000824','role','PRIMARY'); begin
  r:=public.founder_operation_counts();
  if r->>'source'<>'SUPABASE_DATABASE' or r->'content'->>'DRAFT'<>'1' or r->'assets'->>'PENDING'<>'1' then raise exception 'Counts mismatch';end if;
  r:=public.read_trial_assets_for_founder();if jsonb_array_length(r->'items')<>1 then raise exception 'Asset listing';end if;
  if (r->'items'->0) ? 'storage_path' then raise exception 'Unsafe projection';end if;
  if public.manage_trial_content_asset_draft(p)->>'outcome'<>'asset_not_ready' then raise exception 'PENDING attached';end if;
  begin perform public.transition_trial_content_checked(jsonb_build_object('action','release','id','bad'));raise exception 'Invalid UUID';exception when invalid_parameter_value then null;end;
end; $$;
reset role;
-- Synthetic catalog entry; does not represent an uploaded binary.
insert into storage.objects(bucket_id,name,metadata) values
 ('trial-assets','image/00000000-0000-4000-8000-000000000824/asset.png','{"mimetype":"image/png","size":8}');
update public.trial_assets set status='READY' where id='00000000-0000-4000-8000-000000000824';
set local role authenticated;
do $$ declare p jsonb:=jsonb_build_object('action','attach','content_id','00000000-0000-4000-8000-000000000823',
 'asset_id','00000000-0000-4000-8000-000000000824','role','PRIMARY'); r jsonb; begin
  r:=public.manage_trial_content_asset_draft(p);if r->>'outcome'<>'saved' then raise exception 'READY attach';end if;
  if public.manage_trial_content_asset_draft(p)->>'outcome'<>'relation_conflict' then raise exception 'Duplicate attach';end if;
  if public.delete_trial_asset_for_founder(jsonb_build_object('action','delete_asset','id',p->>'asset_id'))->>'outcome'<>'linked_asset' then raise exception 'Linked delete';end if;
  r:=public.transition_trial_content_checked(jsonb_build_object('action','release','id',p->>'content_id'));
  if r->>'outcome'<>'saved' or r->'content'->>'state'<>'RELEASED' then raise exception 'Release';end if;
  if public.manage_trial_content_asset_draft((p || jsonb_build_object('action','detach')) - 'role')->>'outcome'<>'not_draft' then raise exception 'Released edit';end if;
  if public.transition_trial_content_checked(jsonb_build_object('action','release','id',p->>'content_id'))->>'outcome'<>'invalid_transition' then raise exception 'Double release';end if;
  if (select count(*) from public.read_released_content())<>1 then raise exception 'Release visibility';end if;
  r:=public.transition_trial_content_checked(jsonb_build_object('action','withdraw','id',p->>'content_id'));
  if r->>'outcome'<>'saved' or (select count(*) from public.read_released_content())<>0 then raise exception 'Withdraw visibility';end if;
  if public.manage_trial_content_asset_draft(p)->>'outcome'<>'not_draft' then raise exception 'Withdrawn edit';end if;
end; $$;
reset role;
update public.trial_content set state='DRAFT',released_at=null where id='00000000-0000-4000-8000-000000000823';
set local role authenticated;
do $$ declare r jsonb; begin
  r:=public.manage_trial_content_asset_draft(jsonb_build_object('action','detach','content_id','00000000-0000-4000-8000-000000000823','asset_id','00000000-0000-4000-8000-000000000824'));
  if r->>'outcome'<>'saved' then raise exception 'Detach';end if;
  r:=public.delete_trial_asset_for_founder(jsonb_build_object('action','delete_asset','id','00000000-0000-4000-8000-000000000824'));
  if r->>'outcome'<>'storage_delete_required' then raise exception 'Storage deletion must be required';end if;
  begin perform public.manage_trial_asset(jsonb_build_object('action','finish_delete','id','00000000-0000-4000-8000-000000000824'));
    raise exception 'Metadata-only deletion accepted';exception when raise_exception then
    if sqlerrm<>'Deletion incomplete' then raise;end if;end;
end; $$;
reset role;
do $$ declare n text; p record; begin
  foreach n in array array['read_trial_assets_for_founder','founder_operation_counts','manage_trial_content_asset_draft','transition_trial_content_checked','delete_trial_asset_for_founder'] loop
    select x.* into strict p from pg_proc x join pg_namespace s on s.oid=x.pronamespace where s.nspname='public' and x.proname=n;
    if not p.prosecdef or p.proconfig is distinct from array['search_path=""']::text[] or p.proowner<>'postgres'::regrole then raise exception 'Unsafe definer %',n;end if;
    if exists(select 1 from aclexplode(p.proacl) a where a.grantee=0 and a.privilege_type='EXECUTE') then raise exception 'Public executable %',n;end if;
  end loop;
end; $$;
rollback;
