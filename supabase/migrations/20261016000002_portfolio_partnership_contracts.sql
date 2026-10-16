begin;

-- Um instrumento pode cobrir varias negociacoes dos mesmos profissionais.
-- Cada versao conserva o conjunto exato de imoveis e os contratos de origem.
create table if not exists public.partnership_portfolio_agreements (
  id uuid primary key default gen_random_uuid(),
  captor_id uuid not null references public.profiles(id) on delete restrict,
  partner_id uuid not null references public.profiles(id) on delete restrict,
  current_contract_id uuid references public.partnership_contract_versions(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (captor_id <> partner_id)
);
alter table public.partnership_portfolio_agreements enable row level security;
revoke all on public.partnership_portfolio_agreements from public,anon,authenticated;

alter table public.partnership_contract_versions
  add column if not exists portfolio_agreement_id uuid references public.partnership_portfolio_agreements(id) on delete restrict,
  add column if not exists instrument_kind text not null default 'individual'
    check (instrument_kind in ('individual','portfolio_contract','property_addendum','fee_replacement'));
create index if not exists partnership_contract_versions_portfolio
  on public.partnership_contract_versions(portfolio_agreement_id,created_at desc);

create or replace function public.protect_partnership_contract_version()
returns trigger language plpgsql set search_path='' as $$
begin
  if new.negotiation_id<>old.negotiation_id or new.term_version_id<>old.term_version_id or new.version_number<>old.version_number
    or new.captor_id is distinct from old.captor_id or new.partner_id is distinct from old.partner_id
    or new.captor_snapshot<>old.captor_snapshot or new.partner_snapshot<>old.partner_snapshot
    or new.property_snapshot<>old.property_snapshot or new.canonical_terms<>old.canonical_terms
    or new.canonical_sha256<>old.canonical_sha256 or new.original_sgr_contract_number<>old.original_sgr_contract_number
    or new.declaration_version<>old.declaration_version or new.created_by is distinct from old.created_by
    or new.created_at<>old.created_at or new.portfolio_agreement_id is distinct from old.portfolio_agreement_id
    or new.instrument_kind<>old.instrument_kind then
    raise exception 'Canonical contract data is immutable';
  end if;
  return new;
end;
$$;
revoke all on function public.protect_partnership_contract_version() from public,anon,authenticated;

create table if not exists public.partnership_contract_property_scope (
  contract_version_id uuid not null references public.partnership_contract_versions(id) on delete restrict,
  negotiation_id uuid not null references public.property_partnership_negotiations(id) on delete restrict,
  property_id uuid not null references public.properties(id) on delete restrict,
  offer_id uuid not null references public.property_partnership_offers(id) on delete restrict,
  original_sgr_contract_number text not null check (char_length(trim(original_sgr_contract_number)) between 3 and 120),
  property_snapshot jsonb not null,
  term_version_id uuid not null references public.property_partnership_term_versions(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (contract_version_id,negotiation_id),
  unique (contract_version_id,property_id)
);
create index if not exists partnership_contract_property_scope_negotiation
  on public.partnership_contract_property_scope(negotiation_id,contract_version_id);
alter table public.partnership_contract_property_scope enable row level security;
revoke all on public.partnership_contract_property_scope from public,anon,authenticated;

-- Nao ha contratos oficiais a migrar segundo o operador; ainda assim, preserve
-- qualquer versao ja criada, inclusive preliminar ou de teste, sem apagá-la.
insert into public.partnership_contract_property_scope(
  contract_version_id,negotiation_id,property_id,offer_id,original_sgr_contract_number,property_snapshot,term_version_id
)
select c.id,c.negotiation_id,o.property_id,o.id,c.original_sgr_contract_number,c.property_snapshot,c.term_version_id
from public.partnership_contract_versions c
join public.property_partnership_negotiations n on n.id=c.negotiation_id
join public.property_partnership_offers o on o.id=n.offer_id
where o.property_id is not null
on conflict (contract_version_id,negotiation_id) do nothing;

alter table public.property_partnerships
  drop constraint if exists property_partnerships_contract_version_id_key;
create index if not exists property_partnerships_contract_version
  on public.property_partnerships(contract_version_id);

create or replace function public.prevent_partnership_scope_mutation()
returns trigger language plpgsql set search_path='' as $$
begin raise exception 'Contract property scope is immutable'; end;
$$;
revoke all on function public.prevent_partnership_scope_mutation() from public,anon,authenticated;
drop trigger if exists prevent_partnership_scope_mutation on public.partnership_contract_property_scope;
create trigger prevent_partnership_scope_mutation before update or delete
on public.partnership_contract_property_scope for each row
execute function public.prevent_partnership_scope_mutation();

-- Contratos individuais criados depois desta migration tambem precisam de escopo.
create or replace function public.register_individual_contract_scope()
returns trigger language plpgsql set search_path='' as $$
declare v_offer public.property_partnership_offers%rowtype;
begin
  if new.instrument_kind<>'individual' then return new; end if;
  if exists(select 1 from public.partnership_contract_property_scope s
    join public.partnership_contract_versions c on c.id=s.contract_version_id
    where s.negotiation_id=new.negotiation_id and c.id<>new.id
      and c.status in ('awaiting_acknowledgements','awaiting_sgr','awaiting_verification','verified'))
    then raise exception 'Property already has a contract'; end if;
  select o.* into v_offer from public.property_partnership_negotiations n
    join public.property_partnership_offers o on o.id=n.offer_id
    where n.id=new.negotiation_id;
  if v_offer.property_id is null then raise exception 'Contract property not found'; end if;
  insert into public.partnership_contract_property_scope(
    contract_version_id,negotiation_id,property_id,offer_id,
    original_sgr_contract_number,property_snapshot,term_version_id)
  values(new.id,new.negotiation_id,v_offer.property_id,v_offer.id,
    new.original_sgr_contract_number,new.property_snapshot,new.term_version_id);
  return new;
end;
$$;
revoke all on function public.register_individual_contract_scope() from public,anon,authenticated;
drop trigger if exists register_individual_contract_scope on public.partnership_contract_versions;
create trigger register_individual_contract_scope after insert
on public.partnership_contract_versions for each row
execute function public.register_individual_contract_scope();

create or replace function public.get_portfolio_contract_candidates(p_negotiation_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_neg public.property_partnership_negotiations%rowtype;v_captor uuid;
begin
  select * into v_neg from public.property_partnership_negotiations where id=p_negotiation_id;
  if not found then raise exception 'Negotiation not found'; end if;
  select captor_id into v_captor from public.property_partnership_offers where id=v_neg.offer_id;
  if v_uid<>v_captor then raise exception 'Captor access required'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
    'negotiation_id',n.id,'property_id',o.property_id,'code',o.property_snapshot->>'code',
    'title',o.property_snapshot->>'title','version_number',t.version_number,
    'captor_share',t.captor_share,'partner_share',t.partner_share
  ) order by o.property_snapshot->>'code')
  from public.property_partnership_negotiations n
  join public.property_partnership_offers o on o.id=n.offer_id
  join public.property_partnership_term_versions t on t.id=n.accepted_version_id
  join public.properties p on p.id=o.property_id
  where o.captor_id=v_captor and n.partner_id=v_neg.partner_id
    and n.status='preliminarily_accepted' and o.status='open' and p.status='active'
    and not exists(select 1 from public.partnership_contract_property_scope s
      join public.partnership_contract_versions c on c.id=s.contract_version_id
      where s.negotiation_id=n.id and c.status in ('awaiting_acknowledgements','awaiting_sgr','awaiting_verification','verified'))
  ),'[]'::jsonb);
end;
$$;
revoke all on function public.get_portfolio_contract_candidates(uuid) from public,anon;
grant execute on function public.get_portfolio_contract_candidates(uuid) to authenticated;

-- Retorna apenas as clausulas compartilhadas; metadados de negociacao nao
-- interferem na comparacao entre imoveis do mesmo instrumento.
create or replace function public.partnership_shared_terms(p_term_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
  select (to_jsonb(t)-'id'-'negotiation_id'-'version_number'-'parent_version_id'
    -'proposed_by'-'proposed_by_snapshot'-'proposal_kind'-'created_at') ||
    jsonb_build_object('responsibilities',coalesce((select jsonb_object_agg(r.responsibility_key,r.responsible_party)
      from public.property_partnership_responsibilities r where r.term_version_id=t.id),'{}'::jsonb))
  from public.property_partnership_term_versions t where t.id=p_term_id;
$$;
revoke all on function public.partnership_shared_terms(uuid) from public,anon,authenticated;

create or replace function public.create_portfolio_partnership_contract_draft(
  p_anchor_negotiation_id uuid,p_expected_term_version integer,p_properties jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_uid uuid:=auth.uid();v_anchor public.property_partnership_negotiations%rowtype;
  v_offer public.property_partnership_offers%rowtype;v_term public.property_partnership_term_versions%rowtype;
  v_item jsonb;v_neg public.property_partnership_negotiations%rowtype;
  v_other_offer public.property_partnership_offers%rowtype;v_shared jsonb;v_scope jsonb:='[]'::jsonb;
  v_group_id uuid;v_contract public.partnership_contract_versions%rowtype;
  v_payload jsonb;v_hash text;v_number integer;v_source_number text;v_count integer:=0;
begin
  perform public.require_partnership_aal2();
  if jsonb_typeof(p_properties)<>'array' or jsonb_array_length(p_properties) not between 2 and 200 then
    raise exception 'Select between two and two hundred properties';
  end if;
  select * into v_anchor from public.property_partnership_negotiations
    where id=p_anchor_negotiation_id for update;
  if not found or v_anchor.status<>'preliminarily_accepted' then raise exception 'Preliminarily accepted negotiation required'; end if;
  select * into v_offer from public.property_partnership_offers where id=v_anchor.offer_id for update;
  if not found or v_offer.captor_id<>v_uid or v_offer.status<>'open' then raise exception 'Captor access required'; end if;
  select * into v_term from public.property_partnership_term_versions where id=v_anchor.accepted_version_id;
  if not found or v_term.version_number<>p_expected_term_version then raise exception 'Accepted terms version changed'; end if;
  v_shared:=public.partnership_shared_terms(v_term.id);

  -- Ordenacao deterministica: o hash cobre exatamente os imoveis selecionados.
  for v_item in select value from jsonb_array_elements(p_properties) value
    order by value->>'negotiation_id' loop
    v_count:=v_count+1;
    begin select * into v_neg from public.property_partnership_negotiations
      where id=(v_item->>'negotiation_id')::uuid for update;
    exception when invalid_text_representation then raise exception 'Invalid negotiation identifier'; end;
    if not found or v_neg.status<>'preliminarily_accepted' or v_neg.partner_id<>v_anchor.partner_id
       or v_neg.accepted_version_id is null then raise exception 'Selected negotiation is not eligible'; end if;
    select * into v_other_offer from public.property_partnership_offers where id=v_neg.offer_id for update;
    if not found or v_other_offer.captor_id<>v_uid or v_other_offer.status<>'open'
       or not exists(select 1 from public.properties p where p.id=v_other_offer.property_id and p.status='active')
       then raise exception 'Selected property is not eligible'; end if;
    if public.partnership_shared_terms(v_neg.accepted_version_id)<>v_shared then
      raise exception 'Selected properties must have the same accepted terms'; end if;
    if exists(select 1 from public.partnership_contract_property_scope s
      join public.partnership_contract_versions c on c.id=s.contract_version_id
      where s.negotiation_id=v_neg.id and c.status in ('awaiting_acknowledgements','awaiting_sgr','awaiting_verification','verified'))
      then raise exception 'Property already has a contract'; end if;
    if v_scope @> jsonb_build_array(jsonb_build_object('negotiation_id',v_neg.id)) then
      raise exception 'Duplicate property'; end if;
    v_source_number:=trim(coalesce(v_item->>'original_sgr_contract_number',''));
    if char_length(v_source_number) not between 3 and 120 then raise exception 'Original SGR contract number required'; end if;
    v_scope:=v_scope||jsonb_build_array(jsonb_build_object(
      'negotiation_id',v_neg.id,'offer_id',v_other_offer.id,'property_id',v_other_offer.property_id,
      'property',v_other_offer.property_snapshot,'original_sgr_contract_number',v_source_number,
      'term_version_id',v_neg.accepted_version_id));
  end loop;
  if not v_scope @> jsonb_build_array(jsonb_build_object('negotiation_id',v_anchor.id)) then
    raise exception 'Anchor negotiation must be selected'; end if;
  if not public.is_eligible_sp_partnership_professional(v_uid)
     or not public.is_eligible_sp_partnership_professional(v_anchor.partner_id) then
    raise exception 'Parties are no longer eligible'; end if;
  insert into public.partnership_portfolio_agreements(captor_id,partner_id)
    values(v_uid,v_anchor.partner_id) returning id into v_group_id;
  select coalesce(max(version_number),0)+1 into v_number
    from public.partnership_contract_versions where negotiation_id=v_anchor.id;
  v_payload:=jsonb_build_object('schema_version',2,'instrument_kind','portfolio_contract',
    'portfolio_agreement_id',v_group_id,'negotiation_id',v_anchor.id,
    'captor',v_offer.captor_snapshot,'partner',v_anchor.partner_snapshot,
    'properties',v_scope,'terms',v_shared,
    'legal_notice','Minuta operacional sujeita à assinatura eletrônica e à conferência do SGR/COFECI.');
  v_hash:=encode(extensions.digest(convert_to(v_payload::text,'UTF8'),'sha256'::text),'hex');
  insert into public.partnership_contract_versions(
    negotiation_id,term_version_id,version_number,captor_id,partner_id,captor_snapshot,partner_snapshot,
    property_snapshot,canonical_terms,canonical_sha256,original_sgr_contract_number,created_by,
    portfolio_agreement_id,instrument_kind)
  values(v_anchor.id,v_term.id,v_number,v_uid,v_anchor.partner_id,v_offer.captor_snapshot,v_anchor.partner_snapshot,
    v_scope,v_payload,v_hash,v_scope->0->>'original_sgr_contract_number',v_uid,v_group_id,'portfolio_contract')
  returning * into v_contract;
  insert into public.partnership_contract_property_scope(
    contract_version_id,negotiation_id,property_id,offer_id,original_sgr_contract_number,property_snapshot,term_version_id)
  select v_contract.id,(item->>'negotiation_id')::uuid,(item->>'property_id')::uuid,
    (item->>'offer_id')::uuid,item->>'original_sgr_contract_number',item->'property',
    (item->>'term_version_id')::uuid from jsonb_array_elements(v_scope) item;
  insert into public.partnership_contract_events(contract_version_id,actor_id,event_type,details)
  values(v_contract.id,v_uid,'draft_created',jsonb_build_object('canonical_sha256',v_hash,'property_count',v_count));
  return jsonb_build_object('contract_id',v_contract.id,'property_count',v_count,
    'canonical_sha256',v_hash,'status',v_contract.status);
end;
$$;
revoke all on function public.create_portfolio_partnership_contract_draft(uuid,integer,jsonb) from public,anon;
grant execute on function public.create_portfolio_partnership_contract_draft(uuid,integer,jsonb) to authenticated;

create or replace function public.create_portfolio_contract_revision(
  p_agreement_id uuid,p_expected_contract_id uuid,p_kind text,p_properties jsonb,p_terms jsonb default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_uid uuid:=auth.uid();v_group public.partnership_portfolio_agreements%rowtype;
  v_previous public.partnership_contract_versions%rowtype;
  v_neg public.property_partnership_negotiations%rowtype;
  v_offer public.property_partnership_offers%rowtype;
  v_item jsonb;v_scope jsonb:='[]'::jsonb;v_old_scope jsonb;
  v_shared jsonb;v_source_number text;v_contract public.partnership_contract_versions%rowtype;
  v_payload jsonb;v_hash text;v_number integer;v_count integer:=0;
begin
  perform public.require_partnership_aal2();
  if p_kind not in ('property_addendum','fee_replacement') then raise exception 'Invalid contract revision kind'; end if;
  if jsonb_typeof(p_properties)<>'array' or jsonb_array_length(p_properties) not between 1 and 200
    then raise exception 'Select between one and two hundred properties'; end if;
  select * into v_group from public.partnership_portfolio_agreements
    where id=p_agreement_id for update;
  if not found or v_group.captor_id<>v_uid or v_group.current_contract_id<>p_expected_contract_id
    then raise exception 'Portfolio contract changed'; end if;
  select * into v_previous from public.partnership_contract_versions
    where id=v_group.current_contract_id and status='verified';
  if not found then raise exception 'Verified portfolio contract required'; end if;
  if exists(select 1 from public.partnership_contract_versions
    where portfolio_agreement_id=v_group.id and status in
      ('awaiting_acknowledgements','awaiting_sgr','awaiting_verification'))
    then raise exception 'Another portfolio revision is in progress'; end if;
  v_old_scope:=coalesce((select jsonb_agg(jsonb_build_object(
    'negotiation_id',s.negotiation_id,'original_sgr_contract_number',s.original_sgr_contract_number)
    order by s.negotiation_id) from public.partnership_contract_property_scope s
    where s.contract_version_id=v_previous.id),'[]'::jsonb);
  v_shared:=v_previous.canonical_terms->'terms';
  if p_kind='fee_replacement' then
    perform public.validate_partnership_terms(p_terms);
    if (p_terms-'captor_share'-'partner_share')<>(v_shared-'captor_share'-'partner_share')
       or (p_terms->>'captor_share')::numeric=(v_shared->>'captor_share')::numeric
      then raise exception 'Fee replacement must change only the fee split'; end if;
    v_shared:=p_terms;
  elsif p_terms is not null and p_terms<>v_shared then
    raise exception 'Property addendum cannot change fees or other terms';
  end if;
  for v_item in select value from jsonb_array_elements(p_properties) value
    order by value->>'negotiation_id' loop
    v_count:=v_count+1;
    begin select * into v_neg from public.property_partnership_negotiations
      where id=(v_item->>'negotiation_id')::uuid for update;
    exception when invalid_text_representation then raise exception 'Invalid negotiation identifier'; end;
    if not found or v_neg.partner_id<>v_group.partner_id
       or v_neg.status not in ('active','preliminarily_accepted')
      then raise exception 'Selected negotiation is not eligible'; end if;
    select * into v_offer from public.property_partnership_offers where id=v_neg.offer_id for update;
    if not found or v_offer.captor_id<>v_uid or v_offer.status<>'open'
       or not exists(select 1 from public.properties p where p.id=v_offer.property_id and p.status='active')
      then raise exception 'Selected property is not eligible'; end if;
    if v_scope @> jsonb_build_array(jsonb_build_object('negotiation_id',v_neg.id))
      then raise exception 'Duplicate property'; end if;
    v_source_number:=trim(coalesce(v_item->>'original_sgr_contract_number',''));
    if char_length(v_source_number) not between 3 and 120
      then raise exception 'Original SGR contract number required'; end if;
    if v_neg.status='active' then
      if not exists(select 1 from public.partnership_contract_property_scope s
        where s.contract_version_id=v_previous.id and s.negotiation_id=v_neg.id
          and s.original_sgr_contract_number=v_source_number)
        then raise exception 'Active property scope changed'; end if;
    elsif p_kind='fee_replacement' or
      public.partnership_shared_terms(v_neg.accepted_version_id)<>v_previous.canonical_terms->'terms'
      then raise exception 'New property requires matching accepted terms'; end if;
    v_scope:=v_scope||jsonb_build_array(jsonb_build_object(
      'negotiation_id',v_neg.id,'offer_id',v_offer.id,'property_id',v_offer.property_id,
      'property',v_offer.property_snapshot,'original_sgr_contract_number',v_source_number,
      'term_version_id',v_neg.accepted_version_id));
  end loop;
  if p_kind='property_addendum' and
     (select jsonb_agg(jsonb_build_object('negotiation_id',item->>'negotiation_id',
       'original_sgr_contract_number',item->>'original_sgr_contract_number')
       order by item->>'negotiation_id') from jsonb_array_elements(v_scope) item)=
     (select jsonb_agg(jsonb_build_object('negotiation_id',item->>'negotiation_id',
       'original_sgr_contract_number',item->>'original_sgr_contract_number')
       order by item->>'negotiation_id') from jsonb_array_elements(v_old_scope) item)
    then raise exception 'Property addendum has no changes'; end if;
  if p_kind='fee_replacement' and
     (select jsonb_agg(jsonb_build_object('negotiation_id',item->>'negotiation_id',
       'original_sgr_contract_number',item->>'original_sgr_contract_number')
       order by item->>'negotiation_id') from jsonb_array_elements(v_scope) item)<>
     (select jsonb_agg(jsonb_build_object('negotiation_id',item->>'negotiation_id',
       'original_sgr_contract_number',item->>'original_sgr_contract_number')
       order by item->>'negotiation_id') from jsonb_array_elements(v_old_scope) item)
    then raise exception 'Fee replacement cannot change property scope'; end if;
  if not public.is_eligible_sp_partnership_professional(v_uid)
     or not public.is_eligible_sp_partnership_professional(v_group.partner_id)
    then raise exception 'Parties are no longer eligible'; end if;
  select coalesce(max(version_number),0)+1 into v_number
    from public.partnership_contract_versions where negotiation_id=v_previous.negotiation_id;
  v_payload:=jsonb_build_object('schema_version',2,'instrument_kind',p_kind,
    'portfolio_agreement_id',v_group.id,'previous_contract_id',v_previous.id,
    'negotiation_id',v_previous.negotiation_id,
    'captor',v_previous.captor_snapshot,'partner',v_previous.partner_snapshot,
    'properties',v_scope,'terms',v_shared,
    'legal_notice','Instrumento sujeito à assinatura eletrônica e à conferência do SGR/COFECI.');
  v_hash:=encode(extensions.digest(convert_to(v_payload::text,'UTF8'),'sha256'::text),'hex');
  insert into public.partnership_contract_versions(
    negotiation_id,term_version_id,version_number,captor_id,partner_id,captor_snapshot,partner_snapshot,
    property_snapshot,canonical_terms,canonical_sha256,original_sgr_contract_number,created_by,
    portfolio_agreement_id,instrument_kind)
  values(v_previous.negotiation_id,v_previous.term_version_id,v_number,v_uid,v_group.partner_id,
    v_previous.captor_snapshot,v_previous.partner_snapshot,v_scope,v_payload,v_hash,
    v_scope->0->>'original_sgr_contract_number',v_uid,v_group.id,p_kind)
  returning * into v_contract;
  insert into public.partnership_contract_property_scope(
    contract_version_id,negotiation_id,property_id,offer_id,original_sgr_contract_number,
    property_snapshot,term_version_id)
  select v_contract.id,(item->>'negotiation_id')::uuid,(item->>'property_id')::uuid,
    (item->>'offer_id')::uuid,item->>'original_sgr_contract_number',item->'property',
    (item->>'term_version_id')::uuid from jsonb_array_elements(v_scope) item;
  insert into public.partnership_contract_events(contract_version_id,actor_id,event_type,details)
    values(v_contract.id,v_uid,'draft_created',jsonb_build_object('instrument_kind',p_kind,
      'previous_contract_id',v_previous.id,'property_count',v_count));
  insert into public.notifications(user_id,type,title,message,link,data)
    values(v_group.partner_id,'system_alert'::public.notification_type,
      case when p_kind='property_addendum' then 'Aditivo de imóveis proposto'
        else 'Novo contrato de honorários proposto' end,
      'Confira o documento e os imóveis abrangidos antes de confirmar sua ciência.',
      '/meus-imoveis',jsonb_build_object('scope','partnership_contract_revision',
        'contract_id',v_contract.id,'kind',p_kind));
  return jsonb_build_object('contract_id',v_contract.id,'property_count',v_count,
    'canonical_sha256',v_hash,'status',v_contract.status);
end;
$$;
revoke all on function public.create_portfolio_contract_revision(uuid,uuid,text,jsonb,jsonb) from public,anon;
grant execute on function public.create_portfolio_contract_revision(uuid,uuid,text,jsonb,jsonb) to authenticated;

-- Evita que o fluxo antigo de revisao por um imovel contorne o instrumento
-- de carteira. Aditivos e nova divisao passam somente pela RPC do portfolio.
create or replace function public.prevent_portfolio_term_shortcut()
returns trigger language plpgsql set search_path='' as $$
begin
  if exists(select 1 from public.property_partnerships pp
    join public.partnership_contract_versions c on c.id=pp.contract_version_id
    where pp.negotiation_id=new.negotiation_id and pp.status='active'
      and c.portfolio_agreement_id is not null)
    then raise exception 'Portfolio changes require a new portfolio instrument'; end if;
  return new;
end;
$$;
revoke all on function public.prevent_portfolio_term_shortcut() from public,anon,authenticated;
drop trigger if exists prevent_portfolio_term_shortcut on public.property_partnership_term_versions;
create trigger prevent_portfolio_term_shortcut before insert
on public.property_partnership_term_versions for each row
execute function public.prevent_portfolio_term_shortcut();

create or replace function public.get_partnership_contract_workspace(p_negotiation_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_neg public.property_partnership_negotiations%rowtype;
  v_offer public.property_partnership_offers%rowtype;v_contract public.partnership_contract_versions%rowtype;v_role text;
begin
  select * into v_neg from public.property_partnership_negotiations where id=p_negotiation_id;
  if not found then raise exception 'Negotiation not found'; end if;
  select * into v_offer from public.property_partnership_offers where id=v_neg.offer_id;
  if v_uid=v_offer.captor_id then v_role:='captor';
  elsif v_uid=v_neg.partner_id then v_role:='partner';
  elsif public.is_admin() then v_role:='administrator';
  else raise exception 'Contract access denied'; end if;
  select c.* into v_contract from public.partnership_contract_versions c
    join public.partnership_contract_property_scope s on s.contract_version_id=c.id
    where s.negotiation_id=v_neg.id
    order by case when c.status in ('awaiting_acknowledgements','awaiting_sgr','awaiting_verification') then 0
      when c.status='verified' then 1 else 2 end,
      c.created_at desc,c.version_number desc limit 1;
  return jsonb_build_object(
    'negotiation_id',v_neg.id,'negotiation_status',v_neg.status,'party_role',v_role,
    'accepted_term_version',case when v_neg.accepted_version_id is null then null else
      (select version_number from public.property_partnership_term_versions where id=v_neg.accepted_version_id) end,
    'contract',case when v_contract.id is null then null else jsonb_build_object(
      'id',v_contract.id,'version_number',v_contract.version_number,'status',v_contract.status,
      'canonical_sha256',v_contract.canonical_sha256,
      'original_sgr_contract_number',v_contract.original_sgr_contract_number,
      'canonical_terms',v_contract.canonical_terms,'instrument_kind',v_contract.instrument_kind,
      'portfolio_agreement_id',v_contract.portfolio_agreement_id,
      'created_at',v_contract.created_at,
      'properties',coalesce((select jsonb_agg(jsonb_build_object(
        'negotiation_id',s.negotiation_id,'property_id',s.property_id,
        'code',s.property_snapshot->>'code','title',s.property_snapshot->>'title',
        'original_sgr_contract_number',s.original_sgr_contract_number
      ) order by s.property_snapshot->>'code') from public.partnership_contract_property_scope s
        where s.contract_version_id=v_contract.id),'[]'::jsonb)) end,
    'acknowledgements',coalesce((select jsonb_agg(jsonb_build_object(
      'party_role',a.party_role,'acknowledged_at',a.acknowledged_at,'terms_sha256',a.terms_sha256)
      order by a.acknowledged_at) from public.partnership_contract_acknowledgements a
      where a.contract_version_id=v_contract.id),'[]'::jsonb),
    'documents',coalesce((select jsonb_agg(jsonb_build_object(
      'id',d.id,'document_kind',d.document_kind,'storage_path',d.storage_path,
      'original_name',d.original_name,'mime_type',d.mime_type,'size_bytes',d.size_bytes,
      'sha256',d.sha256,'created_at',d.created_at) order by d.created_at)
      from public.partnership_contract_documents d where d.contract_version_id=v_contract.id),'[]'::jsonb),
    'sgr_submissions',coalesce((select jsonb_agg(jsonb_build_object(
      'party_role',s.party_role,'submission_version',s.submission_version,
      'sgr_contract_number',s.sgr_contract_number,'cf_ledger_hash',s.cf_ledger_hash,
      'blockchain_hash',s.blockchain_hash,'verification_url',s.verification_url,
      'submitted_at',s.submitted_at)) from (select distinct on (party_role) *
      from public.partnership_sgr_submissions where contract_version_id=v_contract.id
      order by party_role,submission_version desc) s),'[]'::jsonb),
    'review',case when v_contract.id is null then null else (select jsonb_build_object(
      'decision',r.decision,'note',r.note,'created_at',r.created_at)
      from public.partnership_contract_document_reviews r where r.contract_version_id=v_contract.id
      order by r.created_at desc limit 1) end
  );
end;
$$;
revoke all on function public.get_partnership_contract_workspace(uuid) from public,anon;
grant execute on function public.get_partnership_contract_workspace(uuid) to authenticated;

create or replace function public.review_partnership_contract(
  p_contract_id uuid,p_expected_status text,p_decision text,p_note text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_contract public.partnership_contract_versions%rowtype;
  v_neg public.property_partnership_negotiations%rowtype;
  v_offer public.property_partnership_offers%rowtype;
  v_scope public.partnership_contract_property_scope%rowtype;
  v_previous_contract_id uuid;
  v_decision text:=lower(trim(coalesce(p_decision,'')));
  v_partnership_id uuid;v_count integer:=0;
begin
  if not public.is_admin() then raise exception 'Administrative access required'; end if;
  perform public.require_partnership_aal2();
  if v_decision not in('verified','rejected') or char_length(trim(coalesce(p_note,'')))<10
    then raise exception 'Decision and justification required'; end if;
  select * into v_contract from public.partnership_contract_versions where id=p_contract_id for update;
  if not found or v_contract.status<>p_expected_status or v_contract.status<>'awaiting_verification'
    then raise exception 'Contract review changed'; end if;
  if v_decision='verified' and ((select count(*) from public.partnership_contract_acknowledgements
      where contract_version_id=v_contract.id)<>2
    or (select count(*) from (select distinct on (party_role) party_role
      from public.partnership_sgr_submissions where contract_version_id=v_contract.id
      order by party_role,submission_version desc) latest)<>2
    or (select count(distinct lower(sgr_contract_number)||'|'||lower(cf_ledger_hash)||'|'||lower(coalesce(blockchain_hash,'')))
      from (select distinct on (party_role) party_role,sgr_contract_number,cf_ledger_hash,blockchain_hash
        from public.partnership_sgr_submissions where contract_version_id=v_contract.id
        order by party_role,submission_version desc) latest)<>1
    or not exists(select 1 from public.partnership_contract_documents
      where contract_version_id=v_contract.id and document_kind='signed_contract')
    or not exists(select 1 from public.partnership_contract_documents
      where contract_version_id=v_contract.id and document_kind='sgr_receipt'))
    then raise exception 'Incomplete contract evidence'; end if;
  if v_decision='verified' then
    if not public.is_eligible_sp_partnership_professional(v_contract.captor_id)
       or not public.is_eligible_sp_partnership_professional(v_contract.partner_id)
      then raise exception 'Parties are no longer eligible'; end if;
    if v_contract.instrument_kind in ('property_addendum','fee_replacement') then
      select current_contract_id into v_previous_contract_id
        from public.partnership_portfolio_agreements
        where id=v_contract.portfolio_agreement_id for update;
      if v_previous_contract_id is distinct from
         (v_contract.canonical_terms->>'previous_contract_id')::uuid
        then raise exception 'Portfolio contract changed'; end if;
    end if;
    for v_scope in select * from public.partnership_contract_property_scope
      where contract_version_id=v_contract.id order by negotiation_id loop
      select * into v_neg from public.property_partnership_negotiations
        where id=v_scope.negotiation_id for update;
      select * into v_offer from public.property_partnership_offers
        where id=v_scope.offer_id for update;
      if not found or v_neg.id is null or v_neg.offer_id<>v_offer.id
         or v_neg.partner_id<>v_contract.partner_id or v_offer.captor_id<>v_contract.captor_id
         or v_offer.property_id<>v_scope.property_id or v_offer.status<>'open'
         or v_neg.status not in ('preliminarily_accepted','active')
         or (v_neg.status='active' and
           (v_contract.instrument_kind not in ('property_addendum','fee_replacement')
            or not exists(select 1 from public.property_partnerships pp
              where pp.negotiation_id=v_neg.id and pp.contract_version_id=v_previous_contract_id
                and pp.status='active')))
         or (v_neg.status='preliminarily_accepted' and
           v_neg.accepted_version_id<>v_scope.term_version_id)
         or not exists(select 1 from public.properties p
           where p.id=v_scope.property_id and p.status='active')
        then raise exception 'Contract property scope changed'; end if;
      update public.property_partnership_negotiations set status='active',updated_at=now()
        where id=v_neg.id;
      insert into public.property_partnerships(
        negotiation_id,offer_id,contract_version_id,property_id,captor_id,partner_id,
        property_snapshot,captor_snapshot,partner_snapshot)
      values(v_neg.id,v_offer.id,v_contract.id,v_scope.property_id,v_contract.captor_id,
        v_contract.partner_id,v_scope.property_snapshot,v_contract.captor_snapshot,v_contract.partner_snapshot)
      on conflict(negotiation_id) do update set contract_version_id=excluded.contract_version_id,
        status='active',starts_at=case when public.property_partnerships.status='ended'
          then now() else public.property_partnerships.starts_at end,
        ends_at=null,suspended_at=null,ended_at=null,status_reason=null,updated_at=now()
      returning id into v_partnership_id;
      v_count:=v_count+1;
    end loop;
    if v_count=0 then raise exception 'Contract has no properties'; end if;
    if v_previous_contract_id is not null then
      update public.property_partnerships pp set status='ended',ends_at=now(),
        ended_at=now(),status_reason='Imóvel excluído por aditivo verificado',updated_at=now()
      where pp.contract_version_id=v_previous_contract_id and pp.status='active'
        and not exists(select 1 from public.partnership_contract_property_scope s
          where s.contract_version_id=v_contract.id and s.negotiation_id=pp.negotiation_id);
    end if;
    update public.partnership_contract_versions set status='verified',verified_at=now()
      where id=v_contract.id;
    if v_contract.portfolio_agreement_id is not null then
      update public.partnership_portfolio_agreements set current_contract_id=v_contract.id
        where id=v_contract.portfolio_agreement_id;
    end if;
  else
    update public.partnership_contract_versions set status='rejected',rejected_at=now()
      where id=v_contract.id;
  end if;
  insert into public.partnership_contract_document_reviews(
    contract_version_id,document_id,decision,note,administrator_id,administrator_snapshot)
  select v_contract.id,d.id,v_decision,trim(p_note),v_uid,
    jsonb_build_object('profile_id',p.id,'name',p.name,'email',p.email)
  from public.partnership_contract_documents d
  join public.profiles p on p.id=v_uid where d.contract_version_id=v_contract.id;
  insert into public.partnership_contract_events(contract_version_id,actor_id,event_type,details)
    values(v_contract.id,v_uid,v_decision,jsonb_build_object('note',trim(p_note),
      'partnership_id',v_partnership_id,'property_count',v_count));
  insert into public.notifications(user_id,type,title,message,link,data)
  select party_id,'system_alert'::public.notification_type,
    case when v_decision='verified' then 'Contrato de parceria verificado'
      else 'Contrato de parceria requer correção' end,
    case when v_decision='verified' then 'O contrato foi conferido e os imóveis incluídos foram ativados.'
      else 'A conferência encontrou uma pendência. Consulte a justificativa e envie uma nova versão.' end,
    '/meus-imoveis',jsonb_build_object('scope','partnership_contract_review',
      'contract_id',v_contract.id,'decision',v_decision,'note',trim(p_note))
  from unnest(array[v_contract.captor_id,v_contract.partner_id]) party_id
  where party_id is not null;
  return jsonb_build_object('contract_id',v_contract.id,'decision',v_decision,
    'partnership_id',v_partnership_id,'property_count',v_count);
end;
$$;
revoke all on function public.review_partnership_contract(uuid,text,text,text) from public,anon;
grant execute on function public.review_partnership_contract(uuid,text,text,text) to authenticated;

create or replace function public.get_admin_partnership_contract_reviews()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if not public.is_admin() then raise exception 'Administrative access required'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
    'id',c.id,'status',c.status,'instrument_kind',c.instrument_kind,
    'created_at',c.created_at,'canonical_sha256',c.canonical_sha256,
    'captor',c.captor_snapshot,'partner',c.partner_snapshot,
    'captor_share',c.canonical_terms#>>'{terms,captor_share}',
    'partner_share',c.canonical_terms#>>'{terms,partner_share}',
    'properties',coalesce((select jsonb_agg(jsonb_build_object(
      'code',s.property_snapshot->>'code','title',s.property_snapshot->>'title',
      'original_sgr_contract_number',s.original_sgr_contract_number)
      order by s.property_snapshot->>'code') from public.partnership_contract_property_scope s
      where s.contract_version_id=c.id),'[]'::jsonb),
    'documents',coalesce((select jsonb_agg(jsonb_build_object(
      'id',d.id,'document_kind',d.document_kind,'storage_path',d.storage_path,
      'original_name',d.original_name,'sha256',d.sha256)
      order by d.created_at) from public.partnership_contract_documents d
      where d.contract_version_id=c.id),'[]'::jsonb),
    'sgr_submissions',coalesce((select jsonb_agg(jsonb_build_object(
      'party_role',s.party_role,'sgr_contract_number',s.sgr_contract_number,
      'cf_ledger_hash',s.cf_ledger_hash,'blockchain_hash',s.blockchain_hash,
      'verification_url',s.verification_url,'submitted_at',s.submitted_at))
      from (select distinct on (party_role) * from public.partnership_sgr_submissions
        where contract_version_id=c.id order by party_role,submission_version desc) s),'[]'::jsonb)
  ) order by c.created_at asc) from public.partnership_contract_versions c
    where c.status='awaiting_verification'),'[]'::jsonb);
end;
$$;
revoke all on function public.get_admin_partnership_contract_reviews() from public,anon;
grant execute on function public.get_admin_partnership_contract_reviews() to authenticated;

notify pgrst,'reload schema';
commit;
