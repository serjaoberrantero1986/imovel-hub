begin;

create or replace function public.check_portal_slug_availability(p_value text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_slug text := public.portal_slugify(p_value);
  v_owner uuid := auth.uid();
begin
  if length(v_slug) < 3 then
    return jsonb_build_object('slug', v_slug, 'available', false, 'reason', 'Use pelo menos 3 caracteres.');
  end if;
  if v_slug in ('www','app','admin','api','auth','mail','smtp','static','assets','cdn','support','status') then
    return jsonb_build_object('slug', v_slug, 'available', false, 'reason', 'Este endereço é reservado.');
  end if;
  if exists (
    select 1 from public.portal_settings s
    where s.subdomain_slug = v_slug and (v_owner is null or s.owner_profile_id is distinct from v_owner)
  ) then
    return jsonb_build_object('slug', v_slug, 'available', false, 'reason', 'Este endereço já está em uso.');
  end if;
  return jsonb_build_object('slug', v_slug, 'available', true, 'reason', 'Endereço disponível.');
end;
$$;
revoke all on function public.check_portal_slug_availability(text) from public;
grant execute on function public.check_portal_slug_availability(text) to anon, authenticated;

create or replace function public.get_my_portal_address()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when auth.uid() is null then null else coalesce((
    select jsonb_build_object(
      'title', coalesce(nullif(s.identity->>'portalName', ''), nullif(p.agency_name, ''), p.name),
      'slug', s.subdomain_slug,
      'url', case when s.subdomain_slug is null then null else 'https://' || s.subdomain_slug || '.webimoveis.site' end
    )
    from public.profiles p
    left join public.portal_settings s on s.owner_profile_id = p.id
    where p.id = auth.uid() and p.role in ('broker'::public.user_role, 'agency'::public.user_role)
  ), '{}'::jsonb) end;
$$;
revoke all on function public.get_my_portal_address() from public, anon;
grant execute on function public.get_my_portal_address() to authenticated;

create or replace function public.update_my_portal_address(p_title text, p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_title text := trim(coalesce(p_title, ''));
  v_slug text := public.portal_slugify(p_slug);
  v_role public.user_role;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not public.has_satisfied_mfa() then raise exception 'MFA verification required'; end if;
  select role into v_role from public.profiles where id = v_uid for update;
  if not found or v_role not in ('broker'::public.user_role, 'agency'::public.user_role) then
    raise exception 'Professional account required';
  end if;
  if length(v_title) < 3 or length(v_title) > 80 then raise exception 'Invalid portal title'; end if;
  if length(v_slug) < 3 or v_slug <> lower(trim(p_slug)) or v_slug in ('www','app','admin','api','auth','mail','smtp','static','assets','cdn','support','status') then
    raise exception 'Invalid portal address';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('portal-subdomain-allocation'));
  if exists (select 1 from public.portal_settings where subdomain_slug = v_slug and owner_profile_id is distinct from v_uid) then
    raise exception 'Portal address unavailable' using errcode = '23505';
  end if;

  insert into public.portal_settings(id, owner_profile_id, subdomain_slug, identity)
  values (v_uid::text, v_uid, v_slug, jsonb_build_object('portalName', v_title))
  on conflict (id) do update set
    owner_profile_id = excluded.owner_profile_id,
    subdomain_slug = excluded.subdomain_slug,
    identity = coalesce(public.portal_settings.identity, '{}'::jsonb) || jsonb_build_object('portalName', v_title),
    updated_at = now();

  return jsonb_build_object('title', v_title, 'slug', v_slug, 'url', 'https://' || v_slug || '.webimoveis.site');
end;
$$;
revoke all on function public.update_my_portal_address(text, text) from public, anon;
grant execute on function public.update_my_portal_address(text, text) to authenticated;

create or replace function public.save_my_profile_and_portal(
  p_profile jsonb, p_preferences jsonb, p_title text, p_slug text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_saved jsonb;
  v_portal jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  v_saved := public.save_my_profile(p_profile, p_preferences);
  v_portal := public.update_my_portal_address(p_title, p_slug);
  return v_saved || jsonb_build_object('portal', v_portal);
end;
$$;
revoke all on function public.save_my_profile_and_portal(jsonb, jsonb, text, text) from public, anon;
grant execute on function public.save_my_profile_and_portal(jsonb, jsonb, text, text) to authenticated;

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
  end if;
  return new;
end;
$$;

create or replace function public.get_creci_reviews()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_result jsonb;
begin
  if not public.is_admin() then raise exception 'Acesso administrativo necessário'; end if;
  select coalesce(jsonb_agg(item order by item->>'updated_at' desc), '[]'::jsonb) into v_result
  from (
    select jsonb_build_object(
      'profile_id', p.id, 'name', p.name, 'email', p.email, 'avatar_url', p.avatar_url,
      'creci', p.creci, 'creci_uf', p.creci_uf, 'status', p.creci_review_status, 'updated_at', p.updated_at,
      'requested_at', r.updated_at, 'reviewed_at', p.creci_reviewed_at, 'expires_at', p.creci_review_expires_at,
      'documents', coalesce((select jsonb_agg(to_jsonb(d) order by d.created_at)
        from public.creci_verification_documents d where d.profile_id = p.id), '[]'::jsonb),
      'history', coalesce((select jsonb_agg(jsonb_build_object(
        'id', a.id, 'decision', a.decision, 'note', a.note, 'created_at', a.created_at,
        'reviewer_name', reviewer.name, 'expires_at', a.expires_at
      ) order by a.created_at desc) from public.creci_review_audit a
        left join public.profiles reviewer on reviewer.id = a.reviewer_id where a.profile_id = p.id), '[]'::jsonb)
    ) item
    from public.profiles p
    left join public.creci_review_records r on r.profile_id = p.id
    where p.role in ('broker', 'agency') and p.creci_review_status in ('pending', 'approved', 'rejected', 'expired')
      and (p.creci_review_status <> 'pending' or r.decision = 'pending')
  ) rows;
  return v_result;
end;
$$;
revoke all on function public.get_creci_reviews() from public, anon;
grant execute on function public.get_creci_reviews() to authenticated;

notify pgrst, 'reload schema';
commit;
