begin;
create or replace function public.get_partnership_visit_otp_recipient(p_visit_id uuid)
returns text language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_target uuid; v_email text;
begin
  perform public.require_partnership_aal2();
  select case when pp.captor_id=v_uid then pp.partner_id when pp.partner_id=v_uid then pp.captor_id else null end into v_target
  from public.partnership_visits v join public.property_partnerships pp on pp.id=v.partnership_id where v.id=p_visit_id;
  if v_target is null then raise exception 'Visit access denied'; end if;
  select lower(trim(email)) into v_email from public.profiles where id=v_target;
  if v_email is null or v_email='' then raise exception 'Recipient email not configured'; end if;
  return v_email;
end; $$;
revoke all on function public.get_partnership_visit_otp_recipient(uuid) from public,anon;
grant execute on function public.get_partnership_visit_otp_recipient(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
