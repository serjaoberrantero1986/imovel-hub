begin;

-- Fase 1 da rede de parcerias: adesão, regiões de atuação e conexões.
-- A oferta de imóveis e os contratos serão adicionados em migrations posteriores.

create table if not exists public.partnership_network_members (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'suspended')),
  accepts_sale boolean not null default true,
  accepts_rent boolean not null default true,
  accepts_launch boolean not null default false,
  specialties text[] not null default '{}'::text[],
  introduction text,
  joined_at timestamptz not null default now(),
  deactivated_at timestamptz,
  updated_at timestamptz not null default now(),
  check (introduction is null or char_length(introduction) <= 500),
  check (specialties <@ array['capture','marketing','visits','negotiation','documents','closing']::text[]),
  check (
    (status = 'active' and deactivated_at is null)
    or (status <> 'active')
  )
);

create table if not exists public.partnership_member_regions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.partnership_network_members(profile_id) on delete cascade,
  state char(2) not null default 'SP' check (state = 'SP'),
  city text not null,
  neighborhood text,
  created_at timestamptz not null default now(),
  check (char_length(trim(city)) between 2 and 100),
  check (neighborhood is null or char_length(trim(neighborhood)) between 2 and 100)
);

create unique index if not exists partnership_member_regions_unique_area
  on public.partnership_member_regions (
    profile_id,
    lower(trim(city)),
    lower(trim(coalesce(neighborhood, '')))
  );
create index if not exists partnership_member_regions_lookup
  on public.partnership_member_regions (state, lower(trim(city)), lower(trim(coalesce(neighborhood, ''))));

create table if not exists public.partnership_connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.partnership_network_members(profile_id) on delete cascade,
  recipient_id uuid not null references public.partnership_network_members(profile_id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled', 'blocked')),
  requested_at timestamptz not null default now(),
  responded_at timestamptz,
  ended_at timestamptz,
  updated_at timestamptz not null default now(),
  check (requester_id <> recipient_id),
  check (
    (status = 'pending' and responded_at is null and ended_at is null)
    or (status in ('accepted', 'declined') and responded_at is not null)
    or (status in ('cancelled', 'blocked') and ended_at is not null)
  )
);

create unique index if not exists partnership_connections_unique_pair
  on public.partnership_connections (
    least(requester_id, recipient_id),
    greatest(requester_id, recipient_id)
  );
create index if not exists partnership_connections_requester
  on public.partnership_connections (requester_id, status, updated_at desc);
create index if not exists partnership_connections_recipient
  on public.partnership_connections (recipient_id, status, updated_at desc);

alter table public.partnership_network_members enable row level security;
alter table public.partnership_member_regions enable row level security;
alter table public.partnership_connections enable row level security;

revoke all on public.partnership_network_members from public, anon, authenticated;
revoke all on public.partnership_member_regions from public, anon, authenticated;
revoke all on public.partnership_connections from public, anon, authenticated;

-- Centraliza todos os requisitos profissionais e evita divergência entre RPCs.
create or replace function public.is_eligible_sp_partnership_professional(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_profile_id
      and p.is_active = true
      and p.role in ('broker'::public.user_role, 'agency'::public.user_role)
      and upper(coalesce(p.creci_uf, '')) = 'SP'
      and p.creci_review_status = 'approved'
      and p.verified = true
      and (p.creci_review_expires_at is null or p.creci_review_expires_at > now())
  );
$$;
revoke all on function public.is_eligible_sp_partnership_professional(uuid) from public, anon;
grant execute on function public.is_eligible_sp_partnership_professional(uuid) to authenticated;

create or replace function public.get_my_partnership_network()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_result jsonb;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not public.has_satisfied_mfa() then raise exception 'MFA verification required'; end if;

  select jsonb_build_object(
    'eligible', public.is_eligible_sp_partnership_professional(v_uid),
    'member', case when m.profile_id is null then null else jsonb_build_object(
      'profile_id', m.profile_id,
      'status', m.status,
      'accepts_sale', m.accepts_sale,
      'accepts_rent', m.accepts_rent,
      'accepts_launch', m.accepts_launch,
      'specialties', to_jsonb(m.specialties),
      'introduction', m.introduction,
      'joined_at', m.joined_at,
      'updated_at', m.updated_at
    ) end,
    'regions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id,
        'state', r.state,
        'city', r.city,
        'neighborhood', r.neighborhood
      ) order by r.city, r.neighborhood nulls first)
      from public.partnership_member_regions r
      where r.profile_id = v_uid
    ), '[]'::jsonb),
    'connections', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id,
        'status', c.status,
        'direction', case when c.requester_id = v_uid then 'sent' else 'received' end,
        'requested_at', c.requested_at,
        'responded_at', c.responded_at,
        'updated_at', c.updated_at,
        'partner', jsonb_build_object(
          'profile_id', p.id,
          'name', p.name,
          'avatar_url', p.avatar_url,
          'creci', p.creci,
          'creci_uf', p.creci_uf,
          'portal_slug', ps.subdomain_slug,
          'portal_title', coalesce(nullif(ps.identity->>'portalName', ''), nullif(p.agency_name, ''), p.name)
        )
      ) order by c.updated_at desc)
      from public.partnership_connections c
      join public.profiles p on p.id = case when c.requester_id = v_uid then c.recipient_id else c.requester_id end
      left join public.portal_settings ps on ps.owner_profile_id = p.id
      where v_uid in (c.requester_id, c.recipient_id)
    ), '[]'::jsonb)
  ) into v_result
  from (select 1) seed
  left join public.partnership_network_members m on m.profile_id = v_uid;

  return v_result;
end;
$$;
revoke all on function public.get_my_partnership_network() from public, anon;
grant execute on function public.get_my_partnership_network() to authenticated;

create or replace function public.save_my_partnership_membership(
  p_enabled boolean,
  p_accepts_sale boolean,
  p_accepts_rent boolean,
  p_accepts_launch boolean,
  p_specialties text[],
  p_introduction text,
  p_regions jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_intro text := nullif(trim(coalesce(p_introduction, '')), '');
  v_region jsonb;
  v_city text;
  v_neighborhood text;
  v_region_count integer := 0;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not public.has_satisfied_mfa() then raise exception 'MFA verification required'; end if;
  if p_enabled is null then raise exception 'Invalid membership state'; end if;
  if jsonb_typeof(coalesce(p_regions, '[]'::jsonb)) <> 'array' then raise exception 'Invalid regions'; end if;
  if char_length(coalesce(v_intro, '')) > 500 then raise exception 'Introduction is too long'; end if;
  if array_position(coalesce(p_specialties, '{}'::text[]), null) is not null
     or not coalesce(p_specialties, '{}'::text[]) <@ array['capture','marketing','visits','negotiation','documents','closing']::text[]
     or cardinality(coalesce(p_specialties, '{}'::text[])) <> cardinality(array(select distinct unnest(coalesce(p_specialties, '{}'::text[])))) then
    raise exception 'Invalid specialties';
  end if;

  perform 1 from public.profiles where id = v_uid for update;
  if not found then raise exception 'Profile not found'; end if;

  if p_enabled and not public.is_eligible_sp_partnership_professional(v_uid) then
    raise exception 'Approved and valid CRECI-SP required';
  end if;

  if p_enabled then
    v_region_count := jsonb_array_length(coalesce(p_regions, '[]'::jsonb));
    if v_region_count < 1 or v_region_count > 20 then raise exception 'Provide between one and twenty regions'; end if;
  end if;

  insert into public.partnership_network_members(
    profile_id, status, accepts_sale, accepts_rent, accepts_launch, specialties,
    introduction, joined_at, deactivated_at, updated_at
  ) values (
    v_uid, case when p_enabled then 'active' else 'inactive' end,
    coalesce(p_accepts_sale, false), coalesce(p_accepts_rent, false), coalesce(p_accepts_launch, false),
    coalesce(p_specialties, '{}'::text[]), v_intro, now(), case when p_enabled then null else now() end, now()
  )
  on conflict (profile_id) do update set
    status = excluded.status,
    accepts_sale = excluded.accepts_sale,
    accepts_rent = excluded.accepts_rent,
    accepts_launch = excluded.accepts_launch,
    specialties = excluded.specialties,
    introduction = excluded.introduction,
    deactivated_at = excluded.deactivated_at,
    updated_at = now();

  delete from public.partnership_member_regions where profile_id = v_uid;
  if p_enabled then
    for v_region in select value from jsonb_array_elements(p_regions) loop
      if jsonb_typeof(v_region) <> 'object' then raise exception 'Invalid region'; end if;
      v_city := regexp_replace(trim(coalesce(v_region->>'city', '')), '\s+', ' ', 'g');
      v_neighborhood := nullif(regexp_replace(trim(coalesce(v_region->>'neighborhood', '')), '\s+', ' ', 'g'), '');
      if char_length(v_city) not between 2 and 100
         or (v_neighborhood is not null and char_length(v_neighborhood) not between 2 and 100) then
        raise exception 'Invalid region';
      end if;
      insert into public.partnership_member_regions(profile_id, state, city, neighborhood)
      values (v_uid, 'SP', v_city, v_neighborhood)
      on conflict do nothing;
    end loop;
  end if;

  return public.get_my_partnership_network();
end;
$$;
revoke all on function public.save_my_partnership_membership(boolean, boolean, boolean, boolean, text[], text, jsonb) from public, anon;
grant execute on function public.save_my_partnership_membership(boolean, boolean, boolean, boolean, text[], text, jsonb) to authenticated;

create or replace function public.search_partnership_professionals(
  p_search text default '',
  p_city text default '',
  p_limit integer default 30,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_search text := lower(trim(coalesce(p_search, '')));
  v_city text := lower(trim(coalesce(p_city, '')));
  v_limit integer := greatest(1, least(coalesce(p_limit, 30), 50));
  v_offset integer := greatest(0, coalesce(p_offset, 0));
  v_result jsonb;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not public.has_satisfied_mfa() then raise exception 'MFA verification required'; end if;
  if not exists (
    select 1 from public.partnership_network_members
    where profile_id = v_uid and status = 'active'
  ) then raise exception 'Active partnership membership required'; end if;

  with candidates as (
    select
      p.id, p.name, p.avatar_url, p.creci, p.creci_uf,
      ps.subdomain_slug,
      coalesce(nullif(ps.identity->>'portalName', ''), nullif(p.agency_name, ''), p.name) portal_title,
      m.accepts_sale, m.accepts_rent, m.accepts_launch, m.specialties, m.introduction,
      coalesce((select jsonb_agg(jsonb_build_object('state', r.state, 'city', r.city, 'neighborhood', r.neighborhood) order by r.city, r.neighborhood nulls first)
        from public.partnership_member_regions r where r.profile_id = p.id), '[]'::jsonb) regions,
      (select jsonb_build_object('id', c.id, 'status', c.status, 'direction', case when c.requester_id = v_uid then 'sent' else 'received' end)
        from public.partnership_connections c
        where (c.requester_id = v_uid and c.recipient_id = p.id) or (c.requester_id = p.id and c.recipient_id = v_uid)
        limit 1) connection
    from public.partnership_network_members m
    join public.profiles p on p.id = m.profile_id
    left join public.portal_settings ps on ps.owner_profile_id = p.id
    where m.status = 'active'
      and p.id <> v_uid
      and public.is_eligible_sp_partnership_professional(p.id)
      and (v_search = '' or lower(p.name) like '%' || v_search || '%' or lower(coalesce(p.creci, '')) like '%' || v_search || '%' or lower(coalesce(ps.identity->>'portalName', '')) like '%' || v_search || '%')
      and (v_city = '' or exists (select 1 from public.partnership_member_regions r where r.profile_id = p.id and lower(trim(r.city)) = v_city))
    order by p.name
    limit v_limit offset v_offset
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'profile_id', id, 'name', name, 'avatar_url', avatar_url,
    'creci', creci, 'creci_uf', creci_uf,
    'portal_slug', subdomain_slug, 'portal_title', portal_title,
    'accepts_sale', accepts_sale, 'accepts_rent', accepts_rent,
    'accepts_launch', accepts_launch, 'introduction', introduction,
    'specialties', to_jsonb(specialties),
    'regions', regions, 'connection', connection
  )), '[]'::jsonb) into v_result from candidates;

  return v_result;
end;
$$;
revoke all on function public.search_partnership_professionals(text, text, integer, integer) from public, anon;
grant execute on function public.search_partnership_professionals(text, text, integer, integer) to authenticated;

create or replace function public.request_partnership_connection(p_recipient_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_connection public.partnership_connections%rowtype;
  v_requester_name text;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not public.has_satisfied_mfa() then raise exception 'MFA verification required'; end if;
  if p_recipient_id is null or p_recipient_id = v_uid then raise exception 'Invalid recipient'; end if;
  if not public.is_eligible_sp_partnership_professional(v_uid)
     or not public.is_eligible_sp_partnership_professional(p_recipient_id) then
    raise exception 'Eligible CRECI-SP professionals required';
  end if;
  if not exists (select 1 from public.partnership_network_members where profile_id = v_uid and status = 'active')
     or not exists (select 1 from public.partnership_network_members where profile_id = p_recipient_id and status = 'active') then
    raise exception 'Active partnership membership required';
  end if;

  select * into v_connection from public.partnership_connections
  where least(requester_id, recipient_id) = least(v_uid, p_recipient_id)
    and greatest(requester_id, recipient_id) = greatest(v_uid, p_recipient_id)
  for update;

  if found and v_connection.status in ('pending', 'accepted', 'blocked') then
    raise exception 'Connection already exists';
  end if;

  if found then
    update public.partnership_connections set
      requester_id = v_uid, recipient_id = p_recipient_id, status = 'pending',
      requested_at = now(), responded_at = null, ended_at = null, updated_at = now()
    where id = v_connection.id returning * into v_connection;
  else
    insert into public.partnership_connections(requester_id, recipient_id)
    values (v_uid, p_recipient_id) returning * into v_connection;
  end if;

  select name into v_requester_name from public.profiles where id = v_uid;
  insert into public.notifications(user_id, type, title, message, link, data)
  values (
    p_recipient_id, 'system_alert'::public.notification_type,
    'Novo convite para parceria',
    coalesce(v_requester_name, 'Um profissional') || ' quer se conectar à sua rede de parcerias.',
    '/perfil',
    jsonb_build_object('scope', 'partnership_connection', 'connection_id', v_connection.id)
  );

  return jsonb_build_object('id', v_connection.id, 'status', v_connection.status);
end;
$$;
revoke all on function public.request_partnership_connection(uuid) from public, anon;
grant execute on function public.request_partnership_connection(uuid) to authenticated;

create or replace function public.respond_partnership_connection(
  p_connection_id uuid,
  p_decision text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_decision text := lower(trim(coalesce(p_decision, '')));
  v_connection public.partnership_connections%rowtype;
  v_recipient_name text;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not public.has_satisfied_mfa() then raise exception 'MFA verification required'; end if;
  if v_decision not in ('accepted', 'declined') then raise exception 'Invalid decision'; end if;

  select * into v_connection from public.partnership_connections
  where id = p_connection_id for update;
  if not found or v_connection.recipient_id <> v_uid or v_connection.status <> 'pending' then
    raise exception 'Pending invitation not found';
  end if;
  if v_decision = 'accepted' and (
    not public.is_eligible_sp_partnership_professional(v_uid)
    or not public.is_eligible_sp_partnership_professional(v_connection.requester_id)
  ) then raise exception 'Eligible CRECI-SP professionals required'; end if;

  update public.partnership_connections set
    status = v_decision,
    responded_at = now(),
    ended_at = case when v_decision = 'declined' then now() else null end,
    updated_at = now()
  where id = p_connection_id returning * into v_connection;

  select name into v_recipient_name from public.profiles where id = v_uid;
  insert into public.notifications(user_id, type, title, message, link, data)
  values (
    v_connection.requester_id, 'system_alert'::public.notification_type,
    case when v_decision = 'accepted' then 'Convite de parceria aceito' else 'Convite de parceria não aceito' end,
    coalesce(v_recipient_name, 'O profissional') || case when v_decision = 'accepted' then ' agora faz parte da sua rede.' else ' não aceitou o convite neste momento.' end,
    '/perfil',
    jsonb_build_object('scope', 'partnership_connection', 'connection_id', v_connection.id, 'decision', v_decision)
  );

  return jsonb_build_object('id', v_connection.id, 'status', v_connection.status);
end;
$$;
revoke all on function public.respond_partnership_connection(uuid, text) from public, anon;
grant execute on function public.respond_partnership_connection(uuid, text) to authenticated;

create or replace function public.end_partnership_connection(p_connection_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not public.has_satisfied_mfa() then raise exception 'MFA verification required'; end if;
  update public.partnership_connections set
    status = 'cancelled', ended_at = now(), updated_at = now()
  where id = p_connection_id
    and v_uid in (requester_id, recipient_id)
    and status in ('pending', 'accepted');
  if not found then raise exception 'Active connection not found'; end if;
  return true;
end;
$$;
revoke all on function public.end_partnership_connection(uuid) from public, anon;
grant execute on function public.end_partnership_connection(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
