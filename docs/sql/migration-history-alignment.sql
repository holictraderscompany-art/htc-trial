DO $history$
DECLARE
  m1 constant text[] := ARRAY[
$m1s1$create table public.user_profiles (
  id uuid primary key,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);$m1s1$,
$m1s2$

create function public.set_user_profiles_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;$m1s2$,
$m1s3$

create trigger user_profiles_set_updated_at
before update on public.user_profiles
for each row
execute function public.set_user_profiles_updated_at();$m1s3$,
$m1s4$

alter table public.user_profiles enable row level security;
$m1s4$
  ];
  m2 constant text[] := ARRAY[
$m2s1$create type public.user_role as enum ('USER', 'FOUNDER');$m2s1$,
$m2s2$

alter table public.user_profiles
  add column role public.user_role not null default 'USER'::public.user_role;$m2s2$,
$m2s3$

alter table public.user_profiles
  add constraint user_profiles_id_fkey
  foreign key (id) references auth.users(id) on delete cascade;$m2s3$,
$m2s4$

create function public.is_founder()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.user_profiles
    where id = (select auth.uid())
      and role = 'FOUNDER'::public.user_role
  );
$$;$m2s4$,
$m2s5$

revoke execute on function public.is_founder() from public;$m2s5$,
$m2s6$
grant execute on function public.is_founder() to authenticated;$m2s6$,
$m2s7$

create function public.sync_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  perform set_config('htc.auth_sync', 'on', true);

  if tg_op = 'INSERT' then
    insert into public.user_profiles (id, role)
    values (
      new.id,
      case
        when lower(trim(coalesce(new.email, ''))) = 'holictraderscompany@gmail.com'
          then 'FOUNDER'::public.user_role
        else 'USER'::public.user_role
      end
    )
    on conflict (id) do update
      set role = excluded.role;
  elsif new.email is distinct from old.email then
    update public.user_profiles
    set role = case
      when lower(trim(coalesce(new.email, ''))) = 'holictraderscompany@gmail.com'
        then 'FOUNDER'::public.user_role
      else 'USER'::public.user_role
    end
    where id = new.id;
  end if;

  return new;
end;
$$;$m2s7$,
$m2s8$

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.sync_auth_user_profile();$m2s8$,
$m2s9$

create trigger on_auth_user_email_changed
after update of email on auth.users
for each row
when (old.email is distinct from new.email)
execute function public.sync_auth_user_profile();$m2s9$,
$m2s10$

create function public.protect_user_profile_fields()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.id is distinct from old.id
     or new.created_at is distinct from old.created_at
     or new.updated_at is distinct from old.updated_at
     or (new.role is distinct from old.role
         and current_setting('htc.auth_sync', true) is distinct from 'on') then
    raise exception 'protected user profile fields cannot be changed';
  end if;

  return new;
end;
$$;$m2s10$,
$m2s11$

create trigger user_profiles_protect_fields
before update on public.user_profiles
for each row
execute function public.protect_user_profile_fields();$m2s11$,
$m2s12$

revoke execute on function public.sync_auth_user_profile() from public, anon, authenticated;$m2s12$,
$m2s13$
revoke execute on function public.protect_user_profile_fields() from public, anon, authenticated;$m2s13$,
$m2s14$
revoke execute on function public.is_founder() from anon;$m2s14$,
$m2s15$

revoke all on table public.user_profiles from anon, authenticated;$m2s15$,
$m2s16$
grant select on table public.user_profiles to authenticated;$m2s16$,
$m2s17$
grant update (display_name) on table public.user_profiles to authenticated;$m2s17$,
$m2s18$

create policy user_profiles_select_own_or_founder
on public.user_profiles
for select
to authenticated
using ((id = (select auth.uid())) or (select public.is_founder()));$m2s18$,
$m2s19$

create policy user_profiles_update_own_or_founder_display_name
on public.user_profiles
for update
to authenticated
using ((id = (select auth.uid())) or (select public.is_founder()))
with check ((id = (select auth.uid())) or (select public.is_founder()));
$m2s19$
  ];
  m3 constant text[] := ARRAY[
$m3s1$-- T06 only. No changes to Foundation identity, roles, policies or triggers.
create table public.trial_content (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('INTRODUCTION', 'INFORMATION', 'EDITORIAL', 'DISCOVERY', 'FUTURE_JOURNEY', 'VALIDATION')),
  -- Match JavaScript String.trim() whitespace exactly; stored text must be normalized.
  title text not null check (title = btrim(title, U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF') and char_length(title) between 1 and 200 and title !~ '[<>]'),
  body text not null check (body = btrim(body, U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF') and char_length(body) between 1 and 8000 and body !~ '[<>]'),
  state text not null default 'DRAFT' check (state in ('DRAFT', 'RELEASED', 'WITHDRAWN')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  released_at timestamptz,
  check ((state = 'DRAFT' and released_at is null) or (state in ('RELEASED', 'WITHDRAWN') and released_at is not null))
);$m3s1$,
$m3s2$

alter table public.trial_content enable row level security;$m3s2$,
$m3s3$
-- API roles have no direct table rights. Only the narrow RPC contracts below.
revoke all on table public.trial_content from public, anon, authenticated;$m3s3$,
$m3s4$
-- Applies if table access is ever granted: no public rows or USER mutations.
create policy trial_content_founder on public.trial_content
  for all to authenticated
  using ((select public.is_founder()))
  with check ((select public.is_founder()));$m3s4$,
$m3s5$

-- Definer reads are deliberately restricted to RELEASED rows and four safe fields.
create function public.read_released_content(content_id uuid default null)
returns table (id uuid, category text, title text, body text)
language sql stable security definer
set search_path = ''
as $$
  select c.id, c.category, c.title, c.body
  from public.trial_content c
  where c.state = 'RELEASED' and (content_id is null or c.id = content_id)
  order by c.created_at desc, c.id
  limit 100;
$$;$m3s5$,
$m3s6$
revoke all on function public.read_released_content(uuid) from public, anon, authenticated;$m3s6$,
$m3s7$
grant execute on function public.read_released_content(uuid) to anon, authenticated;$m3s7$,
$m3s8$

-- A locked row makes edit/release/withdraw decisions atomic. No arbitrary state input.
create function public.manage_trial_content(payload jsonb)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  operation text;
  record public.trial_content%rowtype;
  allowed_keys text[];
  trim_characters constant text := U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF';
begin
  if auth.uid() is null or not public.is_founder() then
    raise exception 'Access denied' using errcode = '42501';
  end if;
  if jsonb_typeof(payload) is distinct from 'object' then
    raise exception 'Invalid request' using errcode = '22023';
  end if;
  operation := payload->>'action';
  if operation = 'create' then allowed_keys := array['action', 'category', 'title', 'body'];
  elsif operation = 'update' then allowed_keys := array['action', 'id', 'category', 'title', 'body'];
  elsif operation = 'release' then allowed_keys := array['action', 'id'];
  elsif operation in ('withdraw', 'read') then allowed_keys := array['action', 'id'];
  else raise exception 'Invalid request' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_object_keys(payload) k where not (k = any(allowed_keys)))
     or not (payload ?& allowed_keys) then
    raise exception 'Invalid request' using errcode = '22023';
  end if;
  if operation in ('create', 'update') then
    if jsonb_typeof(payload->'category') is distinct from 'string'
       or jsonb_typeof(payload->'title') is distinct from 'string'
       or jsonb_typeof(payload->'body') is distinct from 'string' then
      raise exception 'Invalid request' using errcode = '22023';
    end if;
    payload := payload || jsonb_build_object(
      'title', btrim(payload->>'title', trim_characters),
      'body', btrim(payload->>'body', trim_characters)
    );
  end if;
  if operation = 'create' then
    insert into public.trial_content(category, title, body)
      values (payload->>'category', payload->>'title', payload->>'body')
      returning * into record;
  else
    if jsonb_typeof(payload->'id') is distinct from 'string' then
      raise exception 'Invalid request' using errcode = '22023';
    end if;
    select * into record from public.trial_content
      where id = (payload->>'id')::uuid for update;
    if not found then return null; end if;
    if operation = 'update' then
      update public.trial_content set category = payload->>'category',
        title = payload->>'title', body = payload->>'body', state = 'DRAFT',
        released_at = null, updated_at = now() where id = record.id returning * into record;
    elsif operation = 'release' then
      if record.state = 'RELEASED' then
        raise exception 'Invalid release' using errcode = '22023';
      end if;
      update public.trial_content set state = 'RELEASED', released_at = now(), updated_at = now()
        where id = record.id returning * into record;
    elsif operation = 'withdraw' then
      if record.state <> 'RELEASED' then
        raise exception 'Invalid withdrawal' using errcode = '22023';
      end if;
      update public.trial_content set state = 'WITHDRAWN', updated_at = now()
        where id = record.id returning * into record;
    end if;
  end if;
  return to_jsonb(record);
end;
$$;$m3s8$,
$m3s9$
revoke all on function public.manage_trial_content(jsonb) from public, anon, authenticated;$m3s9$,
$m3s10$
grant execute on function public.manage_trial_content(jsonb) to authenticated;
$m3s10$
  ];
  m4 constant text[] := ARRAY[
$m4s1$-- T13-P0A additive only. Local file: application requires separate approval.
-- T13 callers must use this RPC, never a read followed by the legacy update RPC.
-- The row lock spans the guard and nested update in one transaction. A transition
-- committed first causes rejection; a later transition waits for the draft save.
-- Concurrent DRAFT saves serialize but remain last-writer-wins (no version token).
create function public.update_trial_content_draft(payload jsonb)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  content public.trial_content%rowtype;
  result jsonb;
  required constant text[] := array['id', 'category', 'title', 'body'];
begin
  if auth.uid() is null or public.is_founder() is distinct from true then
    raise exception 'Access denied' using errcode = '42501';
  end if;
  if jsonb_typeof(payload) is distinct from 'object' then
    raise exception 'Invalid request' using errcode = '22023';
  end if;
  if not (payload ?& required)
     or exists (select 1 from jsonb_object_keys(payload) k where not (k = any(required)))
     or exists (select 1 from unnest(required) k where jsonb_typeof(payload->k) is distinct from 'string') then
    raise exception 'Invalid request' using errcode = '22023';
  end if;
  if payload->>'id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'Invalid request' using errcode = '22023';
  end if;

  select * into content from public.trial_content
    where id = (payload->>'id')::uuid for update;
  if not found then return jsonb_build_object('outcome', 'not_found'); end if;
  if content.state is distinct from 'DRAFT' then
    return jsonb_build_object('outcome', 'not_draft');
  end if;

  -- Reuse T06 normalization, category/text constraints and mutation semantics.
  -- The caller cannot select another action or supply lifecycle/identity fields.
  begin
    result := public.manage_trial_content(jsonb_build_object(
      'action', 'update', 'id', content.id, 'category', payload->>'category',
      'title', payload->>'title', 'body', payload->>'body'));
  exception when check_violation then
    -- Do not expose the failing row or database constraint details.
    raise exception 'Invalid request' using errcode = '22023';
  end;
  if result is null
     or result->>'id' is distinct from content.id::text
     or result->>'state' is distinct from 'DRAFT'
     or result->'released_at' is distinct from 'null'::jsonb
     or result->'created_at' is distinct from to_jsonb(content.created_at) then
    raise exception 'Request could not be completed' using errcode = 'XX000';
  end if;
  return jsonb_build_object('outcome', 'saved', 'content', result);
end;
$$;$m4s1$,
$m4s2$
revoke all on function public.update_trial_content_draft(jsonb) from public, anon, authenticated;$m4s2$,
$m4s3$
grant execute on function public.update_trial_content_draft(jsonb) to authenticated;
-- Existing tables, RLS, grants and legacy RPCs are unchanged. To disable this
-- additive boundary, revoke its EXECUTE grant; never fall back to legacy update.
$m4s3$
  ];

 n integer;
begin
 if (select count(*) from supabase_migrations.schema_migrations where name='htc_group3_core_auth_content_draft')<>1
 or exists(select 1 from supabase_migrations.schema_migrations where version in ('20260925','20261005','20261008','20261011090000')) then raise exception 'Unexpected migration history baseline';end if;
 update supabase_migrations.schema_migrations set version='20260925',name='core_data_foundation',statements=m1 where name='htc_group3_core_auth_content_draft';
 insert into supabase_migrations.schema_migrations(version,name,statements) values
 ('20261005','auth_role_foundation',m2),
 ('20261008','content_release',m3),('20261011090000','trial_content_draft_only',m4);
 if (select count(*) from supabase_migrations.schema_migrations where name='trial_assets')<>1 or exists(select 1 from supabase_migrations.schema_migrations where version='20261008090000') then raise exception 'History mismatch trial_assets';end if;
 update supabase_migrations.schema_migrations set version='20261008090000',statements=array[$source$-- T07A only. Unique migration version; remote application requires explicit approval.
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
$source$] where name='trial_assets';
 if (select count(*) from supabase_migrations.schema_migrations where name='trial_content_assets')<>1 or exists(select 1 from supabase_migrations.schema_migrations where version='20261009090000') then raise exception 'History mismatch trial_content_assets';end if;
 update supabase_migrations.schema_migrations set version='20261009090000',statements=array[$source$-- T07B additive only. Review and explicit approval are required before remote apply.
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
$source$] where name='trial_content_assets';
 if (select count(*) from supabase_migrations.schema_migrations where name='public_content_discovery')<>1 or exists(select 1 from supabase_migrations.schema_migrations where version='20261009100000') then raise exception 'History mismatch public_content_discovery';end if;
 update supabase_migrations.schema_migrations set version='20261009100000',statements=array[$source$-- T09 additive public pagination only. Do not apply remotely without approval.
-- The existing T06 ordering is retained; creation time does not move on rerelease.
create index trial_content_released_discovery
  on public.trial_content(created_at desc, id asc) where state = 'RELEASED';

create function public.read_released_content_page(
  page_size integer default 20,
  after_created_at timestamptz default null,
  after_id uuid default null,
  category_filter text default null
)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if page_size is null or page_size not between 1 and 100
    or (after_created_at is null) <> (after_id is null)
    or (after_created_at is not null and not isfinite(after_created_at))
    or (category_filter is not null and category_filter not in
      ('INTRODUCTION','INFORMATION','EDITORIAL','DISCOVERY','FUTURE_JOURNEY','VALIDATION')) then
    raise exception 'Invalid discovery request' using errcode='22023';
  end if;
  with candidates as materialized (
    select c.id,c.category,c.title,c.body,c.created_at
    from public.trial_content c
    where c.state='RELEASED'
      and (category_filter is null or c.category=category_filter)
      and (after_created_at is null or c.created_at < after_created_at
        or (c.created_at=after_created_at and c.id > after_id))
    order by c.created_at desc,c.id asc limit page_size+1
  ), page as (
    select * from candidates order by created_at desc,id asc limit page_size
  )
  select jsonb_build_object(
    'items',coalesce(jsonb_agg(jsonb_build_object('id',p.id,'category',p.category,'title',p.title,'body',p.body)
      order by p.created_at desc,p.id asc),'[]'::jsonb),
    'next_position',case when (select count(*) from candidates)>page_size then
      (select jsonb_build_object('created_at',to_char(last.created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),'id',last.id)
       from page last order by last.created_at asc,last.id desc limit 1)
      else null end
  ) into result from page p;
  return result;
end; $$;
revoke all on function public.read_released_content_page(integer,timestamptz,uuid,text) from public,anon,authenticated;
grant execute on function public.read_released_content_page(integer,timestamptz,uuid,text) to anon,authenticated;
$source$] where name='public_content_discovery';
 if (select count(*) from supabase_migrations.schema_migrations where name='founder_content_list')<>1 or exists(select 1 from supabase_migrations.schema_migrations where version='20261011100000') then raise exception 'History mismatch founder_content_list';end if;
 update supabase_migrations.schema_migrations set version='20261011100000',statements=array[$source$-- T13 private, bounded keyset listing. No publishing or media operations.
create function public.list_trial_content_for_founder(after_id uuid default null)
returns table (id uuid, category text, title text, body text, state text,
  created_at timestamptz, updated_at timestamptz, released_at timestamptz)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or public.is_founder() is distinct from true then
    raise exception 'Access denied' using errcode = '42501';
  end if;
  return query select c.id, c.category, c.title, c.body, c.state,
    c.created_at, c.updated_at, c.released_at
    from public.trial_content c
    where after_id is null or c.id > after_id
    order by c.id limit 51;
end;
$$;
revoke all on function public.list_trial_content_for_founder(uuid) from public, anon, authenticated;
grant execute on function public.list_trial_content_for_founder(uuid) to authenticated;
$source$] where name='founder_content_list';
end;
$history$;
