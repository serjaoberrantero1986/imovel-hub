begin;

create or replace function public.get_partnership_official_sp_neighborhoods(p_municipality_ibge_id bigint)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(distinct trim(neighborhood_name) order by trim(neighborhood_name)), '{}'::text[])
  from public.partnership_official_sp_neighborhoods
  where municipality_ibge_id = p_municipality_ibge_id
    and nullif(trim(neighborhood_name), '') is not null;
$$;

revoke all on function public.get_partnership_official_sp_neighborhoods(bigint) from public, anon;
grant execute on function public.get_partnership_official_sp_neighborhoods(bigint) to authenticated;

create or replace function public.enforce_sp_partnership_territory()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if trim(coalesce(new.territory_description, '')) <> 'Estado de São Paulo' then
    raise exception 'Partnership territory must be Estado de São Paulo';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_sp_partnership_territory on public.property_partnership_term_versions;
create trigger enforce_sp_partnership_territory
before insert or update of territory_description on public.property_partnership_term_versions
for each row execute function public.enforce_sp_partnership_territory();

revoke all on function public.enforce_sp_partnership_territory() from public, anon, authenticated;
commit;
