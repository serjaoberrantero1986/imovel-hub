begin;

create or replace function public.preflight_my_portal_access(p_portal_slug text default null)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_role public.user_role;
  v_slug text := lower(trim(coalesce(p_portal_slug, '')));
  v_portal_id varchar;
begin
  if v_uid is null then return false; end if;

  select p.role into v_role
  from public.profiles p
  where p.id = v_uid and p.is_active;
  if not found then return false; end if;

  if v_role = 'admin'::public.user_role then return true; end if;

  if v_slug = '' then
    return v_role in ('broker'::public.user_role, 'agency'::public.user_role);
  end if;

  select ps.id into v_portal_id
  from public.portal_settings ps
  where ps.subdomain_slug = v_slug
    and ps.owner_profile_id is not null;
  if not found then return false; end if;

  if exists (
    select 1
    from public.portal_account_bindings binding
    where binding.profile_id = v_uid
      and binding.portal_id = v_portal_id
  ) then
    return true;
  end if;

  return v_role = 'buyer'::public.user_role
    and not exists (
      select 1
      from public.portal_account_bindings binding
      where binding.profile_id = v_uid
    );
end;
$$;

revoke all on function public.preflight_my_portal_access(text) from public, anon;
grant execute on function public.preflight_my_portal_access(text) to authenticated;

commit;
