-- Calculadora pública de poder de compra e catálogo auditável de taxas imobiliárias.
create table if not exists public.mortgage_institutions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  logo_url text,
  display_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mortgage_products (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.mortgage_institutions(id) on delete restrict,
  name text not null,
  audience text not null default 'general' check (audience in ('general','relationship','segment','program')),
  indexer text not null default 'TR',
  amortization_systems text[] not null default array['SAC','PRICE']::text[],
  max_ltv numeric(6,5) not null default .8 check (max_ltv > 0 and max_ltv <= 1),
  income_commitment numeric(6,5) not null default .3 check (income_commitment > 0 and income_commitment <= 1),
  min_term_months integer not null default 120 check (min_term_months > 0),
  max_term_months integer not null default 420 check (max_term_months >= min_term_months),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, name)
);

create table if not exists public.mortgage_rate_sources (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.mortgage_products(id) on delete cascade,
  name text not null,
  source_type text not null check (source_type in ('bcb_odata','official_page','official_simulator')),
  url text not null check (url ~ '^https://'),
  priority integer not null default 100,
  automatic boolean not null default true,
  active boolean not null default true,
  parser_config jsonb not null default '{}'::jsonb,
  last_checked_at timestamptz,
  last_success_at timestamptz,
  last_status text not null default 'pending' check (last_status in ('pending','success','unchanged','review','failed','disabled')),
  last_message text,
  last_value numeric(8,5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, url)
);

create table if not exists public.mortgage_rate_versions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.mortgage_products(id) on delete restrict,
  source_id uuid references public.mortgage_rate_sources(id) on delete set null,
  annual_rate numeric(8,5) not null check (annual_rate >= 0 and annual_rate <= 1),
  rate_kind text not null default 'advertised' check (rate_kind in ('advertised','market_average','manual')),
  effective_from date not null default current_date,
  verified_at timestamptz not null default now(),
  published_at timestamptz,
  status text not null default 'published' check (status in ('pending','published','rejected','superseded')),
  source_snapshot jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists mortgage_one_published_rate_per_product_kind
  on public.mortgage_rate_versions(product_id, rate_kind) where status = 'published';

create table if not exists public.mortgage_rate_sync_runs (
  id uuid primary key default gen_random_uuid(),
  trigger_type text not null check (trigger_type in ('scheduled','manual','single_source')),
  requested_by uuid references auth.users(id) on delete set null,
  status text not null default 'running' check (status in ('running','success','partial','failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  summary jsonb not null default '{}'::jsonb
);

alter table public.mortgage_institutions enable row level security;
alter table public.mortgage_products enable row level security;
alter table public.mortgage_rate_sources enable row level security;
alter table public.mortgage_rate_versions enable row level security;
alter table public.mortgage_rate_sync_runs enable row level security;

create or replace function public.is_portal_admin()
returns boolean language sql stable security invoker set search_path = public
as $$ select exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin') $$;

drop policy if exists "public reads mortgage institutions" on public.mortgage_institutions;
create policy "public reads mortgage institutions" on public.mortgage_institutions for select to anon, authenticated using (active or public.is_portal_admin());
drop policy if exists "public reads mortgage products" on public.mortgage_products;
create policy "public reads mortgage products" on public.mortgage_products for select to anon, authenticated using (active or public.is_portal_admin());
drop policy if exists "public reads published mortgage rates" on public.mortgage_rate_versions;
create policy "public reads published mortgage rates" on public.mortgage_rate_versions for select to anon, authenticated using (status = 'published' or public.is_portal_admin());
drop policy if exists "admins manage mortgage institutions" on public.mortgage_institutions;
create policy "admins manage mortgage institutions" on public.mortgage_institutions for all to authenticated using (public.is_portal_admin()) with check (public.is_portal_admin());
drop policy if exists "admins manage mortgage products" on public.mortgage_products;
create policy "admins manage mortgage products" on public.mortgage_products for all to authenticated using (public.is_portal_admin()) with check (public.is_portal_admin());
drop policy if exists "admins manage mortgage sources" on public.mortgage_rate_sources;
create policy "admins manage mortgage sources" on public.mortgage_rate_sources for all to authenticated using (public.is_portal_admin()) with check (public.is_portal_admin());
drop policy if exists "admins read mortgage runs" on public.mortgage_rate_sync_runs;
create policy "admins read mortgage runs" on public.mortgage_rate_sync_runs for select to authenticated using (public.is_portal_admin());

grant select on public.mortgage_institutions, public.mortgage_products, public.mortgage_rate_versions to anon, authenticated;
grant select, insert, update, delete on public.mortgage_rate_sources to authenticated;
grant select, insert, update, delete on public.mortgage_institutions, public.mortgage_products to authenticated;
grant select on public.mortgage_rate_sync_runs to authenticated;

create or replace function public.get_public_mortgage_rates()
returns jsonb language sql stable security definer set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'institution_id', i.id, 'institution', i.name, 'institution_slug', i.slug,
    'product_id', p.id, 'product', p.name, 'audience', p.audience, 'indexer', p.indexer,
    'amortization_systems', p.amortization_systems, 'max_ltv', p.max_ltv,
    'income_commitment', p.income_commitment, 'min_term_months', p.min_term_months,
    'max_term_months', p.max_term_months, 'annual_rate', r.annual_rate,
    'rate_kind', r.rate_kind, 'verified_at', r.verified_at, 'effective_from', r.effective_from,
    'source_name', s.name, 'source_url', s.url
  ) order by i.display_order, r.rate_kind, r.annual_rate), '[]'::jsonb)
  from public.mortgage_products p
  join public.mortgage_institutions i on i.id=p.institution_id and i.active
  join public.mortgage_rate_versions r on r.product_id=p.id and r.status='published'
  left join public.mortgage_rate_sources s on s.id=r.source_id
  where p.active;
$$;
grant execute on function public.get_public_mortgage_rates() to anon, authenticated;

insert into public.mortgage_institutions(slug,name,display_order) values
('caixa','Caixa',10),('banco-do-brasil','Banco do Brasil',20),('bradesco','Bradesco',30),('itau','Itaú',40),('santander','Santander',50)
on conflict (slug) do update set name=excluded.name,display_order=excluded.display_order;

with catalog(slug,product_name,audience,indexer,ltv,commitment,min_term,max_term) as (values
 ('caixa','Crédito Imobiliário SBPE','general','TR',.90,.30,120,420),
 ('banco-do-brasil','Crédito Imobiliário SBPE','general','TR',.80,.30,60,420),
 ('bradesco','Crédito Imobiliário Residencial','general','TR',.80,.30,12,420),
 ('itau','Crédito Imobiliário Prefixado','general','TR',.80,.30,12,420),
 ('itau','Crédito Imobiliário Poupança','general','POUPANÇA',.80,.30,12,420),
 ('santander','Crédito Imobiliário Residencial Atualizável','relationship','TR',.80,.30,12,420)
)
insert into public.mortgage_products(institution_id,name,audience,indexer,max_ltv,income_commitment,min_term_months,max_term_months)
select i.id,c.product_name,c.audience,c.indexer,c.ltv,c.commitment,c.min_term,c.max_term from catalog c join public.mortgage_institutions i on i.slug=c.slug
on conflict (institution_id,name) do update set audience=excluded.audience,indexer=excluded.indexer,max_ltv=excluded.max_ltv,income_commitment=excluded.income_commitment,min_term_months=excluded.min_term_months,max_term_months=excluded.max_term_months;

with seed(slug,product_name,source_name,source_type,url,priority,parser) as (values
 ('caixa','Crédito Imobiliário SBPE','Banco Central — média praticada','bcb_odata','https://olinda.bcb.gov.br/olinda/servico/taxaJuros/versao/v2/odata/TaxasJurosMensalPorMes',10,'{"institution_match":"CAIXA ECONOMICA FEDERAL","cnpj8":"00360305","modality_match":"Financiamento imobiliário com taxas de mercado - Pós-fixado referenciado em TR"}'::jsonb),
 ('banco-do-brasil','Crédito Imobiliário SBPE','Banco Central — média praticada','bcb_odata','https://olinda.bcb.gov.br/olinda/servico/taxaJuros/versao/v2/odata/TaxasJurosMensalPorMes',10,'{"institution_match":"BCO DO BRASIL S.A.","cnpj8":"00000000","modality_match":"Financiamento imobiliário com taxas de mercado - Pós-fixado referenciado em TR"}'::jsonb),
 ('bradesco','Crédito Imobiliário Residencial','Banco Central — média praticada','bcb_odata','https://olinda.bcb.gov.br/olinda/servico/taxaJuros/versao/v2/odata/TaxasJurosMensalPorMes',10,'{"institution_match":"BCO BRADESCO S.A.","cnpj8":"60746948","modality_match":"Financiamento imobiliário com taxas de mercado - Pós-fixado referenciado em TR"}'::jsonb),
 ('itau','Crédito Imobiliário Prefixado','Banco Central — média praticada','bcb_odata','https://olinda.bcb.gov.br/olinda/servico/taxaJuros/versao/v2/odata/TaxasJurosMensalPorMes',10,'{"institution_match":"ITAÚ UNIBANCO S.A.","cnpj8":"60701190","modality_match":"Financiamento imobiliário com taxas de mercado - Pós-fixado referenciado em TR"}'::jsonb),
 ('santander','Crédito Imobiliário Residencial Atualizável','Banco Central — média praticada','bcb_odata','https://olinda.bcb.gov.br/olinda/servico/taxaJuros/versao/v2/odata/TaxasJurosMensalPorMes',10,'{"institution_match":"BCO SANTANDER (BRASIL) S.A.","cnpj8":"90400888","modality_match":"Financiamento imobiliário com taxas de mercado - Pós-fixado referenciado em TR"}'::jsonb),
 ('caixa','Crédito Imobiliário SBPE','Condições oficiais Caixa','official_page','https://www.caixa.gov.br/voce/habitacao/financiamento/perguntas-frequentes/Paginas/default.aspx',20,'{"rate_regex":"taxa[^%]{0,120}?([0-9]{1,2}[,.][0-9]{1,4})%","required":["financiamento","habitação"]}'::jsonb),
 ('banco-do-brasil','Crédito Imobiliário SBPE','Crédito Imobiliário BB','official_page','https://www.bb.com.br/site/pra-voce/financiamentos/financiamento-imobiliario/',20,'{"rate_regex":"a partir de\\s*([0-9]{1,2}[,.][0-9]{1,4})\\s*%","required":["financiamento imobiliário","SBPE"]}'::jsonb),
 ('bradesco','Crédito Imobiliário Residencial','Simulador de Crédito Imobiliário Bradesco','official_simulator','https://www.bradesco.com.br/html/classic/produtos-servicos/emprestimo-e-financiamento/encontre-seu-credito/simuladores-imoveis.shtm',20,'{"rate_regex":"Taxa de juros efetiva[^0-9]{0,80}([0-9]{1,2}[,.][0-9]{1,4})%","required":["Crédito imobiliário"]}'::jsonb),
 ('itau','Crédito Imobiliário Prefixado','Crédito Imobiliário Itaú','official_page','https://www.itau.com.br/emprestimos-financiamentos/credito-imobiliario',20,'{"rate_regex":"prefixada[^%]{0,180}?([0-9]{1,2}[,.][0-9]{1,4})%","required":["Crédito imobiliário","TR"]}'::jsonb),
 ('itau','Crédito Imobiliário Poupança','Crédito Imobiliário Itaú — Poupança','official_page','https://www.itau.com.br/emprestimos-financiamentos/credito-imobiliario',20,'{"rate_regex":"poupança[^%]{0,220}?([0-9]{1,2}[,.][0-9]{1,4})%","required":["rendimento da poupança"]}'::jsonb),
 ('santander','Crédito Imobiliário Residencial Atualizável','Crédito Imobiliário Santander','official_page','https://www.santander.com.br/creditos-e-financiamentos',20,'{"rate_regex":"taxa a partir de\\s*([0-9]{1,2}[,.][0-9]{1,4})","required":["Crédito Imobiliário","TR"]}'::jsonb)
)
insert into public.mortgage_rate_sources(product_id,name,source_type,url,priority,parser_config)
select p.id,s.source_name,s.source_type,s.url,s.priority,s.parser from seed s join public.mortgage_institutions i on i.slug=s.slug join public.mortgage_products p on p.institution_id=i.id and p.name=s.product_name
on conflict (product_id,url) do update set name=excluded.name,source_type=excluded.source_type,priority=excluded.priority,parser_config=excluded.parser_config;

-- Valores anunciados nas páginas oficiais, identificados em 26/10/2026.
with initial(slug,product_name,rate) as (values
 ('banco-do-brasil','Crédito Imobiliário SBPE',.1160),
 ('bradesco','Crédito Imobiliário Residencial',.1169),
 ('itau','Crédito Imobiliário Prefixado',.1385),
 ('itau','Crédito Imobiliário Poupança',.0832),
 ('santander','Crédito Imobiliário Residencial Atualizável',.1099)
), rows_to_add as (
 select p.id product_id,s.id source_id,x.rate from initial x join public.mortgage_institutions i on i.slug=x.slug join public.mortgage_products p on p.institution_id=i.id and p.name=x.product_name join lateral(select id from public.mortgage_rate_sources where product_id=p.id order by priority desc limit 1)s on true
)
insert into public.mortgage_rate_versions(product_id,source_id,annual_rate,rate_kind,status,source_snapshot)
select product_id,source_id,rate,'advertised','published',jsonb_build_object('seeded_on','2026-10-26','note','Taxa pública oficial; sujeita a perfil e análise') from rows_to_add
where not exists(select 1 from public.mortgage_rate_versions r where r.product_id=rows_to_add.product_id and r.rate_kind='advertised' and r.status='published');

-- Médias do Banco Central para setembro de 2026, modalidade de mercado pós-fixada em TR.
with averages(slug,product_name,rate) as (values
 ('caixa','Crédito Imobiliário SBPE',.1205),
 ('banco-do-brasil','Crédito Imobiliário SBPE',.1449),
 ('bradesco','Crédito Imobiliário Residencial',.1224),
 ('itau','Crédito Imobiliário Prefixado',.1214),
 ('santander','Crédito Imobiliário Residencial Atualizável',.1231)
), rows_to_add as (
 select p.id product_id,s.id source_id,x.rate from averages x join public.mortgage_institutions i on i.slug=x.slug join public.mortgage_products p on p.institution_id=i.id and p.name=x.product_name join public.mortgage_rate_sources s on s.product_id=p.id and s.source_type='bcb_odata'
)
insert into public.mortgage_rate_versions(product_id,source_id,annual_rate,rate_kind,status,effective_from,source_snapshot)
select product_id,source_id,rate,'market_average','published','2026-09-01',jsonb_build_object('reference','2026-09','modality','Financiamento imobiliário com taxas de mercado - Pós-fixado referenciado em TR') from rows_to_add
where not exists(select 1 from public.mortgage_rate_versions r where r.product_id=rows_to_add.product_id and r.rate_kind='market_average' and r.status='published');

