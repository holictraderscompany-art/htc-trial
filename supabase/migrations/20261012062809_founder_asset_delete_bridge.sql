create function public.delete_trial_asset_for_founder(payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.trial_assets%rowtype;
begin
  if auth.uid() is null or public.is_founder() is distinct from true then
    raise exception 'Access denied' using errcode='42501'; end if;
  if jsonb_typeof(payload) is distinct from 'object' or not(payload ?& array['action','id'])
    or exists(select 1 from jsonb_object_keys(payload) k where k not in ('action','id'))
    or payload->>'action' is distinct from 'delete_asset'
    or jsonb_typeof(payload->'id') is distinct from 'string'
    or payload->>'id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'Invalid request' using errcode='22023'; end if;
  select * into a from public.trial_assets where id=(payload->>'id')::uuid for update;
  if not found then return jsonb_build_object('outcome','not_found'); end if;
  if exists(select 1 from public.trial_content_assets r where r.asset_id=a.id) then
    return jsonb_build_object('outcome','linked_asset'); end if;
  perform public.manage_trial_asset(jsonb_build_object('action','begin_delete','id',a.id));
  -- Reservation is now DELETING; concurrent attach/upload cannot pass its guards.
  -- Only the existing authenticated Storage deletion + finish_delete can complete it.
  return jsonb_build_object('outcome','storage_delete_required','id',a.id);
end; $$;
revoke all on function public.delete_trial_asset_for_founder(jsonb) from public,anon,authenticated;
grant execute on function public.delete_trial_asset_for_founder(jsonb) to authenticated;
