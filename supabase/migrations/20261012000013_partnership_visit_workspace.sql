begin;
create or replace function public.get_my_partnership_visits()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_result jsonb;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',v.id,'partnership_id',v.partnership_id,'property_id',v.property_id,'lead_id',v.lead_id,'status',v.status,'attendee_name',v.attendee_name,'scheduled_at',v.scheduled_at,'check_in_at',v.check_in_at,'check_out_at',v.check_out_at,'property_title',coalesce(p.title,'Imóvel'),'other_party',case when pp.captor_id=v_uid then coalesce(prt.name,'') else coalesce(cap.name,'') end,'dispute_count',(select count(*) from public.partnership_visit_disputes d where d.visit_id=v.id)) order by coalesce(v.scheduled_at,v.created_at) desc),'[]'::jsonb) into v_result
  from public.partnership_visits v join public.property_partnerships pp on pp.id=v.partnership_id left join public.properties p on p.id=v.property_id left join public.profiles cap on cap.id=pp.captor_id left join public.profiles prt on prt.id=pp.partner_id where pp.captor_id=v_uid or pp.partner_id=v_uid;
  return v_result;
end; $$;
revoke all on function public.get_my_partnership_visits() from public,anon;
grant execute on function public.get_my_partnership_visits() to authenticated;
notify pgrst,'reload schema';
commit;
