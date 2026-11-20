-- T07A only. Unique migration version; remote application requires explicit approval.
create table public.trial_assets (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  asset_type text not null check (asset_type in ('IMAGE','VIDEO','AUDIO','THUMBNAIL','DOCUMENT')),
  storage_bucket text not null default 'trial-assets' check (storage_bucket = 'trial-assets'),
  storage_path text not null unique,
  mime_type text not null,
  original_filename text not null check (original_filename ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$' and position('..' in original_filename) = 0),
  byte_size bigint not null check (byte_size between 1 and 6000000),
  width integer check (width > 0), height integer check (height > 0),
  duration_seconds numeric check (duration_seconds >= 0),
  status text not null default 'PENDING' check (status in ('PENDING','READY','DELETING')),
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (storage_path = lower(asset_type) || '/' || id::text || '/asset.' ||
    case mime_type when 'image/jpeg' then 'jpg' when 'image/png' then 'png' when 'image/webp' then 'webp'
      when 'video/mp4' then 'mp4' when 'audio/mpeg' then 'mp3' when 'application/pdf' then 'pdf' end),
  check ((asset_type in ('IMAGE','THUMBNAIL') and
    ((mime_type = 'image/jpeg' and lower(original_filename) ~ '\.(jpg|jpeg)$') or
     (mime_type = 'image/png' and lower(original_filename) ~ '\.png$') or
     (mime_type = 'image/webp' and lower(original_filename) ~ '\.webp$'))) or
    (asset_type = 'VIDEO' and mime_type = 'video/mp4' and lower(original_filename) ~ '\.mp4$') or
    (asset_type = 'AUDIO' and mime_type = 'audio/mpeg' and lower(original_filename) ~ '\.mp3$') or
    (asset_type = 'DOCUMENT' and mime_type = 'application/pdf' and lower(original_filename) ~ '\.pdf$'))
);
alter table public.trial_assets enable row level security;
revoke all on public.trial_assets from public, anon, authenticated;
create policy trial_assets_founder on public.trial_assets for all to authenticated
  using ((select public.is_founder())) with check ((select public.is_founder()));

-- Exactly one private bucket. Never overwrite an existing bucket's configuration.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('trial-assets','trial-assets',false,6000000,
  array['image/jpeg','image/png','image/webp','video/mp4','audio/mpeg','application/pdf']);

-- Storage checks RLS before transfer and completes as an internal superuser.
-- Recheck at catalog insertion to close the late-upload/cleanup race.
-- The trigger leaves every other bucket untouched and never stores binary data.
create function public.guard_trial_asset_object()
returns trigger language plpgsql security definer set search_path = '' as $$
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
    raise exception 'No active asset reservation'; end if;
  if new.metadata->>'mimetype' is distinct from a.mime_type
    or (new.metadata ? 'size' and (new.metadata->>'size')::numeric is distinct from a.byte_size::numeric) then
    raise exception 'Object does not match reservation'; end if;
  return new;
end; $$;
revoke all on function public.guard_trial_asset_object() from public, anon, authenticated;
create trigger guard_trial_asset_object before insert or update on storage.objects
  for each row execute function public.guard_trial_asset_object();

-- Lock the reservation during INSERT policy checks, serializing with cleanup.
create function public.trial_asset_upload_allowed(bucket text, path text)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
declare a public.trial_assets%rowtype;
begin
  if auth.uid() is null or not public.is_founder() or bucket <> 'trial-assets' then return false; end if;
  select * into a from public.trial_assets where storage_bucket = bucket and storage_path = path for share;
  return found and a.status = 'PENDING' and a.expires_at > clock_timestamp()
    and exists(select 1 from storage.buckets b where b.id = bucket and not b.public and b.file_size_limit = 6000000);
end; $$;
create function public.trial_asset_storage_allowed(bucket text, path text, deleting boolean)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and public.is_founder() and bucket = 'trial-assets'
    and exists(select 1 from public.trial_assets a where a.storage_bucket = bucket and a.storage_path = path
      and case when deleting then a.status = 'DELETING' else a.status in ('PENDING','READY') end)
    and exists(select 1 from storage.buckets b where b.id = bucket and not b.public);
$$;
revoke all on function public.trial_asset_upload_allowed(text,text), public.trial_asset_storage_allowed(text,text,boolean) from public, anon, authenticated;
grant execute on function public.trial_asset_upload_allowed(text,text), public.trial_asset_storage_allowed(text,text,boolean) to authenticated;
create policy trial_assets_upload on storage.objects for insert to authenticated
  with check (storage.allow_only_operation('object.upload') and public.trial_asset_upload_allowed(bucket_id,name));
create policy trial_assets_private_read on storage.objects for select to authenticated
  using ((public.trial_asset_storage_allowed(bucket_id,name,false)
    and storage.allow_any_operation(array['object.get_authenticated','object.get_authenticated_info']))
    or (public.trial_asset_storage_allowed(bucket_id,name,true)
    and storage.allow_any_operation(array['object.delete','object.delete_many'])));
create policy trial_assets_delete on storage.objects for delete to authenticated
  using (public.trial_asset_storage_allowed(bucket_id,name,true)
    and storage.allow_any_operation(array['object.delete','object.delete_many']));
-- No UPDATE, public read or signed-upload policy. Existing Founder JWT is required.

create function public.manage_trial_asset(payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  a public.trial_assets%rowtype; operation text; required text[]; generated_id uuid;
  object_metadata jsonb; private_bucket boolean;
begin
  if auth.uid() is null or not public.is_founder() then raise exception 'Access denied' using errcode='42501'; end if;
  if jsonb_typeof(payload) is distinct from 'object' then raise exception 'Invalid request' using errcode='22023'; end if;
  operation := payload->>'action';
  if operation = 'reserve' then required := array['action','request_id','asset_type','mime_type','original_filename','byte_size'];
  elsif operation in ('inspect','finalize','begin_delete','finish_delete') then required := array['action','id'];
  else raise exception 'Invalid request' using errcode='22023'; end if;
  if not (payload ?& required) or exists(select 1 from jsonb_object_keys(payload) k where not (k = any(required))) then
    raise exception 'Invalid request' using errcode='22023'; end if;
  if operation = 'reserve' then
    if exists(select 1 from unnest(array['request_id','asset_type','mime_type','original_filename']) k
      where jsonb_typeof(payload->k) is distinct from 'string') or jsonb_typeof(payload->'byte_size') is distinct from 'number'
      or (payload->>'byte_size')::numeric <> trunc((payload->>'byte_size')::numeric) then
      raise exception 'Invalid request' using errcode='22023'; end if;
    generated_id := gen_random_uuid();
    insert into public.trial_assets(id,request_id,asset_type,storage_path,mime_type,original_filename,byte_size)
    values(generated_id,(payload->>'request_id')::uuid,payload->>'asset_type',
      lower(payload->>'asset_type') || '/' || generated_id::text || '/asset.' ||
        case payload->>'mime_type' when 'image/jpeg' then 'jpg' when 'image/png' then 'png' when 'image/webp' then 'webp'
          when 'video/mp4' then 'mp4' when 'audio/mpeg' then 'mp3' when 'application/pdf' then 'pdf' end,
      payload->>'mime_type',payload->>'original_filename',(payload->>'byte_size')::bigint)
    on conflict(request_id) do nothing;
    select * into a from public.trial_assets where request_id = (payload->>'request_id')::uuid for update;
    if a.asset_type <> payload->>'asset_type' or a.mime_type <> payload->>'mime_type'
      or a.original_filename <> payload->>'original_filename' or a.byte_size <> (payload->>'byte_size')::bigint then
      raise exception 'Reservation mismatch' using errcode='22023'; end if;
  else
    if jsonb_typeof(payload->'id') is distinct from 'string' then raise exception 'Invalid request' using errcode='22023'; end if;
    select * into a from public.trial_assets where id = (payload->>'id')::uuid for update;
    if not found then return null; end if;
  end if;
  select not b.public into private_bucket from storage.buckets b where b.id = a.storage_bucket;
  if private_bucket is distinct from true then raise exception 'Storage configuration invalid'; end if;
  select o.metadata into object_metadata from storage.objects o where o.bucket_id = a.storage_bucket and o.name = a.storage_path;
  if operation = 'begin_delete' then
    update public.trial_assets set status='DELETING',updated_at=now() where id=a.id returning * into a;
    return to_jsonb(a);
  elsif operation = 'finish_delete' then
    if a.status <> 'DELETING' or exists(select 1 from storage.objects o where o.bucket_id=a.storage_bucket and o.name=a.storage_path) then
      raise exception 'Deletion incomplete'; end if;
    delete from public.trial_assets where id=a.id; return jsonb_build_object('id',a.id,'deleted',true);
  elsif operation = 'finalize' then
    if a.status='DELETING' or (a.status='PENDING' and a.expires_at <= clock_timestamp())
      or object_metadata is null or (object_metadata->>'size')::numeric is distinct from a.byte_size::numeric
      or object_metadata->>'mimetype' is distinct from a.mime_type then raise exception 'Asset verification failed'; end if;
    update public.trial_assets set status='READY',updated_at=case when status='READY' then updated_at else now() end
      where id=a.id returning * into a;
    return to_jsonb(a);
  end if;
  return jsonb_build_object('asset',to_jsonb(a),'bucket_private',private_bucket,'object',
    case when object_metadata is null then null else jsonb_build_object('size',(object_metadata->>'size')::numeric,'mime_type',object_metadata->>'mimetype') end);
end; $$;
revoke all on function public.manage_trial_asset(jsonb) from public, anon, authenticated;
grant execute on function public.manage_trial_asset(jsonb) to authenticated;
