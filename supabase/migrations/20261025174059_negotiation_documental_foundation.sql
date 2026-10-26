begin;

create table if not exists public.deal_dossiers (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null unique references public.leads(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  business_type text not null check (business_type in ('sale','rent','other')),
  status text not null default 'collecting' check (status in ('collecting','reviewing','ready_for_contract','contract_review','signing','completed','cancelled')),
  current_stage text not null default 'inherited_data',
  progress smallint not null default 10 check (progress between 0 and 100),
  inherited_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.deal_participants (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references public.deal_dossiers(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  role text not null check (role in ('owner','co_owner','buyer','tenant','spouse','guarantor','representative','captor','partner_broker','agency','other')),
  name text not null check (char_length(btrim(name)) between 2 and 160),
  email text,
  phone text,
  document_number text,
  is_primary boolean not null default false,
  status text not null default 'pending' check (status in ('pending','confirmed','documents_pending','documents_complete','inactive')),
  source text not null default 'manual' check (source in ('lead','property','profile','manual')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_deal_participant_profile_role
  on public.deal_participants(dossier_id, profile_id, role) where profile_id is not null;
create index if not exists idx_deal_participants_dossier on public.deal_participants(dossier_id, created_at);

create table if not exists public.deal_document_catalog (
  key text primary key,
  label text not null,
  description text not null,
  category text not null check (category in ('personal','property','certificate','financial','representation','business','other')),
  accepted_roles text[] not null default '{}',
  accepted_mime_types text[] not null default array['application/pdf','image/jpeg','image/png'],
  allows_multiple boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.deal_document_catalog(key,label,description,category,accepted_roles,allows_multiple,sort_order) values
  ('identity','RG ou CNH','Envie um documento oficial legível. Inclua frente e verso quando houver.','personal',array['owner','co_owner','buyer','tenant','spouse','guarantor','representative'],true,10),
  ('cpf','CPF','Envie o comprovante de inscrição no CPF quando o número não constar no documento de identidade.','personal',array['owner','co_owner','buyer','tenant','spouse','guarantor','representative'],false,20),
  ('address_proof','Comprovante de endereço','Envie um comprovante de endereço recente e legível.','personal',array['owner','co_owner','buyer','tenant','spouse','guarantor','representative'],false,30),
  ('birth_certificate','Certidão de nascimento','Envie a certidão atual disponível quando aplicável ao estado civil.','personal',array['owner','co_owner','buyer','tenant','spouse','guarantor'],false,40),
  ('marriage_certificate','Certidão de casamento','Envie a certidão de casamento legível e atualizada quando solicitada.','personal',array['owner','co_owner','buyer','tenant','spouse','guarantor'],false,50),
  ('prenuptial_agreement','Pacto antenupcial','Envie o pacto antenupcial e seu registro quando aplicável.','personal',array['owner','co_owner','buyer','tenant','spouse'],true,60),
  ('power_of_attorney','Procuração','Envie a procuração completa e eventuais certidões ou confirmações de vigência.','representation',array['representative','owner','co_owner','buyer','tenant'],true,70),
  ('bank_proof','Comprovante bancário','Envie comprovante de titularidade da conta, sem informar senha ou código de acesso.','financial',array['owner','co_owner','buyer','tenant'],false,80),
  ('property_registration','Matrícula do imóvel','Envie a certidão ou matrícula completa emitida pelo Registro de Imóveis.','property',array['owner','co_owner'],true,100),
  ('property_tax','IPTU ou cadastro municipal','Envie o espelho do IPTU ou documento equivalente do cadastro municipal.','property',array['owner','co_owner'],true,110),
  ('condominium_clearance','Declaração do condomínio','Envie declaração, demonstrativo ou documento solicitado sobre a situação condominial.','certificate',array['owner','co_owner'],true,120),
  ('custom','Outro documento','Use este item para um documento específico desta negociação.','other',array['owner','co_owner','buyer','tenant','spouse','guarantor','representative','other'],true,999)
on conflict (key) do update set label=excluded.label,description=excluded.description,category=excluded.category,
  accepted_roles=excluded.accepted_roles,accepted_mime_types=excluded.accepted_mime_types,
  allows_multiple=excluded.allows_multiple,active=true,sort_order=excluded.sort_order,updated_at=now();

create table if not exists public.deal_document_requests (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references public.deal_dossiers(id) on delete cascade,
  participant_id uuid not null references public.deal_participants(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft','sent','partially_received','received','expired','revoked','completed')),
  instructions text,
  token_hash text unique,
  token_expires_at timestamptz,
  sent_at timestamptz,
  last_accessed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_deal_document_requests_dossier on public.deal_document_requests(dossier_id, created_at desc);
create index if not exists idx_deal_document_requests_participant on public.deal_document_requests(participant_id, created_at desc);

create table if not exists public.deal_document_request_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.deal_document_requests(id) on delete cascade,
  catalog_key text references public.deal_document_catalog(key) on delete restrict,
  label text not null,
  description text not null default '',
  required boolean not null default true,
  allows_multiple boolean not null default false,
  status text not null default 'requested' check (status in ('requested','received','under_review','approved','correction_requested','expired','not_applicable')),
  decision_note text,
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_deal_document_items_request on public.deal_document_request_items(request_id, created_at);

create table if not exists public.deal_documents (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references public.deal_dossiers(id) on delete cascade,
  participant_id uuid not null references public.deal_participants(id) on delete restrict,
  request_item_id uuid not null references public.deal_document_request_items(id) on delete restrict,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null check (mime_type in ('application/pdf','image/jpeg','image/png')),
  file_size bigint not null check (file_size between 1 and 15728640),
  version integer not null check (version > 0),
  is_current boolean not null default true,
  uploaded_by_profile_id uuid references public.profiles(id) on delete set null,
  uploaded_via_request boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(request_item_id, version)
);

create unique index if not exists uq_deal_documents_current
  on public.deal_documents(request_item_id) where is_current;
create index if not exists idx_deal_documents_dossier on public.deal_documents(dossier_id, created_at desc);

create table if not exists public.deal_audit_events (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references public.deal_dossiers(id) on delete cascade,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  actor_label text not null,
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_deal_audit_dossier on public.deal_audit_events(dossier_id, created_at desc);

create or replace function public.owns_deal_dossier(p_dossier_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.deal_dossiers d where d.id=p_dossier_id and d.owner_id=auth.uid());
$$;
revoke all on function public.owns_deal_dossier(uuid) from public,anon;
grant execute on function public.owns_deal_dossier(uuid) to authenticated;

alter table public.deal_dossiers enable row level security;
alter table public.deal_participants enable row level security;
alter table public.deal_document_catalog enable row level security;
alter table public.deal_document_requests enable row level security;
alter table public.deal_document_request_items enable row level security;
alter table public.deal_documents enable row level security;
alter table public.deal_audit_events enable row level security;

revoke all on public.deal_dossiers,public.deal_participants,public.deal_document_catalog,
  public.deal_document_requests,public.deal_document_request_items,public.deal_documents,public.deal_audit_events
  from public,anon;
grant select,insert,update on public.deal_dossiers,public.deal_participants,public.deal_document_requests,
  public.deal_document_request_items,public.deal_documents to authenticated;
grant select on public.deal_document_catalog,public.deal_audit_events to authenticated;

create policy "owners manage deal dossiers" on public.deal_dossiers for all to authenticated
  using (owner_id=auth.uid() and public.has_satisfied_mfa())
  with check (owner_id=auth.uid() and public.has_satisfied_mfa());
create policy "owners manage deal participants" on public.deal_participants for all to authenticated
  using (public.owns_deal_dossier(dossier_id) and public.has_satisfied_mfa())
  with check (public.owns_deal_dossier(dossier_id) and created_by=auth.uid() and public.has_satisfied_mfa());
create policy "authenticated reads document catalog" on public.deal_document_catalog for select to authenticated using (active);
create policy "owners manage document requests" on public.deal_document_requests for all to authenticated
  using (public.owns_deal_dossier(dossier_id) and public.has_satisfied_mfa())
  with check (public.owns_deal_dossier(dossier_id) and requested_by=auth.uid() and public.has_satisfied_mfa());
create policy "owners manage document request items" on public.deal_document_request_items for all to authenticated
  using (exists(select 1 from public.deal_document_requests r where r.id=request_id and public.owns_deal_dossier(r.dossier_id)) and public.has_satisfied_mfa())
  with check (exists(select 1 from public.deal_document_requests r where r.id=request_id and public.owns_deal_dossier(r.dossier_id)) and public.has_satisfied_mfa());
create policy "owners manage deal documents" on public.deal_documents for all to authenticated
  using (public.owns_deal_dossier(dossier_id) and public.has_satisfied_mfa())
  with check (public.owns_deal_dossier(dossier_id) and public.has_satisfied_mfa());
create policy "owners read deal audit" on public.deal_audit_events for select to authenticated
  using (public.owns_deal_dossier(dossier_id) and public.has_satisfied_mfa());

create or replace function public.start_deal_dossier(p_lead_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_lead public.leads%rowtype; v_property public.properties%rowtype; v_location jsonb; v_dossier uuid;
begin
  if v_uid is null or not public.has_satisfied_mfa() then raise exception 'DEAL_AUTH_REQUIRED'; end if;
  select * into v_lead from public.leads where id=p_lead_id and advertiser_id=v_uid for update;
  if not found then raise exception 'DEAL_ACCESS_DENIED'; end if;
  if v_lead.status<>'documentation' then raise exception 'DEAL_STAGE_REQUIRED'; end if;
  select * into v_property from public.properties where id=v_lead.property_id;
  select to_jsonb(l)-array['latitude','longitude'] into v_location from public.property_locations l where l.property_id=v_lead.property_id limit 1;
  insert into public.deal_dossiers(lead_id,property_id,owner_id,business_type,inherited_snapshot)
  values(v_lead.id,v_lead.property_id,v_uid,case when v_property.purpose::text='rent' then 'rent' when v_property.purpose::text='sale' then 'sale' else 'other' end,
    jsonb_build_object('lead',jsonb_build_object('id',v_lead.id,'buyer_id',v_lead.buyer_id,'name',v_lead.name,'email',v_lead.email,'phone',v_lead.phone,'origin',v_lead.origin),
      'property',jsonb_build_object('id',v_property.id,'code',v_property.code,'title',v_property.title,'purpose',v_property.purpose,'type',v_property.type,'price',v_property.price,'total_area',v_property.total_area,'useful_area',v_property.useful_area,'built_area',v_property.built_area),
      'location',coalesce(v_location,'{}'::jsonb)))
  on conflict(lead_id) do update set updated_at=now()
  returning id into v_dossier;
  if nullif(btrim(v_lead.name),'') is not null and not exists(
    select 1 from public.deal_participants dp where dp.dossier_id=v_dossier and dp.is_primary
  ) then
    insert into public.deal_participants(dossier_id,profile_id,role,name,email,phone,is_primary,status,source,created_by)
    values(v_dossier,v_lead.buyer_id,case when v_property.purpose::text='rent' then 'tenant' else 'buyer' end,v_lead.name,v_lead.email,v_lead.phone,true,'confirmed','lead',v_uid)
    ;
  end if;
  if not exists(select 1 from public.deal_audit_events where dossier_id=v_dossier and event_type='dossier_started') then
    insert into public.deal_audit_events(dossier_id,actor_profile_id,actor_label,event_type,entity_type,entity_id,description)
    values(v_dossier,v_uid,'Profissional responsável','dossier_started','dossier',v_dossier,'Dossiê documental iniciado a partir do lead e do imóvel.');
  end if;
  return v_dossier;
end;$$;
revoke all on function public.start_deal_dossier(uuid) from public,anon;
grant execute on function public.start_deal_dossier(uuid) to authenticated;

create or replace function public.prepare_deal_document_request(
  p_actor uuid,
  p_participant_id uuid,
  p_items jsonb,
  p_instructions text default null,
  p_valid_days integer default 7
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_participant public.deal_participants%rowtype; v_dossier public.deal_dossiers%rowtype; v_request uuid; v_token text; v_item jsonb; v_catalog public.deal_document_catalog%rowtype; v_property_title text;
begin
  select * into v_participant from public.deal_participants where id=p_participant_id;
  if not found then raise exception 'DEAL_PARTICIPANT_NOT_FOUND'; end if;
  select * into v_dossier from public.deal_dossiers where id=v_participant.dossier_id and owner_id=p_actor;
  if not found then raise exception 'DEAL_ACCESS_DENIED'; end if;
  if nullif(btrim(coalesce(v_participant.email,'')),'') is null then raise exception 'DEAL_PARTICIPANT_EMAIL_REQUIRED'; end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'DEAL_DOCUMENTS_REQUIRED'; end if;
  if p_valid_days not between 1 and 30 then raise exception 'DEAL_INVALID_EXPIRY'; end if;
  v_token:=encode(extensions.gen_random_bytes(32),'hex');
  insert into public.deal_document_requests(dossier_id,participant_id,requested_by,status,instructions,token_hash,token_expires_at,sent_at)
  values(v_dossier.id,v_participant.id,p_actor,'draft',nullif(btrim(p_instructions),''),encode(extensions.digest(v_token,'sha256'),'hex'),now()+make_interval(days=>p_valid_days),null) returning id into v_request;
  for v_item in select value from jsonb_array_elements(p_items) loop
    select * into v_catalog from public.deal_document_catalog where key=v_item->>'key' and active;
    if not found then raise exception 'DEAL_DOCUMENT_INVALID'; end if;
    insert into public.deal_document_request_items(request_id,catalog_key,label,description,required,allows_multiple)
    values(v_request,v_catalog.key,v_catalog.label,v_catalog.description,coalesce((v_item->>'required')::boolean,true),v_catalog.allows_multiple);
  end loop;
  update public.deal_participants set status='documents_pending',updated_at=now() where id=v_participant.id;
  update public.deal_dossiers set current_stage='personal_documents',progress=greatest(progress,25),updated_at=now() where id=v_dossier.id;
  insert into public.deal_audit_events(dossier_id,actor_profile_id,actor_label,event_type,entity_type,entity_id,description,metadata)
  values(v_dossier.id,p_actor,'Profissional responsável','document_request_prepared','document_request',v_request,
    'Solicitação de documentos preparada para '||v_participant.name||'.',jsonb_build_object('participant_id',v_participant.id,'item_count',jsonb_array_length(p_items)));
  select p.title into v_property_title from public.properties p where p.id=v_dossier.property_id;
  return jsonb_build_object('request_id',v_request,'token',v_token,'expires_at',now()+make_interval(days=>p_valid_days),
    'recipient_name',v_participant.name,'recipient_email',v_participant.email,'property_title',coalesce(v_property_title,'Imóvel'));
end;$$;
revoke all on function public.prepare_deal_document_request(uuid,uuid,jsonb,text,integer) from public,anon,authenticated;
grant execute on function public.prepare_deal_document_request(uuid,uuid,jsonb,text,integer) to service_role;

create or replace function public.finish_deal_document_request_delivery(p_request_id uuid,p_sent boolean)
returns void language plpgsql security definer set search_path='' as $$
declare v_request public.deal_document_requests%rowtype; v_name text;
begin
  select * into v_request from public.deal_document_requests where id=p_request_id for update;
  if not found then raise exception 'DEAL_REQUEST_NOT_FOUND'; end if;
  update public.deal_document_requests set status=case when p_sent then 'sent' else 'draft' end,sent_at=case when p_sent then now() else null end,updated_at=now() where id=p_request_id;
  if p_sent then
    select name into v_name from public.deal_participants where id=v_request.participant_id;
    insert into public.deal_audit_events(dossier_id,actor_profile_id,actor_label,event_type,entity_type,entity_id,description)
    values(v_request.dossier_id,v_request.requested_by,'Profissional responsável','document_request_sent','document_request',v_request.id,'Solicitação de documentos enviada a '||coalesce(v_name,'participante')||'.');
  end if;
end;$$;
revoke all on function public.finish_deal_document_request_delivery(uuid,boolean) from public,anon,authenticated;
grant execute on function public.finish_deal_document_request_delivery(uuid,boolean) to service_role;

create or replace function public.get_public_deal_document_request(p_token text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_request public.deal_document_requests%rowtype; v_result jsonb;
begin
  if p_token is null or length(p_token)<>64 then raise exception 'DEAL_LINK_INVALID'; end if;
  select * into v_request from public.deal_document_requests where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') for update;
  if not found or v_request.status in ('revoked','completed') or v_request.token_expires_at<=now() then raise exception 'DEAL_LINK_INVALID'; end if;
  update public.deal_document_requests set last_accessed_at=now(),status=case when status='sent' then 'partially_received' else status end,updated_at=now() where id=v_request.id;
  select jsonb_build_object(
    'request_id',v_request.id,'dossier_id',v_request.dossier_id,'participant_id',v_request.participant_id,
    'instructions',v_request.instructions,'expires_at',v_request.token_expires_at,'status',v_request.status,
    'participant',jsonb_build_object('name',dp.name,'role',dp.role),
    'property',jsonb_build_object('title',coalesce(p.title,'Imóvel'),'code',coalesce(p.code,'')),
    'items',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'label',i.label,'description',i.description,'required',i.required,'allows_multiple',i.allows_multiple,'status',i.status,
      'files',coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'name',d.original_name,'mime_type',d.mime_type,'size',d.file_size,'version',d.version,'created_at',d.created_at) order by d.version desc) from public.deal_documents d where d.request_item_id=i.id),'[]'::jsonb)) order by i.created_at)
      from public.deal_document_request_items i where i.request_id=v_request.id),'[]'::jsonb)) into v_result
  from public.deal_participants dp join public.deal_dossiers dd on dd.id=v_request.dossier_id left join public.properties p on p.id=dd.property_id where dp.id=v_request.participant_id;
  return v_result;
end;$$;
revoke all on function public.get_public_deal_document_request(text) from public,anon,authenticated;
grant execute on function public.get_public_deal_document_request(text) to service_role;

create or replace function public.complete_public_deal_document_upload(
  p_token text,p_item_id uuid,p_storage_path text,p_original_name text,p_mime_type text,p_file_size bigint
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_request public.deal_document_requests%rowtype; v_item public.deal_document_request_items%rowtype; v_participant uuid; v_document uuid; v_version integer; v_remaining integer;
begin
  if p_token is null or length(p_token)<>64 then raise exception 'DEAL_LINK_INVALID'; end if;
  select * into v_request from public.deal_document_requests where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') for update;
  if not found or v_request.status in ('revoked','completed') or v_request.token_expires_at<=now() then raise exception 'DEAL_LINK_INVALID'; end if;
  select * into v_item from public.deal_document_request_items where id=p_item_id and request_id=v_request.id for update;
  if not found or v_item.status in ('approved','not_applicable') then raise exception 'DEAL_ITEM_INVALID'; end if;
  if p_mime_type not in ('application/pdf','image/jpeg','image/png') or p_file_size not between 1 and 15728640 then raise exception 'DEAL_FILE_INVALID'; end if;
  if p_storage_path not like v_request.dossier_id::text||'/'||p_item_id::text||'/%' then raise exception 'DEAL_FILE_INVALID'; end if;
  select coalesce(max(version),0)+1 into v_version from public.deal_documents where request_item_id=p_item_id;
  update public.deal_documents set is_current=false where request_item_id=p_item_id and is_current;
  insert into public.deal_documents(dossier_id,participant_id,request_item_id,storage_path,original_name,mime_type,file_size,version,is_current,uploaded_via_request)
  values(v_request.dossier_id,v_request.participant_id,p_item_id,p_storage_path,left(p_original_name,255),p_mime_type,p_file_size,v_version,true,true) returning id into v_document;
  update public.deal_document_request_items set status='received',decision_note=null,decided_by=null,decided_at=null,updated_at=now() where id=p_item_id;
  select count(*) into v_remaining from public.deal_document_request_items where request_id=v_request.id and required and status not in ('received','under_review','approved','not_applicable');
  update public.deal_document_requests set status=case when v_remaining=0 then 'received' else 'partially_received' end,updated_at=now() where id=v_request.id;
  update public.deal_participants set status=case when v_remaining=0 then 'documents_complete' else 'documents_pending' end,updated_at=now() where id=v_request.participant_id returning id into v_participant;
  insert into public.deal_audit_events(dossier_id,actor_label,event_type,entity_type,entity_id,description,metadata)
  values(v_request.dossier_id,'Participante externo','document_uploaded','document',v_document,'Documento enviado por link temporário.',jsonb_build_object('participant_id',v_participant,'request_item_id',p_item_id,'version',v_version));
  return v_document;
end;$$;
revoke all on function public.complete_public_deal_document_upload(text,uuid,text,text,text,bigint) from public,anon,authenticated;
grant execute on function public.complete_public_deal_document_upload(text,uuid,text,text,text,bigint) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('deal-documents','deal-documents',false,15728640,array['application/pdf','image/jpeg','image/png'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy "dossier owners upload deal documents" on storage.objects for insert to authenticated
  with check (bucket_id='deal-documents' and public.owns_deal_dossier(((storage.foldername(name))[1])::uuid));
create policy "dossier owners read deal documents" on storage.objects for select to authenticated
  using (bucket_id='deal-documents' and public.owns_deal_dossier(((storage.foldername(name))[1])::uuid));

notify pgrst,'reload schema';
commit;
