begin;

revoke all on public.portal_account_bindings from anon;
revoke update, delete, truncate, references, trigger on public.portal_account_bindings from authenticated;
grant select, insert on public.portal_account_bindings to authenticated;

drop policy if exists "unbound buyers claim their origin portal" on public.portal_account_bindings;
create policy "unbound buyers claim their origin portal"
  on public.portal_account_bindings for insert to authenticated
  with check (
    (select auth.uid()) = profile_id
    and account_scope = 'buyer'
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'buyer'::public.user_role
    )
    and not exists (
      select 1 from public.portal_account_bindings existing
      where existing.profile_id = (select auth.uid())
    )
  );

create or replace function public.authorize_my_portal_access(p_portal_slug text default null)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_role public.user_role;
  v_slug text := lower(trim(coalesce(p_portal_slug,'')));
  v_public_portal jsonb;
  v_portal_id varchar;
  v_scope text;
begin
  if v_uid is null then return jsonb_build_object('allowed',false,'reason','unauthenticated'); end if;

  select p.role into v_role from public.profiles p where p.id = v_uid and p.is_active;
  if not found then return jsonb_build_object('allowed',false,'reason','inactive'); end if;
  if v_role = 'admin'::public.user_role then return jsonb_build_object('allowed',true,'scope','administrator'); end if;

  if v_slug = '' then
    if v_role in ('broker'::public.user_role, 'agency'::public.user_role) then
      return jsonb_build_object('allowed',true,'scope','professional_app');
    end if;
    return jsonb_build_object('allowed',false,'reason','address_mismatch');
  end if;

  v_public_portal := public.resolve_public_portal(v_slug);
  if not coalesce((v_public_portal->>'found')::boolean,false)
    or nullif(v_public_portal->>'owner_profile_id','') is null then
    return jsonb_build_object('allowed',false,'reason','portal_not_found');
  end if;
  v_portal_id := (v_public_portal->>'owner_profile_id')::uuid::text;

  select binding.account_scope into v_scope
  from public.portal_account_bindings binding
  where binding.profile_id = v_uid and binding.portal_id = v_portal_id;
  if found then return jsonb_build_object('allowed',true,'scope',v_scope); end if;

  if exists (select 1 from public.portal_account_bindings binding where binding.profile_id = v_uid) then
    return jsonb_build_object('allowed',false,'reason','address_mismatch');
  end if;

  if v_role = 'buyer'::public.user_role then
    insert into public.portal_account_bindings(profile_id,portal_id,account_scope)
    values(v_uid,v_portal_id,'buyer');
    return jsonb_build_object('allowed',true,'scope','buyer');
  end if;

  return jsonb_build_object('allowed',false,'reason','address_mismatch');
end;
$$;

revoke all on function public.authorize_my_portal_access(text) from public, anon;
grant execute on function public.authorize_my_portal_access(text) to authenticated;

commit;
