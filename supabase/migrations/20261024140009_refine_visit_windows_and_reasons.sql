-- Refina as janelas operacionais sem alterar visitas ou evidências existentes.
-- Código: 2h antes até 4h depois do fim.
-- Chegada: 1h antes até 4h depois do fim.
-- Ausência: 30min após o início até 24h após o fim.
begin;

alter table public.partnership_visits
  drop constraint if exists partnership_visits_manual_confirmation_reason_check;
alter table public.partnership_visits
  add constraint partnership_visits_manual_confirmation_reason_check
  check(manual_confirmation_reason is null or char_length(trim(manual_confirmation_reason)) between 3 and 1000);

create or replace function public.update_property_visit(p_visit_id uuid,p_revision integer,p_action text,p_start timestamptz default null,
  p_end timestamptz default null,p_reason text default null,p_lat numeric default null,p_lng numeric default null,p_accuracy numeric default null)
returns boolean language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); v public.partnership_visits%rowtype; pro boolean; ev text; evidence jsonb;
  distance_m double precision; receipt jsonb;
begin
  select * into v from public.partnership_visits where id=p_visit_id for update;
  if not found or not coalesce(visit_private.can_access(v,u),false) then raise exception 'VISIT_ACCESS'; end if;
  pro:=visit_private.is_professional(v,u);
  if not pro and v.attendee_profile_id is distinct from u then raise exception 'VISIT_ACCESS'; end if;
  if pro then perform public.require_partnership_aal2(); end if;
  if v.revision<>p_revision then raise exception 'VISIT_STALE'; end if;
  if v.partnership_id is not null and p_action in('confirm','reschedule','check_in','manual_check_in') and not exists(
    select 1 from public.property_partnerships pp join public.partnership_contract_versions cv on cv.id=pp.contract_version_id
    where pp.id=v.partnership_id and pp.status='active' and (pp.ends_at is null or pp.ends_at>now()) and cv.status='verified'
      and cv.id=v.contract_version_id and public.is_eligible_sp_partnership_professional(pp.captor_id)
      and public.is_eligible_sp_partnership_professional(pp.partner_id)) then raise exception 'VISIT_PARTNERSHIP'; end if;
  evidence:=jsonb_build_object('action',p_action,'previous_status',v.status,'reason',nullif(trim(p_reason),''));
  if p_action in('confirm','reschedule') then
    if v.status not in('requested','confirmed') then raise exception 'VISIT_STATE'; end if;
    if p_action='reschedule' then
      perform visit_private.validate_schedule(p_start,p_end,v.responsible_id,v.attendee_profile_id,v.id);
      if char_length(trim(coalesce(p_reason,''))) not between 3 and 1000 then raise exception 'VISIT_REASON'; end if;
      evidence:=evidence||jsonb_build_object('previous_start',v.scheduled_at,'previous_end',v.scheduled_end,'start',p_start,'end',p_end);
      v.scheduled_at:=p_start; v.scheduled_end:=p_end; v.broker_confirmed_at:=null; v.buyer_confirmed_at:=null;
      v.buyer_presence_at:=null; v.otp_hash:=null; v.otp_expires_at:=null;
    else
      perform visit_private.validate_schedule(v.scheduled_at,v.scheduled_end,v.responsible_id,v.attendee_profile_id,v.id);
    end if;
    if pro then v.broker_confirmed_at:=now(); else v.buyer_confirmed_at:=now(); end if;
    v.status:=case when v.broker_confirmed_at is not null and v.buyer_confirmed_at is not null then 'confirmed' else 'requested' end;
    ev:=case when p_action='reschedule' then 'requested' else 'confirmed' end;
  elsif p_action='cancel' then
    if v.status not in('requested','confirmed') then raise exception 'VISIT_STATE'; end if;
    if char_length(trim(coalesce(p_reason,''))) not between 3 and 1000 then raise exception 'VISIT_REASON'; end if;
    v.status:='cancelled'; v.otp_hash:=null; ev:='cancelled';
  elsif p_action='no_show' then
    if not pro or v.status<>'confirmed' or now()<v.scheduled_at+interval '30 minutes'
      or now()>v.scheduled_end+interval '24 hours' then raise exception 'VISIT_STATE'; end if;
    if char_length(trim(coalesce(p_reason,''))) not between 3 and 1000 then raise exception 'VISIT_REASON'; end if;
    v.status:='no_show'; ev:='no_show';
  elsif p_action in('check_in','manual_check_in') then
    if not pro or v.status not in('requested','confirmed') or now()<v.scheduled_at-interval '1 hour'
      or now()>v.scheduled_end+interval '4 hours' then raise exception 'VISIT_STATE'; end if;
    if p_action='check_in' and (v.status<>'confirmed' or v.buyer_presence_at is null) then raise exception 'VISIT_BUYER_PRESENCE'; end if;
    if p_action='manual_check_in' or p_lat is null then
      if char_length(trim(coalesce(p_reason,''))) not between 3 and 1000 then raise exception 'VISIT_REASON'; end if;
      v.manual_confirmation_reason:=trim(p_reason);
    end if;
    if (p_lat is null)<>(p_lng is null) or (p_lat is null)<>(p_accuracy is null)
      or p_lat not between -90 and 90 or p_lng not between -180 and 180 or p_accuracy not between 0 and 100000
      then raise exception 'VISIT_LOCATION'; end if;
    if p_lat is not null and v.location_snapshot->>'quality'='property' then
      distance_m:=6371000*2*asin(sqrt(least(1.0,power(sin(radians((p_lat-(v.location_snapshot->>'lat')::numeric)/2)),2)
        +cos(radians(p_lat))*cos(radians((v.location_snapshot->>'lat')::numeric))
        *power(sin(radians((p_lng-(v.location_snapshot->>'lng')::numeric)/2)),2))));
    end if;
    v.status:='checked_in'; v.check_in_at:=now(); v.check_in_lat:=p_lat; v.check_in_lng:=p_lng; v.check_in_accuracy:=p_accuracy;
    ev:=case when p_action='manual_check_in' then 'manual_confirmed' else 'check_in' end;
    evidence:=evidence||jsonb_build_object('lat',p_lat,'lng',p_lng,'accuracy',p_accuracy,'distance_m',distance_m,
      'reference',v.location_snapshot,'buyer_presence_at',v.buyer_presence_at,'method',case when p_action='manual_check_in' then 'declaratory' else 'buyer_confirmed' end);
  elsif p_action='complete' then
    if not pro or v.status<>'checked_in' then raise exception 'VISIT_STATE'; end if;
    if (p_lat is null)<>(p_lng is null) or (p_lat is null)<>(p_accuracy is null)
      or p_lat not between -90 and 90 or p_lng not between -180 and 180 or p_accuracy not between 0 and 100000
      then raise exception 'VISIT_LOCATION'; end if;
    v.status:='completed'; v.check_out_at:=now(); ev:='completed';
    v.check_out_lat:=p_lat; v.check_out_lng:=p_lng; v.check_out_accuracy:=p_accuracy;
    evidence:=evidence||jsonb_build_object('lat',p_lat,'lng',p_lng,'accuracy',p_accuracy,'location_optional',true);
    -- Saída geográfica opcional; conclusão sem coordenadas é válida.
  else raise exception 'VISIT_ACTION'; end if;
  update public.partnership_visits set scheduled_at=v.scheduled_at,scheduled_end=v.scheduled_end,status=v.status,
    broker_confirmed_at=v.broker_confirmed_at,buyer_confirmed_at=v.buyer_confirmed_at,buyer_presence_at=v.buyer_presence_at,
    check_in_at=v.check_in_at,check_in_lat=v.check_in_lat,check_in_lng=v.check_in_lng,check_in_accuracy=v.check_in_accuracy,
    check_out_at=v.check_out_at,check_out_lat=v.check_out_lat,check_out_lng=v.check_out_lng,check_out_accuracy=v.check_out_accuracy,
    manual_confirmation_reason=v.manual_confirmation_reason,
    otp_hash=v.otp_hash,otp_expires_at=v.otp_expires_at,revision=revision+1,updated_at=now() where id=v.id;
  perform visit_private.record_event(v.id,ev,evidence);
  if p_action='complete' then
    receipt:=jsonb_build_object('id',v.id,'property',v.property_snapshot,'attendee',v.attendee_name,'attendee_id',v.attendee_profile_id,
      'responsible_id',v.responsible_id,'scheduled_at',v.scheduled_at,'check_in_at',v.check_in_at,'completed_at',v.check_out_at,
      'declaration',v.declaration_text,'declaration_version',v.declaration_version,'buyer_presence_at',v.buyer_presence_at,
      'events',(select jsonb_agg(jsonb_build_object('event',e.event,'at',e.created_at,'actor',e.actor_snapshot,'evidence',e.evidence) order by e.created_at,e.id)
        from public.partnership_visit_events e where e.visit_id=v.id));
    update public.partnership_visits set receipt_snapshot=receipt,receipt_hash=encode(extensions.digest(receipt::text,'sha256'),'hex') where id=v.id;
  end if;
  perform visit_private.notify_participants(v,'A visita foi atualizada. Consulte o horário, a situação e o histórico no portal.');
  return true;
end; $$;
revoke all on function public.update_property_visit(uuid,integer,text,timestamptz,timestamptz,text,numeric,numeric,numeric) from public,anon;
grant execute on function public.update_property_visit(uuid,integer,text,timestamptz,timestamptz,text,numeric,numeric,numeric) to authenticated;

create or replace function public.get_my_property_visits() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'VISIT_AUTH'; end if;
  return (select coalesce(jsonb_agg((to_jsonb(v)-array['otp_hash','otp_expires_at','otp_used_at','otp_attempts','location_snapshot'])
    ||jsonb_build_object('property_title',coalesce(v.property_snapshot->>'title',p.title),'is_professional',visit_private.is_professional(v,auth.uid()),
    'responsible_name',pr.name,
    'code_available_at',v.scheduled_at-interval '2 hours','code_expires_at',v.scheduled_end+interval '4 hours',
    'can_send_code',v.status='confirmed' and v.attendee_profile_id is not null and v.buyer_presence_at is null
      and now() between v.scheduled_at-interval '2 hours' and v.scheduled_end+interval '4 hours',
    'check_in_available_at',v.scheduled_at-interval '1 hour','check_in_expires_at',v.scheduled_end+interval '4 hours',
    'can_check_in',visit_private.is_professional(v,auth.uid()) and v.status in('requested','confirmed')
      and now() between v.scheduled_at-interval '1 hour' and v.scheduled_end+interval '4 hours',
    'no_show_available_at',v.scheduled_at+interval '30 minutes','no_show_expires_at',v.scheduled_end+interval '24 hours',
    'can_mark_no_show',visit_private.is_professional(v,auth.uid()) and v.status='confirmed'
      and now() between v.scheduled_at+interval '30 minutes' and v.scheduled_end+interval '24 hours',
    'attendance_method',(select e.event from public.partnership_visit_events e where e.visit_id=v.id and e.event in('check_in','manual_confirmed') order by e.created_at desc limit 1),
    'is_administrator',exists(select 1 from public.profiles a where a.id=auth.uid() and a.role='admin'),
    'dispute_count',(select count(*) from public.partnership_visit_disputes d where d.visit_id=v.id))
    order by v.scheduled_at desc),'[]'::jsonb)
    from public.partnership_visits v join public.properties p on p.id=v.property_id left join public.profiles pr on pr.id=v.responsible_id
    where visit_private.can_access(v,auth.uid()));
end; $$;
revoke all on function public.get_my_property_visits() from public,anon;
grant execute on function public.get_my_property_visits() to authenticated;

create or replace function public.prepare_property_visit_code(p_visit_id uuid,p_actor uuid,p_aal text,p_hash text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.partnership_visits%rowtype; email text;
begin
  select * into v from public.partnership_visits where id=p_visit_id for update;
  if not found or not coalesce(visit_private.can_access(v,p_actor),false) then raise exception 'VISIT_ACCESS'; end if;
  if not visit_private.is_professional(v,p_actor) and v.attendee_profile_id is distinct from p_actor then raise exception 'VISIT_ACCESS'; end if;
  if visit_private.is_professional(v,p_actor) and p_aal is distinct from 'aal2' then raise exception 'VISIT_MFA'; end if;
  if v.status<>'confirmed' or v.attendee_profile_id is null or v.buyer_presence_at is not null
    or now()<v.scheduled_at-interval '2 hours' or now()>v.scheduled_end+interval '4 hours' then raise exception 'VISIT_STATE'; end if;
  if p_hash is null or p_hash!~'^[0-9a-f]{64}$' then raise exception 'VISIT_CODE'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_actor::text,4304));
  if (select count(*) from public.partnership_visit_events where actor_id=p_actor and event='otp_issued' and created_at>now()-interval '1 hour')>=20
    then raise exception 'VISIT_RATE'; end if;
  if v.otp_issued_at>now()-interval '60 seconds' or
    (select count(*) from public.partnership_visit_events where visit_id=v.id and event='otp_issued' and created_at>now()-interval '1 hour')>=5
    then raise exception 'VISIT_RATE'; end if;
  select u.email into email from auth.users u where u.id=v.attendee_profile_id and u.email_confirmed_at is not null;
  if email is null then raise exception 'VISIT_VERIFIED_EMAIL'; end if;
  update public.partnership_visits set otp_hash=p_hash,otp_expires_at=now()+interval '10 minutes',otp_issued_at=now(),
    otp_used_at=null,otp_attempts=0,otp_delivery='pending' where id=v.id;
  insert into public.partnership_visit_events(visit_id,actor_id,actor_snapshot,event,evidence)
    values(v.id,p_actor,jsonb_build_object('id',p_actor),'otp_issued',jsonb_build_object('expires_at',now()+interval '10 minutes'));
  return jsonb_build_object('email',email,'attendee_id',v.attendee_profile_id,'origin',v.source_origin,'brand',v.portal_snapshot->>'portalName');
end; $$;
revoke all on function public.prepare_property_visit_code(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.prepare_property_visit_code(uuid,uuid,text,text) to service_role;

notify pgrst,'reload schema';
commit;
