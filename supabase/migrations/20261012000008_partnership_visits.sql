begin;

-- Fase 6: registro pontual de visitas, OTP de uso único e trilha imutável.
create table if not exists public.partnership_visits (
  id uuid primary key default gen_random_uuid(),
  partnership_id uuid not null references public.property_partnerships(id) on delete restrict,
  contract_version_id uuid not null references public.partnership_contract_versions(id) on delete restrict,
  property_id uuid not null references public.properties(id) on delete restrict,
  lead_id uuid references public.leads(id) on delete set null,
  requested_by uuid not null references public.profiles(id) on delete restrict,
  attendee_name text not null check(char_length(trim(attendee_name)) between 2 and 150),
  attendee_profile_id uuid references public.profiles(id) on delete set null,
  scheduled_at timestamptz,
  status text not null default 'requested' check(status in('requested','confirmed','cancelled','checked_in','checked_out','completed','disputed','no_show')),
  check_in_at timestamptz,
  check_out_at timestamptz,
  check_in_lat numeric(9,6), check_in_lng numeric(9,6), check_in_accuracy numeric(8,2),
  check_out_lat numeric(9,6), check_out_lng numeric(9,6), check_out_accuracy numeric(8,2),
  manual_confirmation_reason text check(manual_confirmation_reason is null or char_length(trim(manual_confirmation_reason)) between 10 and 1000),
  declaration_version text not null default 'visit-v1',
  declaration_hash text not null check(declaration_hash~'^[0-9a-f]{64}$'),
  otp_hash text, otp_expires_at timestamptz, otp_used_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.partnership_visit_events (
  id uuid primary key default gen_random_uuid(), visit_id uuid not null references public.partnership_visits(id) on delete restrict,
  actor_id uuid references public.profiles(id) on delete set null, actor_snapshot jsonb not null,
  event text not null check(event in('requested','confirmed','otp_issued','otp_verified','check_in','check_out','manual_confirmed','cancelled','disputed','completed','no_show')),
  evidence jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

create index if not exists partnership_visits_party on public.partnership_visits(requested_by,status,created_at desc);
create index if not exists partnership_visit_events_visit on public.partnership_visit_events(visit_id,created_at);
alter table public.partnership_visits enable row level security;
alter table public.partnership_visit_events enable row level security;
revoke all on public.partnership_visits from public,anon,authenticated;
revoke all on public.partnership_visit_events from public,anon,authenticated;

create or replace function public.create_partnership_visit(p_partnership_id uuid,p_lead_id uuid,p_attendee_name text,p_scheduled_at timestamptz,p_declaration_version text,p_declaration_hash text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_pp public.property_partnerships%rowtype; v_id uuid; v_snap jsonb;
begin
  perform public.require_partnership_aal2();
  select * into v_pp from public.property_partnerships where id=p_partnership_id and status='active' and (ends_at is null or ends_at>now());
  if not found or not(v_pp.captor_id=v_uid or v_pp.partner_id=v_uid) then raise exception 'Active partnership required'; end if;
  if not exists(select 1 from public.partnership_contract_versions cv where cv.id=v_pp.contract_version_id and cv.status='verified') then raise exception 'Verified contract required'; end if;
  if char_length(trim(coalesce(p_attendee_name,''))) not between 2 and 150 then raise exception 'Attendee name required'; end if;
  if p_declaration_hash !~ '^[0-9a-f]{64}$' then raise exception 'Invalid declaration hash'; end if;
  insert into public.partnership_visits(partnership_id,contract_version_id,property_id,lead_id,requested_by,attendee_name,attendee_profile_id,scheduled_at,declaration_version,declaration_hash)
  values(v_pp.id,v_pp.contract_version_id,v_pp.property_id,p_lead_id,v_uid,trim(p_attendee_name),case when p_lead_id is null then null else v_uid end,p_scheduled_at,coalesce(nullif(trim(p_declaration_version),''),'visit-v1'),p_declaration_hash) returning id into v_id;
  select jsonb_build_object('profile_id',p.id,'name',p.name,'creci',p.creci) into v_snap from public.profiles p where p.id=v_uid;
  insert into public.partnership_visit_events(visit_id,actor_id,actor_snapshot,event,evidence) values(v_id,v_uid,v_snap,'requested',jsonb_build_object('declaration_version',p_declaration_version));
  return v_id;
end; $$;
revoke all on function public.create_partnership_visit(uuid,uuid,text,timestamptz,text,text) from public,anon;
grant execute on function public.create_partnership_visit(uuid,uuid,text,timestamptz,text,text) to authenticated;

create or replace function public.issue_partnership_visit_otp(p_visit_id uuid)
returns text language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_visit public.partnership_visits%rowtype; v_code text:=lpad((floor(random()*1000000))::int::text,6,'0'); v_snap jsonb; v_target uuid;
begin
  perform public.require_partnership_aal2();
  select * into v_visit from public.partnership_visits where id=p_visit_id for update;
  if not found then raise exception 'Visit not found'; end if;
  if not exists(select 1 from public.property_partnerships pp where pp.id=v_visit.partnership_id and (pp.captor_id=v_uid or pp.partner_id=v_uid)) then raise exception 'Visit access denied'; end if;
  update public.partnership_visits set otp_hash=encode(extensions.digest(v_code,'sha256'),'hex'),otp_expires_at=now()+interval '10 minutes',otp_used_at=null,updated_at=now() where id=p_visit_id;
  select jsonb_build_object('profile_id',p.id,'name',p.name,'creci',p.creci) into v_snap from public.profiles p where p.id=v_uid;
  select case when pp.captor_id=v_uid then pp.partner_id else pp.captor_id end into v_target from public.property_partnerships pp where pp.id=v_visit.partnership_id;
  insert into public.partnership_visit_events(visit_id,actor_id,actor_snapshot,event,evidence) values(p_visit_id,v_uid,v_snap,'otp_issued',jsonb_build_object('expires_at',now()+interval '10 minutes'));
  insert into public.notifications(user_id,type,title,message,link,data) values(v_target,'system_alert'::public.notification_type,'Código de confirmação de visita','Foi emitido um código de uso único para confirmar a visita. Consulte o canal seguro configurado para recebê-lo.','/crm',jsonb_build_object('scope','partnership_visit_otp','visit_id',p_visit_id,'delivery','external_channel_required'));
  return v_code;
end; $$;
revoke all on function public.issue_partnership_visit_otp(uuid) from public,anon;
grant execute on function public.issue_partnership_visit_otp(uuid) to authenticated;

create or replace function public.confirm_partnership_visit_checkin(p_visit_id uuid,p_code text,p_lat numeric,p_lng numeric,p_accuracy numeric,p_manual_reason text default null)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_visit public.partnership_visits%rowtype; v_snap jsonb; v_event text;
begin
  perform public.require_partnership_aal2();
  select * into v_visit from public.partnership_visits where id=p_visit_id for update;
  if not found then raise exception 'Visit not found'; end if;
  if not exists(select 1 from public.property_partnerships pp where pp.id=v_visit.partnership_id and (pp.captor_id=v_uid or pp.partner_id=v_uid)) then raise exception 'Visit access denied'; end if;
  if v_visit.status not in('requested','confirmed') then raise exception 'Visit cannot be checked in'; end if;
  if p_manual_reason is null and (v_visit.otp_hash is null or v_visit.otp_expires_at<now() or v_visit.otp_used_at is not null or encode(extensions.digest(trim(coalesce(p_code,'')),'sha256'),'hex')<>v_visit.otp_hash) then raise exception 'Invalid or expired visit code'; end if;
  if p_manual_reason is null and (p_lat is null or p_lng is null) then raise exception 'Location required for check-in'; end if;
  if p_manual_reason is not null and char_length(trim(p_manual_reason))<10 then raise exception 'Manual reason required'; end if;
  update public.partnership_visits set status='checked_in',check_in_at=now(),check_in_lat=p_lat,check_in_lng=p_lng,check_in_accuracy=p_accuracy,manual_confirmation_reason=case when p_manual_reason is null then manual_confirmation_reason else trim(p_manual_reason) end,otp_used_at=case when p_manual_reason is null then now() else otp_used_at end,updated_at=now() where id=p_visit_id;
  select jsonb_build_object('profile_id',p.id,'name',p.name,'creci',p.creci) into v_snap from public.profiles p where p.id=v_uid;
  v_event:=case when p_manual_reason is null then 'check_in' else 'manual_confirmed' end;
  insert into public.partnership_visit_events(visit_id,actor_id,actor_snapshot,event,evidence) values(p_visit_id,v_uid,v_snap,v_event,jsonb_build_object('lat',p_lat,'lng',p_lng,'accuracy',p_accuracy));
  return true;
end; $$;
revoke all on function public.confirm_partnership_visit_checkin(uuid,text,numeric,numeric,numeric,text) from public,anon;
grant execute on function public.confirm_partnership_visit_checkin(uuid,text,numeric,numeric,numeric,text) to authenticated;

create or replace function public.confirm_partnership_visit_checkout(p_visit_id uuid,p_lat numeric,p_lng numeric,p_accuracy numeric)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_snap jsonb;
begin
  perform public.require_partnership_aal2();
  if not exists(select 1 from public.partnership_visits v join public.property_partnerships pp on pp.id=v.partnership_id where v.id=p_visit_id and v.status='checked_in' and (pp.captor_id=v_uid or pp.partner_id=v_uid)) then raise exception 'Checked-in visit not found'; end if;
  update public.partnership_visits set status='completed',check_out_at=now(),check_out_lat=p_lat,check_out_lng=p_lng,check_out_accuracy=p_accuracy,updated_at=now() where id=p_visit_id;
  select jsonb_build_object('profile_id',p.id,'name',p.name,'creci',p.creci) into v_snap from public.profiles p where p.id=v_uid;
  insert into public.partnership_visit_events(visit_id,actor_id,actor_snapshot,event,evidence) values(p_visit_id,v_uid,v_snap,'check_out',jsonb_build_object('lat',p_lat,'lng',p_lng,'accuracy',p_accuracy));
  return true;
end; $$;
revoke all on function public.confirm_partnership_visit_checkout(uuid,numeric,numeric,numeric) from public,anon;
grant execute on function public.confirm_partnership_visit_checkout(uuid,numeric,numeric,numeric) to authenticated;

create or replace function public.prevent_partnership_visit_event_mutation() returns trigger language plpgsql set search_path='' as $$ begin raise exception 'Visit evidence is immutable'; end; $$;
drop trigger if exists prevent_partnership_visit_event_mutation on public.partnership_visit_events;
create trigger prevent_partnership_visit_event_mutation before update or delete on public.partnership_visit_events for each row execute function public.prevent_partnership_visit_event_mutation();
revoke all on function public.prevent_partnership_visit_event_mutation() from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
