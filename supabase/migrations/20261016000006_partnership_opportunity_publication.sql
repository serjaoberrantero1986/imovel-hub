begin;

alter table public.property_partnership_offers
  add column if not exists discovery_enabled boolean not null default false,
  add column if not exists discovery_terms jsonb;

create index if not exists property_partnership_offers_discovery
  on public.property_partnership_offers(status, discovery_enabled, updated_at desc);

create or replace function public.publish_partnership_opportunity(
  p_property_id uuid,
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
  v_location public.property_locations%rowtype;
  v_offer public.property_partnership_offers%rowtype;
begin
  perform public.require_partnership_aal2();
  if not public.is_eligible_sp_partnership_professional(v_uid) then raise exception 'Eligible CRECI-SP professional required'; end if;
  perform public.validate_partnership_terms(p_terms);
  select * into v_property from public.properties where id = p_property_id and user_id = v_uid for update;
  if not found or v_property.status <> 'active' then raise exception 'Active property required'; end if;
  select * into v_location from public.property_locations where property_id = p_property_id and upper(state) = 'SP' limit 1;
  if not found then raise exception 'Only properties in SP are eligible'; end if;

  select * into v_offer from public.property_partnership_offers where property_id = p_property_id and status = 'open' for update;
  if not found then
    insert into public.property_partnership_offers(property_id, captor_id, property_snapshot, captor_snapshot, partner_limit, discovery_enabled, discovery_terms)
    select p_property_id, v_uid,
      jsonb_build_object('property_id', v_property.id, 'code', v_property.code, 'title', v_property.title, 'purpose', v_property.purpose, 'price', v_property.price),
      jsonb_build_object('profile_id', p.id, 'name', p.name, 'avatar_url', p.avatar_url, 'creci', p.creci, 'creci_uf', p.creci_uf),
      null, true, p_terms
    from public.profiles p where p.id = v_uid
    returning * into v_offer;
  else
    if v_offer.captor_id <> v_uid then raise exception 'Offer access denied'; end if;
    update public.property_partnership_offers
      set discovery_enabled = true, discovery_terms = p_terms, partner_limit = null, updated_at = now()
      where id = v_offer.id
      returning * into v_offer;
  end if;
  insert into public.property_partnership_events(offer_id, actor_id, event_type, details)
    values (v_offer.id, v_uid, 'offer_created', jsonb_build_object('discovery_enabled', true));
  insert into public.notifications(user_id, type, title, message, link, data)
    select distinct m.profile_id,
      'system_alert'::public.notification_type,
      'Nova oportunidade de parceria',
      'Um imóvel compatível com sua região e finalidade foi publicado por um captador.',
      '/crm',
      jsonb_build_object('scope','partnership_opportunity','offer_id',v_offer.id,'property_id',v_property.id)
    from public.partnership_network_members m
    join public.partnership_member_regions r on r.profile_id = m.profile_id
    where m.profile_id <> v_uid
      and m.status = 'active'
      and m.notify_opportunities = true
      and lower(trim(r.city)) = lower(trim(v_location.city))
      and (r.neighborhood is null or lower(trim(r.neighborhood)) = lower(trim(v_location.neighborhood)))
      and (case lower(trim(v_property.purpose)) when 'sale' then m.accepts_sale when 'rent' then m.accepts_rent when 'seasonal' then m.accepts_rent when 'launch' then m.accepts_launch else false end)
      and not exists (select 1 from public.notifications n where n.user_id = m.profile_id and n.data->>'scope' = 'partnership_opportunity' and n.data->>'offer_id' = v_offer.id::text);
  return public.get_property_partnership_workspace(p_property_id);
end;
$$;

create or replace function public.request_partnership_opportunity(p_offer_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_offer public.property_partnership_offers%rowtype;
  v_property public.properties%rowtype;
  v_location public.property_locations%rowtype;
  v_region boolean;
  v_neg public.property_partnership_negotiations%rowtype;
  v_version public.property_partnership_term_versions%rowtype;
begin
  perform public.require_partnership_aal2();
  if not public.is_eligible_sp_partnership_professional(v_uid) then raise exception 'Eligible CRECI-SP professional required'; end if;
  select * into v_offer from public.property_partnership_offers where id = p_offer_id and status = 'open' and discovery_enabled = true for update;
  if not found or v_offer.captor_id = v_uid then raise exception 'Opportunity unavailable'; end if;
  if v_offer.discovery_terms is null then raise exception 'Opportunity terms unavailable'; end if;
  select * into v_property from public.properties where id = v_offer.property_id and status = 'active';
  select * into v_location from public.property_locations where property_id = v_offer.property_id and upper(state) = 'SP' limit 1;
  select exists(select 1 from public.partnership_member_regions r where r.profile_id = v_uid and lower(trim(r.city)) = lower(trim(v_location.city)) and (r.neighborhood is null or lower(trim(r.neighborhood)) = lower(trim(v_location.neighborhood)))) into v_region;
  if not v_region then raise exception 'Opportunity region mismatch'; end if;
  select * into v_neg from public.property_partnership_negotiations where offer_id = v_offer.id and partner_id = v_uid for update;
  if found and v_neg.status not in ('declined','cancelled') then raise exception 'Opportunity already requested'; end if;
  if found then
    update public.property_partnership_negotiations
       set status = 'proposed', updated_at = now(), responded_at = null
     where id = v_neg.id
     returning * into v_neg;
    v_version := public.insert_partnership_term_version(v_neg.id, v_offer.captor_id, 'revision', v_offer.discovery_terms, v_neg.current_version_id);
  else
    insert into public.property_partnership_negotiations(offer_id, partner_id, partner_snapshot)
      select v_offer.id, v_uid, jsonb_build_object('profile_id', p.id, 'name', p.name, 'avatar_url', p.avatar_url, 'creci', p.creci, 'creci_uf', p.creci_uf)
      from public.profiles p where p.id = v_uid returning * into v_neg;
    v_version := public.insert_partnership_term_version(v_neg.id, v_offer.captor_id, 'initial', v_offer.discovery_terms, null);
  end if;
  update public.property_partnership_negotiations set current_version_id = v_version.id where id = v_neg.id;
  insert into public.property_partnership_events(offer_id, negotiation_id, term_version_id, actor_id, event_type)
    values (v_offer.id, v_neg.id, v_version.id, v_uid, 'partner_invited');
  return v_neg.id;
end;
$$;

revoke all on function public.publish_partnership_opportunity(uuid, jsonb) from public, anon;
grant execute on function public.publish_partnership_opportunity(uuid, jsonb) to authenticated;
revoke all on function public.request_partnership_opportunity(uuid) from public, anon;
grant execute on function public.request_partnership_opportunity(uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
