begin;

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
      'subtitle', coalesce(s.identity->>'slogan', ''),
      'slug', s.subdomain_slug,
      'url', case when s.subdomain_slug is null then null else 'https://' || s.subdomain_slug || '.webimoveis.site' end
    )
    from public.profiles p
    left join public.portal_settings s on s.owner_profile_id = p.id
    where p.id = auth.uid()
      and p.role in ('broker'::public.user_role, 'agency'::public.user_role)
  ), '{}'::jsonb) end;
$$;
revoke all on function public.get_my_portal_address() from public, anon;
grant execute on function public.get_my_portal_address() to authenticated;

create or replace function public.save_my_profile_and_portal_identity(
  p_profile jsonb,
  p_preferences jsonb,
  p_title text,
  p_subtitle text,
  p_slug text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_subtitle text := trim(coalesce(p_subtitle, ''));
  v_saved jsonb;
  v_portal jsonb;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if length(v_subtitle) > 100 then raise exception 'Invalid portal subtitle'; end if;

  v_saved := public.save_my_profile(
    coalesce(p_profile, '{}'::jsonb) || jsonb_build_object('agency_name', trim(p_title)),
    p_preferences
  );
  v_portal := public.update_my_portal_address(p_title, p_slug);

  update public.portal_settings
  set identity = coalesce(identity, '{}'::jsonb) || jsonb_build_object('slogan', v_subtitle),
      updated_at = now()
  where owner_profile_id = v_uid;

  return v_saved || jsonb_build_object(
    'portal', v_portal || jsonb_build_object('subtitle', v_subtitle)
  );
end;
$$;
revoke all on function public.save_my_profile_and_portal_identity(jsonb, jsonb, text, text, text) from public, anon;
grant execute on function public.save_my_profile_and_portal_identity(jsonb, jsonb, text, text, text) to authenticated;

create or replace function public.get_creci_reviews()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not public.is_admin() then raise exception 'Acesso administrativo necessário'; end if;

  select coalesce(jsonb_agg(item order by item->>'updated_at' desc), '[]'::jsonb)
  into v_result
  from (
    select jsonb_build_object(
      'profile_id', p.id,
      'name', p.name,
      'email', p.email,
      'avatar_url', p.avatar_url,
      'creci', p.creci,
      'creci_uf', p.creci_uf,
      'status', p.creci_review_status,
      'updated_at', p.updated_at,
      'requested_at', r.updated_at,
      'reviewed_at', p.creci_reviewed_at,
      'expires_at', p.creci_review_expires_at,
      'portal_title', s.identity->>'portalName',
      'portal_slug', s.subdomain_slug,
      'portal_url', case when s.subdomain_slug is null then null else 'https://' || s.subdomain_slug || '.webimoveis.site' end,
      'portal_published', coalesce(s.visual_published, '{}'::jsonb) <> '{}'::jsonb,
      'documents', coalesce((
        select jsonb_agg(to_jsonb(d) order by d.created_at)
        from public.creci_verification_documents d
        where d.profile_id = p.id
      ), '[]'::jsonb),
      'history', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', a.id,
          'decision', a.decision,
          'note', a.note,
          'created_at', a.created_at,
          'reviewer_name', reviewer.name,
          'expires_at', a.expires_at
        ) order by a.created_at desc)
        from public.creci_review_audit a
        left join public.profiles reviewer on reviewer.id = a.reviewer_id
        where a.profile_id = p.id
      ), '[]'::jsonb)
    ) item
    from public.profiles p
    left join public.creci_review_records r on r.profile_id = p.id
    left join public.portal_settings s on s.owner_profile_id = p.id
    where p.role in ('broker', 'agency')
      and p.creci_review_status in ('pending', 'approved', 'rejected', 'expired')
      and (p.creci_review_status <> 'pending' or r.decision = 'pending')
  ) rows;

  return v_result;
end;
$$;
revoke all on function public.get_creci_reviews() from public, anon;
grant execute on function public.get_creci_reviews() to authenticated;

create or replace function public.get_admin_portal_overview(
  p_search text default '',
  p_filter text default 'all',
  p_limit integer default 100,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_search text := lower(trim(coalesce(p_search, '')));
  v_filter text := lower(trim(coalesce(p_filter, 'all')));
  v_limit integer := greatest(1, least(coalesce(p_limit, 100), 200));
  v_offset integer := greatest(0, coalesce(p_offset, 0));
  v_result jsonb;
begin
  if not public.is_admin() then raise exception 'Acesso administrativo necessário'; end if;
  if v_filter not in ('all','published','unpublished','approved','pending','with_properties','without_properties') then
    raise exception 'Filtro inválido';
  end if;

  with portal_rows as (
    select
      p.id as profile_id,
      p.name,
      p.email,
      p.avatar_url,
      p.creci,
      p.creci_uf,
      p.creci_review_status,
      p.is_active,
      s.subdomain_slug,
      coalesce(nullif(s.identity->>'portalName', ''), nullif(p.agency_name, ''), p.name) as portal_title,
      coalesce(s.identity->>'slogan', '') as portal_subtitle,
      s.created_at,
      s.updated_at,
      coalesce(s.visual_published, '{}'::jsonb) <> '{}'::jsonb as is_published,
      count(pr.id)::integer as properties_total,
      (count(pr.id) filter (where pr.status = 'active'))::integer as properties_active,
      (count(pr.id) filter (where pr.purpose = 'sale'))::integer as properties_sale,
      (count(pr.id) filter (where pr.purpose = 'rent'))::integer as properties_rent,
      (count(pr.id) filter (where pr.purpose = 'seasonal'))::integer as properties_seasonal,
      (count(pr.id) filter (where pr.purpose = 'launch'))::integer as properties_launch,
      (count(pr.id) filter (where pr.status = 'paused'))::integer as properties_paused,
      (count(pr.id) filter (where pr.status = 'draft'))::integer as properties_draft,
      (count(pr.id) filter (where pr.status = 'pending_moderation'))::integer as properties_pending,
      (count(pr.id) filter (where pr.status in ('sold','rented')))::integer as properties_closed,
      (count(pr.id) filter (where pr.status = 'archived'))::integer as properties_archived
    from public.portal_settings s
    join public.profiles p on p.id = s.owner_profile_id
    left join public.properties pr on pr.user_id = p.id
    where s.id <> 'default'
      and p.role in ('broker'::public.user_role, 'agency'::public.user_role)
    group by p.id, p.name, p.email, p.avatar_url, p.creci, p.creci_uf,
      p.creci_review_status, p.is_active, s.subdomain_slug, s.identity,
      s.created_at, s.updated_at, s.visual_published
  ), filtered as (
    select *
    from portal_rows r
    where (
      v_search = ''
      or lower(r.name) like '%' || v_search || '%'
      or lower(r.email) like '%' || v_search || '%'
      or lower(coalesce(r.creci, '')) like '%' || v_search || '%'
      or lower(coalesce(r.portal_title, '')) like '%' || v_search || '%'
      or lower(coalesce(r.subdomain_slug, '')) like '%' || v_search || '%'
    )
    and case v_filter
      when 'published' then r.is_published
      when 'unpublished' then not r.is_published
      when 'approved' then r.creci_review_status = 'approved'
      when 'pending' then r.creci_review_status = 'pending'
      when 'with_properties' then r.properties_total > 0
      when 'without_properties' then r.properties_total = 0
      else true
    end
  ), page as (
    select * from filtered order by created_at desc limit v_limit offset v_offset
  )
  select jsonb_build_object(
    'summary', jsonb_build_object(
      'portals_total', (select count(*) from portal_rows),
      'portals_published', (select count(*) from portal_rows where is_published),
      'creci_approved', (select count(*) from portal_rows where creci_review_status = 'approved'),
      'properties_total', (select coalesce(sum(properties_total), 0) from portal_rows),
      'properties_active', (select coalesce(sum(properties_active), 0) from portal_rows),
      'addresses_in_use', (select count(*) from portal_rows where subdomain_slug is not null)
    ),
    'total', (select count(*) from filtered),
    'items', coalesce((select jsonb_agg(jsonb_build_object(
      'profile_id', profile_id,
      'name', name,
      'email', email,
      'avatar_url', avatar_url,
      'creci', creci,
      'creci_uf', creci_uf,
      'creci_status', creci_review_status,
      'is_active', is_active,
      'portal_title', portal_title,
      'portal_subtitle', portal_subtitle,
      'slug', subdomain_slug,
      'url', case when subdomain_slug is null then null else 'https://' || subdomain_slug || '.webimoveis.site' end,
      'is_published', is_published,
      'created_at', created_at,
      'updated_at', updated_at,
      'properties_total', properties_total,
      'properties_active', properties_active,
      'properties_sale', properties_sale,
      'properties_rent', properties_rent,
      'properties_seasonal', properties_seasonal,
      'properties_launch', properties_launch,
      'properties_paused', properties_paused,
      'properties_draft', properties_draft,
      'properties_pending', properties_pending,
      'properties_closed', properties_closed,
      'properties_archived', properties_archived
    ) order by created_at desc) from page), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;
revoke all on function public.get_admin_portal_overview(text, text, integer, integer) from public, anon;
grant execute on function public.get_admin_portal_overview(text, text, integer, integer) to authenticated;

notify pgrst, 'reload schema';
commit;
