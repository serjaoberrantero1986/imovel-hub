begin;

create or replace function public.get_partnership_opportunities(
  p_city text default null,
  p_neighborhood text default null,
  p_purpose text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_result jsonb;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not public.has_satisfied_mfa() then raise exception 'MFA verification required'; end if;
  if not public.is_eligible_sp_partnership_professional(v_uid) then
    raise exception 'Eligible CRECI-SP professional required';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'offer_id', o.id,
    'property_id', o.property_id,
    'property', o.property_snapshot,
    'captor', o.captor_snapshot,
    'city', l.city,
    'neighborhood', l.neighborhood,
    'created_at', o.created_at
  ) order by o.created_at desc), '[]'::jsonb)
  into v_result
  from public.property_partnership_offers o
  join public.properties p on p.id = o.property_id
  join public.property_locations l on l.property_id = p.id and upper(l.state) = 'SP'
  join public.partnership_member_regions r
    on r.profile_id = v_uid
   and upper(r.state) = 'SP'
   and lower(trim(r.city)) = lower(trim(l.city))
   and (r.neighborhood is null or lower(trim(r.neighborhood)) = lower(trim(l.neighborhood)))
  where o.status = 'open'
    and p.status = 'active'
    and o.captor_id <> v_uid
    and (nullif(trim(coalesce(p_city, '')), '') is null or lower(trim(l.city)) = lower(trim(p_city)))
    and (nullif(trim(coalesce(p_neighborhood, '')), '') is null or lower(trim(l.neighborhood)) = lower(trim(p_neighborhood)))
    and (nullif(trim(coalesce(p_purpose, '')), '') is null or lower(trim(p.purpose)) = lower(trim(p_purpose)))
    and not exists (select 1 from public.property_partnership_negotiations n where n.offer_id = o.id);

  return v_result;
end;
$$;

revoke all on function public.get_partnership_opportunities(text, text, text) from public, anon;
grant execute on function public.get_partnership_opportunities(text, text, text) to authenticated;
notify pgrst, 'reload schema';
commit;
