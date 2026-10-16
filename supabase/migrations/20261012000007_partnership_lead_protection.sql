begin;

-- Fase 5: atribuição imutável, divulgação progressiva e auditoria de leads.

create table if not exists public.partnership_lead_attributions (
  id uuid primary key default gen_random_uuid(),
  partnership_id uuid not null references public.property_partnerships(id) on delete restrict,
  contract_version_id uuid not null references public.partnership_contract_versions(id) on delete restrict,
  lead_id uuid not null references public.leads(id) on delete restrict,
  contact_event_id uuid not null unique references public.lead_contact_events(id) on delete restrict,
  property_id uuid references public.properties(id) on delete set null,
  captor_id uuid references public.profiles(id) on delete set null,
  partner_id uuid references public.profiles(id) on delete set null,
  buyer_id uuid references public.profiles(id) on delete set null,
  captor_snapshot jsonb not null,
  partner_snapshot jsonb not null,
  property_snapshot jsonb not null,
  origin_snapshot jsonb not null,
  contact_fingerprint text not null check (contact_fingerprint~'^[0-9a-f]{64}$'),
  attributed_at timestamptz not null default now()
);

create table if not exists public.partnership_lead_access_requests (
  id uuid primary key default gen_random_uuid(),
  attribution_id uuid not null references public.partnership_lead_attributions(id) on delete restrict,
  requested_by uuid references public.profiles(id) on delete set null,
  requested_fields text[] not null,
  purpose text not null check (char_length(trim(purpose)) between 10 and 1000),
  status text not null default 'pending' check(status in('pending','approved','rejected','revoked')),
  decided_by uuid references public.profiles(id) on delete set null,
  decision_reason text,
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  unique(attribution_id,requested_by,status)
);

create table if not exists public.partnership_lead_access_audit (
  id uuid primary key default gen_random_uuid(),
  attribution_id uuid not null references public.partnership_lead_attributions(id) on delete restrict,
  request_id uuid references public.partnership_lead_access_requests(id) on delete restrict,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_snapshot jsonb not null,
  action text not null check(action in('summary_viewed','access_requested','access_approved','access_rejected','details_viewed','access_revoked','duplicate_flagged')),
  fields text[] not null default '{}',
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists partnership_lead_attributions_captor on public.partnership_lead_attributions(captor_id,attributed_at desc);
create index if not exists partnership_lead_attributions_partner on public.partnership_lead_attributions(partner_id,attributed_at desc);
create index if not exists partnership_lead_fingerprint on public.partnership_lead_attributions(contact_fingerprint,attributed_at desc);
alter table public.partnership_lead_attributions enable row level security;
alter table public.partnership_lead_access_requests enable row level security;
alter table public.partnership_lead_access_audit enable row level security;
revoke all on public.partnership_lead_attributions from public,anon,authenticated;
revoke all on public.partnership_lead_access_requests from public,anon,authenticated;
revoke all on public.partnership_lead_access_audit from public,anon,authenticated;

drop function if exists public.submit_property_contact(uuid,text,text,text,text,text);
create function public.submit_property_contact(
  p_property_id uuid,p_name text,p_email text default null,p_phone text default null,
  p_message text default null,p_origin text default 'portal_form',p_partnership_id uuid default null
) returns table(lead_id uuid,conversation_id uuid,created_lead boolean)
language plpgsql security definer set search_path='' as $$
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
$$;
revoke all on function public.submit_property_contact(uuid,text,text,text,text,text,uuid) from public,anon;
grant execute on function public.submit_property_contact(uuid,text,text,text,text,text,uuid) to authenticated;

create or replace function public.get_my_partnership_lead_summaries(p_limit integer default 50,p_offset integer default 0)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_result jsonb;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select coalesce(jsonb_agg(row_data order by row_data->>'attributed_at' desc),'[]'::jsonb) into v_result from(
    select jsonb_build_object('attribution_id',a.id,'property',a.property_snapshot,'partner',a.partner_snapshot,'origin',a.origin_snapshot,'attributed_at',a.attributed_at,'duplicate_possible',exists(select 1 from public.partnership_lead_attributions d where d.contact_fingerprint=a.contact_fingerprint and d.id<>a.id),'access_status',coalesce((select r.status from public.partnership_lead_access_requests r where r.attribution_id=a.id and r.requested_by=v_uid order by r.requested_at desc limit 1),'not_requested'),'access_request_id',(select r.id from public.partnership_lead_access_requests r where r.attribution_id=a.id and r.requested_by=v_uid order by r.requested_at desc limit 1)) row_data
    from public.partnership_lead_attributions a where a.captor_id=v_uid order by a.attributed_at desc limit least(greatest(p_limit,1),50) offset greatest(p_offset,0)
  ) rows;
  insert into public.partnership_lead_access_audit(attribution_id,actor_id,actor_snapshot,action)
  select a.id,v_uid,jsonb_build_object('profile_id',p.id,'name',p.name,'creci',p.creci),'summary_viewed' from public.partnership_lead_attributions a join public.profiles p on p.id=v_uid where a.captor_id=v_uid order by a.attributed_at desc limit least(greatest(p_limit,1),50) offset greatest(p_offset,0);
  return v_result;
end;
$$;
revoke all on function public.get_my_partnership_lead_summaries(integer,integer) from public,anon;
grant execute on function public.get_my_partnership_lead_summaries(integer,integer) to authenticated;

create or replace function public.get_my_partnership_lead_access_requests()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_result jsonb;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('request_id',r.id,'attribution_id',a.id,'status',r.status,'requested_fields',r.requested_fields,'purpose',r.purpose,'requested_at',r.requested_at,'captor',a.captor_snapshot,'property',a.property_snapshot) order by r.requested_at desc),'[]'::jsonb) into v_result
  from public.partnership_lead_access_requests r join public.partnership_lead_attributions a on a.id=r.attribution_id
  where a.partner_id=v_uid and r.status='pending';
  return v_result;
end;
$$;
revoke all on function public.get_my_partnership_lead_access_requests() from public,anon;
grant execute on function public.get_my_partnership_lead_access_requests() to authenticated;

create or replace function public.request_partnership_lead_access(p_attribution_id uuid,p_fields text[],p_purpose text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_attr public.partnership_lead_attributions%rowtype;v_id uuid;v_fields text[];v_snapshot jsonb;
begin
  perform public.require_partnership_aal2();
  select * into v_attr from public.partnership_lead_attributions where id=p_attribution_id;
  if not found or v_attr.captor_id<>v_uid then raise exception 'Captor attribution access required'; end if;
  if char_length(trim(coalesce(p_purpose,''))) not between 10 and 1000 then raise exception 'Access purpose required'; end if;
  select array_agg(distinct f order by f) into v_fields from unnest(coalesce(p_fields,'{}')) f where f in('name','email','phone','message');
  if coalesce(array_length(v_fields,1),0)=0 then raise exception 'Select at least one permitted field'; end if;
  if exists(select 1 from public.partnership_lead_access_requests where attribution_id=v_attr.id and requested_by=v_uid and status='pending') then raise exception 'Access request already pending'; end if;
  insert into public.partnership_lead_access_requests(attribution_id,requested_by,requested_fields,purpose) values(v_attr.id,v_uid,v_fields,trim(p_purpose)) returning id into v_id;
  select jsonb_build_object('profile_id',p.id,'name',p.name,'creci',p.creci) into v_snapshot from public.profiles p where p.id=v_uid;
  insert into public.partnership_lead_access_audit(attribution_id,request_id,actor_id,actor_snapshot,action,fields,details) values(v_attr.id,v_id,v_uid,v_snapshot,'access_requested',v_fields,jsonb_build_object('purpose',trim(p_purpose)));
  insert into public.notifications(user_id,type,title,message,link,data) values(v_attr.partner_id,'system_alert'::public.notification_type,'Solicitação de acesso a dados de lead','O captador solicitou acesso justificado a dados de um contato originado no seu portal.','/crm',jsonb_build_object('scope','partnership_lead_access','request_id',v_id,'attribution_id',v_attr.id));
  return v_id;
end;
$$;
revoke all on function public.request_partnership_lead_access(uuid,text[],text) from public,anon;
grant execute on function public.request_partnership_lead_access(uuid,text[],text) to authenticated;

create or replace function public.decide_partnership_lead_access(p_request_id uuid,p_approve boolean,p_reason text)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_request public.partnership_lead_access_requests%rowtype;v_attr public.partnership_lead_attributions%rowtype;v_snapshot jsonb;
begin
  perform public.require_partnership_aal2();
  if char_length(trim(coalesce(p_reason,''))) not between 10 and 1000 then raise exception 'Decision reason required'; end if;
  select * into v_request from public.partnership_lead_access_requests where id=p_request_id for update;
  if not found or v_request.status<>'pending' then raise exception 'Pending access request not found'; end if;
  select * into v_attr from public.partnership_lead_attributions where id=v_request.attribution_id;
  if v_attr.partner_id<>v_uid then raise exception 'Partner decision access required'; end if;
  update public.partnership_lead_access_requests set status=case when p_approve then 'approved' else 'rejected' end,decided_by=v_uid,decision_reason=trim(p_reason),decided_at=now() where id=v_request.id;
  select jsonb_build_object('profile_id',p.id,'name',p.name,'creci',p.creci) into v_snapshot from public.profiles p where p.id=v_uid;
  insert into public.partnership_lead_access_audit(attribution_id,request_id,actor_id,actor_snapshot,action,fields,details) values(v_attr.id,v_request.id,v_uid,v_snapshot,case when p_approve then 'access_approved' else 'access_rejected' end,v_request.requested_fields,jsonb_build_object('reason',trim(p_reason)));
  insert into public.notifications(user_id,type,title,message,link,data) values(v_attr.captor_id,'system_alert'::public.notification_type,case when p_approve then 'Acesso a dados autorizado' else 'Acesso a dados não autorizado' end,'A solicitação de acesso ao contato recebeu uma decisão. Consulte o CRM para ver os detalhes.','/crm',jsonb_build_object('scope','partnership_lead_access_decision','request_id',v_request.id,'approved',p_approve));
  return true;
end;
$$;
revoke all on function public.decide_partnership_lead_access(uuid,boolean,text) from public,anon;
grant execute on function public.decide_partnership_lead_access(uuid,boolean,text) to authenticated;

create or replace function public.get_authorized_partnership_lead_details(p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_request public.partnership_lead_access_requests%rowtype;v_attr public.partnership_lead_attributions%rowtype;v_lead public.leads%rowtype;v_result jsonb:='{}'::jsonb;v_snapshot jsonb;
begin
  perform public.require_partnership_aal2();
  select * into v_request from public.partnership_lead_access_requests where id=p_request_id and status='approved';
  if not found or v_request.requested_by<>v_uid then raise exception 'Approved access request required'; end if;
  select * into v_attr from public.partnership_lead_attributions where id=v_request.attribution_id;
  if v_attr.captor_id<>v_uid then raise exception 'Captor attribution access required'; end if;
  select * into v_lead from public.leads where id=v_attr.lead_id;
  if 'name'=any(v_request.requested_fields) then v_result:=v_result||jsonb_build_object('name',v_lead.name);end if;
  if 'email'=any(v_request.requested_fields) then v_result:=v_result||jsonb_build_object('email',v_lead.email);end if;
  if 'phone'=any(v_request.requested_fields) then v_result:=v_result||jsonb_build_object('phone',v_lead.phone);end if;
  if 'message'=any(v_request.requested_fields) then v_result:=v_result||jsonb_build_object('message',v_lead.message);end if;
  select jsonb_build_object('profile_id',p.id,'name',p.name,'creci',p.creci) into v_snapshot from public.profiles p where p.id=v_uid;
  insert into public.partnership_lead_access_audit(attribution_id,request_id,actor_id,actor_snapshot,action,fields) values(v_attr.id,v_request.id,v_uid,v_snapshot,'details_viewed',v_request.requested_fields);
  return v_result||jsonb_build_object('attribution_id',v_attr.id,'request_id',v_request.id);
end;
$$;
revoke all on function public.get_authorized_partnership_lead_details(uuid) from public,anon;
grant execute on function public.get_authorized_partnership_lead_details(uuid) to authenticated;

create or replace function public.prevent_partnership_lead_evidence_mutation()
returns trigger language plpgsql set search_path='' as $$begin raise exception 'Partnership lead evidence is immutable';end;$$;
revoke all on function public.prevent_partnership_lead_evidence_mutation() from public,anon,authenticated;
drop trigger if exists prevent_partnership_lead_attribution_mutation on public.partnership_lead_attributions;
create trigger prevent_partnership_lead_attribution_mutation before update or delete on public.partnership_lead_attributions for each row execute function public.prevent_partnership_lead_evidence_mutation();
drop trigger if exists prevent_partnership_lead_audit_mutation on public.partnership_lead_access_audit;
create trigger prevent_partnership_lead_audit_mutation before update or delete on public.partnership_lead_access_audit for each row execute function public.prevent_partnership_lead_evidence_mutation();

notify pgrst,'reload schema';
commit;
