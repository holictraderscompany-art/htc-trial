create type public.user_role as enum ('USER', 'FOUNDER');

alter table public.user_profiles
  add column role public.user_role not null default 'USER'::public.user_role;

alter table public.user_profiles
  add constraint user_profiles_id_fkey
  foreign key (id) references auth.users(id) on delete cascade;

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
$$;

revoke execute on function public.is_founder() from public;
grant execute on function public.is_founder() to authenticated;

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
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.sync_auth_user_profile();

create trigger on_auth_user_email_changed
after update of email on auth.users
for each row
when (old.email is distinct from new.email)
execute function public.sync_auth_user_profile();

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
$$;

create trigger user_profiles_protect_fields
before update on public.user_profiles
for each row
execute function public.protect_user_profile_fields();

revoke execute on function public.sync_auth_user_profile() from public, anon, authenticated;
revoke execute on function public.protect_user_profile_fields() from public, anon, authenticated;
revoke execute on function public.is_founder() from anon;

revoke all on table public.user_profiles from anon, authenticated;
grant select on table public.user_profiles to authenticated;
grant update (display_name) on table public.user_profiles to authenticated;

create policy user_profiles_select_own_or_founder
on public.user_profiles
for select
to authenticated
using ((id = (select auth.uid())) or (select public.is_founder()));

create policy user_profiles_update_own_or_founder_display_name
on public.user_profiles
for update
to authenticated
using ((id = (select auth.uid())) or (select public.is_founder()))
with check ((id = (select auth.uid())) or (select public.is_founder()));
