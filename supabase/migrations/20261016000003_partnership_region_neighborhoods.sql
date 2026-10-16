begin;

-- Sugestões reais de bairros a partir dos imóveis públicos ativos em São Paulo.
-- O município é escolhido na relação oficial do IBGE pela interface.
create or replace function public.get_partnership_region_neighborhoods(p_city text)
returns text[] language plpgsql stable security definer set search_path = '' as $$
declare v_city text := lower(trim(coalesce(p_city, '')));
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if char_length(v_city) not between 2 and 100 then return '{}'::text[]; end if;
  return coalesce((
    select array_agg(name order by name)
    from (
      select distinct trim(location.neighborhood) as name
      from public.property_public_locations location
      join public.properties property on property.id = location.property_id and property.status = 'active'
      where upper(trim(location.state)) = 'SP'
        and lower(trim(location.city)) = v_city
        and nullif(trim(location.neighborhood), '') is not null
    ) neighborhoods
  ), '{}'::text[]);
end;
$$;

revoke all on function public.get_partnership_region_neighborhoods(text) from public, anon;
grant execute on function public.get_partnership_region_neighborhoods(text) to authenticated;
notify pgrst, 'reload schema';
commit;
