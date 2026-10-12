-- Group 3 additive RPCs. Apply only to the authorized test project.
-- Preserve T06/T07A/T07B; every definer validates the existing Founder identity.
create function public.read_trial_assets_for_founder(after_id uuid default null, asset_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or public.is_founder() is distinct from true then
    raise exception 'Access denied' using errcode='42501'; end if;
  if after_id is not null and asset_id is not null then
    raise exception 'Invalid request' using errcode='22023'; end if;
  return jsonb_build_object('source','SUPABASE_DATABASE','items',coalesce((
    select jsonb_agg(to_jsonb(x) order by x.id) from (
      select a.id,a.status,a.asset_type,a.mime_type,a.byte_size,a.original_filename
      from public.trial_assets a
      where (after_id is null or a.id>after_id) and (asset_id is null or a.id=asset_id)
      order by a.id limit 51
    ) x),'[]'::jsonb));
end; $$;

create function public.founder_operation_counts()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare c jsonb; a jsonb;
begin
  if auth.uid() is null or public.is_founder() is distinct from true then
    raise exception 'Access denied' using errcode='42501'; end if;
  select jsonb_build_object('DRAFT',count(*) filter(where state='DRAFT'),
    'RELEASED',count(*) filter(where state='RELEASED'),'WITHDRAWN',count(*) filter(where state='WITHDRAWN'))
    into c from public.trial_content;
  select jsonb_build_object('PENDING',count(*) filter(where status='PENDING'),
    'READY',count(*) filter(where status='READY'),'DELETING',count(*) filter(where status='DELETING'))
    into a from public.trial_assets;
  return jsonb_build_object('source','SUPABASE_DATABASE','captured_at',statement_timestamp(),'content',c,'assets',a);
end; $$;

create function public.manage_trial_content_asset_draft(payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.trial_content%rowtype; a public.trial_assets%rowtype;
  r jsonb; required text[]; op text;
begin
  if auth.uid() is null or public.is_founder() is distinct from true then
    raise exception 'Access denied' using errcode='42501'; end if;
  if jsonb_typeof(payload) is distinct from 'object' then
    raise exception 'Invalid request' using errcode='22023'; end if;
  op:=payload->>'action';
  if op='attach' then required:=array['action','content_id','asset_id','role'];
  elsif op='detach' then required:=array['action','content_id','asset_id'];
  else raise exception 'Invalid request' using errcode='22023'; end if;
  if not(payload ?& required) or exists(select 1 from jsonb_object_keys(payload) k where not(k=any(required)))
    or exists(select 1 from unnest(required) k where jsonb_typeof(payload->k) is distinct from 'string')
    or payload->>'content_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    or payload->>'asset_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    or (op='attach' and payload->>'role' not in ('PRIMARY','THUMBNAIL','ATTACHMENT')) then
    raise exception 'Invalid request' using errcode='22023'; end if;
  -- Same lock order as T07B: content, then asset. Lock spans guard and mutation.
  select * into c from public.trial_content where id=(payload->>'content_id')::uuid for update;
  if not found then return jsonb_build_object('outcome','not_found'); end if;
  if c.state<>'DRAFT' then return jsonb_build_object('outcome','not_draft'); end if;
  select * into a from public.trial_assets where id=(payload->>'asset_id')::uuid for update;
  if not found then return jsonb_build_object('outcome','not_found'); end if;
  if op='attach' and (a.status<>'READY'
    or (payload->>'role'='THUMBNAIL' and a.asset_type not in ('IMAGE','THUMBNAIL'))
    or not exists(select 1 from storage.buckets b where b.id=a.storage_bucket and not b.public)
    or not exists(select 1 from storage.objects o where o.bucket_id=a.storage_bucket and o.name=a.storage_path
      and o.metadata->>'mimetype'=a.mime_type and (o.metadata->>'size')::numeric=a.byte_size)) then
    return jsonb_build_object('outcome','asset_not_ready'); end if;
  begin
    r:=public.manage_trial_content_asset(payload);
  exception when unique_violation then
    return jsonb_build_object('outcome','relation_conflict');
  when invalid_parameter_value then
    return jsonb_build_object('outcome','asset_not_ready');
  end;
  if r is null then return jsonb_build_object('outcome','not_found'); end if;
  return jsonb_build_object('outcome','saved','relation',r);
end; $$;

create function public.transition_trial_content_checked(payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.trial_content%rowtype; a public.trial_assets%rowtype; r jsonb; op text;
begin
  if auth.uid() is null or public.is_founder() is distinct from true then
    raise exception 'Access denied' using errcode='42501'; end if;
  if jsonb_typeof(payload) is distinct from 'object' or not(payload ?& array['action','id'])
    or exists(select 1 from jsonb_object_keys(payload) k where k not in ('action','id'))
    or jsonb_typeof(payload->'action') is distinct from 'string'
    or jsonb_typeof(payload->'id') is distinct from 'string'
    or payload->>'action' not in ('release','withdraw')
    or payload->>'id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'Invalid request' using errcode='22023'; end if;
  op:=payload->>'action';
  select * into c from public.trial_content where id=(payload->>'id')::uuid for update;
  if not found then return jsonb_build_object('outcome','not_found'); end if;
  if (op='release' and c.state not in ('DRAFT','WITHDRAWN')) or (op='withdraw' and c.state<>'RELEASED') then
    return jsonb_build_object('outcome','invalid_transition'); end if;
  if op='release' then
    -- Relation edits acquire the content lock too; sorted asset locks avoid cycles.
    for a in select x.* from public.trial_assets x
      join public.trial_content_assets rel on rel.asset_id=x.id
      where rel.content_id=c.id order by x.id for share of x loop
      if a.status<>'READY' or not exists(select 1 from storage.buckets b where b.id=a.storage_bucket and not b.public)
        or not exists(select 1 from storage.objects o where o.bucket_id=a.storage_bucket and o.name=a.storage_path
          and o.metadata->>'mimetype'=a.mime_type and (o.metadata->>'size')::numeric=a.byte_size) then
        return jsonb_build_object('outcome','asset_not_ready'); end if;
    end loop;
  end if;
  r:=public.manage_trial_content(payload);
  if r is null or r->>'state' is distinct from (case when op='release' then 'RELEASED' else 'WITHDRAWN' end) then
    raise exception 'Request could not be completed' using errcode='XX000'; end if;
  return jsonb_build_object('outcome','saved','content',r);
end; $$;

revoke all on function public.read_trial_assets_for_founder(uuid,uuid),public.founder_operation_counts(),
  public.manage_trial_content_asset_draft(jsonb),public.transition_trial_content_checked(jsonb) from public,anon,authenticated;
grant execute on function public.read_trial_assets_for_founder(uuid,uuid),public.founder_operation_counts(),
  public.manage_trial_content_asset_draft(jsonb),public.transition_trial_content_checked(jsonb) to authenticated;
