-- NOT executed by pnpm test. Disposable local Supabase database ONLY.
-- Requires repository migrations including T13-P0A, applied under separate approval.
-- Run with psql -v ON_ERROR_STOP=1; all fixtures/DDL roll back on disconnect.
begin;
insert into auth.users(id, email) values
  ('00000000-0000-4000-8000-000000000701', 'holictraderscompany@gmail.com'),
  ('00000000-0000-4000-8000-000000000702', 't13-p0a-user@example.invalid');
insert into public.trial_content(id, category, title, body, state, released_at) values
  ('00000000-0000-4000-8000-000000000710', 'EDITORIAL', 'Draft', 'Draft body', 'DRAFT', null),
  ('00000000-0000-4000-8000-000000000711', 'INFORMATION', 'Released', 'Public body', 'RELEASED', now()),
  ('00000000-0000-4000-8000-000000000712', 'INFORMATION', 'Withdrawn', 'Retained body', 'WITHDRAWN', now());

set local role anon;
do $$
begin
  if has_function_privilege(current_user, 'public.update_trial_content_draft(jsonb)', 'EXECUTE') then
    raise exception 'Anonymous EXECUTE allowed';
  end if;
  begin
    perform public.update_trial_content_draft('{}'::jsonb);
    raise exception 'Anonymous save allowed';
  exception when insufficient_privilege then null;
  end;
end;
$$;

set local role authenticated;
do $$
declare identity text;
begin
  foreach identity in array array['', '00000000-0000-4000-8000-000000000702'] loop
    perform set_config('request.jwt.claim.sub', identity, true);
    begin
      perform public.update_trial_content_draft(jsonb_build_object(
        'id','00000000-0000-4000-8000-000000000710', 'category','EDITORIAL',
        'title','Unauthorized', 'body','Unauthorized', 'role','FOUNDER'));
      raise exception 'Anonymous/USER save allowed';
    exception when insufficient_privilege then null;
    end;
  end loop;
  if has_table_privilege(current_user, 'public.trial_content', 'SELECT')
     or has_table_privilege(current_user, 'public.trial_content', 'INSERT')
     or has_table_privilege(current_user, 'public.trial_content', 'UPDATE')
     or has_table_privilege(current_user, 'public.trial_content', 'DELETE') then
    raise exception 'Direct content table access allowed';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000701', true);
do $$
declare
  draft_id constant text := '00000000-0000-4000-8000-000000000710';
  target text;
  field text;
  candidate jsonb;
  payload jsonb := jsonb_build_object('id', draft_id, 'category','EDITORIAL', 'title','  Edited  ', 'body','  Draft body  ');
  result jsonb;
  snapshot jsonb;
  public_before jsonb;
begin
  snapshot := public.manage_trial_content(jsonb_build_object('action','read','id',draft_id));
  if snapshot->>'title' <> 'Draft' then raise exception 'Unauthorized request changed draft'; end if;
  result := public.update_trial_content_draft(payload);
  if result->>'outcome' is distinct from 'saved'
     or result->'content'->>'id' is distinct from draft_id
     or result->'content'->>'title' is distinct from 'Edited'
     or result->'content'->>'body' is distinct from 'Draft body'
     or result->'content'->>'state' is distinct from 'DRAFT'
     or result->'content'->'released_at' is distinct from 'null'::jsonb
     or result->'content'->'created_at' is distinct from snapshot->'created_at' then
    raise exception 'Valid draft save/invariants failed';
  end if;
  if exists(select 1 from public.read_released_content(draft_id::uuid)) then
    raise exception 'Draft became public';
  end if;
  snapshot := public.manage_trial_content(jsonb_build_object('action','read','id',draft_id));
  foreach field in array array['action','state','released_at','created_at','updated_at','role','owner_id','asset_id','unexpected'] loop
    begin
      perform public.update_trial_content_draft(payload || jsonb_build_object(field,'RELEASED'));
      raise exception 'Forbidden field accepted: %', field;
    exception when invalid_parameter_value then null;
    end;
  end loop;
  foreach field in array array['id','category','title','body'] loop
    begin
      perform public.update_trial_content_draft(payload - field);
      raise exception 'Missing field accepted: %', field;
    exception when invalid_parameter_value then null;
    end;
    begin
      perform public.update_trial_content_draft(payload || jsonb_build_object(field,null));
      raise exception 'Null field accepted: %', field;
    exception when invalid_parameter_value then null;
    end;
    begin
      perform public.update_trial_content_draft(payload || jsonb_build_object(field,42));
      raise exception 'Numeric field accepted: %', field;
    exception when invalid_parameter_value then null;
    end;
  end loop;
  for candidate in select value from jsonb_array_elements(jsonb_build_array(
    'null'::jsonb, '[]'::jsonb, '42'::jsonb,
    payload || jsonb_build_object('id','not-a-uuid'),
    payload || jsonb_build_object('category','UNAPPROVED'),
    payload || jsonb_build_object('title','   '),
    payload || jsonb_build_object('body',''),
    payload || jsonb_build_object('title','<script>'),
    payload || jsonb_build_object('body','<html>'),
    payload || jsonb_build_object('title',repeat('x',201)),
    payload || jsonb_build_object('body',repeat('x',8001)))) loop
    begin
      perform public.update_trial_content_draft(candidate);
      raise exception 'Malformed request accepted';
    exception when invalid_parameter_value then
      if sqlerrm <> 'Invalid request' then raise exception 'Database details leaked'; end if;
    end;
  end loop;
  if public.manage_trial_content(jsonb_build_object('action','read','id',draft_id)) is distinct from snapshot then
    raise exception 'Invalid request changed row';
  end if;
  result := public.update_trial_content_draft(payload || jsonb_build_object('id','00000000-0000-4000-8000-000000000799'));
  if result is distinct from jsonb_build_object('outcome','not_found') then raise exception 'Missing row contract failed'; end if;
  select coalesce(jsonb_agg(to_jsonb(c) order by c.id),'[]'::jsonb) into public_before from public.read_released_content() c;
  foreach target in array array['00000000-0000-4000-8000-000000000711','00000000-0000-4000-8000-000000000712'] loop
    snapshot := public.manage_trial_content(jsonb_build_object('action','read','id',target));
    result := public.update_trial_content_draft(payload || jsonb_build_object('id',target));
    if result is distinct from jsonb_build_object('outcome','not_draft')
       or public.manage_trial_content(jsonb_build_object('action','read','id',target)) is distinct from snapshot then
      raise exception 'Non-DRAFT rejection changed row';
    end if;
  end loop;
  if (select coalesce(jsonb_agg(to_jsonb(c) order by c.id),'[]'::jsonb) from public.read_released_content() c) is distinct from public_before then
    raise exception 'Public content changed';
  end if;
end;
$$;

-- Inject a post-update invariant violation to prove the whole save rolls back.
reset role;
create function pg_temp.t13_corrupt_creation() returns trigger language plpgsql as $$
begin new.created_at := old.created_at + interval '1 second'; return new; end;
$$;
create trigger t13_test_invariant before update on public.trial_content
  for each row when (old.id = '00000000-0000-4000-8000-000000000710'::uuid)
  execute function pg_temp.t13_corrupt_creation();
set local role authenticated;
do $$
declare snapshot jsonb;
begin
  snapshot := public.manage_trial_content(jsonb_build_object('action','read','id','00000000-0000-4000-8000-000000000710'));
  begin
    perform public.update_trial_content_draft(jsonb_build_object('id','00000000-0000-4000-8000-000000000710',
      'category','EDITORIAL','title','Must roll back','body','Must roll back'));
    raise exception 'Invariant violation accepted';
  exception when sqlstate 'XX000' then
    if sqlerrm <> 'Request could not be completed' then raise exception 'Internal details leaked'; end if;
  end;
  if public.manage_trial_content(jsonb_build_object('action','read','id','00000000-0000-4000-8000-000000000710')) is distinct from snapshot then
    raise exception 'Invariant failure did not roll back update';
  end if;
end;
$$;
rollback;
