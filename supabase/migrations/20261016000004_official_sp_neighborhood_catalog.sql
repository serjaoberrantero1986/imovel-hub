begin;

-- Catálogo controlado de bairros do Estado de São Paulo.
-- A carga deve ser feita a partir da malha oficial de bairros do Censo 2022
-- (IBGE), preservando os códigos do município e do bairro. O aplicativo não
-- aceita texto livre nem altera este catálogo.
-- Fonte: https://www.ibge.gov.br/geociencias/organizacao-do-territorio/
-- malhas-territoriais/26565-malhas-desetores-censitarios-divisoes-intramunicipais.html
create table if not exists public.partnership_official_sp_neighborhoods (
  municipality_ibge_id bigint not null,
  municipality_name text not null,
  neighborhood_code text not null,
  neighborhood_name text not null,
  source text not null default 'IBGE_CENSO_2022',
  source_version text not null default '2022',
  updated_at timestamptz not null default now(),
  primary key (municipality_ibge_id, neighborhood_code)
);

create index if not exists partnership_official_sp_neighborhoods_city_idx
  on public.partnership_official_sp_neighborhoods (lower(municipality_name), lower(neighborhood_name));

alter table public.partnership_official_sp_neighborhoods enable row level security;
revoke all on table public.partnership_official_sp_neighborhoods from public, anon, authenticated;

create or replace function public.get_partnership_official_sp_neighborhoods(p_city text)
returns text[] language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(distinct trim(neighborhood_name) order by trim(neighborhood_name)), '{}'::text[])
  from public.partnership_official_sp_neighborhoods
  where lower(trim(municipality_name)) = lower(trim(coalesce(p_city, '')))
    and nullif(trim(neighborhood_name), '') is not null;
$$;

revoke all on function public.get_partnership_official_sp_neighborhoods(text) from public, anon;
grant execute on function public.get_partnership_official_sp_neighborhoods(text) to authenticated;
notify pgrst, 'reload schema';
commit;
