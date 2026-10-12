begin;

-- Fase 3: orquestração contratual com assinatura avançada e registro externos no SGR.
-- O Web Imóveis não coleta biometria nem declara o aceite interno como assinatura eletrônica.

create table if not exists public.partnership_contract_versions (
  id uuid primary key default gen_random_uuid(),
  negotiation_id uuid not null references public.property_partnership_negotiations(id) on delete restrict,
  term_version_id uuid not null references public.property_partnership_term_versions(id) on delete restrict,
  version_number integer not null check (version_number > 0),
  status text not null default 'awaiting_acknowledgements' check (status in (
    'awaiting_acknowledgements','awaiting_sgr','awaiting_verification','verified','rejected','superseded'
  )),
  captor_id uuid references public.profiles(id) on delete set null,
  partner_id uuid references public.profiles(id) on delete set null,
  captor_snapshot jsonb not null,
  partner_snapshot jsonb not null,
  property_snapshot jsonb not null,
  canonical_terms jsonb not null,
  canonical_sha256 text not null check (canonical_sha256 ~ '^[0-9a-f]{64}$'),
  original_sgr_contract_number text not null check (char_length(trim(original_sgr_contract_number)) between 3 and 120),
  declaration_version integer not null default 1,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  verified_at timestamptz,
  rejected_at timestamptz,
  unique (negotiation_id, version_number),
  unique (canonical_sha256)
);

create table if not exists public.partnership_contract_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  contract_version_id uuid not null references public.partnership_contract_versions(id) on delete restrict,
  party_role text not null check (party_role in ('captor','partner')),
  profile_id uuid references public.profiles(id) on delete set null,
  profile_snapshot jsonb not null,
  declaration_version integer not null default 1,
  terms_sha256 text not null check (terms_sha256 ~ '^[0-9a-f]{64}$'),
  aal text not null check (aal = 'aal2'),
  acknowledged_at timestamptz not null default now(),
  unique (contract_version_id, party_role)
);

create table if not exists public.partnership_contract_documents (
  id uuid primary key default gen_random_uuid(),
  contract_version_id uuid not null references public.partnership_contract_versions(id) on delete restrict,
  document_kind text not null check (document_kind in ('signed_contract','sgr_receipt')),
  storage_path text not null unique,
  original_name text not null check (char_length(original_name) between 1 and 255),
  mime_type text not null check (mime_type in ('application/pdf','image/jpeg','image/png')),
  size_bytes bigint not null check (size_bytes between 1 and 15728640),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  uploaded_by uuid references public.profiles(id) on delete set null,
  uploaded_by_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  check (document_kind <> 'signed_contract' or mime_type = 'application/pdf')
);

create table if not exists public.partnership_sgr_submissions (
  id uuid primary key default gen_random_uuid(),
  contract_version_id uuid not null references public.partnership_contract_versions(id) on delete restrict,
  party_role text not null check (party_role in ('captor','partner')),
  profile_id uuid references public.profiles(id) on delete set null,
  profile_snapshot jsonb not null,
  sgr_contract_number text not null check (char_length(trim(sgr_contract_number)) between 3 and 120),
  cf_ledger_hash text not null check (char_length(trim(cf_ledger_hash)) between 8 and 300),
  blockchain_hash text check (blockchain_hash is null or char_length(trim(blockchain_hash)) between 8 and 300),
  verification_url text check (verification_url is null or verification_url ~ '^https://sgr\.cofeci\.gov\.br/'),
  declaration_version integer not null default 1,
  submission_version integer not null check (submission_version > 0),
  submitted_at timestamptz not null default now(),
  unique (contract_version_id, party_role, submission_version)
);

create table if not exists public.partnership_contract_document_reviews (
  id uuid primary key default gen_random_uuid(),
  contract_version_id uuid not null references public.partnership_contract_versions(id) on delete restrict,
  document_id uuid not null references public.partnership_contract_documents(id) on delete restrict,
  decision text not null check (decision in ('verified','rejected')),
  note text not null check (char_length(trim(note)) between 10 and 2000),
  administrator_id uuid references public.profiles(id) on delete set null,
  administrator_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  unique (contract_version_id, document_id)
);

create table if not exists public.property_partnerships (
  id uuid primary key default gen_random_uuid(),
  negotiation_id uuid not null unique references public.property_partnership_negotiations(id) on delete restrict,
  offer_id uuid not null references public.property_partnership_offers(id) on delete restrict,
  contract_version_id uuid not null unique references public.partnership_contract_versions(id) on delete restrict,
  property_id uuid references public.properties(id) on delete set null,
  captor_id uuid references public.profiles(id) on delete set null,
  partner_id uuid references public.profiles(id) on delete set null,
  property_snapshot jsonb not null,
  captor_snapshot jsonb not null,
  partner_snapshot jsonb not null,
  status text not null default 'active' check (status in ('active','suspended','expired','ended','disputed')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  suspended_at timestamptz,
  ended_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.partnership_contract_events (
  id uuid primary key default gen_random_uuid(),
  contract_version_id uuid not null references public.partnership_contract_versions(id) on delete restrict,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null check (event_type in (
    'draft_created','terms_acknowledged','document_registered','sgr_submitted',
    'awaiting_verification','verified','rejected','superseded'
  )),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists partnership_contract_versions_negotiation on public.partnership_contract_versions(negotiation_id,version_number desc);
create index if not exists partnership_contract_documents_contract on public.partnership_contract_documents(contract_version_id,document_kind,created_at desc);
create index if not exists partnership_contract_events_contract on public.partnership_contract_events(contract_version_id,created_at desc);
create index if not exists property_partnerships_property on public.property_partnerships(property_id,status);
create index if not exists property_partnerships_partner on public.property_partnerships(partner_id,status);

do $$
declare v_constraint text;
begin
  select conname into v_constraint
  from pg_catalog.pg_constraint
  where conrelid='public.property_partnership_negotiations'::regclass
    and contype='c'
    and pg_get_constraintdef(oid) like '%awaiting_contract%';
  if v_constraint is not null then
    execute format('alter table public.property_partnership_negotiations drop constraint %I',v_constraint);
  end if;
  alter table public.property_partnership_negotiations
    add constraint property_partnership_negotiations_status_check
    check (status in ('proposed','countered','preliminarily_accepted','declined','cancelled','awaiting_contract','active'));
end $$;

alter table public.partnership_contract_versions enable row level security;
alter table public.partnership_contract_acknowledgements enable row level security;
alter table public.partnership_contract_documents enable row level security;
alter table public.partnership_sgr_submissions enable row level security;
alter table public.partnership_contract_document_reviews enable row level security;
alter table public.property_partnerships enable row level security;
alter table public.partnership_contract_events enable row level security;

revoke all on public.partnership_contract_versions from public, anon, authenticated;
revoke all on public.partnership_contract_acknowledgements from public, anon, authenticated;
revoke all on public.partnership_contract_documents from public, anon, authenticated;
revoke all on public.partnership_sgr_submissions from public, anon, authenticated;
revoke all on public.partnership_contract_document_reviews from public, anon, authenticated;
revoke all on public.property_partnerships from public, anon, authenticated;
revoke all on public.partnership_contract_events from public, anon, authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('partnership-contracts','partnership-contracts',false,15728640,array['application/pdf','image/jpeg','image/png'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create or replace function public.can_access_partnership_contract(p_contract_id uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select public.is_admin() or exists(
    select 1 from public.partnership_contract_versions c
    where c.id=p_contract_id and auth.uid() in (c.captor_id,c.partner_id)
  );
$$;
revoke all on function public.can_access_partnership_contract(uuid) from public, anon;
grant execute on function public.can_access_partnership_contract(uuid) to authenticated;

create or replace function public.can_access_partnership_contract_path(p_contract_id text)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select public.is_admin() or exists(
    select 1 from public.partnership_contract_versions c
    where c.id::text=p_contract_id and auth.uid() in (c.captor_id,c.partner_id)
  );
$$;
revoke all on function public.can_access_partnership_contract_path(text) from public, anon;
grant execute on function public.can_access_partnership_contract_path(text) to authenticated;

drop policy if exists "contract parties read private documents" on storage.objects;
create policy "contract parties read private documents" on storage.objects for select to authenticated
using(bucket_id='partnership-contracts' and public.can_access_partnership_contract_path((storage.foldername(name))[1]));
drop policy if exists "contract parties upload private documents" on storage.objects;
create policy "contract parties upload private documents" on storage.objects for insert to authenticated
with check(
  bucket_id='partnership-contracts'
  and (storage.foldername(name))[2]=auth.uid()::text
  and public.can_access_partnership_contract_path((storage.foldername(name))[1])
  and public.has_satisfied_mfa()
);
drop policy if exists "contract uploaders remove unregistered documents" on storage.objects;
create policy "contract uploaders remove unregistered documents" on storage.objects for delete to authenticated
using(
  bucket_id='partnership-contracts'
  and (storage.foldername(name))[2]=auth.uid()::text
  and not exists(select 1 from public.partnership_contract_documents d where d.storage_path=name)
  and public.has_satisfied_mfa()
);

create or replace function public.create_partnership_contract_draft(
  p_negotiation_id uuid,
  p_expected_term_version integer,
  p_original_sgr_contract_number text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_uid uuid:=auth.uid();
  v_neg public.property_partnership_negotiations%rowtype;
  v_offer public.property_partnership_offers%rowtype;
  v_term public.property_partnership_term_versions%rowtype;
  v_contract public.partnership_contract_versions%rowtype;
  v_number integer;
  v_payload jsonb;
  v_hash text;
begin
  perform public.require_partnership_aal2();
  select * into v_neg from public.property_partnership_negotiations where id=p_negotiation_id for update;
  if not found or v_neg.status<>'preliminarily_accepted' or v_neg.accepted_version_id is null then raise exception 'Preliminarily accepted negotiation required'; end if;
  select * into v_offer from public.property_partnership_offers where id=v_neg.offer_id for update;
  if not found or v_offer.captor_id<>v_uid or v_offer.status<>'open' then raise exception 'Captor access required'; end if;
  select * into v_term from public.property_partnership_term_versions where id=v_neg.accepted_version_id;
  if not found or v_term.version_number<>p_expected_term_version then raise exception 'Accepted terms version changed'; end if;
  if char_length(trim(coalesce(p_original_sgr_contract_number,''))) not between 3 and 120 then raise exception 'Original SGR contract number required'; end if;

  update public.partnership_contract_versions set status='superseded'
  where negotiation_id=v_neg.id and status in ('awaiting_acknowledgements','awaiting_sgr','rejected');
  insert into public.partnership_contract_events(contract_version_id,actor_id,event_type)
  select id,v_uid,'superseded' from public.partnership_contract_versions
  where negotiation_id=v_neg.id and status='superseded'
    and not exists(select 1 from public.partnership_contract_events e where e.contract_version_id=partnership_contract_versions.id and e.event_type='superseded');

  select coalesce(max(version_number),0)+1 into v_number from public.partnership_contract_versions where negotiation_id=v_neg.id;
  v_payload:=jsonb_build_object(
    'schema_version',1,'negotiation_id',v_neg.id,'term_version_id',v_term.id,'term_version_number',v_term.version_number,
    'original_sgr_contract_number',trim(p_original_sgr_contract_number),
    'property',v_offer.property_snapshot,'captor',v_offer.captor_snapshot,'partner',v_neg.partner_snapshot,
    'terms',to_jsonb(v_term)-'created_at' || jsonb_build_object('responsibilities',coalesce((select jsonb_object_agg(r.responsibility_key,r.responsible_party) from public.property_partnership_responsibilities r where r.term_version_id=v_term.id),'{}'::jsonb)),
    'legal_notice','Minuta operacional sujeita à formalização e assinatura eletrônica avançada ou superior no SGR/COFECI.'
  );
  v_hash:=encode(digest(convert_to(v_payload::text,'UTF8'),'sha256'),'hex');
  insert into public.partnership_contract_versions(
    negotiation_id,term_version_id,version_number,captor_id,partner_id,captor_snapshot,partner_snapshot,
    property_snapshot,canonical_terms,canonical_sha256,original_sgr_contract_number,created_by
  ) values(v_neg.id,v_term.id,v_number,v_offer.captor_id,v_neg.partner_id,v_offer.captor_snapshot,v_neg.partner_snapshot,
    v_offer.property_snapshot,v_payload,v_hash,trim(p_original_sgr_contract_number),v_uid)
  returning * into v_contract;
  insert into public.partnership_contract_events(contract_version_id,actor_id,event_type,details)
  values(v_contract.id,v_uid,'draft_created',jsonb_build_object('canonical_sha256',v_hash,'version_number',v_number));
  return jsonb_build_object('contract_id',v_contract.id,'version_number',v_number,'canonical_sha256',v_hash,'status',v_contract.status);
end;
$$;
revoke all on function public.create_partnership_contract_draft(uuid,integer,text) from public,anon;
grant execute on function public.create_partnership_contract_draft(uuid,integer,text) to authenticated;

create or replace function public.acknowledge_partnership_contract(p_contract_id uuid,p_expected_sha256 text)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_uid uuid:=auth.uid(); v_contract public.partnership_contract_versions%rowtype; v_role text; v_snapshot jsonb; v_count integer;
begin
  perform public.require_partnership_aal2();
  select * into v_contract from public.partnership_contract_versions where id=p_contract_id for update;
  if not found or v_contract.status not in ('awaiting_acknowledgements','awaiting_sgr') then raise exception 'Contract is not awaiting acknowledgement'; end if;
  if v_contract.canonical_sha256<>lower(trim(coalesce(p_expected_sha256,''))) then raise exception 'Contract hash mismatch'; end if;
  if v_uid=v_contract.captor_id then v_role:='captor';v_snapshot:=v_contract.captor_snapshot;
  elsif v_uid=v_contract.partner_id then v_role:='partner';v_snapshot:=v_contract.partner_snapshot;
  else raise exception 'Contract access denied'; end if;
  insert into public.partnership_contract_acknowledgements(contract_version_id,party_role,profile_id,profile_snapshot,terms_sha256,aal)
  values(v_contract.id,v_role,v_uid,v_snapshot,v_contract.canonical_sha256,'aal2') on conflict(contract_version_id,party_role) do nothing;
  if not found then raise exception 'Contract already acknowledged'; end if;
  insert into public.partnership_contract_events(contract_version_id,actor_id,event_type,details)
  values(v_contract.id,v_uid,'terms_acknowledged',jsonb_build_object('party_role',v_role,'terms_sha256',v_contract.canonical_sha256));
  select count(*) into v_count from public.partnership_contract_acknowledgements where contract_version_id=v_contract.id;
  if v_count=2 then update public.partnership_contract_versions set status='awaiting_sgr' where id=v_contract.id; end if;
  return jsonb_build_object('contract_id',v_contract.id,'party_role',v_role,'acknowledgements',v_count,'status',case when v_count=2 then 'awaiting_sgr' else v_contract.status end);
end;
$$;
revoke all on function public.acknowledge_partnership_contract(uuid,text) from public,anon;
grant execute on function public.acknowledge_partnership_contract(uuid,text) to authenticated;

create or replace function public.register_partnership_contract_document(
  p_contract_id uuid,p_document_kind text,p_storage_path text,p_original_name text,p_mime_type text,p_size_bytes bigint,p_sha256 text
)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare v_uid uuid:=auth.uid();v_contract public.partnership_contract_versions%rowtype;v_id uuid;v_snapshot jsonb;
begin
  perform public.require_partnership_aal2();
  select * into v_contract from public.partnership_contract_versions where id=p_contract_id for update;
  if not found or v_uid not in(v_contract.captor_id,v_contract.partner_id) or v_contract.status not in('awaiting_sgr','awaiting_verification') then raise exception 'Contract document access denied'; end if;
  if p_document_kind not in('signed_contract','sgr_receipt') then raise exception 'Invalid document kind'; end if;
  if p_mime_type not in('application/pdf','image/jpeg','image/png') or (p_document_kind='signed_contract' and p_mime_type<>'application/pdf') then raise exception 'Invalid document type'; end if;
  if p_size_bytes not between 1 and 15728640 or lower(trim(p_sha256))!~'^[0-9a-f]{64}$' then raise exception 'Invalid document metadata'; end if;
  if p_storage_path!~('^'||v_contract.id::text||'/'||v_uid::text||'/[0-9a-f-]+\.(pdf|jpg|png)$') then raise exception 'Invalid storage path'; end if;
  if not exists(select 1 from storage.objects where bucket_id='partnership-contracts' and name=p_storage_path) then raise exception 'Uploaded document not found'; end if;
  select jsonb_build_object('profile_id',p.id,'name',p.name,'creci',p.creci,'creci_uf',p.creci_uf) into v_snapshot from public.profiles p where p.id=v_uid;
  insert into public.partnership_contract_documents(contract_version_id,document_kind,storage_path,original_name,mime_type,size_bytes,sha256,uploaded_by,uploaded_by_snapshot)
  values(v_contract.id,p_document_kind,p_storage_path,left(p_original_name,255),p_mime_type,p_size_bytes,lower(trim(p_sha256)),v_uid,v_snapshot) returning id into v_id;
  insert into public.partnership_contract_events(contract_version_id,actor_id,event_type,details)
  values(v_contract.id,v_uid,'document_registered',jsonb_build_object('document_id',v_id,'document_kind',p_document_kind,'sha256',lower(trim(p_sha256))));
  return v_id;
end;
$$;
revoke all on function public.register_partnership_contract_document(uuid,text,text,text,text,bigint,text) from public,anon;
grant execute on function public.register_partnership_contract_document(uuid,text,text,text,text,bigint,text) to authenticated;

create or replace function public.submit_partnership_sgr_evidence(
  p_contract_id uuid,p_sgr_contract_number text,p_cf_ledger_hash text,p_blockchain_hash text default null,p_verification_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare v_uid uuid:=auth.uid();v_contract public.partnership_contract_versions%rowtype;v_role text;v_snapshot jsonb;v_count integer;v_distinct integer;v_submission_version integer;
begin
  perform public.require_partnership_aal2();
  select * into v_contract from public.partnership_contract_versions where id=p_contract_id for update;
  if not found or v_contract.status not in('awaiting_sgr','awaiting_verification') then raise exception 'Contract is not awaiting SGR evidence'; end if;
  if v_uid=v_contract.captor_id then v_role:='captor';v_snapshot:=v_contract.captor_snapshot;
  elsif v_uid=v_contract.partner_id then v_role:='partner';v_snapshot:=v_contract.partner_snapshot;
  else raise exception 'Contract access denied'; end if;
  if not exists(select 1 from public.partnership_contract_acknowledgements where contract_version_id=v_contract.id and party_role=v_role) then raise exception 'Acknowledge terms first'; end if;
  if char_length(trim(coalesce(p_sgr_contract_number,''))) not between 3 and 120 or char_length(trim(coalesce(p_cf_ledger_hash,''))) not between 8 and 300 then raise exception 'Invalid SGR evidence'; end if;
  if p_verification_url is not null and p_verification_url!~'^https://sgr\.cofeci\.gov\.br/' then raise exception 'Invalid SGR verification URL'; end if;
  if not exists(select 1 from public.partnership_contract_documents where contract_version_id=v_contract.id and document_kind='signed_contract')
     or not exists(select 1 from public.partnership_contract_documents where contract_version_id=v_contract.id and document_kind='sgr_receipt') then raise exception 'Signed contract and SGR receipt required'; end if;
  select coalesce(max(submission_version),0)+1 into v_submission_version
  from public.partnership_sgr_submissions where contract_version_id=v_contract.id and party_role=v_role;
  insert into public.partnership_sgr_submissions(contract_version_id,party_role,profile_id,profile_snapshot,sgr_contract_number,cf_ledger_hash,blockchain_hash,verification_url,submission_version)
  values(v_contract.id,v_role,v_uid,v_snapshot,trim(p_sgr_contract_number),trim(p_cf_ledger_hash),nullif(trim(coalesce(p_blockchain_hash,'')),''),nullif(trim(coalesce(p_verification_url,'')),''),v_submission_version);
  insert into public.partnership_contract_events(contract_version_id,actor_id,event_type,details)
  values(v_contract.id,v_uid,'sgr_submitted',jsonb_build_object('party_role',v_role,'submission_version',v_submission_version));
  with latest as (
    select distinct on (party_role) party_role,sgr_contract_number,cf_ledger_hash,blockchain_hash
    from public.partnership_sgr_submissions where contract_version_id=v_contract.id
    order by party_role,submission_version desc
  )
  select count(*),count(distinct lower(sgr_contract_number)||'|'||lower(cf_ledger_hash)||'|'||lower(coalesce(blockchain_hash,'')))
  into v_count,v_distinct from latest;
  if v_count=2 and v_distinct=1 then
    update public.partnership_contract_versions set status='awaiting_verification' where id=v_contract.id;
    insert into public.partnership_contract_events(contract_version_id,actor_id,event_type) values(v_contract.id,v_uid,'awaiting_verification');
  end if;
  return jsonb_build_object('contract_id',v_contract.id,'party_role',v_role,'submissions',v_count,'matching',v_count=2 and v_distinct=1,'status',case when v_count=2 and v_distinct=1 then 'awaiting_verification' else 'awaiting_sgr' end);
end;
$$;
revoke all on function public.submit_partnership_sgr_evidence(uuid,text,text,text,text) from public,anon;
grant execute on function public.submit_partnership_sgr_evidence(uuid,text,text,text,text) to authenticated;

create or replace function public.get_partnership_contract_workspace(p_negotiation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare v_uid uuid:=auth.uid();v_neg public.property_partnership_negotiations%rowtype;v_offer public.property_partnership_offers%rowtype;v_contract public.partnership_contract_versions%rowtype;v_role text;
begin
  select * into v_neg from public.property_partnership_negotiations where id=p_negotiation_id;
  if not found then raise exception 'Negotiation not found'; end if;
  select * into v_offer from public.property_partnership_offers where id=v_neg.offer_id;
  if v_uid=v_offer.captor_id then v_role:='captor'; elsif v_uid=v_neg.partner_id then v_role:='partner'; elsif public.is_admin() then v_role:='administrator'; else raise exception 'Contract access denied'; end if;
  select * into v_contract from public.partnership_contract_versions
  where negotiation_id=v_neg.id order by version_number desc limit 1;
  return jsonb_build_object(
    'negotiation_id',v_neg.id,'negotiation_status',v_neg.status,'party_role',v_role,
    'accepted_term_version',case when v_neg.accepted_version_id is null then null else (select version_number from public.property_partnership_term_versions where id=v_neg.accepted_version_id) end,
    'contract',case when v_contract.id is null then null else jsonb_build_object(
      'id',v_contract.id,'version_number',v_contract.version_number,'status',v_contract.status,
      'canonical_sha256',v_contract.canonical_sha256,'original_sgr_contract_number',v_contract.original_sgr_contract_number,
      'canonical_terms',v_contract.canonical_terms,'created_at',v_contract.created_at
    ) end,
    'acknowledgements',coalesce((select jsonb_agg(jsonb_build_object('party_role',a.party_role,'acknowledged_at',a.acknowledged_at,'terms_sha256',a.terms_sha256) order by a.acknowledged_at) from public.partnership_contract_acknowledgements a where a.contract_version_id=v_contract.id),'[]'::jsonb),
    'documents',coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'document_kind',d.document_kind,'storage_path',d.storage_path,'original_name',d.original_name,'mime_type',d.mime_type,'size_bytes',d.size_bytes,'sha256',d.sha256,'created_at',d.created_at) order by d.created_at) from public.partnership_contract_documents d where d.contract_version_id=v_contract.id),'[]'::jsonb),
    'sgr_submissions',coalesce((select jsonb_agg(jsonb_build_object('party_role',s.party_role,'submission_version',s.submission_version,'sgr_contract_number',s.sgr_contract_number,'cf_ledger_hash',s.cf_ledger_hash,'blockchain_hash',s.blockchain_hash,'verification_url',s.verification_url,'submitted_at',s.submitted_at)) from (select distinct on (party_role) * from public.partnership_sgr_submissions where contract_version_id=v_contract.id order by party_role,submission_version desc) s),'[]'::jsonb),
    'review',case when v_contract.id is null then null else (select jsonb_build_object('decision',r.decision,'note',r.note,'created_at',r.created_at) from public.partnership_contract_document_reviews r where r.contract_version_id=v_contract.id order by r.created_at desc limit 1) end
  );
end;
$$;
revoke all on function public.get_partnership_contract_workspace(uuid) from public,anon;
grant execute on function public.get_partnership_contract_workspace(uuid) to authenticated;

create or replace function public.review_partnership_contract(
  p_contract_id uuid,p_expected_status text,p_decision text,p_note text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare v_uid uuid:=auth.uid();v_contract public.partnership_contract_versions%rowtype;v_neg public.property_partnership_negotiations%rowtype;v_offer public.property_partnership_offers%rowtype;v_decision text:=lower(trim(coalesce(p_decision,'')));v_partnership_id uuid;
begin
  if not public.is_admin() then raise exception 'Administrative access required'; end if;
  perform public.require_partnership_aal2();
  if v_decision not in('verified','rejected') or char_length(trim(coalesce(p_note,'')))<10 then raise exception 'Decision and justification required'; end if;
  select * into v_contract from public.partnership_contract_versions where id=p_contract_id for update;
  if not found or v_contract.status<>p_expected_status or v_contract.status<>'awaiting_verification' then raise exception 'Contract review changed'; end if;
  select * into v_neg from public.property_partnership_negotiations where id=v_contract.negotiation_id for update;
  select * into v_offer from public.property_partnership_offers where id=v_neg.offer_id for update;
  if v_decision='verified' then
    if (select count(*) from public.partnership_contract_acknowledgements where contract_version_id=v_contract.id)<>2
       or (select count(*) from (select distinct on (party_role) party_role from public.partnership_sgr_submissions where contract_version_id=v_contract.id order by party_role,submission_version desc) latest)<>2
       or (select count(distinct lower(sgr_contract_number)||'|'||lower(cf_ledger_hash)||'|'||lower(coalesce(blockchain_hash,''))) from (select distinct on (party_role) party_role,sgr_contract_number,cf_ledger_hash,blockchain_hash from public.partnership_sgr_submissions where contract_version_id=v_contract.id order by party_role,submission_version desc) latest)<>1
       or not exists(select 1 from public.partnership_contract_documents where contract_version_id=v_contract.id and document_kind='signed_contract')
       or not exists(select 1 from public.partnership_contract_documents where contract_version_id=v_contract.id and document_kind='sgr_receipt') then raise exception 'Incomplete contract evidence'; end if;
    if v_offer.property_id is null or not exists(select 1 from public.properties where id=v_offer.property_id and status='active') then raise exception 'Property must be active'; end if;
    if not public.is_eligible_sp_partnership_professional(v_offer.captor_id) or not public.is_eligible_sp_partnership_professional(v_neg.partner_id) then raise exception 'Parties are no longer eligible'; end if;
    update public.partnership_contract_versions set status='verified',verified_at=now() where id=v_contract.id;
    insert into public.partnership_contract_document_reviews(contract_version_id,document_id,decision,note,administrator_id,administrator_snapshot)
    select v_contract.id,d.id,'verified',trim(p_note),v_uid,
      jsonb_build_object('profile_id',p.id,'name',p.name,'email',p.email)
    from public.partnership_contract_documents d
    join public.profiles p on p.id=v_uid
    where d.contract_version_id=v_contract.id;
    update public.property_partnership_negotiations set status='active',updated_at=now() where id=v_neg.id;
    insert into public.property_partnerships(negotiation_id,offer_id,contract_version_id,property_id,captor_id,partner_id,property_snapshot,captor_snapshot,partner_snapshot)
    values(v_neg.id,v_offer.id,v_contract.id,v_offer.property_id,v_offer.captor_id,v_neg.partner_id,v_offer.property_snapshot,v_offer.captor_snapshot,v_neg.partner_snapshot)
    on conflict(negotiation_id) do update set contract_version_id=excluded.contract_version_id,status='active',starts_at=now(),ends_at=null,suspended_at=null,ended_at=null,updated_at=now()
    returning id into v_partnership_id;
  else
    update public.partnership_contract_versions set status='rejected',rejected_at=now() where id=v_contract.id;
    insert into public.partnership_contract_document_reviews(contract_version_id,document_id,decision,note,administrator_id,administrator_snapshot)
    select v_contract.id,d.id,'rejected',trim(p_note),v_uid,
      jsonb_build_object('profile_id',p.id,'name',p.name,'email',p.email)
    from public.partnership_contract_documents d
    join public.profiles p on p.id=v_uid
    where d.contract_version_id=v_contract.id;
  end if;
  insert into public.partnership_contract_events(contract_version_id,actor_id,event_type,details)
  values(v_contract.id,v_uid,v_decision,jsonb_build_object('note',trim(p_note),'partnership_id',v_partnership_id));
  insert into public.notifications(user_id,type,title,message,link,data)
  select party_id,'system_alert'::public.notification_type,
    case when v_decision='verified' then 'Contrato de parceria verificado' else 'Contrato de parceria requer correção' end,
    case when v_decision='verified' then 'As evidências do SGR foram conferidas e a parceria operacional foi ativada.' else 'A conferência encontrou uma pendência. Consulte a justificativa e envie uma nova versão.' end,
    '/meus-imoveis',jsonb_build_object('scope','partnership_contract_review','contract_id',v_contract.id,'decision',v_decision,'note',trim(p_note))
  from unnest(array[v_contract.captor_id,v_contract.partner_id]) party_id where party_id is not null;
  return jsonb_build_object('contract_id',v_contract.id,'decision',v_decision,'partnership_id',v_partnership_id);
end;
$$;
revoke all on function public.review_partnership_contract(uuid,text,text,text) from public,anon;
grant execute on function public.review_partnership_contract(uuid,text,text,text) to authenticated;

create or replace function public.prevent_contract_evidence_mutation()
returns trigger language plpgsql set search_path='' as $$begin raise exception 'Contract evidence is immutable';end;$$;
revoke all on function public.prevent_contract_evidence_mutation() from public,anon,authenticated;
drop trigger if exists prevent_contract_acknowledgement_mutation on public.partnership_contract_acknowledgements;
create trigger prevent_contract_acknowledgement_mutation before update or delete on public.partnership_contract_acknowledgements for each row execute function public.prevent_contract_evidence_mutation();
drop trigger if exists prevent_contract_document_mutation on public.partnership_contract_documents;
create trigger prevent_contract_document_mutation before update or delete on public.partnership_contract_documents for each row execute function public.prevent_contract_evidence_mutation();
drop trigger if exists prevent_contract_sgr_submission_mutation on public.partnership_sgr_submissions;
create trigger prevent_contract_sgr_submission_mutation before update or delete on public.partnership_sgr_submissions for each row execute function public.prevent_contract_evidence_mutation();
drop trigger if exists prevent_contract_document_review_mutation on public.partnership_contract_document_reviews;
create trigger prevent_contract_document_review_mutation before update or delete on public.partnership_contract_document_reviews for each row execute function public.prevent_contract_evidence_mutation();
drop trigger if exists prevent_contract_event_mutation on public.partnership_contract_events;
create trigger prevent_contract_event_mutation before update or delete on public.partnership_contract_events for each row execute function public.prevent_contract_evidence_mutation();

create or replace function public.protect_partnership_contract_version()
returns trigger language plpgsql set search_path='' as $$
begin
  if new.negotiation_id<>old.negotiation_id or new.term_version_id<>old.term_version_id or new.version_number<>old.version_number
    or new.captor_id is distinct from old.captor_id or new.partner_id is distinct from old.partner_id
    or new.captor_snapshot<>old.captor_snapshot or new.partner_snapshot<>old.partner_snapshot
    or new.property_snapshot<>old.property_snapshot or new.canonical_terms<>old.canonical_terms
    or new.canonical_sha256<>old.canonical_sha256 or new.original_sgr_contract_number<>old.original_sgr_contract_number
    or new.declaration_version<>old.declaration_version or new.created_by is distinct from old.created_by or new.created_at<>old.created_at then
    raise exception 'Canonical contract data is immutable';
  end if;
  return new;
end;
$$;
revoke all on function public.protect_partnership_contract_version() from public,anon,authenticated;
drop trigger if exists protect_partnership_contract_version on public.partnership_contract_versions;
create trigger protect_partnership_contract_version before update on public.partnership_contract_versions for each row execute function public.protect_partnership_contract_version();

notify pgrst,'reload schema';
commit;
