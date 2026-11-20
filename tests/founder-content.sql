-- Isolated disposable HTC test database ONLY, never production/staging.
-- Requires DB1 and 20261011100000_founder_content_list.sql. All fixtures roll back.
-- Run once using psql -X -v ON_ERROR_STOP=1 -f tests/founder-content.sql.
begin;
do $$ begin
  if exists(select 1 from auth.users) or exists(select 1 from public.trial_content) then
    raise exception 'Requires an empty disposable test database';
  end if;
end; $$;
insert into auth.users(id,email) values
  ('00000000-0000-4000-8000-000000000701','holictraderscompany@gmail.com'),
  ('00000000-0000-4000-8000-000000000702','t13-workspace-user@example.invalid');
insert into public.trial_content(id,category,title,body,state,released_at)
select ('00000000-0000-4000-8000-' || lpad(i::text,12,'0'))::uuid,
  'INFORMATION', 'Synthetic record ' || i, 'Synthetic plain text',
  case when i=912 then 'RELEASED' when i=911 then 'WITHDRAWN' else 'DRAFT' end,
  case when i>=911 then now() else null end
from generate_series(810,912) i;

set local role anon;
do $$ begin
  if has_function_privilege(current_user,'public.list_trial_content_for_founder(uuid)','EXECUTE') then
    raise exception 'Anonymous list EXECUTE allowed';
  end if;
  begin
    perform public.list_trial_content_for_founder();
    raise exception 'Anonymous private listing allowed';
  exception when insufficient_privilege then null;
  end;
end; $$;
set local role authenticated;
do $$ declare identity text; begin
  foreach identity in array array['','00000000-0000-4000-8000-000000000702'] loop
    perform set_config('request.jwt.claim.sub',identity,true);
    begin
      perform public.list_trial_content_for_founder();
      raise exception 'Anonymous/USER private listing allowed';
    exception when insufficient_privilege then null;
    end;
  end loop;
  if has_table_privilege(current_user,'public.trial_content','SELECT') then
    raise exception 'Direct table access unexpectedly granted';
  end if;
end; $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000701',true);
do $$
declare first_page uuid[]; second_page uuid[]; final_page uuid[]; public_before jsonb; result jsonb;
begin
  if public.is_founder() is distinct from true then raise exception 'Synthetic Founder was not assigned by the existing auth trigger'; end if;
  select array_agg(c.id order by c.id) into first_page from public.list_trial_content_for_founder() c;
  if cardinality(first_page)<>51 then raise exception 'First page bound failed'; end if;
  select array_agg(c.id order by c.id) into second_page from public.list_trial_content_for_founder(first_page[50]) c;
  if cardinality(second_page)<>51 or second_page[1]<>first_page[51] then raise exception 'Keyset continuity failed'; end if;
  select array_agg(c.id order by c.id) into final_page from public.list_trial_content_for_founder(second_page[50]) c;
  if cardinality(final_page)<>3 or final_page[1]<>second_page[51] then raise exception 'Final page failed'; end if;
  if (select count(*) from public.list_trial_content_for_founder(final_page[3]))<>0 then raise exception 'Cursor did not exhaust records'; end if;
  if not exists(select 1 from public.list_trial_content_for_founder(second_page[50]) where state='RELEASED')
     or not exists(select 1 from public.list_trial_content_for_founder(second_page[50]) where state='WITHDRAWN') then
    raise exception 'Founder cannot inspect non-DRAFT states';
  end if;
  select jsonb_agg(to_jsonb(c) order by c.id) into public_before from public.read_released_content() c;
  result := public.update_trial_content_draft(jsonb_build_object('id',first_page[1],
    'category','INFORMATION','title','Synthetic edited draft','body','Synthetic edited body'));
  if result->>'outcome' is distinct from 'saved' then raise exception 'Draft save failed'; end if;
  if (select jsonb_agg(to_jsonb(c) order by c.id) from public.read_released_content() c) is distinct from public_before then
    raise exception 'Public content changed';
  end if;
end; $$;
reset role;
do $$ declare definition record; begin
  select p.prosecdef,p.proconfig,r.rolname into definition
    from pg_proc p join pg_roles r on r.oid=p.proowner
    where p.oid='public.list_trial_content_for_founder(uuid)'::regprocedure;
  if definition.prosecdef is distinct from true or definition.proconfig is distinct from array['search_path=""']::text[]
     or definition.rolname<>'postgres' then raise exception 'Unsafe listing function configuration'; end if;
  if exists(select 1 from pg_proc p, lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
    where p.oid='public.list_trial_content_for_founder(uuid)'::regprocedure and a.grantee=0 and a.privilege_type='EXECUTE') then
    raise exception 'PUBLIC EXECUTE unexpectedly granted';
  end if;
  if not (select relrowsecurity from pg_class where oid='public.trial_content'::regclass) then
    raise exception 'Content RLS disabled';
  end if;
end; $$;
rollback;
