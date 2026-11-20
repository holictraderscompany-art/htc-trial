-- T13 private, bounded keyset listing. No publishing or media operations.
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
