begin;

create or replace function public.get_admin_partnership_overview()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_result jsonb;
begin
  if not public.is_admin() then raise exception 'Acesso administrativo necessÃ¡rio'; end if;
  with rows as (
    select pp.id, pp.captor_id, pp.partner_id, pp.property_id, pp.status, pp.started_at, pp.ends_at,
      coalesce(cs.identity->>'portalName', cp.name) as captor_name, cs.subdomain_slug as captor_slug,
      coalesce(ps.identity->>'portalName', ppn.name) as partner_name, ps.subdomain_slug as partner_slug,
      pr.title as property_title, pr.status as property_status,
      (select count(*) from public.partnership_lead_attributions la where la.partnership_id=pp.id)::int as leads_count,
      (select count(*) from public.partnership_visits v where v.partnership_id=pp.id)::int as visits_count
    from public.property_partnerships pp
    join public.profiles cp on cp.id=pp.captor_id
    join public.profiles ppn on ppn.id=pp.partner_id
    left join public.portal_settings cs on cs.owner_profile_id=pp.captor_id
    left join public.portal_settings ps on ps.owner_profile_id=pp.partner_id
    left join public.properties pr on pr.id=pp.property_id
    where pp.status in('active','suspended','disputed')
  )
  select jsonb_build_object('summary',jsonb_build_object('partnerships',count(*),'properties',count(distinct property_id),'active',count(*) filter(where status='active'),'leads',coalesce(sum(leads_count),0),'visits',coalesce(sum(visits_count),0)), 'items',coalesce(jsonb_agg(jsonb_build_object('id',id,'status',status,'captor_name',captor_name,'captor_slug',captor_slug,'partner_name',partner_name,'partner_slug',partner_slug,'property_title',property_title,'property_status',property_status,'started_at',started_at,'ends_at',ends_at,'leads_count',leads_count,'visits_count',visits_count) order by started_at desc),'[]'::jsonb)) into v_result from rows;
  return v_result;
end; $$;
revoke all on function public.get_admin_partnership_overview() from public,anon;
grant execute on function public.get_admin_partnership_overview() to authenticated;
notify pgrst,'reload schema';
commit;
