-- T07B additive only. Review and explicit approval are required before remote apply.
create table public.trial_content_assets (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.trial_content(id) on delete restrict,
  asset_id uuid not null references public.trial_assets(id) on delete restrict,
  role text not null check (role in ('PRIMARY','THUMBNAIL','ATTACHMENT')),
  created_at timestamptz not null default now(),
  unique(content_id,asset_id)
);
create unique index trial_content_assets_primary on public.trial_content_assets(content_id) where role='PRIMARY';
create unique index trial_content_assets_thumbnail on public.trial_content_assets(content_id) where role='THUMBNAIL';
create index trial_content_assets_asset on public.trial_content_assets(asset_id);
alter table public.trial_content_assets enable row level security;
revoke all on public.trial_content_assets from public,anon,authenticated;
create policy trial_content_assets_founder on public.trial_content_assets for all to authenticated
  using ((select public.is_founder())) with check ((select public.is_founder()));

-- Existing begin_delete locks this same asset row. Attach also locks it, so a
-- successful attachment and a transition to DELETING cannot race past each other.
create function public.guard_linked_trial_asset()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.status is distinct from old.status and new.status <> 'READY'
    and exists(select 1 from public.trial_content_assets r where r.asset_id=old.id) then
    raise exception 'Detach asset before changing its state' using errcode='23503';
  end if;
  return new;
end; $$;
revoke all on function public.guard_linked_trial_asset() from public,anon,authenticated;
create trigger guard_linked_trial_asset before update of status on public.trial_assets
  for each row execute function public.guard_linked_trial_asset();

create function public.manage_trial_content_asset(payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.trial_content%rowtype; a public.trial_assets%rowtype;
  r public.trial_content_assets%rowtype; operation text; required text[];
begin
  if auth.uid() is null or not public.is_founder() then raise exception 'Access denied' using errcode='42501'; end if;
  if jsonb_typeof(payload) is distinct from 'object' then raise exception 'Invalid request' using errcode='22023'; end if;
  operation:=payload->>'action';
  if operation='attach' then required:=array['action','content_id','asset_id','role'];
  elsif operation='detach' then required:=array['action','content_id','asset_id'];
  elsif operation='list' then required:=array['action','content_id'];
  else raise exception 'Invalid request' using errcode='22023'; end if;
  if not(payload ?& required) or exists(select 1 from jsonb_object_keys(payload) k where not(k=any(required)))
    or exists(select 1 from unnest(required) k where jsonb_typeof(payload->k) is distinct from 'string') then
    raise exception 'Invalid request' using errcode='22023'; end if;
  select * into c from public.trial_content where id=(payload->>'content_id')::uuid for update;
  if not found then return null; end if;
  if operation='list' then
    return jsonb_build_object('content_id',c.id,'relations',coalesce((
      select jsonb_agg(to_jsonb(x) order by x.role,x.created_at,x.id)
      from public.trial_content_assets x where x.content_id=c.id),'[]'::jsonb));
  end if;
  select * into a from public.trial_assets where id=(payload->>'asset_id')::uuid for update;
  if not found then return null; end if;
  if operation='attach' then
    if a.status<>'READY' or a.storage_bucket<>'trial-assets' or payload->>'role' not in ('PRIMARY','THUMBNAIL','ATTACHMENT')
      or (payload->>'role'='THUMBNAIL' and a.asset_type not in ('IMAGE','THUMBNAIL'))
      or not exists(select 1 from storage.buckets b where b.id=a.storage_bucket and not b.public)
      or not exists(select 1 from storage.objects o where o.bucket_id=a.storage_bucket and o.name=a.storage_path
        and o.metadata->>'mimetype'=a.mime_type and (o.metadata->>'size')::numeric=a.byte_size) then
      raise exception 'Asset cannot be attached' using errcode='22023'; end if;
    insert into public.trial_content_assets(content_id,asset_id,role)
      values(c.id,a.id,payload->>'role') returning * into r;
  else
    delete from public.trial_content_assets where content_id=c.id and asset_id=a.id returning * into r;
    if not found then return null; end if;
  end if;
  -- Relation changes are content edits: use the existing authoritative T06 RPC.
  perform public.manage_trial_content(jsonb_build_object('action','update','id',c.id,
    'category',c.category,'title',c.title,'body',c.body));
  return to_jsonb(r);
end; $$;
revoke all on function public.manage_trial_content_asset(jsonb) from public,anon,authenticated;
grant execute on function public.manage_trial_content_asset(jsonb) to authenticated;

-- One snapshot gates metadata against content state, asset state and actual object.
-- No path, URL, filename, expiry or upload capability is exposed by this function.
create function public.read_released_content_assets(content_ids uuid[])
returns table(content_id uuid,assets jsonb) language sql stable security definer set search_path='' as $$
  select c.id,coalesce((select jsonb_agg(jsonb_build_object(
    'id',a.id,'role',r.role,'mime_type',a.mime_type,'width',a.width,'height',a.height,'duration_seconds',a.duration_seconds)
    order by r.role,r.created_at,r.id)
    from public.trial_content_assets r join public.trial_assets a on a.id=r.asset_id
    where r.content_id=c.id and a.status='READY' and a.storage_bucket='trial-assets'
      and exists(select 1 from storage.buckets b where b.id=a.storage_bucket and not b.public)
      and exists(select 1 from storage.objects o where o.bucket_id=a.storage_bucket and o.name=a.storage_path
        and o.metadata->>'mimetype'=a.mime_type and (o.metadata->>'size')::numeric=a.byte_size)),'[]'::jsonb)
  from public.trial_content c where c.state='RELEASED' and c.id=any(content_ids)
    and cardinality(content_ids) between 1 and 100 order by c.id;
$$;
revoke all on function public.read_released_content_assets(uuid[]) from public,anon,authenticated;
grant execute on function public.read_released_content_assets(uuid[]) to anon,authenticated;
