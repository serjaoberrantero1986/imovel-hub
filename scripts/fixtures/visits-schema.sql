-- Espelho mínimo dos tipos/colunas reais para testes isolados, sem conexão a produção.
create role anon; create role authenticated; create role service_role;
create schema auth; create schema extensions;
create extension pgcrypto with schema extensions;
create type public.notification_type as enum ('system_alert');
create table public.portal_settings(id text primary key,owner_profile_id uuid,identity jsonb,subdomain_slug text);
create function auth.uid() returns uuid language sql stable as $$select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$;
create function auth.jwt() returns jsonb language sql stable as $$select nullif(current_setting('request.jwt.claims',true),'')::jsonb$$;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  property_id uuid,
  advertiser_id uuid,
  buyer_id uuid,
  name text,
  email text,
  phone text,
  message text,
  status text,
  created_at timestamptz default now(),
  updated_at timestamptz,
  origin text,
  contact_key text
);
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid,
  sender_id uuid,
  content text,
  created_at timestamptz default now(),
  read_at timestamptz
);
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  email text,
  name text,
  phone text,
  whatsapp text,
  avatar_url text,
  role text,
  creci text,
  creci_uf text,
  agency_name text,
  agency_logo text,
  city text,
  state text,
  bio text,
  website text,
  instagram text,
  linkedin text,
  verified bool,
  created_at timestamptz default now(),
  updated_at timestamptz,
  creci_status text,
  creci_type text,
  creci_verified_at timestamptz,
  creci_protocol text,
  available_weekend_visits bool,
  settings jsonb,
  creci_review_status text,
  creci_reviewed_at timestamptz,
  creci_review_expires_at timestamptz,
  account_deletion_requested_at timestamptz,
  is_active bool
);
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  code text,
  user_id uuid,
  title text,
  slug text,
  description text,
  purpose text,
  type varchar,
  status text,
  featured bool,
  is_exclusive bool,
  price numeric,
  condo_fee numeric,
  iptu_fee numeric,
  total_area numeric,
  useful_area numeric,
  bedrooms int2,
  suites int2,
  bathrooms int2,
  parking_spots int2,
  floor int2,
  total_floors int2,
  video_url text,
  tour_360_url text,
  views_count int4,
  leads_count int4,
  favorites_count int4,
  shares_count int4,
  created_at timestamptz default now(),
  updated_at timestamptz,
  built_area numeric
);
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid,
  buyer_id uuid,
  advertiser_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz,
  last_message_text text,
  last_message_at timestamptz,
  buyer_unread_count int4,
  advertiser_unread_count int4,
  is_archived_buyer bool,
  is_archived_advertiser bool,
  is_deleted_buyer bool,
  is_deleted_advertiser bool,
  deleted_at_buyer timestamptz,
  deleted_at_advertiser timestamptz
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  type notification_type,
  title varchar,
  message text,
  link text,
  data jsonb,
  read bool,
  read_at timestamptz,
  created_at timestamptz default now()
);
create table public.property_locations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid,
  zip_code text,
  street text,
  street_number text,
  complement text,
  neighborhood text,
  city text,
  state text,
  country text,
  latitude numeric,
  longitude numeric,
  hide_exact_address bool,
  created_at timestamptz default now(),
  updated_at timestamptz,
  coordinate_quality text
);
create table public.lead_contact_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid,
  property_id uuid,
  conversation_id uuid,
  message text,
  origin text,
  created_at timestamptz default now()
);
create table public.property_partnerships (
  id uuid primary key default gen_random_uuid(),
  negotiation_id uuid,
  offer_id uuid,
  contract_version_id uuid,
  property_id uuid,
  captor_id uuid,
  partner_id uuid,
  property_snapshot jsonb,
  captor_snapshot jsonb,
  partner_snapshot jsonb,
  status text,
  starts_at timestamptz,
  ends_at timestamptz,
  suspended_at timestamptz,
  ended_at timestamptz,
  updated_at timestamptz,
  termination_requested_by uuid,
  termination_requested_at timestamptz,
  termination_reason text,
  status_reason text
);
create table public.partnership_contract_versions (
  id uuid primary key default gen_random_uuid(),
  negotiation_id uuid,
  term_version_id uuid,
  version_number int4,
  status text,
  captor_id uuid,
  partner_id uuid,
  captor_snapshot jsonb,
  partner_snapshot jsonb,
  property_snapshot jsonb,
  canonical_terms jsonb,
  canonical_sha256 text,
  original_sgr_contract_number text,
  declaration_version int4,
  created_by uuid,
  created_at timestamptz default now(),
  verified_at timestamptz,
  rejected_at timestamptz,
  portfolio_agreement_id uuid,
  instrument_kind text
);
create table public.partnership_lead_attributions (
  id uuid primary key default gen_random_uuid(),
  partnership_id uuid,
  contract_version_id uuid,
  lead_id uuid,
  contact_event_id uuid,
  property_id uuid,
  captor_id uuid,
  partner_id uuid,
  buyer_id uuid,
  captor_snapshot jsonb,
  partner_snapshot jsonb,
  property_snapshot jsonb,
  origin_snapshot jsonb,
  contact_fingerprint text,
  attributed_at timestamptz
);
create unique index test_lead_contact_key on public.leads(advertiser_id,contact_key) where contact_key is not null;
CREATE OR REPLACE FUNCTION public.submit_property_contact(p_property_id uuid, p_name text, p_email text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_message text DEFAULT NULL::text, p_origin text DEFAULT 'portal_form'::text, p_partnership_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(lead_id uuid, conversation_id uuid, created_lead boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_advertiser_id uuid;v_captor_id uuid;v_buyer_id uuid:=auth.uid();v_lead_id uuid;v_conversation_id uuid;v_contact_event_id uuid;
  v_contact_key text;v_name text;v_email text;v_phone text;v_message text;v_created boolean:=false;
  v_partnership public.property_partnerships%rowtype;v_fingerprint text;
begin
  if p_property_id is null then raise exception 'Property is required'; end if;
  select p.user_id into v_captor_id from public.properties p where p.id=p_property_id and p.status='active';
  if v_captor_id is null then raise exception 'Active property not found'; end if;
  v_advertiser_id:=v_captor_id;
  if p_partnership_id is not null then
    select * into v_partnership from public.property_partnerships pp where pp.id=p_partnership_id and pp.property_id=p_property_id and pp.status='active' and (pp.ends_at is null or pp.ends_at>now());
    if not found or not exists(select 1 from public.partnership_contract_versions cv where cv.id=v_partnership.contract_version_id and cv.status='verified' and coalesce((cv.canonical_terms#>>'{terms,allow_partner_portal}')::boolean,false)) then raise exception 'Active portal partnership not found'; end if;
    if not public.is_eligible_sp_partnership_professional(v_partnership.captor_id) or not public.is_eligible_sp_partnership_professional(v_partnership.partner_id) then raise exception 'Partnership professionals are not eligible'; end if;
    v_advertiser_id:=v_partnership.partner_id;
  end if;
  v_name:=left(trim(coalesce(p_name,'')),150);v_email:=nullif(lower(trim(coalesce(p_email,''))),'');v_phone:=nullif(regexp_replace(coalesce(p_phone,''),'[^0-9]','','g'),'');v_message:=left(trim(coalesce(p_message,'')),4000);
  if v_name='' then raise exception 'Name is required'; end if;
  if v_email is not null and v_email!~'^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'Invalid email'; end if;
  if v_phone is not null and length(v_phone)<10 then raise exception 'Invalid phone'; end if;
  if v_email is null and v_phone is null then raise exception 'A contact channel is required'; end if;
  if v_message='' then raise exception 'Message is required'; end if;
  if p_origin not in('portal_form','schedule_visit') then raise exception 'Invalid contact origin'; end if;
  if v_buyer_id is not null then
    select pr.name,lower(nullif(trim(pr.email),'')),nullif(regexp_replace(coalesce(pr.whatsapp,pr.phone,''),'[^0-9]','','g'),'') into v_name,v_email,v_phone from public.profiles pr where pr.id=v_buyer_id;
    if v_name is null or v_name='' then raise exception 'Buyer profile not found'; end if;
    if v_email is null and v_phone is null then raise exception 'Complete your profile with email or telephone before contacting an advertiser'; end if;
    v_contact_key:='account:'||v_buyer_id::text;
  elsif v_email is not null then v_contact_key:='email:'||encode(extensions.digest(v_email,'sha256'),'hex');
  else v_contact_key:='phone:'||encode(extensions.digest(v_phone,'sha256'),'hex'); end if;
  v_fingerprint:=encode(extensions.digest(coalesce(v_buyer_id::text,coalesce(v_email,v_phone)),'sha256'),'hex');
  select l.id into v_lead_id from public.leads l where l.advertiser_id=v_advertiser_id and (l.contact_key=v_contact_key or (v_buyer_id is not null and l.buyer_id=v_buyer_id) or (v_email is not null and lower(coalesce(l.email,''))=v_email) or (v_phone is not null and regexp_replace(coalesce(l.phone,''),'[^0-9]','','g')=v_phone)) order by l.created_at limit 1 for update;
  if v_lead_id is null then
    insert into public.leads(property_id,advertiser_id,buyer_id,name,email,phone,message,origin,status,contact_key)
    values(p_property_id,v_advertiser_id,v_buyer_id,v_name,v_email,v_phone,v_message,p_origin,'new',v_contact_key)
    on conflict(advertiser_id,contact_key) where contact_key is not null do update set buyer_id=coalesce(public.leads.buyer_id,excluded.buyer_id),email=coalesce(public.leads.email,excluded.email),phone=coalesce(public.leads.phone,excluded.phone),message=excluded.message,updated_at=now()
    returning id,(xmax=0) into v_lead_id,v_created;
  else update public.leads set buyer_id=coalesce(buyer_id,v_buyer_id),contact_key=v_contact_key,name=coalesce(nullif(name,''),v_name),email=coalesce(email,v_email),phone=coalesce(phone,v_phone),message=v_message,updated_at=now() where id=v_lead_id; end if;
  if v_buyer_id is not null then
    select c.id into v_conversation_id from public.conversations c where c.property_id=p_property_id and c.buyer_id=v_buyer_id and c.advertiser_id=v_advertiser_id order by c.created_at limit 1 for update;
    if v_conversation_id is null then insert into public.conversations(property_id,buyer_id,advertiser_id,last_message_text,last_message_at) values(p_property_id,v_buyer_id,v_advertiser_id,left(v_message,200),now()) returning id into v_conversation_id; end if;
    insert into public.messages(conversation_id,sender_id,content) values(v_conversation_id,v_buyer_id,v_message);
  end if;
  insert into public.lead_contact_events(lead_id,property_id,conversation_id,message,origin) values(v_lead_id,p_property_id,v_conversation_id,v_message,p_origin) returning id into v_contact_event_id;
  if p_partnership_id is not null then
    insert into public.partnership_lead_attributions(partnership_id,contract_version_id,lead_id,contact_event_id,property_id,captor_id,partner_id,buyer_id,captor_snapshot,partner_snapshot,property_snapshot,origin_snapshot,contact_fingerprint)
    values(v_partnership.id,v_partnership.contract_version_id,v_lead_id,v_contact_event_id,p_property_id,v_partnership.captor_id,v_partnership.partner_id,v_buyer_id,v_partnership.captor_snapshot,v_partnership.partner_snapshot,v_partnership.property_snapshot,jsonb_build_object('origin',p_origin,'partnership_status','active','contract_version_id',v_partnership.contract_version_id),v_fingerprint);
    insert into public.notifications(user_id,type,title,message,link,data) values(v_partnership.captor_id,'system_alert'::public.notification_type,'Novo interesse em imóvel compartilhado','Um parceiro recebeu um novo contato referente ao seu imóvel. Os dados pessoais permanecem protegidos até uma liberação justificada.','/crm',jsonb_build_object('scope','partnership_lead_summary','property_id',p_property_id,'partnership_id',v_partnership.id));
  end if;
  return query select v_lead_id,v_conversation_id,v_created;
end;
$function$
;
create function public.require_partnership_aal2() returns void language plpgsql set search_path='' as $$begin if auth.uid() is null or auth.jwt()->>'aal' is distinct from 'aal2' then raise exception 'AAL2 required'; end if; end;$$;
create function public.is_eligible_sp_partnership_professional(uuid) returns boolean language sql as $$ select true $$;
