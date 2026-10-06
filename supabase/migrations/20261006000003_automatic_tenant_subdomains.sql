begin;

alter table public.portal_settings
  add column if not exists subdomain_slug text;

alter table public.portal_settings
  drop constraint if exists portal_settings_subdomain_slug_format;
alter table public.portal_settings
  add constraint portal_settings_subdomain_slug_format check (
    subdomain_slug is null
    or (
      subdomain_slug = lower(subdomain_slug)
      and subdomain_slug ~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$'
      and subdomain_slug not in ('www','app','admin','api','auth','mail','smtp','static','assets','cdn','support','status')
    )
  );

create unique index if not exists portal_settings_subdomain_slug_unique
  on public.portal_settings (subdomain_slug)
  where subdomain_slug is not null;

create or replace function public.portal_slugify(p_value text)
returns text
language sql
stable
set search_path = ''
as $$
  select trim(both '-' from left(
    regexp_replace(
      regexp_replace(translate(lower(coalesce(p_value, '')), 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn'), '[^a-z0-9]+', '-', 'g'),
      '-+', '-', 'g'
    ),
    48
  ));
$$;
revoke all on function public.portal_slugify(text) from public, anon, authenticated;

create or replace function public.ensure_my_portal_settings(p_initial jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_role public.user_role;
  v_label text;
  v_base text;
  v_candidate text;
  v_counter integer := 0;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not public.has_satisfied_mfa() then raise exception 'MFA verification required'; end if;
  if jsonb_typeof(coalesce(p_initial, '{}'::jsonb)) <> 'object' then raise exception 'Invalid portal configuration'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('portal-subdomain-allocation'));

  select role, coalesce(nullif(trim(agency_name), ''), nullif(trim(name), ''), 'corretor')
    into v_role, v_label
  from public.profiles
  where id = v_uid;
  if not found or v_role not in ('broker'::public.user_role, 'agency'::public.user_role) then
    raise exception 'Professional account required';
  end if;

  select subdomain_slug into v_candidate
  from public.portal_settings
  where id = v_uid::text;

  if v_candidate is null then
    v_base := public.portal_slugify(v_label);
    if length(v_base) < 3 or v_base in ('www','app','admin','api','auth','mail','smtp','static','assets','cdn','support','status') then
      v_base := 'corretor-' || left(replace(v_uid::text, '-', ''), 8);
    end if;
    loop
      v_candidate := case when v_counter = 0 then v_base else left(v_base, 48 - length(v_counter::text) - 1) || '-' || v_counter::text end;
      exit when not exists (select 1 from public.portal_settings where subdomain_slug = v_candidate and id <> v_uid::text);
      v_counter := v_counter + 1;
      if v_counter > 9999 then raise exception 'Unable to allocate portal slug'; end if;
    end loop;
  end if;

  insert into public.portal_settings (id, owner_profile_id, subdomain_slug, visual_draft, visual_published)
  values (v_uid::text, v_uid, v_candidate, coalesce(p_initial, '{}'::jsonb), coalesce(p_initial, '{}'::jsonb))
  on conflict (id) do update set
    owner_profile_id = excluded.owner_profile_id,
    subdomain_slug = coalesce(public.portal_settings.subdomain_slug, excluded.subdomain_slug),
    visual_draft = case when public.portal_settings.visual_draft = '{}'::jsonb then excluded.visual_draft else public.portal_settings.visual_draft end,
    visual_published = case when public.portal_settings.visual_published = '{}'::jsonb then excluded.visual_published else public.portal_settings.visual_published end,
    updated_at = now();

  return jsonb_build_object('id', v_uid::text, 'slug', v_candidate, 'url', 'https://' || v_candidate || '.webimoveis.site');
exception
  when unique_violation then
    raise exception 'Portal slug allocation conflict. Try again.';
end;
$$;
revoke all on function public.ensure_my_portal_settings(jsonb) from public, anon;
grant execute on function public.ensure_my_portal_settings(jsonb) to authenticated;

create or replace function public.resolve_public_portal(p_slug text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_slug text := nullif(lower(trim(coalesce(p_slug, ''))), '');
  v_result jsonb;
begin
  if v_slug is not null and (
    v_slug !~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$'
    or v_slug in ('www','app','admin','api','auth','mail','smtp','static','assets','cdn','support','status')
  ) then
    return jsonb_build_object('found', false);
  end if;

  if v_slug is null then
    select jsonb_build_object(
      'found', true,
      'slug', null,
      'owner_profile_id', s.owner_profile_id,
      'identity', s.identity,
      'footer', s.footer,
      'home_page', s.home_page,
      'visual_published', s.visual_published,
      'profile', null
    ) into v_result
    from public.portal_settings s
    where s.id = 'default';
  else
    select jsonb_build_object(
      'found', true,
      'slug', s.subdomain_slug,
      'owner_profile_id', s.owner_profile_id,
      'identity', s.identity,
      'footer', s.footer,
      'home_page', s.home_page,
      'visual_published', s.visual_published,
      'profile', jsonb_build_object(
        'name', p.name,
        'email', p.email,
        'phone', p.phone,
        'whatsapp', p.whatsapp,
        'creci', p.creci,
        'agency_name', p.agency_name,
        'agency_logo', p.agency_logo,
        'avatar_url', p.avatar_url
      )
    ) into v_result
    from public.portal_settings s
    join public.profiles p on p.id = s.owner_profile_id
    where s.subdomain_slug = v_slug
      and p.role in ('broker'::public.user_role, 'agency'::public.user_role)
      and p.is_active = true;
  end if;

  return coalesce(v_result, jsonb_build_object('found', false));
end;
$$;
revoke all on function public.resolve_public_portal(text) from public;
grant execute on function public.resolve_public_portal(text) to anon, authenticated;

comment on column public.portal_settings.subdomain_slug is 'Unique DNS label resolved by the wildcard domain to the public tenant portal.';
comment on function public.resolve_public_portal(text) is 'Returns only published tenant portal data; visual drafts are never exposed.';

commit;
