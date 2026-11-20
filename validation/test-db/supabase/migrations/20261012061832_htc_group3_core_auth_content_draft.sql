-- Authorized Group 3 adaptation: same four source bodies and app assertions; one managed history entry.
DO $htc_atomic$
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
  stmt text;
  role_name text;
  table_name text;
  privilege_name text;
  fn_name text;
  expected_path text;
  expected_source text;
  fn record;
  auth_before jsonb;
  auth_after jsonb;
  expected_hashes constant text[] := ARRAY[
    'e778de2bac2850925d15356761dd49d3a3d385210781966dd3f8f96360b7b1c8',
    'ca7530c10db620bd1111b96ec6d0bd951711424a60454ec2311282cf8ef3661a',
    'c4f98313e410b40a793d5b726aed9bfa42a9b72b5f7109cd87b187582808dfb9',
    '3d8e94c8e7d910663b10c3d63293f2a232e88eee25794af4ced4089d46c43a88'
  ];
  actual_hashes text[];
begin
  -- Target identity is verified in the Dashboard/API before submission.
  -- A SQL constant is not proof of which project received this batch.
  if current_user <> 'postgres'
     or current_setting('server_version_num')::integer / 10000 <> 17
     or current_setting('transaction_read_only') <> 'off'
     or to_regclass('public.user_profiles') is not null
     or to_regclass('public.trial_content') is not null
     or to_regtype('public.user_role') is not null
     or exists (select 1 from auth.users)
     or exists (select 1 from pg_trigger
                where tgrelid = 'auth.users'::regclass and not tgisinternal)
     or exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                where n.nspname='public' and p.proname in (
                  'set_user_profiles_updated_at','is_founder',
                  'sync_auth_user_profile','protect_user_profile_fields',
                  'read_released_content','manage_trial_content',
                  'update_trial_content_draft')) then
    raise exception 'DB1 baseline mismatch; no migration may proceed';
  end if;
  if not has_database_privilege(current_user,current_database(),'CREATE')
     or not has_schema_privilege(current_user,'public','CREATE')
     or not has_table_privilege(current_user,'auth.users','TRIGGER')
     or not has_table_privilege(current_user,'auth.users','REFERENCES')
     or to_regprocedure('auth.uid()') is null
     or to_regprocedure('gen_random_uuid()') is null
     or (select count(*) from pg_roles
         where rolname in ('anon','authenticated','service_role')) <> 3
     or exists (select 1 from pg_roles
                where rolname in ('anon','authenticated') and (rolsuper or rolbypassrls)) then
    raise exception 'DB1 prerequisite mismatch';
  end if;
  foreach role_name in array ARRAY['anon','authenticated'] loop
    if has_schema_privilege(role_name,'public','CREATE')
       or has_schema_privilege(role_name,'auth','CREATE') then
      raise exception 'Untrusted role can create objects in a definer search path';
    end if;
  end loop;
  select jsonb_build_object('owner',c.relowner,'acl',c.relacl::text,
      'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,
      'policies',(select coalesce(jsonb_agg(to_jsonb(p) order by p.oid),'[]'::jsonb)
                  from pg_policy p where p.polrelid=c.oid))
    into auth_before from pg_class c where c.oid='auth.users'::regclass;
  if auth_before->>'owner' <> 'supabase_auth_admin'::regrole::oid::text then
    raise exception 'Unexpected Auth ownership';
  end if;

  actual_hashes := ARRAY[
    encode(sha256(convert_to(array_to_string(m1,''),'UTF8')),'hex'),
    encode(sha256(convert_to(array_to_string(m2,''),'UTF8')),'hex'),
    encode(sha256(convert_to(array_to_string(m3,''),'UTF8')),'hex'),
    encode(sha256(convert_to(array_to_string(m4,''),'UTF8')),'hex')
  ];
  if actual_hashes is distinct from expected_hashes then
    raise exception 'Migration byte integrity mismatch';
  end if;

  -- Migration 1: execute the exact original statements in order.
  foreach stmt in array m1 loop execute stmt; end loop;
  -- Migration 2.
  foreach stmt in array m2 loop execute stmt; end loop;
  -- Migration 3.
  foreach stmt in array m3 loop execute stmt; end loop;
  -- Migration 4.
  foreach stmt in array m4 loop execute stmt; end loop;

  -- Migration history is owned by the Management API apply_migration wrapper.
  -- Exact hashes of the four source migrations were asserted above.
  if (select count(*) from pg_class
      where oid in ('public.user_profiles'::regclass,'public.trial_content'::regclass)
        and relrowsecurity and relowner='postgres'::regrole) <> 2 then
    raise exception 'Application ownership or RLS mismatch';
  end if;
  if (select count(*) from pg_policy
      where polrelid in ('public.user_profiles'::regclass,
                         'public.trial_content'::regclass)) <> 3
     or (select count(*) from pg_policy
         where polroles=ARRAY['authenticated'::regrole::oid]
           and polpermissive
           and (
             (polrelid='public.user_profiles'::regclass
              and polname='user_profiles_select_own_or_founder' and polcmd='r')
             or (polrelid='public.user_profiles'::regclass
              and polname='user_profiles_update_own_or_founder_display_name' and polcmd='w')
             or (polrelid='public.trial_content'::regclass
              and polname='trial_content_founder' and polcmd='*'))) <> 3 then
    raise exception 'Application policy mismatch';
  end if;
  foreach role_name in array ARRAY['anon','authenticated'] loop
    foreach table_name in array ARRAY[
      'public.user_profiles','public.trial_content'] loop
      foreach privilege_name in array ARRAY[
        'INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] loop
        if has_table_privilege(role_name,table_name,privilege_name) then
          raise exception 'Forbidden effective table privilege: %, %, %',
            role_name,table_name,privilege_name;
        end if;
      end loop;
      if (table_name <> 'public.user_profiles' or role_name='anon')
         and has_table_privilege(role_name,table_name,'SELECT') then
        raise exception 'Forbidden direct SELECT privilege';
      end if;
      if exists (
        select 1 from pg_attribute a
        where a.attrelid=table_name::regclass and a.attnum>0 and not a.attisdropped
          and (
            has_column_privilege(role_name,table_name,a.attnum,'INSERT')
            or has_column_privilege(role_name,table_name,a.attnum,'REFERENCES')
            or (has_column_privilege(role_name,table_name,a.attnum,'UPDATE')
                and not (role_name='authenticated'
                         and table_name='public.user_profiles'
                         and a.attname='display_name'))
            or (has_column_privilege(role_name,table_name,a.attnum,'SELECT')
                and not (role_name='authenticated'
                         and table_name='public.user_profiles')))) then
        raise exception 'Forbidden effective column privilege';
      end if;
    end loop;
    if has_schema_privilege(role_name,'public','CREATE')
       or has_schema_privilege(role_name,'auth','CREATE') then
      raise exception 'Forbidden effective schema privilege';
    end if;
  end loop;
  if not has_table_privilege('authenticated','public.user_profiles','SELECT')
     or not has_column_privilege('authenticated','public.user_profiles','display_name','UPDATE')
     or exists (
       select 1 from pg_class c,
       lateral aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a
       where c.oid in ('public.user_profiles'::regclass,
                       'public.trial_content'::regclass)
         and a.grantee=0) then
    raise exception 'Required profile grants or PUBLIC table ACL mismatch';
  end if;

  -- Compare every function body and security configuration to its exact source.
  foreach stmt in array (m1 || m2 || m3 || m4) loop
    fn_name := substring(stmt from 'create function public[.]([a-z_]+)');
    if fn_name is not null then
      expected_source := substring(stmt from '(?s)as [$][$](.*)[$][$];');
      expected_path := case
        when position($empty$set search_path = ''$empty$ in stmt)>0
          then 'search_path=""'
        else 'search_path=' || substring(stmt from 'set search_path = ([^\n]+)')
      end;
      if (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
          where n.nspname='public' and p.proname=fn_name) <> 1 then
        raise exception 'Function missing or unexpected overload: %',fn_name;
      end if;
      select p.* into fn from pg_proc p join pg_namespace n on n.oid=p.pronamespace
        where n.nspname='public' and p.proname=fn_name;
      if fn.proowner <> 'postgres'::regrole::oid
         or fn.prosecdef is distinct from (position('security definer' in stmt)>0)
         or fn.proconfig is distinct from ARRAY[expected_path]
         or fn.prosrc is distinct from expected_source then
        raise exception 'Function source/security mismatch: %',fn_name;
      end if;
      if fn_name <> 'set_user_profiles_updated_at'
         and exists (
           select 1 from aclexplode(coalesce(fn.proacl,acldefault('f',fn.proowner))) a
           where a.grantee=0 and a.privilege_type='EXECUTE') then
        raise exception 'Forbidden PUBLIC EXECUTE: %',fn_name;
      end if;
    end if;
  end loop;
  if has_function_privilege('anon','public.is_founder()','EXECUTE')
     or not has_function_privilege('authenticated','public.is_founder()','EXECUTE')
     or has_function_privilege('anon','public.sync_auth_user_profile()','EXECUTE')
     or has_function_privilege('authenticated','public.sync_auth_user_profile()','EXECUTE')
     or has_function_privilege('anon','public.protect_user_profile_fields()','EXECUTE')
     or has_function_privilege('authenticated','public.protect_user_profile_fields()','EXECUTE')
     or not has_function_privilege('anon','public.read_released_content(uuid)','EXECUTE')
     or not has_function_privilege('authenticated','public.read_released_content(uuid)','EXECUTE')
     or has_function_privilege('anon','public.manage_trial_content(jsonb)','EXECUTE')
     or not has_function_privilege('authenticated','public.manage_trial_content(jsonb)','EXECUTE')
     or has_function_privilege('anon','public.update_trial_content_draft(jsonb)','EXECUTE')
     or not has_function_privilege('authenticated','public.update_trial_content_draft(jsonb)','EXECUTE') then
    raise exception 'Effective RPC EXECUTE mismatch';
  end if;
  select jsonb_build_object('owner',c.relowner,'acl',c.relacl::text,
      'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,
      'policies',(select coalesce(jsonb_agg(to_jsonb(p) order by p.oid),'[]'::jsonb)
                  from pg_policy p where p.polrelid=c.oid))
    into auth_after from pg_class c where c.oid='auth.users'::regclass;
  if auth_after is distinct from auth_before
     or exists (select 1 from auth.users)
     or exists (select 1 from public.user_profiles)
     or exists (select 1 from public.trial_content)
     or (select count(*) from pg_trigger
         where tgrelid='auth.users'::regclass and not tgisinternal) <> 2
     or (select count(*) from pg_trigger
         where tgrelid='auth.users'::regclass and not tgisinternal
           and tgname in ('on_auth_user_created','on_auth_user_email_changed')
           and tgenabled='O'
           and tgfoid='public.sync_auth_user_profile()'::regprocedure) <> 2 then
    raise exception 'Auth safety or empty-data assertion failed';
  end if;
end;
$htc_atomic$;
