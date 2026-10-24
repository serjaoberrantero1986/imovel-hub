-- Jornada semanal explícita, antecedência mínima e emissão de código restrita ao profissional.
create table if not exists public.property_visit_working_hours (
  professional_id uuid not null references public.profiles(id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),
  enabled boolean not null default false,
  start_time time not null default time '09:00',
  end_time time not null default time '18:00',
  updated_at timestamptz not null default now(),
  primary key (professional_id,weekday),
  check (start_time<end_time),
  check (extract(minute from start_time)::integer in (0,30)),
  check (extract(minute from end_time)::integer in (0,30))
);

alter table public.property_visit_working_hours enable row level security;
revoke all on public.property_visit_working_hours from public,anon,authenticated;

insert into public.property_visit_working_hours(professional_id,weekday,enabled,start_time,end_time)
select p.id,d,case when d<=5 then true else p.available_weekend_visits end,time '09:00',time '18:00'
from public.profiles p cross join generate_series(1,7) d
where p.role in ('broker','agency')
on conflict(professional_id,weekday) do nothing;

create or replace function visit_private.seed_visit_working_hours()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.role in ('broker','agency') then
    insert into public.property_visit_working_hours(professional_id,weekday,enabled,start_time,end_time)
    select new.id,d,d<=5,time '09:00',time '18:00' from generate_series(1,7) d
    on conflict(professional_id,weekday) do nothing;
  end if;
  return new;
end; $$;

drop trigger if exists seed_visit_working_hours on public.profiles;
create trigger seed_visit_working_hours after insert or update of role on public.profiles
for each row execute function visit_private.seed_visit_working_hours();

create or replace function visit_private.is_within_working_hours(p_professional uuid,p_start timestamptz,p_end timestamptz)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.property_visit_working_hours h
    where h.professional_id=p_professional and h.enabled
      and h.weekday=extract(isodow from p_start at time zone 'America/Sao_Paulo')::integer
      and (p_start at time zone 'America/Sao_Paulo')::date=(p_end at time zone 'America/Sao_Paulo')::date
      and (p_start at time zone 'America/Sao_Paulo')::time>=h.start_time
      and (p_end at time zone 'America/Sao_Paulo')::time<=h.end_time
  );
$$;

create or replace function public.get_my_visit_working_hours()
returns jsonb language sql security definer set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object('weekday',weekday,'enabled',enabled,'start_time',start_time,'end_time',end_time) order by weekday),'[]'::jsonb)
  from public.property_visit_working_hours where professional_id=auth.uid();
$$;

create or replace function public.save_my_visit_working_hours(p_hours jsonb)
returns boolean language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); item jsonb; seen smallint[]:='{}'; d smallint; starts time; ends time;
begin
  if u is null or not exists(select 1 from public.profiles where id=u and role in('broker','agency')) then raise exception 'VISIT_ACCESS'; end if;
  if jsonb_typeof(p_hours)<>'array' or jsonb_array_length(p_hours)<>7 then raise exception 'VISIT_WORKING_HOURS'; end if;
  for item in select value from jsonb_array_elements(p_hours) loop
    d:=(item->>'weekday')::smallint; starts:=(item->>'start_time')::time; ends:=(item->>'end_time')::time;
    if d not between 1 and 7 or d=any(seen) or starts>=ends
      or extract(minute from starts)::integer not in(0,30) or extract(minute from ends)::integer not in(0,30)
      then raise exception 'VISIT_WORKING_HOURS'; end if;
    seen:=array_append(seen,d);
    insert into public.property_visit_working_hours(professional_id,weekday,enabled,start_time,end_time)
    values(u,d,coalesce((item->>'enabled')::boolean,false),starts,ends)
    on conflict(professional_id,weekday) do update set enabled=excluded.enabled,start_time=excluded.start_time,end_time=excluded.end_time,updated_at=now();
  end loop;
  return true;
exception when invalid_text_representation or datetime_field_overflow then raise exception 'VISIT_WORKING_HOURS';
end; $$;

revoke all on function public.get_my_visit_working_hours() from public,anon;
grant execute on function public.get_my_visit_working_hours() to authenticated;
revoke all on function public.save_my_visit_working_hours(jsonb) from public,anon;
grant execute on function public.save_my_visit_working_hours(jsonb) to authenticated;

create or replace function visit_private.validate_schedule(p_start timestamptz,p_end timestamptz,p_responsible uuid,p_buyer uuid,p_exclude uuid default null)
returns void language plpgsql security definer set search_path='' as $$
declare
  local_start timestamp:=p_start at time zone 'America/Sao_Paulo';
  local_end timestamp:=p_end at time zone 'America/Sao_Paulo';
  require_lead boolean:=p_exclude is null or not exists(
    select 1 from public.partnership_visits v where v.id=p_exclude and v.scheduled_at=p_start and v.scheduled_end=p_end
  );
begin
  if p_start is null or not isfinite(p_start) or p_end is null or not isfinite(p_end)
    or p_start<=now() or (require_lead and p_start<now()+interval '90 minutes')
    or p_end-p_start not between interval '15 minutes' and interval '4 hours'
    or p_start>now()+interval '1 year' or local_start::date<>local_end::date
    or extract(minute from local_start)::integer not in(0,30)
    or not visit_private.is_within_working_hours(p_responsible,p_start,p_end)
    then raise exception 'VISIT_TIME'; end if;
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
    select * into pp from public.property_partnerships where id=p_partnership_id and property_id=p_property_id and status='active' and (ends_at is null or ends_at>now());
    if not found then return result; end if; responsible:=pp.partner_id;
  end if;
  for slot_start in select candidate at time zone 'America/Sao_Paulo'
    from generate_series(p_date+time '00:00',p_date+time '23:30',interval '30 minutes') candidate
  loop
    slot_end:=slot_start+interval '1 hour';
    if slot_start>=now()+interval '90 minutes' and visit_private.is_within_working_hours(responsible,slot_start,slot_end)
      and not visit_private.is_unavailable(responsible,slot_start,slot_end)
      and not exists(select 1 from public.partnership_visits v
        where v.responsible_id=responsible and v.status in('requested','confirmed','checked_in') and v.broker_confirmed_at is not null
          and slot_start<coalesce(v.scheduled_end,v.scheduled_at+interval '1 hour')+interval '1 hour'
          and slot_end+interval '1 hour'>v.scheduled_at)
    then result:=result||jsonb_build_array(jsonb_build_object('start',slot_start,'end',slot_end,'label',to_char(slot_start at time zone 'America/Sao_Paulo','HH24:MI'))); end if;
  end loop;
  return result;
end; $$;

create or replace function public.prepare_property_visit_code(p_visit_id uuid,p_actor uuid,p_aal text,p_hash text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.partnership_visits%rowtype; email text;
begin
  select * into v from public.partnership_visits where id=p_visit_id for update;
  if not found or not visit_private.is_professional(v,p_actor) then raise exception 'VISIT_ACCESS'; end if;
  if p_aal is distinct from 'aal2' then raise exception 'VISIT_MFA'; end if;
  if v.status<>'confirmed' or v.attendee_profile_id is null or v.buyer_presence_at is not null
    or now()<v.scheduled_at-interval '2 hours' or now()>v.scheduled_end+interval '4 hours' then raise exception 'VISIT_STATE'; end if;
  if p_hash is null or p_hash!~'^[0-9a-f]{64}$' then raise exception 'VISIT_CODE'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_actor::text,4304));
  if (select count(*) from public.partnership_visit_events where actor_id=p_actor and event='otp_issued' and created_at>now()-interval '1 hour')>=20
    or v.otp_issued_at>now()-interval '60 seconds'
    or (select count(*) from public.partnership_visit_events where visit_id=v.id and event='otp_issued' and created_at>now()-interval '1 hour')>=5
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

-- can_send_code passa a refletir também o papel do participante.
create or replace function public.get_my_property_visits() returns jsonb language sql security definer set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',v.id,'property_id',v.property_id,'lead_id',v.lead_id,'property_title',coalesce(v.property_snapshot->>'title','Imóvel'),
    'attendee_name',v.attendee_name,'attendee_profile_id',v.attendee_profile_id,'responsible_id',v.responsible_id,'responsible_name',coalesce(r.name,'Profissional'),
    'scheduled_at',v.scheduled_at,'scheduled_end',v.scheduled_end,'status',v.status,'revision',v.revision,'source_origin',v.source_origin,
    'broker_confirmed_at',v.broker_confirmed_at,'buyer_confirmed_at',v.buyer_confirmed_at,'buyer_presence_at',v.buyer_presence_at,'check_in_at',v.check_in_at,'check_out_at',v.check_out_at,
    'manual_confirmation_reason',v.manual_confirmation_reason,'attendance_method',case when v.manual_confirmation_reason is not null then 'manual_confirmed' when v.check_in_at is not null then 'buyer_confirmed' end,
    'declaration_text',v.declaration_text,'receipt_snapshot',v.receipt_snapshot,'receipt_hash',v.receipt_hash,'dispute_count',(select count(*) from public.partnership_visit_disputes d where d.visit_id=v.id),
    'is_professional',visit_private.is_professional(v,auth.uid()),'is_administrator',coalesce((select role='admin' from public.profiles where id=auth.uid()),false),
    'code_available_at',v.scheduled_at-interval '2 hours','code_expires_at',v.scheduled_end+interval '4 hours',
    'check_in_available_at',v.scheduled_at-interval '1 hour','check_in_expires_at',v.scheduled_end+interval '4 hours',
    'no_show_available_at',v.scheduled_at+interval '15 minutes','no_show_expires_at',v.scheduled_end+interval '24 hours',
    'can_send_code',visit_private.is_professional(v,auth.uid()) and v.status='confirmed' and v.buyer_presence_at is null and now() between v.scheduled_at-interval '2 hours' and v.scheduled_end+interval '4 hours',
    'can_check_in',visit_private.is_professional(v,auth.uid()) and v.status in('requested','confirmed') and now() between v.scheduled_at-interval '1 hour' and v.scheduled_end+interval '4 hours',
    'can_mark_no_show',visit_private.is_professional(v,auth.uid()) and now() between v.scheduled_at+interval '15 minutes' and v.scheduled_end+interval '24 hours')
    order by v.scheduled_at desc),'[]'::jsonb)
  from public.partnership_visits v left join public.profiles r on r.id=v.responsible_id where coalesce(visit_private.can_access(v,auth.uid()),false);
$$;
