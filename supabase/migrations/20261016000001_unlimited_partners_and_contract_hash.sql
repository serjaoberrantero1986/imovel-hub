-- Remove o limite global da oferta: cada negociação continua independente.
alter table public.property_partnership_offers
  alter column partner_limit drop not null;
alter table public.property_partnership_offers
  drop constraint if exists property_partnership_offers_partner_limit_check;

create or replace function public.save_property_partnership_offer(
  p_property_id uuid,
  p_partner_ids uuid[],
  p_partner_limit integer,
  p_terms jsonb
)
returns jsonb language plpgsql security definer set search_path = '' as $$
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
  if cardinality(coalesce(p_partner_ids, '{}'::uuid[])) < 1 then raise exception 'Select at least one partner'; end if;
  if cardinality(p_partner_ids) <> cardinality(array(select distinct unnest(p_partner_ids))) then raise exception 'Duplicate partners'; end if;
  perform public.validate_partnership_terms(p_terms);
  select * into v_property from public.properties where id = p_property_id for update;
  if not found or v_property.user_id <> v_uid then raise exception 'Property access denied'; end if;
  if v_property.status in ('sold', 'rented', 'archived') then raise exception 'Property status does not allow partnership'; end if;
  if not exists (select 1 from public.property_locations where property_id = p_property_id and upper(state) = 'SP') then raise exception 'Only properties in SP are eligible'; end if;
  select * into v_offer from public.property_partnership_offers where property_id = p_property_id and status='open' order by created_at desc limit 1 for update;
  if not found then
    insert into public.property_partnership_offers(property_id, captor_id, property_snapshot, captor_snapshot, partner_limit)
    values (p_property_id, v_uid,
      jsonb_build_object('property_id',v_property.id,'code',v_property.code,'title',v_property.title,'purpose',v_property.purpose),
      (select jsonb_build_object('profile_id',p.id,'name',p.name,'creci',p.creci,'creci_uf',p.creci_uf) from public.profiles p where p.id=v_uid),
      null) returning * into v_offer;
    v_is_new := true;
    insert into public.property_partnership_events(offer_id, actor_id, event_type) values (v_offer.id, v_uid, 'offer_created');
  else
    if v_offer.captor_id <> v_uid then raise exception 'Offer access denied'; end if;
    if v_offer.status <> 'open' then raise exception 'Offer is not open'; end if;
    update public.property_partnership_offers set partner_limit = null, updated_at = now() where id = v_offer.id returning * into v_offer;
    insert into public.property_partnership_events(offer_id, actor_id, event_type) values (v_offer.id, v_uid, 'offer_revised');
  end if;
  foreach v_partner in array p_partner_ids loop
    if v_partner = v_uid or not public.is_eligible_sp_partnership_professional(v_partner) or public.are_partnership_profiles_blocked(v_uid, v_partner)
       or not exists (select 1 from public.partnership_connections c where c.status = 'accepted' and v_uid in (c.requester_id,c.recipient_id) and v_partner in (c.requester_id,c.recipient_id)) then raise exception 'Invalid partnership recipient'; end if;
    if not exists (select 1 from public.partnership_network_members member join public.partnership_member_regions region on region.profile_id = member.profile_id join public.property_locations location on location.property_id = v_property.id and lower(trim(location.city)) = lower(trim(region.city)) and (region.neighborhood is null or lower(trim(region.neighborhood)) = lower(trim(location.neighborhood))) where member.profile_id = v_partner and member.status = 'active' and upper(location.state) = 'SP' and case when v_property.purpose = 'launch'::public.property_purpose then member.accepts_launch when v_property.purpose in ('rent'::public.property_purpose, 'seasonal'::public.property_purpose) then member.accepts_rent else member.accepts_sale end) then raise exception 'Partner region or purpose does not match property'; end if;
    select * into v_negotiation from public.property_partnership_negotiations where offer_id = v_offer.id and partner_id = v_partner for update;
    if found and v_negotiation.status in ('preliminarily_accepted', 'awaiting_contract', 'active') then raise exception 'Accepted negotiation requires a new contractual version'; end if;
    if not found then insert into public.property_partnership_negotiations(offer_id, partner_id, partner_snapshot) values (v_offer.id, v_partner, (select jsonb_build_object('profile_id',p.id,'name',p.name,'creci',p.creci,'creci_uf',p.creci_uf) from public.profiles p where p.id=v_partner)) returning * into v_negotiation;
    else update public.property_partnership_negotiations set status = 'proposed', responded_at = null, cancelled_at = null, updated_at = now() where id = v_negotiation.id returning * into v_negotiation; end if;
    v_version := public.insert_partnership_term_version(v_negotiation.id, v_uid, case when v_negotiation.current_version_id is null then 'initial' else 'revision' end, p_terms, v_negotiation.current_version_id);
    update public.property_partnership_negotiations set current_version_id = v_version.id, updated_at = now() where id = v_negotiation.id;
    insert into public.property_partnership_events(offer_id, negotiation_id, term_version_id, actor_id, event_type) values (v_offer.id, v_negotiation.id, v_version.id, v_uid, 'partner_invited');
    select name into v_partner_name from public.profiles where id = v_uid;
    insert into public.notifications(user_id, type, title, message, link, data) values (v_partner, 'system_alert'::public.notification_type, 'Nova oferta de parceria', coalesce(v_partner_name, 'Um profissional') || ' enviou uma oferta para o imóvel ' || v_property.code || '.', '/meus-imoveis', jsonb_build_object('scope','property_partnership_offer','negotiation_id',v_negotiation.id,'property_id',p_property_id));
  end loop;
  update public.property_partnership_negotiations set status = 'cancelled', cancelled_at = now(), updated_at = now() where offer_id = v_offer.id and not (partner_id = any(p_partner_ids)) and status in ('proposed','countered','declined');
  return public.get_property_partnership_workspace(p_property_id);
end; $$;
revoke all on function public.save_property_partnership_offer(uuid, uuid[], integer, jsonb) from public, anon;
grant execute on function public.save_property_partnership_offer(uuid, uuid[], integer, jsonb) to authenticated;

create or replace function public.respond_property_partnership_negotiation(p_negotiation_id uuid,p_decision text,p_terms jsonb default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_neg public.property_partnership_negotiations%rowtype; v_offer public.property_partnership_offers%rowtype; v_current public.property_partnership_term_versions%rowtype; v_version public.property_partnership_term_versions%rowtype; v_accepted_count integer;
begin
  perform public.require_partnership_aal2(); select * into v_neg from public.property_partnership_negotiations where id=p_negotiation_id for update; if not found or v_neg.partner_id<>v_uid then raise exception 'Negotiation access denied'; end if; select * into v_offer from public.property_partnership_offers where id=v_neg.offer_id for update; if not found or v_offer.status<>'open' then raise exception 'Offer is not open'; end if;
  if p_decision not in ('accept','decline','counter') then raise exception 'Invalid negotiation decision'; end if;
  if p_decision='decline' then update public.property_partnership_negotiations set status='declined',responded_at=now(),updated_at=now() where id=v_neg.id; return public.get_property_partnership_workspace(v_offer.property_id); end if;
  if p_decision='counter' then perform public.validate_partnership_terms(p_terms); v_version:=public.insert_partnership_term_version(v_neg.id,v_uid,'counteroffer',p_terms,v_neg.current_version_id); update public.property_partnership_negotiations set status='countered',current_version_id=v_version.id,responded_at=now(),updated_at=now() where id=v_neg.id; return public.get_property_partnership_workspace(v_offer.property_id); end if;
  select count(*) into v_accepted_count from public.property_partnership_negotiations where offer_id=v_offer.id and status='preliminarily_accepted';
  select * into v_current from public.property_partnership_term_versions where id=v_neg.current_version_id;
  if v_current is null then raise exception 'Current terms not found'; end if;
  update public.property_partnership_negotiations set status='preliminarily_accepted',accepted_version_id=v_current.id,responded_at=now(),preliminary_accepted_at=now(),updated_at=now() where id=v_neg.id;
  insert into public.property_partnership_events(offer_id,negotiation_id,term_version_id,actor_id,event_type) values(v_offer.id,v_neg.id,v_current.id,v_uid,'preliminarily_accepted');
  return public.get_property_partnership_workspace(v_offer.property_id);
end; $$;
revoke all on function public.respond_property_partnership_negotiation(uuid,text,jsonb) from public, anon;
grant execute on function public.respond_property_partnership_negotiation(uuid,text,jsonb) to authenticated;

create or replace function public.create_partnership_contract_draft(p_negotiation_id uuid,p_expected_term_version integer,p_original_sgr_contract_number text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_neg public.property_partnership_negotiations%rowtype; v_offer public.property_partnership_offers%rowtype; v_term public.property_partnership_term_versions%rowtype; v_contract public.partnership_contract_versions%rowtype; v_number integer; v_payload jsonb; v_hash text;
begin
  perform public.require_partnership_aal2(); select * into v_neg from public.property_partnership_negotiations where id=p_negotiation_id for update; if not found or v_neg.status<>'preliminarily_accepted' or v_neg.accepted_version_id is null then raise exception 'Preliminarily accepted negotiation required'; end if; select * into v_offer from public.property_partnership_offers where id=v_neg.offer_id for update; if not found or v_offer.captor_id<>v_uid or v_offer.status<>'open' then raise exception 'Captor access required'; end if; select * into v_term from public.property_partnership_term_versions where id=v_neg.accepted_version_id; if not found or v_term.version_number<>p_expected_term_version then raise exception 'Accepted terms version changed'; end if; if char_length(trim(coalesce(p_original_sgr_contract_number,''))) not between 3 and 120 then raise exception 'Original SGR contract number required'; end if;
  update public.partnership_contract_versions set status='superseded' where negotiation_id=v_neg.id and status in ('awaiting_acknowledgements','awaiting_sgr','rejected'); select coalesce(max(version_number),0)+1 into v_number from public.partnership_contract_versions where negotiation_id=v_neg.id;
  v_payload:=jsonb_build_object('schema_version',1,'negotiation_id',v_neg.id,'term_version_id',v_term.id,'term_version_number',v_term.version_number,'original_sgr_contract_number',trim(p_original_sgr_contract_number),'property',v_offer.property_snapshot,'captor',v_offer.captor_snapshot,'partner',v_neg.partner_snapshot,'terms',to_jsonb(v_term)-'created_at' || jsonb_build_object('responsibilities',coalesce((select jsonb_object_agg(r.responsibility_key,r.responsible_party) from public.property_partnership_responsibilities r where r.term_version_id=v_term.id),'{}'::jsonb)),'legal_notice','Minuta operacional sujeita à formalização e assinatura eletrônica avançada ou superior no SGR/COFECI.');
  v_hash:=encode(extensions.digest(convert_to(v_payload::text,'UTF8'),'sha256'::text),'hex');
  insert into public.partnership_contract_versions(negotiation_id,term_version_id,version_number,captor_id,partner_id,captor_snapshot,partner_snapshot,property_snapshot,canonical_terms,canonical_sha256,original_sgr_contract_number,created_by) values(v_neg.id,v_term.id,v_number,v_offer.captor_id,v_neg.partner_id,v_offer.captor_snapshot,v_neg.partner_snapshot,v_offer.property_snapshot,v_payload,v_hash,trim(p_original_sgr_contract_number),v_uid) returning * into v_contract;
  insert into public.partnership_contract_events(contract_version_id,actor_id,event_type,details) values(v_contract.id,v_uid,'draft_created',jsonb_build_object('canonical_sha256',v_hash,'version_number',v_number)); return jsonb_build_object('contract_id',v_contract.id,'version_number',v_number,'canonical_sha256',v_hash,'status',v_contract.status);
end; $$;
revoke all on function public.create_partnership_contract_draft(uuid,integer,text) from public,anon;
grant execute on function public.create_partnership_contract_draft(uuid,integer,text) to authenticated;

-- Mantém a assinatura original da RPC e remove apenas a trava global de quantidade.
create or replace function public.respond_property_partnership_negotiation(
  p_negotiation_id uuid,
  p_expected_version integer,
  p_decision text,
  p_counter_terms jsonb default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid(); v_decision text := lower(trim(coalesce(p_decision,'')));
  v_negotiation public.property_partnership_negotiations%rowtype;
  v_offer public.property_partnership_offers%rowtype;
  v_current public.property_partnership_term_versions%rowtype;
  v_next public.property_partnership_term_versions%rowtype;
  v_notify uuid; v_actor_name text;
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
    if v_offer.partner_limit is not null and (select count(*) from public.property_partnership_negotiations where offer_id=v_offer.id and status='preliminarily_accepted') >= v_offer.partner_limit then raise exception 'Partner limit reached'; end if;
    update public.property_partnership_negotiations set status='preliminarily_accepted',accepted_version_id=v_current.id,responded_at=now(),preliminary_accepted_at=now(),updated_at=now() where id=v_negotiation.id;
    insert into public.property_partnership_events(offer_id,negotiation_id,term_version_id,actor_id,event_type) values(v_offer.id,v_negotiation.id,v_current.id,v_uid,'preliminarily_accepted');
  elsif v_decision='decline' then
    update public.property_partnership_negotiations set status='declined',responded_at=now(),updated_at=now() where id=v_negotiation.id;
    insert into public.property_partnership_events(offer_id,negotiation_id,term_version_id,actor_id,event_type) values(v_offer.id,v_negotiation.id,v_current.id,v_uid,'declined');
  else
    perform public.validate_partnership_terms(p_counter_terms);
    v_next := public.insert_partnership_term_version(v_negotiation.id,v_uid,'counteroffer',p_counter_terms,v_current.id);
    update public.property_partnership_negotiations set status='countered',current_version_id=v_next.id,responded_at=now(),updated_at=now() where id=v_negotiation.id;
    insert into public.property_partnership_events(offer_id,negotiation_id,term_version_id,actor_id,event_type) values(v_offer.id,v_negotiation.id,v_next.id,v_uid,'counteroffer_sent');
  end if;
  insert into public.notifications(user_id,type,title,message,link,data) values(v_notify,'system_alert'::public.notification_type,case v_decision when 'accept' then 'Oferta aceita preliminarmente' when 'decline' then 'Oferta de parceria recusada' else 'Nova contraproposta recebida' end,coalesce(v_actor_name,'O profissional') || ' respondeu à negociação de parceria.','/meus-imoveis',jsonb_build_object('scope','property_partnership_offer','negotiation_id',v_negotiation.id,'decision',v_decision));
  return jsonb_build_object('negotiation_id',v_negotiation.id,'decision',v_decision,'version_number',coalesce(v_next.version_number,v_current.version_number));
end; $$;
revoke all on function public.respond_property_partnership_negotiation(uuid,integer,text,jsonb) from public,anon;
grant execute on function public.respond_property_partnership_negotiation(uuid,integer,text,jsonb) to authenticated;

-- A sobrecarga transitória não faz parte da API pública; remova-a caso já exista.
drop function if exists public.respond_property_partnership_negotiation(uuid,text,jsonb);
