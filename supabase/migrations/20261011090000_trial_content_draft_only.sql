-- T13-P0A additive only. Local file: application requires separate approval.
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
$$;
revoke all on function public.update_trial_content_draft(jsonb) from public, anon, authenticated;
grant execute on function public.update_trial_content_draft(jsonb) to authenticated;
-- Existing tables, RLS, grants and legacy RPCs are unchanged. To disable this
-- additive boundary, revoke its EXECUTE grant; never fall back to legacy update.
