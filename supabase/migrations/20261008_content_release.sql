-- T06 only. No changes to Foundation identity, roles, policies or triggers.
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
);

alter table public.trial_content enable row level security;
-- API roles have no direct table rights. Only the narrow RPC contracts below.
revoke all on table public.trial_content from public, anon, authenticated;
-- Applies if table access is ever granted: no public rows or USER mutations.
create policy trial_content_founder on public.trial_content
  for all to authenticated
  using ((select public.is_founder()))
  with check ((select public.is_founder()));

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
$$;
revoke all on function public.read_released_content(uuid) from public, anon, authenticated;
grant execute on function public.read_released_content(uuid) to anon, authenticated;

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
$$;
revoke all on function public.manage_trial_content(jsonb) from public, anon, authenticated;
grant execute on function public.manage_trial_content(jsonb) to authenticated;
