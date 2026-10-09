-- LOCAL EMPTY DISPOSABLE Supabase database ONLY; never use the linked project.
-- Apply repository migrations locally. All fixtures and probes are rolled back.
-- psql -v ON_ERROR_STOP=1 -v T09_LOCAL_DISPOSABLE=true -f tests/content-discovery.sql
\if :{?T09_LOCAL_DISPOSABLE}
\else
  \echo 'An explicitly acknowledged local disposable database is required.'
  \quit 1
\endif
\if :T09_LOCAL_DISPOSABLE
\else
  \quit 1
\endif
begin;
do $$ begin
  if exists(select 1 from public.trial_content) then
    raise exception 'This suite requires an empty disposable content table';
  end if;
end; $$;
insert into public.trial_content(id,category,title,body,state,created_at,released_at)
select ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
  case when n<=104 then 'INFORMATION' else 'EDITORIAL' end,
  'T09 local fixture','Trial only','RELEASED','2026-10-09T01:00:00.123456Z','2026-10-09T01:00:00.123456Z'
from generate_series(1,105) n;
insert into public.trial_content(id,category,title,body,state,created_at,released_at) values
  ('00000000-0000-4000-8000-000000000201','INFORMATION','Private draft','Trial only','DRAFT',now(),null),
  ('00000000-0000-4000-8000-000000000202','INFORMATION','Private withdrawn','Trial only','WITHDRAWN',now(),now());

set local role anon;
do $$
declare first_page jsonb; second_page jsonb; last_page jsonb; boundary jsonb; item jsonb;
begin
  if has_table_privilege(current_user,'public.trial_content','SELECT') then
    raise exception 'Direct public table read must remain denied';
  end if;
  first_page:=public.read_released_content_page(100);
  if jsonb_array_length(first_page->'items')<>100 then raise exception 'Page size mismatch'; end if;
  if first_page#>>'{items,0,id}'<>'00000000-0000-4000-8000-000000000001'
    or first_page#>>'{items,99,id}'<>'00000000-0000-4000-8000-000000000100' then
    raise exception 'Timestamp tie ordering mismatch'; end if;
  for item in select * from jsonb_array_elements(first_page->'items') loop
    if (select count(*) from jsonb_object_keys(item))<>4 or not(item ?& array['id','category','title','body']) then
      raise exception 'Unsafe public fields'; end if;
  end loop;
  boundary:=first_page->'next_position';
  if boundary->>'created_at'<>'2026-10-09T01:00:00.123456Z' then raise exception 'Precision lost'; end if;
  second_page:=public.read_released_content_page(100,(boundary->>'created_at')::timestamptz,(boundary->>'id')::uuid);
  if jsonb_array_length(second_page->'items')<>5 or second_page#>>'{items,0,id}'<>'00000000-0000-4000-8000-000000000101'
    or second_page->'next_position'<>'null'::jsonb then raise exception 'Continuation mismatch'; end if;
  last_page:=public.read_released_content_page(100,'2026-10-09T01:00:00.123456Z','00000000-0000-4000-8000-000000000105');
  if last_page->'items'<>'[]'::jsonb or last_page->'next_position'<>'null'::jsonb then raise exception 'End mismatch'; end if;
  if jsonb_array_length(public.read_released_content_page(100,null,null,'EDITORIAL')->'items')<>1 then
    raise exception 'Category filter mismatch'; end if;
  begin perform public.read_released_content_page(101); raise exception 'Oversize accepted';
    exception when invalid_parameter_value then null; end;
  begin perform public.read_released_content_page(null); raise exception 'Null size accepted';
    exception when invalid_parameter_value then null; end;
  begin perform public.read_released_content_page(1,null,'00000000-0000-4000-8000-000000000001'); raise exception 'Partial cursor accepted';
    exception when invalid_parameter_value then null; end;
  begin perform public.read_released_content_page(1,'infinity','00000000-0000-4000-8000-000000000001'); raise exception 'Infinite cursor accepted';
    exception when invalid_parameter_value then null; end;
  begin perform public.read_released_content_page(1,null,null,'LESSON'); raise exception 'Unknown category accepted';
    exception when invalid_parameter_value then null; end;
end; $$;
reset role;

-- Deleting/withdrawing the cursor anchor cannot break continuation: no anchor lookup.
update public.trial_content set state='WITHDRAWN' where id='00000000-0000-4000-8000-000000000100';
update public.trial_content set state='DRAFT',released_at=null where id='00000000-0000-4000-8000-000000000101';
set local role authenticated;
do $$ declare page jsonb; begin
  if has_table_privilege(current_user,'public.trial_content','SELECT') then raise exception 'USER table access gained'; end if;
  page:=public.read_released_content_page(100,'2026-10-09T01:00:00.123456Z','00000000-0000-4000-8000-000000000100');
  if jsonb_array_length(page->'items')<>4 or page#>>'{items,0,id}'<>'00000000-0000-4000-8000-000000000102' then
    raise exception 'Lifecycle/anchor continuation mismatch'; end if;
end; $$;
reset role;
rollback;
