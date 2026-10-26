begin;

create table if not exists public.deal_contract_templates(
 id uuid primary key default gen_random_uuid(), key text not null, version integer not null check(version>0), business_type text not null check(business_type in('sale','rent','other')),
 name text not null, description text not null, active boolean not null default true, created_at timestamptz not null default now(), unique(key,version)
);
create table if not exists public.deal_contract_clauses(
 id uuid primary key default gen_random_uuid(), key text not null, version integer not null check(version>0), title text not null, explanation text not null, body text not null,
 category text not null, business_types text[] not null default '{}', required boolean not null default false, default_enabled boolean not null default false,
 dependencies text[] not null default '{}', incompatibilities text[] not null default '{}', sort_order integer not null default 0, active boolean not null default true,
 created_at timestamptz not null default now(), unique(key,version)
);
insert into public.deal_contract_templates(key,version,business_type,name,description) values
 ('sale_standard',1,'sale','Compra e venda de imóvel','Estrutura inicial para compra e venda, preenchida com o dossiê aprovado.'),
 ('rent_standard',1,'rent','Locação residencial ou comercial','Estrutura inicial para locação, preenchida com o dossiê aprovado.'),
 ('other_standard',1,'other','Instrumento imobiliário personalizado','Estrutura neutra para negociação que exige complementação profissional.') on conflict do nothing;
insert into public.deal_contract_clauses(key,version,title,explanation,body,category,business_types,required,default_enabled,dependencies,incompatibilities,sort_order) values
 ('party_identification',1,'Identificação das partes','Reúne as partes preservadas no dossiê.','As partes deste instrumento são as pessoas identificadas no quadro de participantes, com os dados constantes do dossiê documental vinculado.','essential',array['sale','rent','other'],true,true,'{}','{}',10),
 ('property_object',1,'Objeto e identificação do imóvel','Vincula o negócio ao imóvel e aos documentos conferidos.','O objeto da negociação é o imóvel identificado no quadro do negócio e na fotografia documental que integra a formação deste instrumento.','essential',array['sale','rent','other'],true,true,'{}','{}',20),
 ('price_payment',1,'Preço e forma de pagamento','Registra valor, sinal, parcelas e demais condições econômicas.','O preço e a forma de pagamento são os indicados no quadro de condições comerciais, observados os vencimentos e meios ali descritos.','financial',array['sale','other'],true,true,'{}','{}',30),
 ('rent_payment',1,'Aluguel e vencimento','Registra valor, vencimento e reajuste da locação.','O aluguel, vencimento, índice e periodicidade de reajuste são os indicados no quadro de condições da locação.','financial',array['rent'],true,true,'{}','{}',30),
 ('earnest_money',1,'Sinal e princípio de pagamento','Use quando houver pagamento inicial para confirmar o negócio.','O valor indicado como sinal integra o preço e seguirá as condições de confirmação, desistência e restituição descritas neste instrumento.','financial',array['sale'],false,false,array['price_payment'],'{}',40),
 ('financing',1,'Financiamento bancário','Use quando parte do preço depender de crédito imobiliário.','A parcela financiada dependerá da aprovação da instituição financeira e do atendimento das exigências documentais pelas partes.','financial',array['sale'],false,false,array['price_payment'],array['cash_only'],50),
 ('cash_only',1,'Pagamento integral sem financiamento','Use quando não houver financiamento bancário.','O pagamento será realizado com recursos próprios, conforme prazos e meios definidos no quadro de condições.','financial',array['sale'],false,false,array['price_payment'],array['financing'],50),
 ('possession',1,'Posse e entrega das chaves','Define o evento que autoriza a entrega da posse.','A posse e as chaves serão entregues no evento indicado no quadro de condições, mediante cumprimento das obrigações correspondentes.','property',array['sale','rent','other'],false,true,'{}','{}',60),
 ('taxes_fees',1,'Tributos, taxas e despesas','Distribui responsabilidades por tributos, emolumentos e despesas.','As responsabilidades por tributos, taxas, emolumentos e despesas observarão o quadro de condições e a legislação aplicável.','property',array['sale','rent','other'],false,true,'{}','{}',70),
 ('brokerage',1,'Intermediação imobiliária','Registra a participação e remuneração profissional.','A intermediação e a remuneração dos profissionais envolvidos observarão os instrumentos de corretagem e parceria vinculados à negociação.','professional',array['sale','rent','other'],false,true,'{}','{}',80),
 ('default_penalty',1,'Inadimplemento e penalidades','Define consequências para obrigações descumpridas.','O descumprimento das obrigações sujeitará a parte responsável às consequências e aos valores definidos no quadro de condições, sem afastar as medidas cabíveis.','general',array['sale','rent','other'],false,true,'{}','{}',90),
 ('electronic_signature',1,'Assinatura eletrônica','Autoriza a formalização eletrônica e a trilha de evidências.','As partes concordam com a assinatura eletrônica e com o registro de evidências de autoria, integridade e tempo mantido pelo provedor indicado.','general',array['sale','rent','other'],false,true,'{}','{}',100),
 ('forum',1,'Foro','Define o foro eleito para questões relacionadas ao instrumento.','Fica eleito o foro indicado no quadro de condições, observadas as hipóteses legais de competência obrigatória.','general',array['sale','rent','other'],false,true,'{}','{}',110) on conflict do nothing;

create table if not exists public.deal_contracts(
 id uuid primary key default gen_random_uuid(), dossier_id uuid not null unique references public.deal_dossiers(id) on delete restrict,
 template_id uuid not null references public.deal_contract_templates(id) on delete restrict, status text not null default 'draft' check(status in('draft','ready_for_review','in_review','approved','signing','completed','cancelled')),
 current_version integer not null default 0, created_by uuid not null references public.profiles(id) on delete restrict, created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.deal_contract_versions(
 id uuid primary key default gen_random_uuid(),contract_id uuid not null references public.deal_contracts(id) on delete restrict,snapshot_id uuid not null references public.deal_dossier_snapshots(id) on delete restrict,
 version integer not null check(version>0),status text not null check(status in('preliminary','ready','final')),
 selected_clause_keys text[] not null,variables jsonb not null default '{}',content jsonb not null,content_hash text not null,created_by uuid not null references public.profiles(id) on delete restrict,created_at timestamptz not null default now(),unique(contract_id,version)
);
create index if not exists idx_deal_contract_versions_contract on public.deal_contract_versions(contract_id,version desc);

alter table public.deal_contract_templates enable row level security;alter table public.deal_contract_clauses enable row level security;alter table public.deal_contracts enable row level security;alter table public.deal_contract_versions enable row level security;
revoke all on public.deal_contract_templates,public.deal_contract_clauses,public.deal_contracts,public.deal_contract_versions from public,anon;
grant select on public.deal_contract_templates,public.deal_contract_clauses to authenticated;grant select,insert,update on public.deal_contracts to authenticated;grant select on public.deal_contract_versions to authenticated;
create policy "authenticated reads contract templates" on public.deal_contract_templates for select to authenticated using(active);
create policy "authenticated reads contract clauses" on public.deal_contract_clauses for select to authenticated using(active);
create policy "owners manage deal contracts" on public.deal_contracts for all to authenticated using(public.owns_deal_dossier(dossier_id) and public.has_satisfied_mfa()) with check(public.owns_deal_dossier(dossier_id) and created_by=auth.uid() and public.has_satisfied_mfa());
create policy "owners read contract versions" on public.deal_contract_versions for select to authenticated using(exists(select 1 from public.deal_contracts c where c.id=contract_id and public.owns_deal_dossier(c.dossier_id)) and public.has_satisfied_mfa());

create or replace function public.create_deal_contract_version(p_dossier_id uuid,p_template_id uuid,p_clause_keys text[],p_variables jsonb,p_ready boolean default false) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_snapshot public.deal_dossier_snapshots%rowtype;v_template public.deal_contract_templates%rowtype;v_contract public.deal_contracts%rowtype;v_version integer;v_required text[];v_missing text[];v_invalid text[];v_content jsonb;v_hash text;v_id uuid;
begin
 if v_uid is null or not public.owns_deal_dossier(p_dossier_id) or not public.has_satisfied_mfa() then raise exception 'DEAL_ACCESS_DENIED';end if;
 select * into v_snapshot from public.deal_dossier_snapshots where dossier_id=p_dossier_id order by version desc limit 1;if not found then raise exception 'DEAL_SNAPSHOT_REQUIRED';end if;
 select * into v_template from public.deal_contract_templates where id=p_template_id and active;if not found then raise exception 'DEAL_TEMPLATE_INVALID';end if;
 if v_template.business_type<>(select business_type from public.deal_dossiers where id=p_dossier_id) then raise exception 'DEAL_TEMPLATE_INVALID';end if;
 select array_agg(key order by sort_order) into v_required from public.deal_contract_clauses where active and required and v_template.business_type=any(business_types);
 select array_agg(x) into v_missing from unnest(coalesce(v_required,'{}'))x where not(x=any(coalesce(p_clause_keys,'{}')));if cardinality(coalesce(v_missing,'{}'))>0 then raise exception 'DEAL_REQUIRED_CLAUSE';end if;
 select array_agg(c.key) into v_invalid from public.deal_contract_clauses c where c.key=any(coalesce(p_clause_keys,'{}')) and (exists(select 1 from unnest(c.dependencies)d where not(d=any(coalesce(p_clause_keys,'{}')))) or exists(select 1 from unnest(c.incompatibilities)i where i=any(coalesce(p_clause_keys,'{}'))));if cardinality(coalesce(v_invalid,'{}'))>0 then raise exception 'DEAL_CLAUSE_CONFLICT';end if;
 insert into public.deal_contracts(dossier_id,template_id,created_by) values(p_dossier_id,p_template_id,v_uid) on conflict(dossier_id) do update set template_id=excluded.template_id,updated_at=now() returning * into v_contract;
 v_version:=v_contract.current_version+1;
 select jsonb_build_object('template',jsonb_build_object('key',v_template.key,'version',v_template.version,'name',v_template.name),'snapshot',jsonb_build_object('id',v_snapshot.id,'version',v_snapshot.version,'hash',v_snapshot.content_hash,'content',v_snapshot.content),'variables',coalesce(p_variables,'{}'),'clauses',coalesce(jsonb_agg(jsonb_build_object('key',c.key,'version',c.version,'title',c.title,'body',c.body,'category',c.category) order by c.sort_order),'[]'::jsonb)) into v_content from public.deal_contract_clauses c where c.active and c.key=any(coalesce(p_clause_keys,'{}'));
 v_hash:=encode(extensions.digest(convert_to(v_content::text,'UTF8'),'sha256'),'hex');insert into public.deal_contract_versions(contract_id,snapshot_id,version,status,selected_clause_keys,variables,content,content_hash,created_by) values(v_contract.id,v_snapshot.id,v_version,case when p_ready then 'ready' else 'preliminary' end,p_clause_keys,coalesce(p_variables,'{}'),v_content,v_hash,v_uid) returning id into v_id;
 update public.deal_contracts set current_version=v_version,status=case when p_ready then 'ready_for_review' else 'draft' end,updated_at=now() where id=v_contract.id;
 update public.deal_dossiers set current_stage='contract',status='contract_review',updated_at=now() where id=p_dossier_id;
 insert into public.deal_audit_events(dossier_id,actor_profile_id,actor_label,event_type,entity_type,entity_id,description,metadata) values(p_dossier_id,v_uid,'Profissional responsável','contract_version_created','contract_version',v_id,'Nova versão contratual criada sem sobrescrever versões anteriores.',jsonb_build_object('version',v_version,'status',case when p_ready then 'ready' else 'preliminary' end,'hash',v_hash));return v_id;
end;$$;
revoke all on function public.create_deal_contract_version(uuid,uuid,text[],jsonb,boolean) from public,anon;grant execute on function public.create_deal_contract_version(uuid,uuid,text[],jsonb,boolean) to authenticated;
notify pgrst,'reload schema';commit;
