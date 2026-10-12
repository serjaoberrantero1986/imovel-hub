begin;

-- Complemento da Fase 1: bloqueios, denúncias e auditoria imutável.
-- Compatibilidade com a primeira versão distribuída da migration de fundamentos.
alter table public.partnership_network_members
  add column if not exists specialties text[] not null default '{}'::text[];

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'partnership_network_members_specialties_check'
      and conrelid = 'public.partnership_network_members'::regclass
  ) then
    alter table public.partnership_network_members
      add constraint partnership_network_members_specialties_check
      check (specialties <@ array['capture','marketing','visits','negotiation','documents','closing']::text[]);
  end if;
end;
$$;

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
      'profile_id', m.profile_id, 'status', m.status,
      'accepts_sale', m.accepts_sale, 'accepts_rent', m.accepts_rent,
      'accepts_launch', m.accepts_launch, 'specialties', to_jsonb(m.specialties),
      'introduction', m.introduction, 'joined_at', m.joined_at, 'updated_at', m.updated_at
    ) end,
    'regions', coalesce((select jsonb_agg(jsonb_build_object(
      'id', r.id, 'state', r.state, 'city', r.city, 'neighborhood', r.neighborhood
    ) order by r.city, r.neighborhood nulls first)
      from public.partnership_member_regions r where r.profile_id = v_uid), '[]'::jsonb),
    'connections', coalesce((select jsonb_agg(jsonb_build_object(
      'id', c.id, 'status', c.status,
      'direction', case when c.requester_id = v_uid then 'sent' else 'received' end,
      'requested_at', c.requested_at, 'responded_at', c.responded_at, 'updated_at', c.updated_at,
      'partner', jsonb_build_object(
        'profile_id', p.id, 'name', p.name, 'avatar_url', p.avatar_url,
        'creci', p.creci, 'creci_uf', p.creci_uf, 'portal_slug', ps.subdomain_slug,
        'portal_title', coalesce(nullif(ps.identity->>'portalName', ''), nullif(p.agency_name, ''), p.name)
      )
    ) order by c.updated_at desc)
      from public.partnership_connections c
      join public.profiles p on p.id = case when c.requester_id = v_uid then c.recipient_id else c.requester_id end
      left join public.portal_settings ps on ps.owner_profile_id = p.id
      where v_uid in (c.requester_id, c.recipient_id)), '[]'::jsonb)
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
  if p_enabled and not public.is_eligible_sp_partnership_professional(v_uid) then raise exception 'Approved and valid CRECI-SP required'; end if;
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
  ) on conflict (profile_id) do update set
    status = excluded.status, accepts_sale = excluded.accepts_sale,
    accepts_rent = excluded.accepts_rent, accepts_launch = excluded.accepts_launch,
    specialties = excluded.specialties, introduction = excluded.introduction,
    deactivated_at = excluded.deactivated_at, updated_at = now();

  delete from public.partnership_member_regions where profile_id = v_uid;
  if p_enabled then
    for v_region in select value from jsonb_array_elements(p_regions) loop
      if jsonb_typeof(v_region) <> 'object' then raise exception 'Invalid region'; end if;
      v_city := regexp_replace(trim(coalesce(v_region->>'city', '')), '\s+', ' ', 'g');
      v_neighborhood := nullif(regexp_replace(trim(coalesce(v_region->>'neighborhood', '')), '\s+', ' ', 'g'), '');
      if char_length(v_city) not between 2 and 100
         or (v_neighborhood is not null and char_length(v_neighborhood) not between 2 and 100) then raise exception 'Invalid region'; end if;
      insert into public.partnership_member_regions(profile_id, state, city, neighborhood)
      values (v_uid, 'SP', v_city, v_neighborhood) on conflict do nothing;
    end loop;
  end if;
  return public.get_my_partnership_network();
end;
$$;
revoke all on function public.save_my_partnership_membership(boolean, boolean, boolean, boolean, text[], text, jsonb) from public, anon;
grant execute on function public.save_my_partnership_membership(boolean, boolean, boolean, boolean, text[], text, jsonb) to authenticated;

create table if not exists public.partnership_network_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  participant_ids uuid[] not null default '{}'::uuid[],
  entity_type text not null check (entity_type in ('membership', 'connection', 'report')),
  entity_id uuid not null,
  action text not null,
  previous_data jsonb,
  current_data jsonb,
  created_at timestamptz not null default now()
);
create index if not exists partnership_network_events_entity
  on public.partnership_network_events(entity_type, entity_id, created_at desc);
create index if not exists partnership_network_events_participants
  on public.partnership_network_events using gin(participant_ids);

create table if not exists public.partnership_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete set null,
  reported_profile_id uuid references public.profiles(id) on delete set null,
  connection_id uuid references public.partnership_connections(id) on delete set null,
  category text not null check (category in ('conduct', 'spam', 'misleading_profile', 'unauthorized_contact', 'other')),
  details text not null check (char_length(trim(details)) between 20 and 2000),
  status text not null default 'open' check (status in ('open', 'under_review', 'resolved', 'dismissed')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  check (reporter_id is null or reported_profile_id is null or reporter_id <> reported_profile_id)
);
create index if not exists partnership_reports_status
  on public.partnership_reports(status, created_at desc);
create index if not exists partnership_reports_reported_profile
  on public.partnership_reports(reported_profile_id, created_at desc);

alter table public.partnership_network_events enable row level security;
alter table public.partnership_reports enable row level security;
revoke all on public.partnership_network_events from public, anon, authenticated;
revoke all on public.partnership_reports from public, anon, authenticated;

create or replace function public.audit_partnership_membership_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.partnership_network_events(
    actor_id, participant_ids, entity_type, entity_id, action, previous_data, current_data
  ) values (
    auth.uid(), array[coalesce(new.profile_id, old.profile_id)], 'membership',
    coalesce(new.profile_id, old.profile_id), lower(tg_op),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists audit_partnership_membership_change on public.partnership_network_members;
create trigger audit_partnership_membership_change
after insert or update or delete on public.partnership_network_members
for each row execute function public.audit_partnership_membership_change();

create or replace function public.audit_partnership_connection_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.partnership_network_events(
    actor_id, participant_ids, entity_type, entity_id, action, previous_data, current_data
  ) values (
    auth.uid(),
    array[coalesce(new.requester_id, old.requester_id), coalesce(new.recipient_id, old.recipient_id)],
    'connection', coalesce(new.id, old.id), lower(tg_op),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists audit_partnership_connection_change on public.partnership_connections;
create trigger audit_partnership_connection_change
after insert or update or delete on public.partnership_connections
for each row execute function public.audit_partnership_connection_change();

create or replace function public.audit_partnership_report_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.partnership_network_events(
    actor_id, participant_ids, entity_type, entity_id, action, previous_data, current_data
  ) values (
    auth.uid(),
    array_remove(array[coalesce(new.reporter_id, old.reporter_id), coalesce(new.reported_profile_id, old.reported_profile_id)], null),
    'report', coalesce(new.id, old.id), lower(tg_op),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists audit_partnership_report_change on public.partnership_reports;
create trigger audit_partnership_report_change
after insert or update or delete on public.partnership_reports
for each row execute function public.audit_partnership_report_change();

revoke all on function public.audit_partnership_membership_change() from public, anon, authenticated;
revoke all on function public.audit_partnership_connection_change() from public, anon, authenticated;
revoke all on function public.audit_partnership_report_change() from public, anon, authenticated;

create or replace function public.are_partnership_profiles_blocked(p_first uuid, p_second uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.partnership_connections c
    where c.status = 'blocked'
      and least(c.requester_id, c.recipient_id) = least(p_first, p_second)
      and greatest(c.requester_id, c.recipient_id) = greatest(p_first, p_second)
  );
$$;
revoke all on function public.are_partnership_profiles_blocked(uuid, uuid) from public, anon;
grant execute on function public.are_partnership_profiles_blocked(uuid, uuid) to authenticated;

create or replace function public.block_partnership_professional(p_profile_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_connection public.partnership_connections%rowtype;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not public.has_satisfied_mfa() then raise exception 'MFA verification required'; end if;
  if p_profile_id is null or p_profile_id = v_uid then raise exception 'Invalid profile'; end if;
  if not exists (select 1 from public.profiles where id = p_profile_id) then raise exception 'Profile not found'; end if;

  select * into v_connection from public.partnership_connections
  where least(requester_id, recipient_id) = least(v_uid, p_profile_id)
    and greatest(requester_id, recipient_id) = greatest(v_uid, p_profile_id)
  for update;

  if found then
    update public.partnership_connections
    set requester_id = v_uid,
        recipient_id = p_profile_id,
        status = 'blocked',
        responded_at = coalesce(responded_at, now()),
        ended_at = now(),
        updated_at = now()
    where id = v_connection.id;
  else
    insert into public.partnership_connections(
      requester_id, recipient_id, status, responded_at, ended_at
    ) values (v_uid, p_profile_id, 'blocked', now(), now());
  end if;
  return true;
end;
$$;
revoke all on function public.block_partnership_professional(uuid) from public, anon;
grant execute on function public.block_partnership_professional(uuid) to authenticated;

create or replace function public.report_partnership_professional(
  p_profile_id uuid,
  p_category text,
  p_details text,
  p_block boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_category text := lower(trim(coalesce(p_category, '')));
  v_details text := trim(coalesce(p_details, ''));
  v_connection_id uuid;
  v_report_id uuid;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not public.has_satisfied_mfa() then raise exception 'MFA verification required'; end if;
  if p_profile_id is null or p_profile_id = v_uid then raise exception 'Invalid profile'; end if;
  if v_category not in ('conduct', 'spam', 'misleading_profile', 'unauthorized_contact', 'other') then raise exception 'Invalid report category'; end if;
  if char_length(v_details) not between 20 and 2000 then raise exception 'Invalid report details'; end if;
  if not exists (select 1 from public.profiles where id = p_profile_id) then raise exception 'Profile not found'; end if;

  select id into v_connection_id from public.partnership_connections
  where least(requester_id, recipient_id) = least(v_uid, p_profile_id)
    and greatest(requester_id, recipient_id) = greatest(v_uid, p_profile_id)
  limit 1;

  insert into public.partnership_reports(reporter_id, reported_profile_id, connection_id, category, details)
  values (v_uid, p_profile_id, v_connection_id, v_category, v_details)
  returning id into v_report_id;

  if coalesce(p_block, false) then perform public.block_partnership_professional(p_profile_id); end if;
  return v_report_id;
end;
$$;
revoke all on function public.report_partnership_professional(uuid, text, text, boolean) from public, anon;
grant execute on function public.report_partnership_professional(uuid, text, text, boolean) to authenticated;

-- Perfis bloqueados deixam de aparecer mutuamente na descoberta.
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
  if not exists (select 1 from public.partnership_network_members where profile_id = v_uid and status = 'active') then
    raise exception 'Active partnership membership required';
  end if;

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
      and not public.are_partnership_profiles_blocked(v_uid, p.id)
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
    'accepts_launch', accepts_launch, 'specialties', to_jsonb(specialties),
    'introduction', introduction, 'regions', regions, 'connection', connection
  )), '[]'::jsonb) into v_result from candidates;

  return v_result;
end;
$$;
revoke all on function public.search_partnership_professionals(text, text, integer, integer) from public, anon;
grant execute on function public.search_partnership_professionals(text, text, integer, integer) to authenticated;

notify pgrst, 'reload schema';
commit;
