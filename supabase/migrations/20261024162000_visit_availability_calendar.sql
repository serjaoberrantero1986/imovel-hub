-- Agenda real de visitas: slots de 30 minutos, intervalo operacional e bloqueios privados.
begin;

create table if not exists public.property_visit_unavailability (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('recurring','period')),
  weekdays smallint[],
  starts_on date,
  ends_on date,
  start_time time,
  end_time time,
  all_day boolean not null default false,
  private_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint property_visit_unavailability_label_check check (
    private_label is null or char_length(trim(private_label)) between 1 and 100
  ),
  constraint property_visit_unavailability_shape_check check (
    (kind='recurring' and cardinality(weekdays)>0 and weekdays <@ array[1,2,3,4,5,6,7]::smallint[]
      and starts_on is null and ends_on is null and not all_day and start_time is not null and end_time>start_time)
    or
    (kind='period' and starts_on is not null and ends_on>=starts_on and weekdays is null
      and (all_day or (start_time is not null and end_time>start_time)))
  )
);

create index if not exists property_visit_unavailability_professional
  on public.property_visit_unavailability(professional_id,kind,starts_on,ends_on);
alter table public.property_visit_unavailability enable row level security;
revoke all on public.property_visit_unavailability from public,anon,authenticated;

create or replace function visit_private.is_unavailable(p_professional uuid,p_start timestamptz,p_end timestamptz)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.property_visit_unavailability b
    where b.professional_id=p_professional and (
      (b.kind='recurring'
        and extract(isodow from p_start at time zone 'America/Sao_Paulo')::smallint=any(b.weekdays)
        and tstzrange(p_start,p_end,'[)') && tstzrange(
          ((p_start at time zone 'America/Sao_Paulo')::date+b.start_time) at time zone 'America/Sao_Paulo',
          ((p_start at time zone 'America/Sao_Paulo')::date+b.end_time) at time zone 'America/Sao_Paulo','[)'))
      or
      (b.kind='period' and (p_start at time zone 'America/Sao_Paulo')::date between b.starts_on and b.ends_on
        and (b.all_day or tstzrange(p_start,p_end,'[)') && tstzrange(
          ((p_start at time zone 'America/Sao_Paulo')::date+b.start_time) at time zone 'America/Sao_Paulo',
          ((p_start at time zone 'America/Sao_Paulo')::date+b.end_time) at time zone 'America/Sao_Paulo','[)')))
    )
  );
$$;

create or replace function visit_private.validate_schedule(p_start timestamptz,p_end timestamptz,p_responsible uuid,p_buyer uuid,p_exclude uuid default null)
returns void language plpgsql security definer set search_path='' as $$
declare local_start timestamp:=p_start at time zone 'America/Sao_Paulo'; local_end timestamp:=p_end at time zone 'America/Sao_Paulo';
begin
  if p_start is null or not isfinite(p_start) or p_end is null or not isfinite(p_end)
    or p_start<=now() or p_end-p_start not between interval '15 minutes' and interval '4 hours'
    or p_start>now()+interval '1 year' or local_start::date<>local_end::date
    or extract(minute from local_start)::integer not in(0,30)
    or local_start::time<time '09:00' or local_end::time>time '18:00'
    then raise exception 'VISIT_TIME'; end if;
  if extract(isodow from local_start)::integer in(6,7)
    and not coalesce((select available_weekend_visits from public.profiles where id=p_responsible),false)
    then raise exception 'VISIT_UNAVAILABLE'; end if;
  if visit_private.is_unavailable(p_responsible,p_start,p_end) then raise exception 'VISIT_UNAVAILABLE'; end if;
  perform pg_advisory_xact_lock(hashtextextended(u::text,4301))
    from (select distinct u from unnest(array[p_responsible,p_buyer]) u where u is not null order by u) locks;
  if exists(select 1 from public.partnership_visits v
    where v.responsible_id=p_responsible and v.status in('requested','confirmed','checked_in')
      and v.broker_confirmed_at is not null and (p_exclude is null or v.id<>p_exclude)
      and p_start<coalesce(v.scheduled_end,v.scheduled_at+interval '1 hour')+interval '1 hour'
      and p_end+interval '1 hour'>v.scheduled_at)
    or exists(select 1 from public.partnership_visits v
      where p_buyer is not null and v.attendee_profile_id=p_buyer and v.status in('confirmed','checked_in')
        and (p_exclude is null or v.id<>p_exclude)
        and tstzrange(v.scheduled_at,coalesce(v.scheduled_end,v.scheduled_at+interval '1 hour'),'[)') && tstzrange(p_start,p_end,'[)'))
    then raise exception 'VISIT_CONFLICT'; end if;
end; $$;

create or replace function public.get_property_visit_slots(p_property_id uuid,p_date date,p_partnership_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare owner_id uuid; responsible uuid; pp public.property_partnerships%rowtype; slot_start timestamptz; slot_end timestamptz; result jsonb:='[]'::jsonb;
begin
  if p_date is null or p_date<(now() at time zone 'America/Sao_Paulo')::date or p_date>(now() at time zone 'America/Sao_Paulo')::date+365 then return result; end if;
  select p.user_id into owner_id from public.properties p where p.id=p_property_id and p.status='active';
  if owner_id is null then return result; end if;
  responsible:=owner_id;
  if p_partnership_id is not null then
    select * into pp from public.property_partnerships where id=p_partnership_id and property_id=p_property_id
      and status='active' and (ends_at is null or ends_at>now());
    if not found then return result; end if;
    responsible:=pp.partner_id;
  end if;
  if extract(isodow from p_date)::integer in(6,7)
    and not coalesce((select available_weekend_visits from public.profiles where id=responsible),false) then return result; end if;
  for slot_start in select (candidate at time zone 'America/Sao_Paulo')
    from generate_series(p_date+time '09:00',p_date+time '17:00',interval '30 minutes') candidate
  loop
    slot_end:=slot_start+interval '1 hour';
    if slot_start>now() and not visit_private.is_unavailable(responsible,slot_start,slot_end)
      and not exists(select 1 from public.partnership_visits v
        where v.responsible_id=responsible and v.status in('requested','confirmed','checked_in') and v.broker_confirmed_at is not null
          and slot_start<coalesce(v.scheduled_end,v.scheduled_at+interval '1 hour')+interval '1 hour'
          and slot_end+interval '1 hour'>v.scheduled_at)
    then result:=result||jsonb_build_array(jsonb_build_object('start',slot_start,'end',slot_end,'label',to_char(slot_start at time zone 'America/Sao_Paulo','HH24:MI'))); end if;
  end loop;
  return result;
end; $$;

create or replace function public.get_my_visit_unavailability()
returns jsonb language sql security definer set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'kind',kind,'weekdays',weekdays,'starts_on',starts_on,'ends_on',ends_on,
    'start_time',start_time,'end_time',end_time,'all_day',all_day,'private_label',private_label) order by kind,starts_on,start_time,created_at),'[]'::jsonb)
  from public.property_visit_unavailability where professional_id=auth.uid();
$$;

create or replace function public.save_my_visit_unavailability(p_id uuid,p_kind text,p_weekdays smallint[] default null,
  p_starts_on date default null,p_ends_on date default null,p_start_time time default null,p_end_time time default null,
  p_all_day boolean default false,p_private_label text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); result uuid:=coalesce(p_id,gen_random_uuid());
begin
  if u is null or not exists(select 1 from public.profiles where id=u and role in('broker','agency')) then raise exception 'VISIT_ACCESS'; end if;
  if p_id is not null and not exists(select 1 from public.property_visit_unavailability where id=p_id and professional_id=u) then raise exception 'VISIT_ACCESS'; end if;
  insert into public.property_visit_unavailability(id,professional_id,kind,weekdays,starts_on,ends_on,start_time,end_time,all_day,private_label)
  values(result,u,p_kind,p_weekdays,p_starts_on,p_ends_on,p_start_time,p_end_time,coalesce(p_all_day,false),nullif(trim(p_private_label),''))
  on conflict(id) do update set kind=excluded.kind,weekdays=excluded.weekdays,starts_on=excluded.starts_on,ends_on=excluded.ends_on,
    start_time=excluded.start_time,end_time=excluded.end_time,all_day=excluded.all_day,private_label=excluded.private_label,updated_at=now()
  where public.property_visit_unavailability.professional_id=u;
  return result;
exception when check_violation then raise exception 'VISIT_AVAILABILITY';
end; $$;

create or replace function public.delete_my_visit_unavailability(p_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  delete from public.property_visit_unavailability where id=p_id and professional_id=auth.uid();
  if not found then raise exception 'VISIT_ACCESS'; end if;
  return true;
end; $$;

revoke all on function public.get_property_visit_slots(uuid,date,uuid) from public;
grant execute on function public.get_property_visit_slots(uuid,date,uuid) to anon,authenticated;
revoke all on function public.get_my_visit_unavailability() from public,anon;
grant execute on function public.get_my_visit_unavailability() to authenticated;
revoke all on function public.save_my_visit_unavailability(uuid,text,smallint[],date,date,time,time,boolean,text) from public,anon;
grant execute on function public.save_my_visit_unavailability(uuid,text,smallint[],date,date,time,time,boolean,text) to authenticated;
revoke all on function public.delete_my_visit_unavailability(uuid) from public,anon;
grant execute on function public.delete_my_visit_unavailability(uuid) to authenticated;

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
  update public.partnership_visits set otp_hash=p_hash,otp_expires_at=now()+interval '10 minutes',otp_issued_at=now(),otp_used_at=null,otp_attempts=0,otp_delivery='pending' where id=v.id;
  insert into public.partnership_visit_events(visit_id,actor_id,actor_snapshot,event,evidence)
    values(v.id,p_actor,jsonb_build_object('id',p_actor),'otp_issued',jsonb_build_object('expires_at',now()+interval '10 minutes'));
  return jsonb_build_object('email',email,'attendee_id',v.attendee_profile_id,'attendee_name',v.attendee_name,'origin',v.source_origin,
    'brand',coalesce(v.portal_snapshot->>'portalName','Web Imóveis'),'property_title',coalesce(v.property_snapshot->>'title','Imóvel'),
    'scheduled_at',v.scheduled_at,'scheduled_end',v.scheduled_end);
end; $$;
revoke all on function public.prepare_property_visit_code(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.prepare_property_visit_code(uuid,uuid,text,text) to service_role;

-- A ausência pode ser informada após a tolerância pública de quinze minutos.
create or replace function public.update_property_visit(p_visit_id uuid,p_revision integer,p_action text,p_start timestamptz default null,
  p_end timestamptz default null,p_reason text default null,p_lat numeric default null,p_lng numeric default null,p_accuracy numeric default null)
returns boolean language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); v public.partnership_visits%rowtype; pro boolean; ev text; evidence jsonb; distance_m double precision; receipt jsonb;
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
    elsif pro then
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
  perform visit_private.notify_participants(v,'A visita foi atualizada. Consulte o horário, a situação e o histórico no portal.');
  return true;
end; $$;

-- Atualiza somente os campos derivados da janela de ausência; nenhum registro histórico é alterado.
create or replace function public.get_my_property_visits() returns jsonb language sql security definer set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',v.id,'property_id',v.property_id,'lead_id',v.lead_id,'property_title',coalesce(v.property_snapshot->>'title','Imóvel'),
    'attendee_name',v.attendee_name,'attendee_profile_id',v.attendee_profile_id,'responsible_id',v.responsible_id,'responsible_name',coalesce(r.name,'Profissional'),
    'scheduled_at',v.scheduled_at,'scheduled_end',v.scheduled_end,'status',v.status,'revision',v.revision,'source_origin',v.source_origin,
    'broker_confirmed_at',v.broker_confirmed_at,'buyer_confirmed_at',v.buyer_confirmed_at,'buyer_presence_at',v.buyer_presence_at,'check_in_at',v.check_in_at,'check_out_at',v.check_out_at,
    'manual_confirmation_reason',v.manual_confirmation_reason,'attendance_method',case when v.manual_confirmation_reason is not null then 'manual_confirmed' when v.check_in_at is not null then 'buyer_confirmed' end,
    'declaration_text',v.declaration_text,'receipt_snapshot',v.receipt_snapshot,'receipt_hash',v.receipt_hash,'dispute_count',(select count(*) from public.partnership_visit_disputes d where d.visit_id=v.id),
    'is_professional',visit_private.is_professional(v,auth.uid()),'is_administrator',coalesce((select role='admin' from public.profiles where id=auth.uid()),false),
    'code_available_at',v.scheduled_at-interval '2 hours','code_expires_at',v.scheduled_end+interval '4 hours',
    'can_send_code',v.status='confirmed' and v.buyer_presence_at is null and now() between v.scheduled_at-interval '2 hours' and v.scheduled_end+interval '4 hours',
    'check_in_available_at',v.scheduled_at-interval '1 hour','check_in_expires_at',v.scheduled_end+interval '4 hours',
    'can_check_in',visit_private.is_professional(v,auth.uid()) and v.status in('requested','confirmed') and now() between v.scheduled_at-interval '1 hour' and v.scheduled_end+interval '4 hours',
    'no_show_available_at',v.scheduled_at+interval '15 minutes','no_show_expires_at',v.scheduled_end+interval '24 hours',
    'can_mark_no_show',visit_private.is_professional(v,auth.uid()) and v.status='confirmed' and now() between v.scheduled_at+interval '15 minutes' and v.scheduled_end+interval '24 hours') order by v.scheduled_at desc),'[]'::jsonb)
  from public.partnership_visits v left join public.profiles r on r.id=v.responsible_id where coalesce(visit_private.can_access(v,auth.uid()),false);
$$;

commit;
