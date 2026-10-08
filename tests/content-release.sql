-- LOCAL DISPOSABLE Supabase database ONLY. Never run against the linked project.
-- Apply the three repository migrations locally first. Run with psql -v ON_ERROR_STOP=1.
-- Fixture users and permission probes below are rolled back, including on disconnect.
begin;
insert into auth.users(id, email) values
  ('00000000-0000-4000-8000-000000000061', 'holictraderscompany@gmail.com'),
  ('00000000-0000-4000-8000-000000000062', 't06-local-user@example.invalid');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000062', true);
do $$
declare operation text;
begin
  foreach operation in array array['create', 'update', 'release', 'withdraw', 'read'] loop
    begin
      perform public.manage_trial_content(jsonb_build_object('action', operation));
      raise exception 'USER mutation/read unexpectedly allowed';
    exception when insufficient_privilege then null;
    end;
  end loop;
  if has_table_privilege(current_user, 'public.trial_content', 'SELECT')
     or has_table_privilege(current_user, 'public.trial_content', 'INSERT')
     or has_table_privilege(current_user, 'public.trial_content', 'UPDATE')
     or has_table_privilege(current_user, 'public.trial_content', 'DELETE') then
    raise exception 'Direct table access unexpectedly granted';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000061', true);
-- Text normalization matrix; lifecycle checks follow separately.
do $$
declare
  field text;
  maximum integer;
  sample record;
  payload jsonb;
  result jsonb;
  content_id uuid;
  normalized text;
  trim_characters constant text := U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF';
begin
  foreach field in array array['title','body'] loop
    maximum := case when field = 'title' then 200 else 8000 end;
    for sample in select * from (values
      ('A normal', 'Valid', true),
      ('B minimum', 'x', true),
      ('C maximum', repeat('x',maximum), true),
      ('D maximum plus one', repeat('x',maximum+1), false),
      ('E leading spaces', '   Valid', true),
      ('F trailing spaces', 'Valid   ', true),
      ('G surrounding spaces', '   Valid   ', true),
      ('H whitespace only', trim_characters, false),
      ('I raw over maximum due to padding', repeat(' ',maximum)||'Valid', true),
      ('J normalized over maximum', ' '||repeat('x',maximum+1)||' ', false),
      ('Unicode surrounding whitespace', trim_characters||'Valid'||trim_characters, true),
      ('Unicode maximum', ' '||repeat(U&'\+01F680',maximum)||' ', true),
      ('Unicode maximum plus one', repeat(U&'\+01F680',maximum+1), false)
    ) as samples(label,value,accepted) loop
      normalized := btrim(sample.value, trim_characters);
      payload := jsonb_build_object('action','create','category','INTRODUCTION','title','HTC','body','Trial')
        || jsonb_build_object(field,sample.value);
      if sample.accepted then
        result := public.manage_trial_content(payload);
        content_id := (result->>'id')::uuid;
        if result->>field is distinct from normalized then
          raise exception 'Create normalization mismatch: % %', field, sample.label;
        end if;
        result := public.manage_trial_content(payload || jsonb_build_object('action','update','id',content_id));
        if result->>field is distinct from normalized then
          raise exception 'Update normalization mismatch: % %', field, sample.label;
        end if;
      else
        begin
          perform public.manage_trial_content(payload);
          raise exception 'Invalid create text accepted: % %', field, sample.label;
        exception when check_violation then null;
        end;
        result := public.manage_trial_content('{"action":"create","category":"INTRODUCTION","title":"HTC","body":"Trial"}');
        begin
          perform public.manage_trial_content(payload || jsonb_build_object('action','update','id',result->>'id'));
          raise exception 'Invalid update text accepted: % %', field, sample.label;
        exception when check_violation then null;
        end;
      end if;
    end loop;
  end loop;
end;
$$;
do $$
declare result jsonb; content_id uuid; category text;
begin
  result := public.manage_trial_content('{"action":"create","category":"INTRODUCTION","title":"HTC","body":"Trial introduction"}');
  content_id := (result->>'id')::uuid;
  perform set_config('htc.t06_test_id', content_id::text, true);
  if result->>'state' <> 'DRAFT' or exists(select 1 from public.read_released_content(content_id)) then
    raise exception 'Draft visibility failure';
  end if;
  foreach category in array array['LESSON','COURSE','MODULE','QUIZ','CURRICULUM','ENROLLMENT','PROGRESS','ASSESSMENT'] loop
    begin
      perform public.manage_trial_content(jsonb_build_object('action','create','category',category,'title','Invalid','body','Invalid'));
      raise exception 'Forbidden category accepted';
    exception when check_violation then null;
    end;
  end loop;
  result := public.manage_trial_content(jsonb_build_object('action','update','id',content_id,'category','INFORMATION','title','HTC Trial','body','Validation only'));
  if result->>'state' <> 'DRAFT' then raise exception 'Draft update failed'; end if;
  result := public.manage_trial_content(jsonb_build_object('action','release','id',content_id));
  if result->>'state' <> 'RELEASED' then raise exception 'Release failed'; end if;
end;
$$;

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$
declare result jsonb;
begin
  select to_jsonb(c) into result from public.read_released_content(current_setting('htc.t06_test_id')::uuid) c;
  if result is null or (select count(*) from jsonb_object_keys(result)) <> 4
     or not (result ?& array['id','category','title','body']) then
    raise exception 'Released public projection failed';
  end if;
  begin
    perform public.manage_trial_content('{"action":"read"}');
    raise exception 'Anonymous management allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.trial_content;
    raise exception 'Anonymous direct table read allowed';
  exception when insufficient_privilege then null;
  end;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000061', true);
do $$
declare content_id uuid := current_setting('htc.t06_test_id')::uuid; result jsonb; operation text;
begin
  -- Valid USER requests remain denied for the current RELEASED record.
  perform set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000062', true);
  foreach operation in array array['update','release','withdraw'] loop
    begin
      if operation = 'update' then
        perform public.manage_trial_content(jsonb_build_object('action',operation,'id',content_id,'category','EDITORIAL','title','Unauthorized','body','Unauthorized'));
      else
        perform public.manage_trial_content(jsonb_build_object('action',operation,'id',content_id));
      end if;
      raise exception 'USER operation allowed on RELEASED content: %', operation;
    exception when insufficient_privilege then null;
    end;
  end loop;
  perform set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000061', true);
  result := public.manage_trial_content(jsonb_build_object('action','update','id',content_id,'category','EDITORIAL','title','Changed','body','Changed'));
  if result->>'state' <> 'DRAFT' or result->'released_at' is distinct from 'null'::jsonb
     or result->>'title' <> 'Changed' or result->>'body' <> 'Changed'
     or result->>'updated_at' is null
     or exists(select 1 from public.read_released_content(content_id))
     or exists(select 1 from public.read_released_content() c where c.id=content_id) then
    raise exception 'RELEASED edit failed to become private DRAFT atomically';
  end if;
  -- The same USER cannot edit the now-DRAFT record or gain authority via a legacy field.
  perform set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000062', true);
  begin
    perform public.manage_trial_content(jsonb_build_object('action','update','id',content_id,'category','EDITORIAL','title','Unauthorized','body','Unauthorized'));
    raise exception 'USER DRAFT edit allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.manage_trial_content(jsonb_build_object('action','release','id',content_id,'trial_approved',true));
    raise exception 'USER legacy field bypassed authorization';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000061', true);
  -- Unknown legacy payload fields are rejected by the ordinary key whitelist.
  begin
    perform public.manage_trial_content(jsonb_build_object('action','release','id',content_id,'trial_approved',true));
    raise exception 'Unexpected legacy release field accepted';
  exception when invalid_parameter_value then null;
  end;
  result := public.manage_trial_content(jsonb_build_object('action','release','id',content_id));
  if result->>'state' <> 'RELEASED' or result->'released_at' = 'null'::jsonb
     or not exists(select 1 from public.read_released_content(content_id) c where c.body='Changed') then
    raise exception 'Edited DRAFT re-release failed';
  end if;
  begin
    perform public.manage_trial_content(jsonb_build_object('action','release','id',content_id));
    raise exception 'Duplicate release allowed';
  exception when invalid_parameter_value then null;
  end;
  result := public.manage_trial_content(jsonb_build_object('action','withdraw','id',content_id));
  if result->>'state' <> 'WITHDRAWN' or exists(select 1 from public.read_released_content(content_id)) then
    raise exception 'Withdrawal failed';
  end if;
  result := public.manage_trial_content(jsonb_build_object('action','read','id',content_id));
  if result->>'state' <> 'WITHDRAWN' then raise exception 'Internal retention failed'; end if;
end;
$$;

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$
begin
  if exists(select 1 from public.read_released_content(current_setting('htc.t06_test_id')::uuid)) then
    raise exception 'Withdrawn direct identifier leaked';
  end if;
end;
$$;

-- Retain the existing WITHDRAWN edit-to-DRAFT behavior.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000061', true);
do $$
declare result jsonb;
begin
  result := public.manage_trial_content(jsonb_build_object('action','update','id',current_setting('htc.t06_test_id'),'category','INFORMATION','title','Retained behavior','body','Withdrawn edit returns to draft'));
  if result->>'state' <> 'DRAFT' or result->'released_at' is distinct from 'null'::jsonb then
    raise exception 'WITHDRAWN edit behavior changed';
  end if;
end;
$$;

-- Prove the RLS policy independently of the revoked production grants.
-- Temporary grant probes are local-only and rolled back.
reset role;
grant select, insert, update on public.trial_content to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000062', true);
do $$
declare affected integer;
begin
  if exists(select 1 from public.trial_content) then raise exception 'USER RLS read leaked'; end if;
  update public.trial_content set state = 'RELEASED';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'USER RLS update allowed'; end if;
  begin
    insert into public.trial_content(category,title,body) values ('INTRODUCTION','Invalid','Invalid');
    raise exception 'USER RLS insert allowed';
  exception when insufficient_privilege then null;
  end;
end;
$$;
rollback;
