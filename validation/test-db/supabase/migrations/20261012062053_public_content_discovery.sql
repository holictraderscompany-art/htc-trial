-- T09 additive public pagination only. Do not apply remotely without approval.
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
