begin;

-- Projeção controlada dos dados profissionais necessários às páginas públicas.
-- Não expõe e-mail, telefone, documentos, preferências ou dados administrativos.
create or replace function public.get_public_professional_cards(p_profile_ids uuid[])
returns table(
  id uuid,
  name text,
  avatar_url text,
  role text,
  creci text,
  creci_uf text,
  agency_name text,
  agency_logo text,
  verified boolean,
  bio text,
  city text,
  state text,
  website text,
  instagram text,
  linkedin text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.name,
    p.avatar_url,
    p.role::text,
    p.creci,
    p.creci_uf,
    p.agency_name,
    p.agency_logo,
    p.verified,
    p.bio,
    p.city,
    p.state,
    p.website,
    p.instagram,
    p.linkedin
  from public.profiles p
  where p.id = any(coalesce(p_profile_ids, '{}'::uuid[]))
    and cardinality(coalesce(p_profile_ids, '{}'::uuid[])) between 1 and 200
    and p.is_active = true
    and p.role in ('owner', 'broker', 'agency');
$$;

revoke all on function public.get_public_professional_cards(uuid[]) from public;
grant execute on function public.get_public_professional_cards(uuid[]) to anon, authenticated;

-- O portal parceiro recebe as identidades profissionais das duas partes para
-- mostrar quem captou o imóvel e quem efetivamente atenderá o visitante.
create or replace function public.get_portal_property_inventory(p_portal_owner_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare v_result jsonb;
begin
  if p_portal_owner_id is null then return '[]'::jsonb; end if;
  select coalesce(jsonb_agg(item order by item->>'updated_at' desc),'[]'::jsonb) into v_result
  from (
    select jsonb_build_object(
      'property_id',p.id,'source','owner','updated_at',p.updated_at,'partnership',null
    ) item
    from public.properties p
    where p.user_id=p_portal_owner_id and p.status='active'

    union all

    select jsonb_build_object(
      'property_id',p.id,'source','partnership','updated_at',p.updated_at,
      'partnership',jsonb_build_object(
        'id',pp.id,'contract_version_id',pp.contract_version_id,
        'captor',jsonb_build_object(
          'profile_id',captor.id,'name',captor.name,'avatar_url',captor.avatar_url,
          'agency_name',captor.agency_name,'agency_logo',captor.agency_logo,
          'creci',captor.creci,'creci_uf',captor.creci_uf,'verified',captor.verified
        ),
        'partner',jsonb_build_object(
          'profile_id',partner.id,'name',partner.name,'avatar_url',partner.avatar_url,
          'agency_name',partner.agency_name,'agency_logo',partner.agency_logo,
          'creci',partner.creci,'creci_uf',partner.creci_uf,'verified',partner.verified
        ),
        'property_updated_at',p.updated_at,
        'notice','Disponibilidade e informações mantidas pelo captador.'
      )
    ) item
    from public.property_partnerships pp
    join public.properties p on p.id=pp.property_id and p.status='active'
    join public.partnership_contract_versions cv on cv.id=pp.contract_version_id and cv.status='verified'
    join public.profiles captor on captor.id=pp.captor_id
    join public.profiles partner on partner.id=pp.partner_id
    where pp.partner_id=p_portal_owner_id
      and pp.status='active'
      and (pp.ends_at is null or pp.ends_at>now())
      and coalesce((cv.canonical_terms#>>'{terms,allow_partner_portal}')::boolean,false)
      and public.is_eligible_sp_partnership_professional(pp.captor_id)
      and public.is_eligible_sp_partnership_professional(pp.partner_id)
      and exists(select 1 from public.property_locations l where l.property_id=p.id and upper(l.state)='SP')
  ) inventory;
  return v_result;
end;
$$;

revoke all on function public.get_portal_property_inventory(uuid) from public;
grant execute on function public.get_portal_property_inventory(uuid) to anon, authenticated;

notify pgrst, 'reload schema';

commit;
