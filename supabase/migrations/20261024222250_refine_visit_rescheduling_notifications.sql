-- Agenda de visitas: próxima disponibilidade, remarcação por perfil e avisos detalhados.
create or replace function visit_private.notify_participants(v public.partnership_visits,p_title text,p_message text,p_action text default 'updated') returns void
language plpgsql set search_path='' as $$
begin
  insert into public.notifications(user_id,type,title,message,link,data)
  select distinct u,'system_alert'::public.notification_type,p_title,p_message,
    '/?visit='||v.id::text,jsonb_build_object('scope','property_visit','visit_id',v.id,'action',p_action)
  from unnest(array[v.responsible_id,v.attendee_profile_id]||coalesce((select array[pp.captor_id,pp.partner_id]
    from public.property_partnerships pp where pp.id=v.partnership_id),'{}'::uuid[])) u
  where u is not null and u<>auth.uid();
end; $$;

create or replace function visit_private.notify_participants(v public.partnership_visits,p_message text) returns void
language plpgsql set search_path='' as $$
declare title text; action text; message text;
begin
  title:=case
    when p_message like 'Há uma solicitação%' then 'Nova solicitação de visita'
    when p_message like 'O interessado confirmou%' then 'Presença confirmada pelo interessado'
    when p_message like 'Uma contestação%' then 'Nova atualização em contestação'
    when p_message like 'A administração%' then 'Contestação de visita encerrada'
    else 'Atualização de visita' end;
  action:=case
    when p_message like 'Há uma solicitação%' then 'requested'
    when p_message like 'O interessado confirmou%' then 'presence_confirmed'
    when p_message like 'Uma contestação%' then 'disputed'
    when p_message like 'A administração%' then 'dispute_resolved'
    else 'updated' end;
  message:=case when p_message like 'Há uma solicitação%' then format('Há uma nova solicitação para visitar %s em %s.',coalesce(v.property_snapshot->>'title','o imóvel'),to_char(v.scheduled_at at time zone 'America/Sao_Paulo','DD/MM/YYYY às HH24:MI')) else p_message end;
  perform visit_private.notify_participants(v,title,message,action);
end; $$;

create or replace function visit_private.visit_slots(p_property_id uuid,p_date date,p_partnership_id uuid,p_exclude uuid default null,p_duration integer default 60)
returns jsonb language plpgsql security definer set search_path='' as $$
declare owner_id uuid; responsible uuid; pp public.property_partnerships%rowtype; slot_start timestamptz; slot_end timestamptz; result jsonb:='[]'::jsonb;
begin
  if p_date is null or p_date<(now() at time zone 'America/Sao_Paulo')::date or p_date>(now() at time zone 'America/Sao_Paulo')::date+365 or p_duration not between 15 and 240 then return result; end if;
  select p.user_id into owner_id from public.properties p where p.id=p_property_id and p.status='active'; if owner_id is null then return result; end if;
  responsible:=owner_id;
  if p_partnership_id is not null then select * into pp from public.property_partnerships where id=p_partnership_id and property_id=p_property_id and status='active' and (ends_at is null or ends_at>now()); if not found then return result; end if; responsible:=pp.partner_id; end if;
  for slot_start in select candidate at time zone 'America/Sao_Paulo' from generate_series(p_date+time '00:00',p_date+time '23:30',interval '30 minutes') candidate loop
    slot_end:=slot_start+make_interval(mins=>p_duration);
    if slot_start>=now()+interval '90 minutes' and visit_private.is_within_working_hours(responsible,slot_start,slot_end)
      and not visit_private.is_unavailable(responsible,slot_start,slot_end)
      and not exists(select 1 from public.partnership_visits v where v.id is distinct from p_exclude and v.responsible_id=responsible
        and v.status in('requested','confirmed','checked_in') and v.broker_confirmed_at is not null
        and slot_start<coalesce(v.scheduled_end,v.scheduled_at+interval '1 hour')+interval '1 hour' and slot_end+interval '1 hour'>v.scheduled_at)
    then result:=result||jsonb_build_array(jsonb_build_object('start',slot_start,'end',slot_end,'label',to_char(slot_start at time zone 'America/Sao_Paulo','HH24:MI'))); end if;
  end loop; return result;
end; $$;

create or replace function public.get_property_visit_slots(p_property_id uuid,p_date date,p_partnership_id uuid default null)
returns jsonb language sql security definer set search_path='' as $$ select visit_private.visit_slots(p_property_id,p_date,p_partnership_id,null,60); $$;

create or replace function public.get_next_property_visit_slot(p_property_id uuid,p_from_date date default null,p_partnership_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d date:=greatest(coalesce(p_from_date,(now() at time zone 'America/Sao_Paulo')::date),(now() at time zone 'America/Sao_Paulo')::date); slots jsonb;
begin
  while d<=(now() at time zone 'America/Sao_Paulo')::date+365 loop slots:=visit_private.visit_slots(p_property_id,d,p_partnership_id,null,60); if jsonb_array_length(slots)>0 then return jsonb_build_object('date',d,'slot',slots->0); end if; d:=d+1; end loop;
  return null;
end; $$;

create or replace function public.get_property_visit_reschedule_slots(p_visit_id uuid,p_date date)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.partnership_visits%rowtype; duration integer;
begin
  select * into v from public.partnership_visits where id=p_visit_id;
  if not found or not coalesce(visit_private.can_access(v,auth.uid()),false) then raise exception 'VISIT_ACCESS'; end if;
  duration:=case when visit_private.is_professional(v,auth.uid()) then greatest(15,least(240,(extract(epoch from (v.scheduled_end-v.scheduled_at))/60)::integer)) else 60 end;
  return visit_private.visit_slots(v.property_id,p_date,v.partnership_id,v.id,duration);
end; $$;

create or replace function public.get_my_visit_notice_count() returns integer language sql stable security definer set search_path='' as $$
  select count(*)::integer from public.notifications where user_id=auth.uid() and data->>'scope'='property_visit' and not read;
$$;

create or replace function public.update_property_visit(p_visit_id uuid,p_revision integer,p_action text,p_start timestamptz default null,
  p_end timestamptz default null,p_reason text default null,p_lat numeric default null,p_lng numeric default null,p_accuracy numeric default null)
returns boolean language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); v public.partnership_visits%rowtype; pro boolean; ev text; evidence jsonb; distance_m double precision; receipt jsonb; notice_title text; notice_message text; old_start timestamptz; old_end timestamptz;
begin
  select * into v from public.partnership_visits where id=p_visit_id for update;
  if not found or not coalesce(visit_private.can_access(v,u),false) then raise exception 'VISIT_ACCESS'; end if;
  pro:=visit_private.is_professional(v,u);
  if not pro and v.attendee_profile_id is distinct from u then raise exception 'VISIT_ACCESS'; end if;
  if pro then perform public.require_partnership_aal2(); end if;
  if v.revision<>p_revision then raise exception 'VISIT_STALE'; end if;
  if v.partnership_id is not null and p_action in('confirm','reschedule','adjust_duration','check_in','manual_check_in') and not exists(
    select 1 from public.property_partnerships pp join public.partnership_contract_versions cv on cv.id=pp.contract_version_id
    where pp.id=v.partnership_id and pp.status='active' and (pp.ends_at is null or pp.ends_at>now()) and cv.status='verified'
      and cv.id=v.contract_version_id and public.is_eligible_sp_partnership_professional(pp.captor_id)
      and public.is_eligible_sp_partnership_professional(pp.partner_id)) then raise exception 'VISIT_PARTNERSHIP'; end if;
  old_start:=v.scheduled_at; old_end:=v.scheduled_end;
  evidence:=jsonb_build_object('action',p_action,'previous_status',v.status,'reason',nullif(trim(p_reason),''));
  if p_action in('confirm','reschedule') then
    if v.status not in('requested','confirmed') then raise exception 'VISIT_STATE'; end if;
    if p_action='reschedule' then
      if not pro and p_end-p_start<>interval '1 hour' then raise exception 'VISIT_TIME'; end if;
      perform visit_private.validate_schedule(p_start,p_end,v.responsible_id,v.attendee_profile_id,v.id);
      if char_length(trim(coalesce(p_reason,''))) not between 3 and 1000 then raise exception 'VISIT_REASON'; end if;
      evidence:=evidence||jsonb_build_object('previous_start',v.scheduled_at,'previous_end',v.scheduled_end,'start',p_start,'end',p_end);
      v.scheduled_at:=p_start; v.scheduled_end:=p_end; v.broker_confirmed_at:=null; v.buyer_confirmed_at:=null;
      v.buyer_presence_at:=null; v.otp_hash:=null; v.otp_expires_at:=null;
    elsif pro then
      perform visit_private.validate_schedule(v.scheduled_at,v.scheduled_end,v.responsible_id,v.attendee_profile_id,v.id);
    end if;
    if pro then v.broker_confirmed_at:=now(); else v.buyer_confirmed_at:=now(); end if;
    v.status:=case when v.broker_confirmed_at is not null and v.buyer_confirmed_at is not null then 'confirmed' else 'requested' end;
    ev:=case when p_action='reschedule' then 'requested' else 'confirmed' end;
  elsif p_action='adjust_duration' then
    if not pro or v.status not in('requested','confirmed') or p_end is null or p_end<=v.scheduled_at
      or p_end-v.scheduled_at not between interval '15 minutes' and interval '4 hours'
      or (p_end at time zone 'America/Sao_Paulo')::date<>(v.scheduled_at at time zone 'America/Sao_Paulo')::date
      or not visit_private.is_within_working_hours(v.responsible_id,v.scheduled_at,p_end)
      or visit_private.is_unavailable(v.responsible_id,v.scheduled_at,p_end) then raise exception 'VISIT_TIME'; end if;
    if exists(select 1 from public.partnership_visits x where x.id<>v.id and x.responsible_id=v.responsible_id
      and x.status in('requested','confirmed','checked_in') and x.broker_confirmed_at is not null
      and v.scheduled_at<coalesce(x.scheduled_end,x.scheduled_at+interval '1 hour')+interval '1 hour'
      and p_end+interval '1 hour'>x.scheduled_at) then raise exception 'VISIT_CONFLICT'; end if;
    evidence:=evidence||jsonb_build_object('previous_end',v.scheduled_end,'end',p_end);
    v.scheduled_end:=p_end; ev:='duration_changed';
  elsif p_action='cancel' then
    if v.status not in('requested','confirmed') then raise exception 'VISIT_STATE'; end if;
    if char_length(trim(coalesce(p_reason,''))) not between 3 and 1000 then raise exception 'VISIT_REASON'; end if;
    v.status:='cancelled'; v.otp_hash:=null; ev:='cancelled';
  elsif p_action='no_show' then
    if not pro or v.status<>'confirmed' or now()<v.scheduled_at+interval '15 minutes' or now()>v.scheduled_end+interval '24 hours' then raise exception 'VISIT_STATE'; end if;
    if char_length(trim(coalesce(p_reason,''))) not between 3 and 1000 then raise exception 'VISIT_REASON'; end if;
    v.status:='no_show'; ev:='no_show';
  elsif p_action in('check_in','manual_check_in') then
    if not pro or v.status not in('requested','confirmed') or now()<v.scheduled_at-interval '1 hour' or now()>v.scheduled_end+interval '4 hours' then raise exception 'VISIT_STATE'; end if;
    if p_action='check_in' and (v.status<>'confirmed' or v.buyer_presence_at is null) then raise exception 'VISIT_BUYER_PRESENCE'; end if;
    if p_action='manual_check_in' or p_lat is null then
      if char_length(trim(coalesce(p_reason,''))) not between 3 and 1000 then raise exception 'VISIT_REASON'; end if;
      v.manual_confirmation_reason:=trim(p_reason);
    end if;
    if (p_lat is null)<>(p_lng is null) or (p_lat is null)<>(p_accuracy is null) or p_lat not between -90 and 90 or p_lng not between -180 and 180 or p_accuracy not between 0 and 100000 then raise exception 'VISIT_LOCATION'; end if;
    if p_lat is not null and v.location_snapshot->>'quality'='property' then
      distance_m:=6371000*2*asin(sqrt(least(1.0,power(sin(radians((p_lat-(v.location_snapshot->>'lat')::numeric)/2)),2)+cos(radians(p_lat))*cos(radians((v.location_snapshot->>'lat')::numeric))*power(sin(radians((p_lng-(v.location_snapshot->>'lng')::numeric)/2)),2))));
    end if;
    v.status:='checked_in'; v.check_in_at:=now(); v.check_in_lat:=p_lat; v.check_in_lng:=p_lng; v.check_in_accuracy:=p_accuracy;
    ev:=case when p_action='manual_check_in' then 'manual_confirmed' else 'check_in' end;
    evidence:=evidence||jsonb_build_object('lat',p_lat,'lng',p_lng,'accuracy',p_accuracy,'distance_m',distance_m,'reference',v.location_snapshot,'buyer_presence_at',v.buyer_presence_at,'method',case when p_action='manual_check_in' then 'declaratory' else 'buyer_confirmed' end);
  elsif p_action='complete' then
    if not pro or v.status<>'checked_in' then raise exception 'VISIT_STATE'; end if;
    if (p_lat is null)<>(p_lng is null) or (p_lat is null)<>(p_accuracy is null) or p_lat not between -90 and 90 or p_lng not between -180 and 180 or p_accuracy not between 0 and 100000 then raise exception 'VISIT_LOCATION'; end if;
    v.status:='completed'; v.check_out_at:=now(); ev:='completed'; v.check_out_lat:=p_lat; v.check_out_lng:=p_lng; v.check_out_accuracy:=p_accuracy;
    evidence:=evidence||jsonb_build_object('lat',p_lat,'lng',p_lng,'accuracy',p_accuracy,'location_optional',true);
  else raise exception 'VISIT_ACTION'; end if;
  update public.partnership_visits set scheduled_at=v.scheduled_at,scheduled_end=v.scheduled_end,status=v.status,broker_confirmed_at=v.broker_confirmed_at,
    buyer_confirmed_at=v.buyer_confirmed_at,buyer_presence_at=v.buyer_presence_at,check_in_at=v.check_in_at,check_in_lat=v.check_in_lat,
    check_in_lng=v.check_in_lng,check_in_accuracy=v.check_in_accuracy,check_out_at=v.check_out_at,check_out_lat=v.check_out_lat,
    check_out_lng=v.check_out_lng,check_out_accuracy=v.check_out_accuracy,manual_confirmation_reason=v.manual_confirmation_reason,
    otp_hash=v.otp_hash,otp_expires_at=v.otp_expires_at,revision=revision+1,updated_at=now() where id=v.id;
  perform visit_private.record_event(v.id,ev,evidence);
  if p_action='complete' then
    receipt:=jsonb_build_object('id',v.id,'property',v.property_snapshot,'attendee',v.attendee_name,'attendee_id',v.attendee_profile_id,'responsible_id',v.responsible_id,
      'scheduled_at',v.scheduled_at,'check_in_at',v.check_in_at,'completed_at',v.check_out_at,'declaration',v.declaration_text,'declaration_version',v.declaration_version,
      'buyer_presence_at',v.buyer_presence_at,'events',(select jsonb_agg(jsonb_build_object('event',e.event,'at',e.created_at,'actor',e.actor_snapshot,'evidence',e.evidence) order by e.created_at,e.id) from public.partnership_visit_events e where e.visit_id=v.id));
    update public.partnership_visits set receipt_snapshot=receipt,receipt_hash=encode(extensions.digest(receipt::text,'sha256'),'hex') where id=v.id;
  end if;
  notice_title:=case p_action
    when 'confirm' then 'Horário de visita confirmado'
    when 'reschedule' then 'Visita remarcada'
    when 'adjust_duration' then 'Duração da visita alterada'
    when 'cancel' then 'Visita cancelada'
    when 'no_show' then 'Ausência registrada'
    when 'check_in' then 'Chegada registrada'
    when 'manual_check_in' then 'Chegada registrada pelo profissional'
    when 'complete' then 'Visita concluída' else 'Atualização de visita' end;
  notice_message:=case p_action
    when 'confirm' then format('O horário de %s foi confirmado para %s.',coalesce(v.property_snapshot->>'title','o imóvel'),to_char(v.scheduled_at at time zone 'America/Sao_Paulo','DD/MM/YYYY às HH24:MI'))
    when 'reschedule' then format('A visita a %s foi remarcada de %s para %s.',coalesce(v.property_snapshot->>'title','o imóvel'),to_char(old_start at time zone 'America/Sao_Paulo','DD/MM/YYYY às HH24:MI'),to_char(v.scheduled_at at time zone 'America/Sao_Paulo','DD/MM/YYYY às HH24:MI'))
    when 'adjust_duration' then format('A visita a %s agora termina às %s.',coalesce(v.property_snapshot->>'title','o imóvel'),to_char(v.scheduled_end at time zone 'America/Sao_Paulo','HH24:MI'))
    when 'cancel' then format('A visita a %s foi cancelada. Motivo: %s',coalesce(v.property_snapshot->>'title','o imóvel'),trim(p_reason))
    when 'no_show' then format('Foi registrada ausência na visita a %s. Motivo: %s',coalesce(v.property_snapshot->>'title','o imóvel'),trim(p_reason))
    when 'check_in' then format('A chegada à visita de %s foi registrada.',coalesce(v.property_snapshot->>'title','o imóvel'))
    when 'manual_check_in' then format('O profissional registrou manualmente a chegada à visita de %s.',coalesce(v.property_snapshot->>'title','o imóvel'))
    when 'complete' then format('A visita a %s foi concluída e o comprovante está disponível.',coalesce(v.property_snapshot->>'title','o imóvel'))
    else 'Consulte os detalhes e o histórico da visita no portal.' end;
  perform visit_private.notify_participants(v,notice_title,notice_message,p_action);
  return true;
end; $$;
revoke all on function public.get_next_property_visit_slot(uuid,date,uuid) from public;
grant execute on function public.get_next_property_visit_slot(uuid,date,uuid) to anon,authenticated;
revoke all on function public.get_property_visit_reschedule_slots(uuid,date) from public,anon;
grant execute on function public.get_property_visit_reschedule_slots(uuid,date) to authenticated;
revoke all on function public.get_my_visit_notice_count() from public,anon;
grant execute on function public.get_my_visit_notice_count() to authenticated;
revoke all on all functions in schema visit_private from public,anon,authenticated;
notify pgrst,'reload schema';
