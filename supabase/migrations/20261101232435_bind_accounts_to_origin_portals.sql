begin;

create table public.portal_account_bindings (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  portal_id varchar not null references public.portal_settings(id) on delete cascade,
  account_scope text not null check (account_scope in ('buyer','professional')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index portal_account_bindings_portal_scope_idx
  on public.portal_account_bindings(portal_id, account_scope);

alter table public.portal_account_bindings enable row level security;
grant select, insert on public.portal_account_bindings to authenticated;
revoke update, delete on public.portal_account_bindings from anon, authenticated;

create policy "accounts read their portal binding"
  on public.portal_account_bindings for select to authenticated
  using ((select auth.uid()) = profile_id or public.is_admin());

create policy "unbound buyers claim their origin portal"
  on public.portal_account_bindings for insert to authenticated
  with check (
    (select auth.uid()) = profile_id
    and account_scope = 'buyer'
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'buyer'::public.user_role
    )
    and exists (
      select 1 from public.portal_settings ps
      where ps.id = portal_id and ps.owner_profile_id is not null and ps.subdomain_slug is not null
    )
  );

insert into public.portal_account_bindings(profile_id, portal_id, account_scope)
select ps.owner_profile_id, ps.id, 'professional'
from public.portal_settings ps
join public.profiles p on p.id = ps.owner_profile_id
where ps.owner_profile_id is not null
  and ps.subdomain_slug is not null
  and p.role in ('broker'::public.user_role, 'agency'::public.user_role)
on conflict (profile_id) do nothing;

with buyer_portals as (
  select l.buyer_id as profile_id, min(ps.id) as portal_id
  from public.leads l
  join public.properties property on property.id = l.property_id
  join public.portal_settings ps on ps.owner_profile_id = property.user_id
  join public.profiles p on p.id = l.buyer_id and p.role = 'buyer'::public.user_role
  where l.buyer_id is not null
  group by l.buyer_id
  having count(distinct ps.id) = 1
)
insert into public.portal_account_bindings(profile_id, portal_id, account_scope)
select profile_id, portal_id, 'buyer' from buyer_portals
on conflict (profile_id) do nothing;

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
  v_portal_id varchar;
  v_scope text;
begin
  if v_uid is null then
    return jsonb_build_object('allowed',false,'reason','unauthenticated');
  end if;

  select p.role into v_role from public.profiles p where p.id = v_uid and p.is_active;
  if not found then
    return jsonb_build_object('allowed',false,'reason','inactive');
  end if;

  if v_role = 'admin'::public.user_role then
    return jsonb_build_object('allowed',true,'scope','administrator');
  end if;

  if v_slug = '' then
    if v_role in ('broker'::public.user_role, 'agency'::public.user_role) then
      return jsonb_build_object('allowed',true,'scope','professional_app');
    end if;
    return jsonb_build_object('allowed',false,'reason','address_mismatch');
  end if;

  select ps.id into v_portal_id
  from public.portal_settings ps
  where ps.subdomain_slug = v_slug and ps.owner_profile_id is not null;
  if not found then
    return jsonb_build_object('allowed',false,'reason','portal_not_found');
  end if;

  select binding.account_scope into v_scope
  from public.portal_account_bindings binding
  where binding.profile_id = v_uid and binding.portal_id = v_portal_id;

  if found then
    return jsonb_build_object('allowed',true,'scope',v_scope);
  end if;

  if v_role = 'buyer'::public.user_role then
    insert into public.portal_account_bindings(profile_id,portal_id,account_scope)
    values(v_uid,v_portal_id,'buyer')
    on conflict (profile_id) do nothing;

    if exists (
      select 1 from public.portal_account_bindings binding
      where binding.profile_id = v_uid and binding.portal_id = v_portal_id and binding.account_scope = 'buyer'
    ) then
      return jsonb_build_object('allowed',true,'scope','buyer');
    end if;
  end if;

  return jsonb_build_object('allowed',false,'reason','address_mismatch');
end;
$$;

revoke all on function public.authorize_my_portal_access(text) from public, anon;
grant execute on function public.authorize_my_portal_access(text) to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role;
  v_name text;
  v_title text;
  v_slug text;
  v_base text;
  v_origin_slug text;
  v_portal_id varchar;
  v_counter integer := 0;
begin
  v_name := coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), split_part(new.email, '@', 1));
  v_role := case when new.raw_user_meta_data->>'role' = 'broker' then 'broker'::public.user_role else 'buyer'::public.user_role end;

  insert into public.profiles(id, email, name, phone, role, avatar_url, creci)
  values (
    new.id, lower(new.email), v_name,
    nullif(trim(new.raw_user_meta_data->>'phone'), ''), v_role,
    nullif(trim(new.raw_user_meta_data->>'avatar_url'), ''),
    case when v_role = 'broker'::public.user_role then nullif(trim(new.raw_user_meta_data->>'creci'), '') else null end
  );

  if v_role = 'broker'::public.user_role then
    v_title := coalesce(nullif(trim(new.raw_user_meta_data->>'portal_title'), ''), v_name);
    if length(v_title) < 3 or length(v_title) > 80 then raise exception 'Invalid portal title'; end if;
    v_slug := public.portal_slugify(new.raw_user_meta_data->>'portal_slug');
    if v_slug = '' then
      v_base := public.portal_slugify(v_title);
      if length(v_base) < 3 or v_base in ('www','app','admin','api','auth','mail','smtp','static','assets','cdn','support','status') then
        v_base := 'corretor-' || left(replace(new.id::text, '-', ''), 8);
      end if;
      loop
        v_slug := case when v_counter = 0 then v_base else left(v_base, 48 - length(v_counter::text) - 1) || '-' || v_counter::text end;
        exit when not exists (select 1 from public.portal_settings where subdomain_slug = v_slug);
        v_counter := v_counter + 1;
        if v_counter > 9999 then raise exception 'Unable to allocate portal slug'; end if;
      end loop;
    elsif length(v_slug) < 3 or v_slug <> lower(trim(new.raw_user_meta_data->>'portal_slug'))
      or v_slug in ('www','app','admin','api','auth','mail','smtp','static','assets','cdn','support','status') then
      raise exception 'Invalid portal address';
    end if;

    insert into public.portal_settings(id, owner_profile_id, subdomain_slug, identity)
    values (new.id::text, new.id, v_slug, jsonb_build_object('portalName', v_title));

    insert into public.portal_account_bindings(profile_id,portal_id,account_scope)
    values(new.id,new.id::text,'professional');
  else
    v_origin_slug := public.portal_slugify(new.raw_user_meta_data->>'origin_portal_slug');
    if v_origin_slug <> '' then
      select ps.id into v_portal_id from public.portal_settings ps
      where ps.subdomain_slug = v_origin_slug and ps.owner_profile_id is not null;
      if not found then raise exception 'Invalid origin portal'; end if;
      insert into public.portal_account_bindings(profile_id,portal_id,account_scope)
      values(new.id,v_portal_id,'buyer');
    end if;
  end if;
  return new;
end;
$$;

commit;
