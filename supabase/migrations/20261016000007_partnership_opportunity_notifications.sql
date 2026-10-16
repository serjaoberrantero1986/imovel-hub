begin;

alter table public.partnership_network_members
  add column if not exists notify_opportunities boolean not null default false;

-- A função original permanece responsável por conexões e MFA; somente a
-- projeção do membro recebe o novo consentimento.
create or replace function public.get_my_partnership_network()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_result jsonb;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not public.has_satisfied_mfa() then raise exception 'MFA verification required'; end if;
  select jsonb_build_object(
    'eligible', public.is_eligible_sp_partnership_professional(v_uid),
    'member', case when m.profile_id is null then null else jsonb_build_object('profile_id',m.profile_id,'status',m.status,'accepts_sale',m.accepts_sale,'accepts_rent',m.accepts_rent,'accepts_launch',m.accepts_launch,'specialties',to_jsonb(m.specialties),'introduction',m.introduction,'joined_at',m.joined_at,'updated_at',m.updated_at,'notify_opportunities',m.notify_opportunities) end,
    'regions', coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'state',r.state,'city',r.city,'neighborhood',r.neighborhood) order by r.city,r.neighborhood nulls first) from public.partnership_member_regions r where r.profile_id=v_uid),'[]'::jsonb),
    'connections', coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'status',c.status,'direction',case when c.requester_id=v_uid then 'sent' else 'received' end,'requested_at',c.requested_at,'responded_at',c.responded_at,'updated_at',c.updated_at,'partner',jsonb_build_object('profile_id',p.id,'name',p.name,'avatar_url',p.avatar_url,'creci',p.creci,'creci_uf',p.creci_uf,'portal_slug',ps.subdomain_slug,'portal_title',coalesce(nullif(ps.identity->>'portalName',''),nullif(p.agency_name,''),p.name))) order by c.updated_at desc) from public.partnership_connections c join public.profiles p on p.id=case when c.requester_id=v_uid then c.recipient_id else c.requester_id end left join public.portal_settings ps on ps.owner_profile_id=p.id where v_uid in(c.requester_id,c.recipient_id)),'[]'::jsonb)
  ) into v_result from (select 1) seed left join public.partnership_network_members m on m.profile_id=v_uid;
  return v_result;
end;
$$;

create or replace function public.save_my_partnership_membership(
  p_enabled boolean, p_accepts_sale boolean, p_accepts_rent boolean, p_accepts_launch boolean,
  p_specialties text[], p_introduction text, p_regions jsonb, p_notify_opportunities boolean default false
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_result jsonb;
begin
  v_result := public.save_my_partnership_membership(p_enabled,p_accepts_sale,p_accepts_rent,p_accepts_launch,p_specialties,p_introduction,p_regions);
  update public.partnership_network_members set notify_opportunities = coalesce(p_notify_opportunities,false), updated_at = now() where profile_id = auth.uid();
  return public.get_my_partnership_network();
end;
$$;

revoke all on function public.save_my_partnership_membership(boolean,boolean,boolean,boolean,text[],text,jsonb,boolean) from public, anon;
grant execute on function public.save_my_partnership_membership(boolean,boolean,boolean,boolean,text[],text,jsonb,boolean) to authenticated;
notify pgrst, 'reload schema';
commit;
