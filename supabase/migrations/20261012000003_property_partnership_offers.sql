begin;

-- Fase 2: ofertas privadas, negociação e aceite preliminar por imóvel.
-- Nenhuma estrutura desta migration autoriza publicação em portal parceiro.

create table if not exists public.property_partnership_offers (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete set null,
  captor_id uuid references public.profiles(id) on delete set null,
  property_snapshot jsonb not null,
  captor_snapshot jsonb not null,
  status text not null default 'open' check (status in ('open', 'closed', 'cancelled')),
  partner_limit smallint not null default 1 check (partner_limit between 1 and 50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

create table if not exists public.property_partnership_negotiations (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.property_partnership_offers(id) on delete restrict,
  partner_id uuid references public.profiles(id) on delete set null,
  partner_snapshot jsonb not null,
  status text not null default 'proposed'
    check (status in ('proposed', 'countered', 'preliminarily_accepted', 'declined', 'cancelled', 'awaiting_contract')),
  current_version_id uuid,
  accepted_version_id uuid,
  proposed_at timestamptz not null default now(),
  responded_at timestamptz,
  preliminary_accepted_at timestamptz,
  cancelled_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (offer_id, partner_id),
  check ((status = 'preliminarily_accepted' and accepted_version_id is not null and preliminary_accepted_at is not null) or status <> 'preliminarily_accepted')
);

create table if not exists public.property_partnership_term_versions (
  id uuid primary key default gen_random_uuid(),
  negotiation_id uuid not null references public.property_partnership_negotiations(id) on delete restrict,
  version_number integer not null check (version_number > 0),
  parent_version_id uuid references public.property_partnership_term_versions(id) on delete restrict,
  proposed_by uuid references public.profiles(id) on delete set null,
  proposed_by_snapshot jsonb not null,
  proposal_kind text not null check (proposal_kind in ('initial', 'revision', 'counteroffer')),
  captor_share numeric(5,2) not null check (captor_share > 0 and captor_share < 100),
  partner_share numeric(5,2) not null check (partner_share > 0 and partner_share < 100),
  duration_kind text not null check (duration_kind in ('fixed', 'indefinite')),
  valid_from date not null,
  valid_until date,
  termination_notice_days smallint not null default 7 check (termination_notice_days between 0 and 180),
  original_authorization_exclusive boolean not null default false,
  partnership_exclusive boolean not null default false,
  honorarium_receiver text not null check (honorarium_receiver in ('captor', 'partner', 'both')),
  contract_preparer text not null check (contract_preparer in ('captor', 'partner', 'both')),
  territory_description text not null check (char_length(trim(territory_description)) between 2 and 500),
  allow_partner_portal boolean not null default true,
  allow_social_media boolean not null default false,
  allow_paid_ads boolean not null default false,
  allow_external_portals boolean not null default false,
  allow_material_adaptation boolean not null default false,
  additional_terms text,
  terms_schema_version integer not null default 1 check (terms_schema_version > 0),
  created_at timestamptz not null default now(),
  unique (negotiation_id, version_number),
  check (captor_share + partner_share = 100.00),
  check ((duration_kind = 'fixed' and valid_until is not null and valid_until >= valid_from) or (duration_kind = 'indefinite' and valid_until is null)),
  check (additional_terms is null or char_length(additional_terms) <= 3000)
);

do $$
begin
  if not exists (select 1 from pg_catalog.pg_constraint where conname='property_partnership_negotiations_current_version_fkey' and conrelid='public.property_partnership_negotiations'::regclass) then
    alter table public.property_partnership_negotiations
      add constraint property_partnership_negotiations_current_version_fkey
      foreign key (current_version_id) references public.property_partnership_term_versions(id) on delete restrict;
  end if;
  if not exists (select 1 from pg_catalog.pg_constraint where conname='property_partnership_negotiations_accepted_version_fkey' and conrelid='public.property_partnership_negotiations'::regclass) then
    alter table public.property_partnership_negotiations
      add constraint property_partnership_negotiations_accepted_version_fkey
      foreign key (accepted_version_id) references public.property_partnership_term_versions(id) on delete restrict;
  end if;
end;
$$;

create table if not exists public.property_partnership_responsibilities (
  term_version_id uuid not null references public.property_partnership_term_versions(id) on delete restrict,
  responsibility_key text not null check (responsibility_key in (
    'owner_relationship', 'buyer_relationship', 'visit_scheduling', 'visit_accompaniment',
    'proposal_receipt', 'proposal_presentation', 'negotiation', 'document_review',
    'transaction_instrument', 'signature_closing', 'key_delivery', 'honorarium_accountability'
  )),
  responsible_party text not null check (responsible_party in ('captor', 'partner', 'both')),
  created_at timestamptz not null default now(),
  primary key (term_version_id, responsibility_key)
);

create table if not exists public.property_partnership_events (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.property_partnership_offers(id) on delete restrict,
  negotiation_id uuid references public.property_partnership_negotiations(id) on delete restrict,
  term_version_id uuid references public.property_partnership_term_versions(id) on delete restrict,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null check (event_type in (
    'offer_created', 'offer_revised', 'offer_closed', 'offer_cancelled',
    'partner_invited', 'counteroffer_sent', 'preliminarily_accepted',
    'declined', 'negotiation_cancelled'
  )),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists property_partnership_offers_captor on public.property_partnership_offers(captor_id, updated_at desc);
create unique index if not exists property_partnership_offers_one_open_per_property
  on public.property_partnership_offers(property_id) where property_id is not null and status='open';
create index if not exists property_partnership_negotiations_partner on public.property_partnership_negotiations(partner_id, status, updated_at desc);
create index if not exists property_partnership_negotiations_offer on public.property_partnership_negotiations(offer_id, status, updated_at desc);
create index if not exists property_partnership_terms_negotiation on public.property_partnership_term_versions(negotiation_id, version_number desc);
create index if not exists property_partnership_events_offer on public.property_partnership_events(offer_id, created_at desc);

alter table public.property_partnership_offers enable row level security;
alter table public.property_partnership_negotiations enable row level security;
alter table public.property_partnership_term_versions enable row level security;
alter table public.property_partnership_responsibilities enable row level security;
alter table public.property_partnership_events enable row level security;

revoke all on public.property_partnership_offers from public, anon, authenticated;
revoke all on public.property_partnership_negotiations from public, anon, authenticated;
revoke all on public.property_partnership_term_versions from public, anon, authenticated;
revoke all on public.property_partnership_responsibilities from public, anon, authenticated;
revoke all on public.property_partnership_events from public, anon, authenticated;

create or replace function public.require_partnership_aal2()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if coalesce(auth.jwt()->>'aal', 'aal1') <> 'aal2' then raise exception 'AAL2 required for partnership terms'; end if;
end;
$$;
revoke all on function public.require_partnership_aal2() from public, anon;
grant execute on function public.require_partnership_aal2() to authenticated;

create or replace function public.validate_partnership_terms(p_terms jsonb)
returns void
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_captor numeric;
  v_partner numeric;
  v_duration text;
  v_from date;
  v_until date;
  v_responsibilities jsonb;
  v_required_key text;
begin
  if jsonb_typeof(p_terms) <> 'object' then raise exception 'Invalid partnership terms'; end if;
  begin
    v_captor := (p_terms->>'captor_share')::numeric;
    v_partner := (p_terms->>'partner_share')::numeric;
    v_from := (p_terms->>'valid_from')::date;
    v_until := nullif(p_terms->>'valid_until', '')::date;
  exception when others then raise exception 'Invalid numeric or date terms'; end;
  if v_captor <= 0 or v_partner <= 0 or v_captor + v_partner <> 100 then raise exception 'Partnership shares must total 100'; end if;
  v_duration := p_terms->>'duration_kind';
  if v_duration not in ('fixed', 'indefinite') then raise exception 'Invalid duration'; end if;
  if v_duration = 'fixed' and (v_until is null or v_until < v_from) then raise exception 'Invalid fixed duration'; end if;
  if v_duration = 'indefinite' and v_until is not null then raise exception 'Indefinite duration cannot have end date'; end if;
  if coalesce(p_terms->>'honorarium_receiver', '') not in ('captor', 'partner', 'both') then raise exception 'Invalid honorarium receiver'; end if;
  if coalesce(p_terms->>'contract_preparer', '') not in ('captor', 'partner', 'both') then raise exception 'Invalid contract preparer'; end if;
  if char_length(trim(coalesce(p_terms->>'territory_description', ''))) not between 2 and 500 then raise exception 'Invalid territory'; end if;
  if coalesce((p_terms->>'termination_notice_days')::integer, -1) not between 0 and 180 then raise exception 'Invalid termination notice'; end if;
  if char_length(coalesce(p_terms->>'additional_terms', '')) > 3000 then raise exception 'Additional terms too long'; end if;
  v_responsibilities := p_terms->'responsibilities';
  if jsonb_typeof(v_responsibilities) <> 'object' then raise exception 'Invalid responsibilities'; end if;
  foreach v_required_key in array array[
    'owner_relationship','buyer_relationship','visit_scheduling','visit_accompaniment',
    'proposal_receipt','proposal_presentation','negotiation','document_review',
    'transaction_instrument','signature_closing','key_delivery','honorarium_accountability'
  ] loop
    if coalesce(v_responsibilities->>v_required_key, '') not in ('captor', 'partner', 'both') then
      raise exception 'Incomplete responsibilities';
    end if;
  end loop;
end;
$$;
revoke all on function public.validate_partnership_terms(jsonb) from public, anon, authenticated;

create or replace function public.insert_partnership_term_version(
  p_negotiation_id uuid,
  p_proposed_by uuid,
  p_proposal_kind text,
  p_terms jsonb,
  p_parent_version_id uuid default null
)
returns public.property_partnership_term_versions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version public.property_partnership_term_versions%rowtype;
  v_number integer;
  v_key text;
  v_proposer_snapshot jsonb;
begin
  perform public.validate_partnership_terms(p_terms);
  select jsonb_build_object('profile_id', p.id, 'name', p.name, 'creci', p.creci, 'creci_uf', p.creci_uf)
  into v_proposer_snapshot from public.profiles p where p.id = p_proposed_by;
  if v_proposer_snapshot is null then raise exception 'Proposer profile not found'; end if;
  select coalesce(max(version_number), 0) + 1 into v_number
  from public.property_partnership_term_versions
  where negotiation_id = p_negotiation_id;

  insert into public.property_partnership_term_versions(
    negotiation_id, version_number, parent_version_id, proposed_by, proposed_by_snapshot, proposal_kind,
    captor_share, partner_share, duration_kind, valid_from, valid_until,
    termination_notice_days, original_authorization_exclusive, partnership_exclusive,
    honorarium_receiver, contract_preparer, territory_description,
    allow_partner_portal, allow_social_media, allow_paid_ads, allow_external_portals,
    allow_material_adaptation, additional_terms
  ) values (
    p_negotiation_id, v_number, p_parent_version_id, p_proposed_by, v_proposer_snapshot, p_proposal_kind,
    (p_terms->>'captor_share')::numeric, (p_terms->>'partner_share')::numeric,
    p_terms->>'duration_kind', (p_terms->>'valid_from')::date, nullif(p_terms->>'valid_until', '')::date,
    coalesce((p_terms->>'termination_notice_days')::smallint, 7),
    coalesce((p_terms->>'original_authorization_exclusive')::boolean, false),
    coalesce((p_terms->>'partnership_exclusive')::boolean, false),
    p_terms->>'honorarium_receiver', p_terms->>'contract_preparer', trim(p_terms->>'territory_description'),
    coalesce((p_terms->>'allow_partner_portal')::boolean, true),
    coalesce((p_terms->>'allow_social_media')::boolean, false),
    coalesce((p_terms->>'allow_paid_ads')::boolean, false),
    coalesce((p_terms->>'allow_external_portals')::boolean, false),
    coalesce((p_terms->>'allow_material_adaptation')::boolean, false),
    nullif(trim(coalesce(p_terms->>'additional_terms', '')), '')
  ) returning * into v_version;

  foreach v_key in array array[
    'owner_relationship','buyer_relationship','visit_scheduling','visit_accompaniment',
    'proposal_receipt','proposal_presentation','negotiation','document_review',
    'transaction_instrument','signature_closing','key_delivery','honorarium_accountability'
  ] loop
    insert into public.property_partnership_responsibilities(term_version_id, responsibility_key, responsible_party)
    values (v_version.id, v_key, p_terms->'responsibilities'->>v_key);
  end loop;
  return v_version;
end;
$$;
revoke all on function public.insert_partnership_term_version(uuid, uuid, text, jsonb, uuid) from public, anon, authenticated;

create or replace function public.get_property_partnership_workspace(p_property_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_property public.properties%rowtype;
  v_offer public.property_partnership_offers%rowtype;
  v_result jsonb;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not public.has_satisfied_mfa() then raise exception 'MFA verification required'; end if;
  select * into v_property from public.properties where id = p_property_id;
  if not found or v_property.user_id <> v_uid then raise exception 'Property access denied'; end if;
  select * into v_offer from public.property_partnership_offers where property_id = p_property_id and status='open' order by created_at desc limit 1;

  select jsonb_build_object(
    'property', jsonb_build_object(
      'id', v_property.id, 'code', v_property.code, 'title', v_property.title,
      'purpose', v_property.purpose, 'status', v_property.status,
      'is_exclusive', v_property.is_exclusive
    ),
    'offer', case when v_offer.id is null then null else to_jsonb(v_offer) end,
    'available_partners', coalesce((
      select jsonb_agg(jsonb_build_object(
        'profile_id', p.id, 'name', p.name, 'avatar_url', p.avatar_url,
        'creci', p.creci, 'creci_uf', p.creci_uf,
        'portal_title', coalesce(nullif(ps.identity->>'portalName',''), nullif(p.agency_name,''), p.name),
        'portal_slug', ps.subdomain_slug,
        'regions', coalesce((select jsonb_agg(jsonb_build_object('city', r.city, 'neighborhood', r.neighborhood) order by r.city)
          from public.partnership_member_regions r where r.profile_id = p.id), '[]'::jsonb)
      ) order by p.name)
      from public.partnership_connections c
      join public.profiles p on p.id = case when c.requester_id = v_uid then c.recipient_id else c.requester_id end
      join public.partnership_network_members m on m.profile_id = p.id and m.status = 'active'
      left join public.portal_settings ps on ps.owner_profile_id = p.id
      where v_uid in (c.requester_id, c.recipient_id)
        and c.status = 'accepted'
        and public.is_eligible_sp_partnership_professional(p.id)
        and case
          when v_property.purpose = 'launch'::public.property_purpose then m.accepts_launch
          when v_property.purpose in ('rent'::public.property_purpose, 'seasonal'::public.property_purpose) then m.accepts_rent
          else m.accepts_sale
        end
        and exists (
          select 1
          from public.property_locations location
          join public.partnership_member_regions region
            on region.profile_id = p.id
           and lower(trim(region.city)) = lower(trim(location.city))
           and (region.neighborhood is null or lower(trim(region.neighborhood)) = lower(trim(location.neighborhood)))
          where location.property_id = v_property.id
            and upper(location.state) = 'SP'
        )
    ), '[]'::jsonb),
    'negotiations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', n.id, 'partner_id', n.partner_id, 'status', n.status,
        'current_version_id', n.current_version_id, 'accepted_version_id', n.accepted_version_id,
        'updated_at', n.updated_at,
        'partner', jsonb_build_object('name', p.name, 'avatar_url', p.avatar_url, 'creci', p.creci, 'creci_uf', p.creci_uf),
        'current_terms', case when tv.id is null then null else to_jsonb(tv) || jsonb_build_object(
          'responsibilities', coalesce((select jsonb_object_agg(r.responsibility_key, r.responsible_party)
            from public.property_partnership_responsibilities r where r.term_version_id = tv.id), '{}'::jsonb)
        ) end
      ) order by n.updated_at desc)
      from public.property_partnership_negotiations n
      join public.profiles p on p.id = n.partner_id
      left join public.property_partnership_term_versions tv on tv.id = n.current_version_id
      where n.offer_id = v_offer.id
    ), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;
revoke all on function public.get_property_partnership_workspace(uuid) from public, anon;
grant execute on function public.get_property_partnership_workspace(uuid) to authenticated;

create or replace function public.save_property_partnership_offer(
  p_property_id uuid,
  p_partner_ids uuid[],
  p_partner_limit integer,
  p_terms jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_property public.properties%rowtype;
  v_offer public.property_partnership_offers%rowtype;
  v_negotiation public.property_partnership_negotiations%rowtype;
  v_version public.property_partnership_term_versions%rowtype;
  v_partner uuid;
  v_is_new boolean := false;
  v_partner_name text;
begin
  perform public.require_partnership_aal2();
  if not public.is_eligible_sp_partnership_professional(v_uid) then raise exception 'Eligible CRECI-SP professional required'; end if;
  if cardinality(coalesce(p_partner_ids, '{}'::uuid[])) < 1 or cardinality(p_partner_ids) > 50 then raise exception 'Select between one and fifty partners'; end if;
  if cardinality(p_partner_ids) <> cardinality(array(select distinct unnest(p_partner_ids))) then raise exception 'Duplicate partners'; end if;
  if p_partner_limit not between 1 and cardinality(p_partner_ids) then raise exception 'Invalid partner limit'; end if;
  perform public.validate_partnership_terms(p_terms);

  select * into v_property from public.properties where id = p_property_id for update;
  if not found or v_property.user_id <> v_uid then raise exception 'Property access denied'; end if;
  if v_property.status in ('sold', 'rented', 'archived') then raise exception 'Property status does not allow partnership'; end if;
  if not exists (select 1 from public.property_locations where property_id = p_property_id and upper(state) = 'SP') then raise exception 'Only properties in SP are eligible'; end if;

  select * into v_offer from public.property_partnership_offers where property_id = p_property_id and status='open' order by created_at desc limit 1 for update;
  if not found then
    insert into public.property_partnership_offers(property_id, captor_id, property_snapshot, captor_snapshot, partner_limit)
    values (
      p_property_id, v_uid,
      jsonb_build_object('property_id',v_property.id,'code',v_property.code,'title',v_property.title,'purpose',v_property.purpose),
      (select jsonb_build_object('profile_id',p.id,'name',p.name,'creci',p.creci,'creci_uf',p.creci_uf) from public.profiles p where p.id=v_uid),
      p_partner_limit
    ) returning * into v_offer;
    v_is_new := true;
    insert into public.property_partnership_events(offer_id, actor_id, event_type)
    values (v_offer.id, v_uid, 'offer_created');
  else
    if v_offer.captor_id <> v_uid then raise exception 'Offer access denied'; end if;
    if v_offer.status <> 'open' then raise exception 'Offer is not open'; end if;
    update public.property_partnership_offers set partner_limit = p_partner_limit, updated_at = now()
    where id = v_offer.id returning * into v_offer;
    insert into public.property_partnership_events(offer_id, actor_id, event_type)
    values (v_offer.id, v_uid, 'offer_revised');
  end if;

  foreach v_partner in array p_partner_ids loop
    if v_partner = v_uid
       or not public.is_eligible_sp_partnership_professional(v_partner)
       or public.are_partnership_profiles_blocked(v_uid, v_partner)
       or not exists (select 1 from public.partnership_connections c where c.status = 'accepted' and v_uid in (c.requester_id,c.recipient_id) and v_partner in (c.requester_id,c.recipient_id)) then
      raise exception 'Invalid partnership recipient';
    end if;
    if not exists (
      select 1
      from public.partnership_network_members member
      join public.partnership_member_regions region on region.profile_id = member.profile_id
      join public.property_locations location
        on location.property_id = v_property.id
       and lower(trim(location.city)) = lower(trim(region.city))
       and (region.neighborhood is null or lower(trim(region.neighborhood)) = lower(trim(location.neighborhood)))
      where member.profile_id = v_partner
        and member.status = 'active'
        and upper(location.state) = 'SP'
        and case
          when v_property.purpose = 'launch'::public.property_purpose then member.accepts_launch
          when v_property.purpose in ('rent'::public.property_purpose, 'seasonal'::public.property_purpose) then member.accepts_rent
          else member.accepts_sale
        end
    ) then raise exception 'Partner region or purpose does not match property'; end if;

    select * into v_negotiation from public.property_partnership_negotiations
    where offer_id = v_offer.id and partner_id = v_partner for update;
    if found and v_negotiation.status in ('preliminarily_accepted', 'awaiting_contract', 'active') then
      raise exception 'Accepted negotiation requires a new contractual version';
    end if;
    if not found then
      insert into public.property_partnership_negotiations(offer_id, partner_id, partner_snapshot)
      values (
        v_offer.id, v_partner,
        (select jsonb_build_object('profile_id',p.id,'name',p.name,'creci',p.creci,'creci_uf',p.creci_uf) from public.profiles p where p.id=v_partner)
      ) returning * into v_negotiation;
    else
      update public.property_partnership_negotiations set
        status = 'proposed', responded_at = null, cancelled_at = null, updated_at = now()
      where id = v_negotiation.id returning * into v_negotiation;
    end if;

    v_version := public.insert_partnership_term_version(
      v_negotiation.id, v_uid,
      case when v_negotiation.current_version_id is null then 'initial' else 'revision' end,
      p_terms, v_negotiation.current_version_id
    );
    update public.property_partnership_negotiations set current_version_id = v_version.id, updated_at = now()
    where id = v_negotiation.id;
    insert into public.property_partnership_events(offer_id, negotiation_id, term_version_id, actor_id, event_type)
    values (v_offer.id, v_negotiation.id, v_version.id, v_uid, 'partner_invited');

    select name into v_partner_name from public.profiles where id = v_uid;
    insert into public.notifications(user_id, type, title, message, link, data)
    values (v_partner, 'system_alert'::public.notification_type, 'Nova oferta de parceria',
      coalesce(v_partner_name, 'Um profissional') || ' enviou uma oferta para o imóvel ' || v_property.code || '.',
      '/meus-imoveis', jsonb_build_object('scope','property_partnership_offer','negotiation_id',v_negotiation.id,'property_id',p_property_id));
  end loop;

  update public.property_partnership_negotiations set status = 'cancelled', cancelled_at = now(), updated_at = now()
  where offer_id = v_offer.id and not (partner_id = any(p_partner_ids)) and status in ('proposed','countered','declined');
  return public.get_property_partnership_workspace(p_property_id);
end;
$$;
revoke all on function public.save_property_partnership_offer(uuid, uuid[], integer, jsonb) from public, anon;
grant execute on function public.save_property_partnership_offer(uuid, uuid[], integer, jsonb) to authenticated;

create or replace function public.cancel_property_partnership_offer(p_offer_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_offer public.property_partnership_offers%rowtype;
  v_recipient record;
begin
  perform public.require_partnership_aal2();
  select * into v_offer from public.property_partnership_offers where id=p_offer_id for update;
  if not found or v_offer.captor_id<>v_uid or v_offer.status<>'open' then raise exception 'Open offer not found'; end if;
  if exists (select 1 from public.property_partnership_negotiations where offer_id=v_offer.id and status in ('awaiting_contract','active')) then
    raise exception 'Offer with contractual process cannot be cancelled here';
  end if;
  update public.property_partnership_offers set status='cancelled',closed_at=now(),updated_at=now() where id=v_offer.id;
  update public.property_partnership_negotiations set status='cancelled',cancelled_at=now(),updated_at=now()
  where offer_id=v_offer.id and status<>'cancelled';
  insert into public.property_partnership_events(offer_id,actor_id,event_type)
  values(v_offer.id,v_uid,'offer_cancelled');
  for v_recipient in select distinct partner_id from public.property_partnership_negotiations where offer_id=v_offer.id and partner_id is not null loop
    insert into public.notifications(user_id,type,title,message,link,data)
    values(v_recipient.partner_id,'system_alert'::public.notification_type,'Oferta de parceria cancelada',
      'O captador cancelou uma oferta de parceria antes da formalização contratual.','/meus-imoveis',
      jsonb_build_object('scope','property_partnership_offer','offer_id',v_offer.id,'status','cancelled'));
  end loop;
  return true;
end;
$$;
revoke all on function public.cancel_property_partnership_offer(uuid) from public, anon;
grant execute on function public.cancel_property_partnership_offer(uuid) to authenticated;

create or replace function public.get_my_incoming_partnership_offers()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_uid uuid := auth.uid(); v_result jsonb;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not public.has_satisfied_mfa() then raise exception 'MFA verification required'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'negotiation_id', n.id, 'status', n.status, 'updated_at', n.updated_at,
    'offer_id', o.id, 'partner_limit', o.partner_limit,
    'property', jsonb_build_object('id', pr.id, 'code', pr.code, 'title', pr.title, 'purpose', pr.purpose, 'price', pr.price, 'status', pr.status),
    'captor', jsonb_build_object('profile_id', p.id, 'name', p.name, 'avatar_url', p.avatar_url, 'creci', p.creci, 'creci_uf', p.creci_uf),
    'current_terms', to_jsonb(tv) || jsonb_build_object('responsibilities', coalesce((select jsonb_object_agg(r.responsibility_key,r.responsible_party) from public.property_partnership_responsibilities r where r.term_version_id=tv.id),'{}'::jsonb))
  ) order by n.updated_at desc), '[]'::jsonb) into v_result
  from public.property_partnership_negotiations n
  join public.property_partnership_offers o on o.id=n.offer_id and o.status='open'
  join public.properties pr on pr.id=o.property_id
  join public.profiles p on p.id=o.captor_id
  join public.property_partnership_term_versions tv on tv.id=n.current_version_id
  where n.partner_id=v_uid and n.status in ('proposed','countered','preliminarily_accepted','awaiting_contract','active');
  return v_result;
end;
$$;
revoke all on function public.get_my_incoming_partnership_offers() from public, anon;
grant execute on function public.get_my_incoming_partnership_offers() to authenticated;

create or replace function public.respond_property_partnership_negotiation(
  p_negotiation_id uuid,
  p_expected_version integer,
  p_decision text,
  p_counter_terms jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_decision text := lower(trim(coalesce(p_decision,'')));
  v_negotiation public.property_partnership_negotiations%rowtype;
  v_offer public.property_partnership_offers%rowtype;
  v_current public.property_partnership_term_versions%rowtype;
  v_next public.property_partnership_term_versions%rowtype;
  v_notify uuid;
  v_actor_name text;
begin
  perform public.require_partnership_aal2();
  if v_decision not in ('accept','decline','counter') then raise exception 'Invalid negotiation decision'; end if;
  select * into v_negotiation from public.property_partnership_negotiations where id=p_negotiation_id for update;
  if not found then raise exception 'Negotiation not found'; end if;
  select * into v_offer from public.property_partnership_offers where id=v_negotiation.offer_id and status='open' for update;
  if not found or v_uid not in (v_offer.captor_id,v_negotiation.partner_id) then raise exception 'Negotiation access denied'; end if;
  select * into v_current from public.property_partnership_term_versions where id=v_negotiation.current_version_id;
  if not found or v_current.version_number <> p_expected_version then raise exception 'Negotiation version changed'; end if;
  if v_current.proposed_by = v_uid then raise exception 'The proposing party cannot answer its own version'; end if;
  if v_negotiation.status not in ('proposed','countered') then raise exception 'Negotiation is not awaiting a response'; end if;

  v_notify := case when v_uid=v_offer.captor_id then v_negotiation.partner_id else v_offer.captor_id end;
  select name into v_actor_name from public.profiles where id=v_uid;
  if v_decision='accept' then
    if (select count(*) from public.property_partnership_negotiations where offer_id=v_offer.id and status='preliminarily_accepted') >= v_offer.partner_limit then
      raise exception 'Partner limit reached';
    end if;
    update public.property_partnership_negotiations set status='preliminarily_accepted', accepted_version_id=v_current.id,
      responded_at=now(), preliminary_accepted_at=now(), updated_at=now() where id=v_negotiation.id;
    insert into public.property_partnership_events(offer_id,negotiation_id,term_version_id,actor_id,event_type)
    values(v_offer.id,v_negotiation.id,v_current.id,v_uid,'preliminarily_accepted');
  elsif v_decision='decline' then
    update public.property_partnership_negotiations set status='declined',responded_at=now(),updated_at=now() where id=v_negotiation.id;
    insert into public.property_partnership_events(offer_id,negotiation_id,term_version_id,actor_id,event_type)
    values(v_offer.id,v_negotiation.id,v_current.id,v_uid,'declined');
  else
    perform public.validate_partnership_terms(p_counter_terms);
    v_next := public.insert_partnership_term_version(v_negotiation.id,v_uid,'counteroffer',p_counter_terms,v_current.id);
    update public.property_partnership_negotiations set status='countered',current_version_id=v_next.id,responded_at=now(),updated_at=now() where id=v_negotiation.id;
    insert into public.property_partnership_events(offer_id,negotiation_id,term_version_id,actor_id,event_type)
    values(v_offer.id,v_negotiation.id,v_next.id,v_uid,'counteroffer_sent');
  end if;
  insert into public.notifications(user_id,type,title,message,link,data)
  values(v_notify,'system_alert'::public.notification_type,
    case v_decision when 'accept' then 'Oferta aceita preliminarmente' when 'decline' then 'Oferta de parceria recusada' else 'Nova contraproposta recebida' end,
    coalesce(v_actor_name,'O profissional') || ' respondeu à negociação de parceria.', '/meus-imoveis',
    jsonb_build_object('scope','property_partnership_offer','negotiation_id',v_negotiation.id,'decision',v_decision));
  return jsonb_build_object('negotiation_id',v_negotiation.id,'decision',v_decision,'version_number',coalesce(v_next.version_number,v_current.version_number));
end;
$$;
revoke all on function public.respond_property_partnership_negotiation(uuid, integer, text, jsonb) from public, anon;
grant execute on function public.respond_property_partnership_negotiation(uuid, integer, text, jsonb) to authenticated;

-- Snapshots de termos e responsabilidades jamais são sobrescritos ou apagados.
create or replace function public.prevent_partnership_snapshot_mutation()
returns trigger language plpgsql set search_path='' as $$
begin raise exception 'Partnership snapshots are immutable'; end; $$;
revoke all on function public.prevent_partnership_snapshot_mutation() from public, anon, authenticated;
drop trigger if exists prevent_partnership_term_mutation on public.property_partnership_term_versions;
create trigger prevent_partnership_term_mutation before update or delete on public.property_partnership_term_versions
for each row execute function public.prevent_partnership_snapshot_mutation();
drop trigger if exists prevent_partnership_responsibility_mutation on public.property_partnership_responsibilities;
create trigger prevent_partnership_responsibility_mutation before update or delete on public.property_partnership_responsibilities
for each row execute function public.prevent_partnership_snapshot_mutation();
drop trigger if exists prevent_partnership_event_mutation on public.property_partnership_events;
create trigger prevent_partnership_event_mutation before update or delete on public.property_partnership_events
for each row execute function public.prevent_partnership_snapshot_mutation();

notify pgrst, 'reload schema';
commit;
