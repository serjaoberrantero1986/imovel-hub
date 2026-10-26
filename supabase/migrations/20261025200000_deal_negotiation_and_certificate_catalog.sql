begin;

alter table public.deal_dossiers
  add column if not exists property_legal_regime text not null default 'unknown'
    check (property_legal_regime in ('unknown','registered','possessory_rights')),
  add column if not exists jurisdiction jsonb not null default '{}'::jsonb;

create table if not exists public.deal_negotiation_versions (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references public.deal_dossiers(id) on delete cascade,
  version integer not null check (version > 0),
  kind text not null check (kind in ('proposal','counterproposal','consolidated_terms')),
  status text not null default 'draft' check (status in ('draft','presented','accepted','rejected','superseded')),
  title text not null,
  terms jsonb not null default '{}'::jsonb,
  notes text,
  content_hash text not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (dossier_id, version)
);

create index if not exists idx_deal_negotiation_versions_dossier
  on public.deal_negotiation_versions(dossier_id, version desc);

create table if not exists public.deal_negotiation_decisions (
  id uuid primary key default gen_random_uuid(),
  negotiation_version_id uuid not null references public.deal_negotiation_versions(id) on delete cascade,
  participant_id uuid not null references public.deal_participants(id) on delete cascade,
  decision text not null check (decision in ('pending','accepted','rejected','changes_requested')),
  comment text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (negotiation_version_id, participant_id)
);

create table if not exists public.deal_certificate_sources (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  description text not null,
  official_url text not null check (official_url ~ '^https?://'),
  authority_name text not null,
  geographic_scope text not null check (geographic_scope in ('municipal','state','federal','national')),
  country_code text not null default 'BR',
  state_code text,
  city_name text,
  applies_to text[] not null default '{}',
  document_catalog_key text references public.deal_document_catalog(key) on delete set null,
  conditional_rule text,
  active boolean not null default true,
  verified_at date not null,
  source_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.deal_document_catalog(key,label,description,category,accepted_roles,allows_multiple,sort_order) values
 ('possession_chain','Cadeia documental da posse','Contratos, cessões, recibos e demais instrumentos que demonstrem a origem e a continuidade da posse.','property',array['owner','co_owner'],true,91),
 ('possession_declaration','Declaração sobre a posse','Declaração das circunstâncias, tempo, forma de aquisição, ocupação e inexistência de conflito possessório conhecido.','property',array['owner','co_owner'],true,92),
 ('survey_plan','Planta, croqui e memorial descritivo','Documentos que identifiquem área, medidas, confrontações, acessos e benfeitorias.','property',array['owner','co_owner'],true,93),
 ('master_registration','Matrícula da área de origem','Matrícula-mãe ou certidão disponível da área maior da qual deriva a posse negociada.','property',array['owner','co_owner'],true,94),
 ('access_easement','Acesso, passagem ou servidão','Instrumentos e evidências do acesso ao imóvel, incluindo autorização, servidão ou passagem por área de terceiros.','property',array['owner','co_owner'],true,95),
 ('municipal_debt_certificate','Certidão municipal e dívida ativa','Certidões relativas ao cadastro imobiliário, tributos municipais e dívida ativa, conforme o município.','certificate',array['owner','co_owner'],true,121),
 ('civil_distribution_certificate','Distribuição cível estadual','Certidões dos sistemas judiciais aplicáveis à jurisdição e ao período pesquisado.','certificate',array['owner','co_owner','buyer','tenant','spouse','guarantor'],true,122),
 ('labor_debt_certificate','Débitos e ações trabalhistas','Certidões trabalhistas aplicáveis, observando a diferença entre CNDT e distribuição de ações.','certificate',array['owner','co_owner','buyer','tenant','spouse','guarantor'],true,123),
 ('federal_tax_certificate','Regularidade fiscal federal','Certidão de débitos relativos a créditos tributários federais e dívida ativa da União.','certificate',array['owner','co_owner','buyer','tenant','spouse','guarantor'],true,124),
 ('federal_court_certificate','Justiça Federal','Certidão judicial federal correspondente à pessoa e à região aplicável.','certificate',array['owner','co_owner','buyer','tenant','spouse','guarantor'],true,125),
 ('state_tax_certificate','Regularidade fiscal estadual','Certidão tributária estadual conforme a unidade federativa e o tipo de débito.','certificate',array['owner','co_owner','buyer','tenant','spouse','guarantor'],true,126),
 ('protest_certificate','Protestos','Certidão ou pesquisa de protestos na central ou cartório competente.','certificate',array['owner','co_owner','buyer','tenant','spouse','guarantor'],true,127),
 ('company_registration_status','Situação cadastral do CNPJ','Comprovante de inscrição e situação cadastral quando a parte for pessoa jurídica.','certificate',array['owner','co_owner','buyer','tenant','guarantor','agency'],true,128),
 ('fgts_clearance','Regularidade do FGTS','Certificado de regularidade do FGTS quando a parte estiver sujeita à obrigação.','certificate',array['owner','co_owner','buyer','tenant','guarantor','agency'],true,129)
on conflict (key) do update set label=excluded.label,description=excluded.description,category=excluded.category,
 accepted_roles=excluded.accepted_roles,allows_multiple=excluded.allows_multiple,active=true,sort_order=excluded.sort_order,updated_at=now();

insert into public.deal_certificate_sources
 (key,label,description,official_url,authority_name,geographic_scope,state_code,city_name,applies_to,document_catalog_key,conditional_rule,verified_at,source_notes)
values
 ('sorocaba_municipal_certificates','Dívida ativa e certidões municipais','Emissão de certidões municipais relacionadas ao imóvel e ao contribuinte.','https://fazenda.sorocaba.sp.gov.br/iptu/emissao-de-certidoes/','Prefeitura de Sorocaba','municipal','SP','Sorocaba',array['property','person'],'municipal_debt_certificate','Aplicável quando o imóvel ou contribuinte estiver vinculado a Sorocaba.',current_date,'Endereço informado pelo profissional e mantido como fonte municipal.'),
 ('sorocaba_iptu','Consulta de IPTU de Sorocaba','Consulta do cadastro e dos débitos de IPTU.','https://iptu.sorocaba.sp.gov.br/','Prefeitura de Sorocaba','municipal','SP','Sorocaba',array['property'],'property_tax','Aplicável a imóveis cadastrados no município de Sorocaba.',current_date,'Consulta cadastral; não substitui todas as certidões municipais.'),
 ('tjsp_civil_distribution','Distribuição cível estadual','Portal de certidões do Tribunal de Justiça de São Paulo. Conferir os sistemas indicados pelo tribunal para cobertura integral.','https://www.tjsp.jus.br/Certidoes/Certidoes/CertidoesPrimeiraInstancia','Tribunal de Justiça de São Paulo','state','SP',null,array['person','company'],'civil_distribution_certificate','Aplicável a partes com domicílio ou fatos relevantes no Estado de São Paulo.',current_date,'A cobertura pode exigir consulta aos sistemas eproc e SAJ, conforme orientação vigente do TJSP.'),
 ('tst_cndt','Certidão Negativa de Débitos Trabalhistas','Emissão oficial da CNDT.','https://www.tst.jus.br/certidao1','Tribunal Superior do Trabalho','national',null,null,array['person','company'],'labor_debt_certificate','Aplicável conforme o papel e a análise de risco da parte.',current_date,'CNDT não equivale à certidão de distribuição de ações trabalhistas.'),
 ('receita_federal_cnd','Regularidade fiscal federal','Serviço oficial para certidões de regularidade fiscal federal.','https://www.gov.br/pt-br/servicos/emitir-certidao-de-regularidade-fiscal','Receita Federal do Brasil e PGFN','federal',null,null,array['person','company'],'federal_tax_certificate','Selecionar o serviço correspondente a pessoa física, jurídica ou imóvel rural.',current_date,'Usar o serviço atual do portal gov.br.'),
 ('cjf_federal_court','Certidão unificada da Justiça Federal','Emissão de certidão judicial federal unificada.','https://certidao-unificada.cjf.jus.br/','Conselho da Justiça Federal','federal',null,null,array['person','company'],'federal_court_certificate','Aplicável conforme domicílio e abrangência necessária.',current_date,'Confirmar abrangência e tipo de certidão no momento da emissão.'),
 ('receita_cnpj_status','Comprovante de situação cadastral do CNPJ','Consulta oficial de inscrição e situação cadastral de pessoa jurídica.','https://servicos.receita.fazenda.gov.br/Servicos/cnpjreva/cnpjreva_solicitacao.asp','Receita Federal do Brasil','national',null,null,array['company'],'company_registration_status','Somente para parte pessoa jurídica.',current_date,'Comprovante cadastral não substitui certidões fiscais.'),
 ('caixa_fgts_crf','Regularidade do empregador no FGTS','Consulta do certificado de regularidade do FGTS.','https://consulta-crf.caixa.gov.br/consultacrf/pages/consultaEmpregador.jsf','Caixa Econômica Federal','national',null,null,array['company'],'fgts_clearance','Somente quando a parte estiver sujeita à regularidade como empregador.',current_date,'Item condicional; não solicitar indistintamente a pessoa física.'),
 ('sefaz_sp_cnd','Certidão tributária estadual de São Paulo','Emissão no sistema atual de certidões tributárias estaduais.','https://www10.fazenda.sp.gov.br/CertidaoNegativaDeb/Pages/EmissaoCertidaoNegativa.aspx','Secretaria da Fazenda e Planejamento de São Paulo','state','SP',null,array['person','company'],'state_tax_certificate','Aplicável a vínculos tributários relevantes no Estado de São Paulo.',current_date,'Confirmar redirecionamento e sistema vigente no momento da emissão.'),
 ('trt2_certificates','Certidões da Justiça do Trabalho da 2ª Região','Página oficial de certidões judiciais do TRT da 2ª Região.','https://ww2.trt2.jus.br/servicos/certidoes','Tribunal Regional do Trabalho da 2ª Região','state','SP',null,array['person','company'],'labor_debt_certificate','Aplicável conforme domicílio e abrangência territorial da parte.',current_date,'Distinguir CNDT nacional de distribuição regional de ações.'),
 ('cenprot_sp','Pesquisa e certidão de protesto em São Paulo','Central estadual de protestos para pesquisa e solicitação de certidões.','https://protestosp.com.br/','CENPROT-SP','state','SP',null,array['person','company'],'protest_certificate','Aplicável a partes vinculadas ao Estado de São Paulo.',current_date,'Fonte centralizada; cartórios locais podem complementar casos específicos.')
on conflict (key) do update set label=excluded.label,description=excluded.description,official_url=excluded.official_url,
 authority_name=excluded.authority_name,geographic_scope=excluded.geographic_scope,state_code=excluded.state_code,city_name=excluded.city_name,
 applies_to=excluded.applies_to,document_catalog_key=excluded.document_catalog_key,conditional_rule=excluded.conditional_rule,
 active=true,verified_at=excluded.verified_at,source_notes=excluded.source_notes,updated_at=now();

insert into public.deal_contract_templates(key,version,business_type,name,description)
values ('possessory_rights_assignment',1,'sale','Cessão de direitos possessórios','Modelo guiado para negociação de posse sem matrícula individual, condicionado à conferência da cadeia possessória e da estratégia de regularização.')
on conflict (key,version) do update set name=excluded.name,description=excluded.description,active=true;

insert into public.deal_contract_clauses(key,version,title,explanation,body,category,business_types,required,default_enabled,dependencies,incompatibilities,sort_order) values
 ('possessory_object',1,'Objeto possessório','Identifica corretamente que o objeto é a cessão da posse e dos direitos existentes, sem declarar propriedade registral inexistente.','O instrumento trata da cessão dos direitos possessórios descritos no dossiê, com origem, limites, benfeitorias e documentos expressamente identificados.','object',array['sale'],false,false,array[]::text[],array['registered_property_object'],21),
 ('possession_chain_warranty',1,'Cadeia e origem da posse','Registra os documentos e declarações que sustentam a continuidade da posse.','O cedente declara a origem e a cadeia possessória apresentadas no dossiê, responde pela autenticidade das informações prestadas e informa eventuais conflitos conhecidos.','warranties',array['sale'],false,false,array['possessory_object'],array[]::text[],22),
 ('area_boundaries_access',1,'Área, confrontações e acesso','Vincula o negócio à identificação física conferida no dossiê.','A área, as confrontações, o acesso, as passagens e as benfeitorias são aqueles descritos nos anexos aprovados, prevalecendo a conferência técnica indicada pelas partes.','property',array['sale'],false,false,array['possessory_object'],array[]::text[],23),
 ('regularization_cooperation',1,'Cooperação para regularização','Prevê colaboração sem prometer resultado perante órgãos públicos.','As partes cooperarão com os atos e documentos necessários à eventual regularização, sem garantia de prazo ou resultado que dependa de cartório, município, Poder Judiciário ou terceiros.','obligations',array['sale'],false,false,array['possessory_object'],array[]::text[],24)
on conflict (key,version) do update set title=excluded.title,explanation=excluded.explanation,body=excluded.body,category=excluded.category,
 business_types=excluded.business_types,required=excluded.required,default_enabled=excluded.default_enabled,dependencies=excluded.dependencies,
 incompatibilities=excluded.incompatibilities,sort_order=excluded.sort_order,active=true;

alter table public.deal_negotiation_versions enable row level security;
alter table public.deal_negotiation_decisions enable row level security;
alter table public.deal_certificate_sources enable row level security;

revoke all on public.deal_negotiation_versions,public.deal_negotiation_decisions,public.deal_certificate_sources from public,anon;
grant select,insert,update on public.deal_negotiation_versions,public.deal_negotiation_decisions to authenticated;
grant select on public.deal_certificate_sources to authenticated;

create policy "owners manage negotiation versions" on public.deal_negotiation_versions for all to authenticated
 using (public.owns_deal_dossier(dossier_id) and public.has_satisfied_mfa())
 with check (public.owns_deal_dossier(dossier_id) and created_by=(select auth.uid()) and public.has_satisfied_mfa());
create policy "owners manage negotiation decisions" on public.deal_negotiation_decisions for all to authenticated
 using (exists(select 1 from public.deal_negotiation_versions v where v.id=negotiation_version_id and public.owns_deal_dossier(v.dossier_id)) and public.has_satisfied_mfa())
 with check (exists(select 1 from public.deal_negotiation_versions v where v.id=negotiation_version_id and public.owns_deal_dossier(v.dossier_id)) and public.has_satisfied_mfa());
create policy "authenticated reads certificate sources" on public.deal_certificate_sources for select to authenticated using (active);

create or replace function public.create_deal_negotiation_version(
 p_dossier_id uuid,p_kind text,p_title text,p_terms jsonb,p_notes text default null,p_status text default 'draft'
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_version integer;v_id uuid;v_hash text;v_participant record;
begin
 if v_uid is null or not public.owns_deal_dossier(p_dossier_id) or not public.has_satisfied_mfa() then raise exception 'DEAL_ACCESS_DENIED';end if;
 if p_kind not in('proposal','counterproposal','consolidated_terms') or p_status not in('draft','presented','accepted') then raise exception 'DEAL_NEGOTIATION_INVALID';end if;
 if char_length(btrim(coalesce(p_title,'')))<3 or jsonb_typeof(p_terms)<>'object' then raise exception 'DEAL_NEGOTIATION_INVALID';end if;
 select coalesce(max(version),0)+1 into v_version from public.deal_negotiation_versions where dossier_id=p_dossier_id;
 v_hash:=encode(extensions.digest(convert_to(jsonb_build_object('version',v_version,'kind',p_kind,'title',btrim(p_title),'terms',p_terms,'notes',nullif(btrim(coalesce(p_notes,'')),''))::text,'UTF8'),'sha256'),'hex');
 update public.deal_negotiation_versions set status='superseded' where dossier_id=p_dossier_id and status in('draft','presented');
 insert into public.deal_negotiation_versions(dossier_id,version,kind,status,title,terms,notes,content_hash,created_by,accepted_at)
 values(p_dossier_id,v_version,p_kind,p_status,btrim(p_title),p_terms,nullif(btrim(coalesce(p_notes,'')),''),v_hash,v_uid,case when p_status='accepted' then now() end) returning id into v_id;
 for v_participant in select id from public.deal_participants where dossier_id=p_dossier_id and role in('owner','co_owner','buyer','tenant','spouse','representative') and status<>'inactive' loop
  insert into public.deal_negotiation_decisions(negotiation_version_id,participant_id,decision,decided_at)
  values(v_id,v_participant.id,case when p_status='accepted' then 'accepted' else 'pending' end,case when p_status='accepted' then now() end);
 end loop;
 update public.deal_dossiers set current_stage='negotiation',progress=greatest(progress,15),updated_at=now() where id=p_dossier_id;
 insert into public.deal_audit_events(dossier_id,actor_profile_id,actor_label,event_type,entity_type,entity_id,description,metadata)
 values(p_dossier_id,v_uid,'Profissional responsável','negotiation_version_created','negotiation_version',v_id,
  'Versão '||v_version||' da negociação registrada.',jsonb_build_object('version',v_version,'kind',p_kind,'status',p_status,'content_hash',v_hash));
 return v_id;
end;$$;
revoke all on function public.create_deal_negotiation_version(uuid,text,text,jsonb,text,text) from public,anon;
grant execute on function public.create_deal_negotiation_version(uuid,text,text,jsonb,text,text) to authenticated;

create or replace function public.configure_deal_legal_context(p_dossier_id uuid,p_regime text,p_state text,p_city text)
returns void language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null or not public.owns_deal_dossier(p_dossier_id) or not public.has_satisfied_mfa() then raise exception 'DEAL_ACCESS_DENIED';end if;
 if p_regime not in('unknown','registered','possessory_rights') then raise exception 'DEAL_LEGAL_CONTEXT_INVALID';end if;
 update public.deal_dossiers set property_legal_regime=p_regime,jurisdiction=jsonb_build_object('country','BR','state',upper(nullif(btrim(coalesce(p_state,'')),'')),'city',nullif(btrim(coalesce(p_city,'')),'')),updated_at=now() where id=p_dossier_id;
 insert into public.deal_audit_events(dossier_id,actor_profile_id,actor_label,event_type,entity_type,entity_id,description,metadata)
 values(p_dossier_id,v_uid,'Profissional responsável','legal_context_updated','dossier',p_dossier_id,'Contexto jurídico e territorial da negociação atualizado.',jsonb_build_object('regime',p_regime,'state',p_state,'city',p_city));
end;$$;
revoke all on function public.configure_deal_legal_context(uuid,text,text,text) from public,anon;
grant execute on function public.configure_deal_legal_context(uuid,text,text,text) to authenticated;

notify pgrst,'reload schema';
commit;
