begin;

-- Bairros colaborativos são distintos do catálogo oficial; preservar origem.
create table if not exists public.community_neighborhoods (
  id bigint generated always as identity primary key,
  municipality_ibge_id integer not null check (municipality_ibge_id between 3500000 and 3599999),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  normalized_name text not null check (char_length(normalized_name) between 2 and 120),
  created_by uuid references public.profiles(id) on delete set null,
  source text not null default 'broker' check (source in ('broker','cep','admin')),
  status text not null default 'active' check (status in ('active','hidden')),
  created_at timestamptz not null default now(),
  unique(municipality_ibge_id, normalized_name)
);
create index if not exists community_neighborhoods_city_idx
  on public.community_neighborhoods (municipality_ibge_id,name);
alter table public.community_neighborhoods enable row level security;
revoke all on public.community_neighborhoods from public, anon, authenticated;
grant select on public.community_neighborhoods to authenticated;
create policy "Bairros informados podem ser consultados por usuários autenticados"
  on public.community_neighborhoods for select to authenticated
  using (status='active');

-- Sem grants de INSERT/UPDATE na tabela: toda inclusão é validada pelo RPC.
create or replace function public.register_community_neighborhood(
 p_municipality_ibge_id integer,
 p_name text,
 p_source text default 'broker'
) returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_name text := regexp_replace(btrim(coalesce(p_name,'')), '\s+', ' ', 'g');
  v_key text;
  v_role text;
  v_count integer;
begin
  if auth.uid() is null or not public.has_satisfied_mfa() then
    raise exception 'Autenticação profissional necessária.';
  end if;
  select p.role::text into v_role from public.profiles p
    where p.id=auth.uid() and p.is_active=true;
  if coalesce(v_role,'') not in ('broker','agency','admin') then
    raise exception 'Somente profissionais podem adicionar bairros.';
  end if;
  if p_municipality_ibge_id is null or p_municipality_ibge_id not between 3500000 and 3599999
     or char_length(v_name) not between 2 and 120
     or v_name ~ '[<>]' then
    raise exception 'Município ou nome de bairro inválido.';
  end if;
  if p_source not in ('broker','cep') then
    raise exception 'Origem de bairro inválida.';
  end if;
  v_key := btrim(regexp_replace(
    translate(lower(v_name),'áàâãäéêèëíìîïóòôõöúùûüç','aaaaaeeeeiiiiooooouuuuc'),
    '[^[:alnum:] ]+', ' ', 'g'
  ));
  v_key := regexp_replace(v_key,'\s+',' ','g');
  if char_length(v_key)<2 then
    raise exception 'Bairro inválido após normalização.';
  end if;
  select count(*) into v_count from public.community_neighborhoods
    where created_by=auth.uid() and created_at>now()-interval '1 hour';
  if v_count>=40 then
    raise exception 'Limite temporário de novos bairros atingido.';
  end if;
  insert into public.community_neighborhoods
    (municipality_ibge_id,name,normalized_name,created_by,source)
    values (p_municipality_ibge_id,v_name,v_key,auth.uid(),p_source)
    on conflict (municipality_ibge_id,normalized_name) do nothing;
  return v_name;
end;
$$;
revoke all on function public.register_community_neighborhood(integer,text,text) from public,anon;
grant execute on function public.register_community_neighborhood(integer,text,text) to authenticated;
comment on table public.community_neighborhoods is
  'Bairros sugeridos pelos profissionais; distintos dos oficiais, filtrados por municipio IBGE.';

commit;
