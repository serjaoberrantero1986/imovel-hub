begin;

-- Reconcilia apenas a expressão de e-mail divergente, preservando o restante
-- da função de contatos instalada e seus vínculos/históricos.
do $repair$
declare definition text;
begin
  select pg_get_functiondef('public.submit_property_contact(uuid,text,text,text,text,text,uuid)'::regprocedure) into definition;
  if position(chr(92)||chr(92)||'.' in definition)>0 then
    execute replace(definition,chr(92)||chr(92)||'.',chr(92)||'.');
  end if;
end; $repair$;

-- Aditiva: conserva IDs, contratos, visitas e evidências anteriores.
alter table public.partnership_visits alter column partnership_id drop not null;
alter table public.partnership_visits alter column contract_version_id drop not null;
alter table public.partnership_visits
  add column responsible_id uuid references public.profiles(id) on delete restrict,
  add column scheduled_end timestamptz,
  add column revision integer not null default 1,
  add column broker_confirmed_at timestamptz,
  add column buyer_confirmed_at timestamptz,
  add column buyer_presence_at timestamptz,
  add column declaration_text text,
  add column location_snapshot jsonb,
  add column property_snapshot jsonb,
  add column receipt_snapshot jsonb,
  add column receipt_hash text,
  add column request_key uuid,
  add column source_origin text,
  add column portal_snapshot jsonb,
  add column otp_attempts integer not null default 0,
  add column otp_issued_at timestamptz,
  add column otp_delivery text;

-- Não reinterpretar identidades legadas: evidência original permanece intacta.
update public.partnership_visits v set responsible_id=pp.partner_id
from public.property_partnerships pp where pp.id=v.partnership_id and v.responsible_id is null;
create unique index visit_request_key on public.partnership_visits(requested_by,request_key) where request_key is not null;
create index visit_responsible_schedule on public.partnership_visits(responsible_id,scheduled_at);
create index visit_attendee_schedule on public.partnership_visits(attendee_profile_id,scheduled_at);

create schema if not exists visit_private;
revoke all on schema visit_private from public,anon,authenticated;

-- Helpers não expostos à Data API. Cada entrada pública verifica seu participante.
create function visit_private.can_access(v public.partnership_visits,u uuid) returns boolean
language sql stable set search_path='' as $$
  select u is not null and (u=v.responsible_id or u=v.attendee_profile_id or exists(
    select 1 from public.property_partnerships pp where pp.id=v.partnership_id and u in(pp.captor_id,pp.partner_id))
    or (auth.jwt()->>'aal'='aal2' and exists(select 1 from public.profiles p where p.id=u and p.role='admin')
      and exists(select 1 from public.partnership_visit_disputes d where d.visit_id=v.id)))
$$;
create function visit_private.is_professional(v public.partnership_visits,u uuid) returns boolean
language sql stable set search_path='' as $$
  select u is not null and (u=v.responsible_id or exists(
    select 1 from public.property_partnerships pp where pp.id=v.partnership_id and u in(pp.captor_id,pp.partner_id)))
$$;
create function visit_private.record_event(v_id uuid,p_event text,p_evidence jsonb) returns void
language plpgsql set search_path='' as $$
begin
  insert into public.partnership_visit_events(visit_id,actor_id,actor_snapshot,event,evidence)
  select v_id,auth.uid(),jsonb_build_object('id',p.id,'name',p.name,'creci',p.creci),p_event,p_evidence
  from public.profiles p where p.id=auth.uid();
end; $$;
create function visit_private.notify_participants(v public.partnership_visits,p_message text) returns void
language plpgsql set search_path='' as $$
begin
  insert into public.notifications(user_id,type,title,message,link,data)
  select distinct u,'system_alert'::public.notification_type,'Atualização de visita',p_message,
    '/?visit='||v.id::text,jsonb_build_object('scope','property_visit','visit_id',v.id)
  from unnest(array[v.responsible_id,v.attendee_profile_id]||coalesce((select array[pp.captor_id,pp.partner_id]
    from public.property_partnerships pp where pp.id=v.partnership_id),'{}'::uuid[])) u where u is not null and u<>auth.uid();
end; $$;
create function visit_private.validate_schedule(p_start timestamptz,p_end timestamptz,p_responsible uuid,p_buyer uuid,p_exclude uuid default null) returns void
language plpgsql set search_path='' as $$
begin
  if p_start is null or not isfinite(p_start) or p_end is null or not isfinite(p_end)
    or p_start<=now() or p_end-p_start not between interval '15 minutes' and interval '4 hours'
    or p_start>now()+interval '1 year' then raise exception 'VISIT_TIME'; end if;
  -- Serializa a disponibilidade por profissional e interessado, em ordem estável.
  perform pg_advisory_xact_lock(hashtextextended(u::text,4301))
    from (select distinct u from unnest(array[p_responsible,p_buyer]) u where u is not null order by u) locks;
  if exists(select 1 from public.partnership_visits v
    where (v.responsible_id=p_responsible or (p_buyer is not null and v.attendee_profile_id=p_buyer))
      and v.status in('confirmed','checked_in') and (p_exclude is null or v.id<>p_exclude)
      and tstzrange(v.scheduled_at,coalesce(v.scheduled_end,v.scheduled_at+interval '1 hour'),'[)') && tstzrange(p_start,p_end,'[)'))
    then raise exception 'VISIT_CONFLICT'; end if;
end; $$;

create function public.schedule_property_visit(p_property_id uuid,p_start timestamptz,p_end timestamptz,p_request_key uuid,
  p_lead_id uuid default null,p_partnership_id uuid default null,p_origin text default 'https://www.webimoveis.site')
returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); v_id uuid; owner_id uuid; responsible uuid; buyer uuid; buyer_name text;
  v_lead uuid; pp public.property_partnerships%rowtype; professional boolean; location jsonb; prop jsonb; portal jsonb;
  declaration constant text:='O agendamento depende do aceite dos participantes. A presença é registrada separadamente. A localização é pontual e não comprova, isoladamente, a presença. Declarações manuais são identificadas e podem ser contestadas.';
begin
  if u is null then raise exception 'VISIT_AUTH'; end if;
  if p_request_key is null then raise exception 'VISIT_REQUEST_KEY'; end if;
  perform pg_advisory_xact_lock(hashtextextended(u::text,4303));
  perform pg_advisory_xact_lock(hashtextextended(u::text||p_request_key::text,4302));
  select id into v_id from public.partnership_visits where requested_by=u and request_key=p_request_key;
  if v_id is not null then return v_id; end if;
  if (select count(*) from public.partnership_visits where requested_by=u and created_at>now()-interval '1 day')>=30
    then raise exception 'VISIT_DAILY_LIMIT'; end if;
  select p.user_id,jsonb_build_object('id',p.id,'title',p.title) into owner_id,prop
    from public.properties p where p.id=p_property_id and p.status='active';
  if owner_id is null then raise exception 'VISIT_PROPERTY'; end if;
  responsible:=owner_id;
  if p_partnership_id is not null then
    select * into pp from public.property_partnerships where id=p_partnership_id and property_id=p_property_id
      and status='active' and (ends_at is null or ends_at>now());
    if not found or not exists(select 1 from public.partnership_contract_versions c where c.id=pp.contract_version_id and c.status='verified')
      or not public.is_eligible_sp_partnership_professional(pp.captor_id) or not public.is_eligible_sp_partnership_professional(pp.partner_id)
      then raise exception 'VISIT_PARTNERSHIP'; end if;
    responsible:=pp.partner_id;
  end if;
  professional:=u=owner_id or u=responsible;
  if p_origin is null then raise exception 'VISIT_PORTAL'; end if;
  if p_origin in ('https://www.webimoveis.site','https://webimoveis.site') then
    select identity into portal from public.portal_settings where id='default';
  else
    select identity into portal from public.portal_settings where owner_profile_id=responsible
      and p_origin='https://'||subdomain_slug||'.webimoveis.site';
    if not found then raise exception 'VISIT_PORTAL'; end if;
  end if;
  if professional then
    perform public.require_partnership_aal2();
    if p_lead_id is null then raise exception 'VISIT_LEAD'; end if;
    select l.id,l.buyer_id,l.name into v_lead,buyer,buyer_name from public.leads l
      where l.id=p_lead_id and l.advertiser_id=responsible
      and (l.property_id=p_property_id or exists(select 1 from public.lead_contact_events e where e.lead_id=l.id and e.property_id=p_property_id));
    if v_lead is null or buyer=responsible or buyer=owner_id then raise exception 'VISIT_LEAD'; end if;
  else
    if p_lead_id is not null then raise exception 'VISIT_LEAD'; end if;
    buyer:=u;
    select name into buyer_name from public.profiles where id=u;
    if buyer_name is null then raise exception 'VISIT_PROFILE'; end if;
  end if;
  perform visit_private.validate_schedule(p_start,p_end,responsible,buyer);
  if not professional then
    select c.lead_id into v_lead from public.submit_property_contact(p_property_id,buyer_name,
      (select email from public.profiles where id=u),(select phone from public.profiles where id=u),
      'Solicitação de visita para '||to_char(p_start at time zone 'America/Sao_Paulo','DD/MM/YYYY HH24:MI')||' (Brasília).',
      'schedule_visit',p_partnership_id) c;
  end if;
  select jsonb_build_object('quality',coordinate_quality,'lat',case when coordinate_quality='property' then latitude end,
    'lng',case when coordinate_quality='property' then longitude end,'captured_at',now()) into location
    from public.property_locations where property_id=p_property_id limit 1;
  insert into public.partnership_visits(partnership_id,contract_version_id,property_id,lead_id,requested_by,
    responsible_id,attendee_name,attendee_profile_id,scheduled_at,scheduled_end,request_key,
    broker_confirmed_at,buyer_confirmed_at,declaration_version,declaration_text,declaration_hash,location_snapshot,property_snapshot,source_origin,portal_snapshot)
  values(p_partnership_id,pp.contract_version_id,p_property_id,v_lead,u,responsible,buyer_name,buyer,p_start,p_end,p_request_key,
    case when professional then now() end,case when not professional then now() end,
    'visit-v2',declaration,encode(extensions.digest(declaration,'sha256'),'hex'),location,prop,p_origin,portal) returning id into v_id;
  perform visit_private.record_event(v_id,'requested',jsonb_build_object('start',p_start,'end',p_end,'timezone','America/Sao_Paulo',
    'buyer_id',buyer,'responsible_id',responsible,'declaration',declaration,'property',prop));
  perform visit_private.notify_participants(v,'Há uma solicitação de visita aguardando confirmação.') from public.partnership_visits v where id=v_id;
  return v_id;
end; $$;
revoke all on function public.schedule_property_visit(uuid,timestamptz,timestamptz,uuid,uuid,uuid,text) from public,anon;
grant execute on function public.schedule_property_visit(uuid,timestamptz,timestamptz,uuid,uuid,uuid,text) to authenticated;

-- Revoga os atalhos legados que permitiam obter código ou atribuir o corretor ao comprador.
revoke all on function public.issue_partnership_visit_otp(uuid) from public,anon,authenticated;
revoke all on function public.get_partnership_visit_otp_recipient(uuid) from public,anon,authenticated;
revoke all on function public.create_partnership_visit(uuid,uuid,text,timestamptz,text,text) from public,anon,authenticated;
revoke all on function public.confirm_partnership_visit_checkin(uuid,text,numeric,numeric,numeric,text) from public,anon,authenticated;
revoke all on function public.confirm_partnership_visit_checkout(uuid,numeric,numeric,numeric) from public,anon,authenticated;

create function public.update_property_visit(p_visit_id uuid,p_revision integer,p_action text,p_start timestamptz default null,
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
      if char_length(trim(coalesce(p_reason,''))) not between 10 and 1000 then raise exception 'VISIT_REASON'; end if;
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
    if char_length(trim(coalesce(p_reason,''))) not between 10 and 1000 then raise exception 'VISIT_REASON'; end if;
    v.status:='cancelled'; v.otp_hash:=null; ev:='cancelled';
  elsif p_action='no_show' then
    if not pro or v.status<>'confirmed' or now()<v.scheduled_end then raise exception 'VISIT_STATE'; end if;
    if char_length(trim(coalesce(p_reason,''))) not between 10 and 1000 then raise exception 'VISIT_REASON'; end if;
    v.status:='no_show'; ev:='no_show';
  elsif p_action in('check_in','manual_check_in') then
    if not pro or v.status not in('requested','confirmed') or now()<v.scheduled_at-interval '2 hours'
      or now()>v.scheduled_end+interval '12 hours' then raise exception 'VISIT_STATE'; end if;
    if p_action='check_in' and (v.status<>'confirmed' or v.buyer_presence_at is null) then raise exception 'VISIT_BUYER_PRESENCE'; end if;
    if p_action='manual_check_in' or p_lat is null then
      if char_length(trim(coalesce(p_reason,''))) not between 10 and 1000 then raise exception 'VISIT_REASON'; end if;
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

create function public.get_my_property_visits() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'VISIT_AUTH'; end if;
  return (select coalesce(jsonb_agg((to_jsonb(v)-array['otp_hash','otp_expires_at','otp_used_at','otp_attempts','location_snapshot'])
    ||jsonb_build_object('property_title',coalesce(v.property_snapshot->>'title',p.title),'is_professional',visit_private.is_professional(v,auth.uid()),
    'responsible_name',pr.name,'attendance_method',(select e.event from public.partnership_visit_events e where e.visit_id=v.id and e.event in('check_in','manual_confirmed') order by e.created_at desc limit 1),
    'is_administrator',exists(select 1 from public.profiles a where a.id=auth.uid() and a.role='admin'),
    'dispute_count',(select count(*) from public.partnership_visit_disputes d where d.visit_id=v.id))
    order by v.scheduled_at desc),'[]'::jsonb)
    from public.partnership_visits v join public.properties p on p.id=v.property_id left join public.profiles pr on pr.id=v.responsible_id
    where visit_private.can_access(v,auth.uid()));
end; $$;
revoke all on function public.get_my_property_visits() from public,anon;
grant execute on function public.get_my_property_visits() to authenticated;

-- Entrega externa: somente o serviço autenticado pode preparar o desafio.
create function public.prepare_property_visit_code(p_visit_id uuid,p_actor uuid,p_aal text,p_hash text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.partnership_visits%rowtype; email text;
begin
  select * into v from public.partnership_visits where id=p_visit_id for update;
  if not found or not coalesce(visit_private.can_access(v,p_actor),false) then raise exception 'VISIT_ACCESS'; end if;
  if not visit_private.is_professional(v,p_actor) and v.attendee_profile_id is distinct from p_actor then raise exception 'VISIT_ACCESS'; end if;
  if visit_private.is_professional(v,p_actor) and p_aal is distinct from 'aal2' then raise exception 'VISIT_MFA'; end if;
  if v.status<>'confirmed' or v.attendee_profile_id is null or v.buyer_presence_at is not null
    or now()<v.scheduled_at-interval '2 hours' or now()>v.scheduled_end+interval '12 hours' then raise exception 'VISIT_STATE'; end if;
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

create function public.finish_property_visit_code_delivery(p_visit_id uuid,p_hash text,p_sent boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
  update public.partnership_visits set otp_delivery=case when p_sent then 'sent' else 'failed' end,
    otp_hash=case when p_sent then otp_hash else null end
    where id=p_visit_id and otp_hash=p_hash;
end; $$;
revoke all on function public.finish_property_visit_code_delivery(uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.finish_property_visit_code_delivery(uuid,text,boolean) to service_role;

create function public.verify_property_visit_presence(p_visit_id uuid,p_code text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v public.partnership_visits%rowtype;
begin
  select * into v from public.partnership_visits where id=p_visit_id for update;
  if not found or auth.uid() is null or v.attendee_profile_id is distinct from auth.uid() then raise exception 'VISIT_ACCESS'; end if;
  if v.status<>'confirmed' or v.buyer_presence_at is not null then raise exception 'VISIT_STATE'; end if;
  if v.otp_hash is null or v.otp_expires_at<=now() or v.otp_used_at is not null or v.otp_attempts>=5 or v.otp_delivery<>'sent'
    then return jsonb_build_object('ok',false,'error','VISIT_CODE'); end if;
  -- Resposta normal em falha: o incremento não pode ser desfeito por uma exceção.
  update public.partnership_visits set otp_attempts=otp_attempts+1 where id=v.id;
  if p_code is null or p_code!~'^[0-9]{6}$' or encode(extensions.digest(p_code,'sha256'),'hex')<>v.otp_hash
    then return jsonb_build_object('ok',false,'error','VISIT_CODE'); end if;
  update public.partnership_visits set buyer_presence_at=now(),otp_used_at=now(),otp_hash=null,revision=revision+1,updated_at=now() where id=v.id;
  perform visit_private.record_event(v.id,'otp_verified',jsonb_build_object('participant_id',auth.uid(),'declaration_version',v.declaration_version,'declaration',v.declaration_text));
  perform visit_private.notify_participants(v,'O interessado confirmou sua presença. O profissional pode registrar a chegada.');
  return jsonb_build_object('ok',true);
end; $$;
revoke all on function public.verify_property_visit_presence(uuid,text) from public,anon;
grant execute on function public.verify_property_visit_presence(uuid,text) to authenticated;

-- Os corpos antigos também deixam de oferecer caminhos inseguros a integrações antigas.
create or replace function public.issue_partnership_visit_otp(p_visit_id uuid) returns text
language plpgsql security definer set search_path='' as $$ begin raise exception 'VISIT_USE_SECURE_DELIVERY'; end; $$;
create or replace function public.get_partnership_visit_otp_recipient(p_visit_id uuid) returns text
language plpgsql security definer set search_path='' as $$ begin raise exception 'VISIT_USE_SECURE_DELIVERY'; end; $$;

create function public.get_property_visit_history(p_visit_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v public.partnership_visits%rowtype;
begin
  select * into v from public.partnership_visits where id=p_visit_id;
  if not found or not coalesce(visit_private.can_access(v,auth.uid()),false) then raise exception 'VISIT_ACCESS'; end if;
  return jsonb_build_object('events',(select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at,e.id),'[]') from public.partnership_visit_events e where e.visit_id=v.id),
    'disputes',(select coalesce(jsonb_agg(to_jsonb(d)||jsonb_build_object('responses',(select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at),'[]')
      from public.partnership_visit_dispute_responses r where r.dispute_id=d.id)) order by d.opened_at),'[]') from public.partnership_visit_disputes d where d.visit_id=v.id));
end; $$;
revoke all on function public.get_property_visit_history(uuid) from public,anon;
grant execute on function public.get_property_visit_history(uuid) to authenticated;

create function public.dispute_property_visit(p_visit_id uuid,p_statement text,p_dispute_id uuid default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare v public.partnership_visits%rowtype; d public.partnership_visit_disputes%rowtype; result_id uuid; ev text;
begin
  select * into v from public.partnership_visits where id=p_visit_id for update;
  if not found or not coalesce(visit_private.can_access(v,auth.uid()),false) then raise exception 'VISIT_ACCESS'; end if;
  if visit_private.is_professional(v,auth.uid()) then perform public.require_partnership_aal2(); end if;
  if char_length(trim(coalesce(p_statement,''))) not between 20 and 4000 then raise exception 'VISIT_STATEMENT'; end if;
  if p_dispute_id is null then
    if exists(select 1 from public.partnership_visit_disputes where visit_id=v.id and opened_by=auth.uid() and status in('open','responded')) then raise exception 'VISIT_DISPUTE_EXISTS'; end if;
    insert into public.partnership_visit_disputes(visit_id,opened_by,category,statement) values(v.id,auth.uid(),'other',trim(p_statement)) returning id into result_id;
    ev:='opened';
  else
    select * into d from public.partnership_visit_disputes where id=p_dispute_id and visit_id=v.id for update;
    if not found or d.status not in('open','responded') then raise exception 'VISIT_STATE'; end if;
    insert into public.partnership_visit_dispute_responses(dispute_id,responder_id,statement) values(d.id,auth.uid(),trim(p_statement));
    update public.partnership_visit_disputes set status='responded' where id=d.id;
    result_id:=d.id; ev:='responded';
  end if;
  insert into public.partnership_visit_dispute_events(dispute_id,actor_id,actor_snapshot,event,evidence)
    select result_id,auth.uid(),jsonb_build_object('id',p.id,'name',p.name),ev,jsonb_build_object('visit_id',v.id) from public.profiles p where p.id=auth.uid();
  perform visit_private.notify_participants(v,'Uma contestação ou resposta foi registrada no histórico da visita.');
  return result_id;
end; $$;
revoke all on function public.dispute_property_visit(uuid,text,uuid) from public,anon;
grant execute on function public.dispute_property_visit(uuid,text,uuid) to authenticated;
-- Impede que a API legada substitua o estado operacional por disputed.
revoke all on function public.open_partnership_visit_dispute(uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.respond_partnership_visit_dispute(uuid,text,text) from public,anon,authenticated;

create function public.resolve_property_visit_dispute(p_dispute_id uuid,p_reason text) returns boolean
language plpgsql security definer set search_path='' as $$
declare d public.partnership_visit_disputes%rowtype; v public.partnership_visits%rowtype;
begin
  perform public.require_partnership_aal2();
  if not exists(select 1 from public.profiles where id=auth.uid() and role='admin') then raise exception 'VISIT_ACCESS'; end if;
  if char_length(trim(coalesce(p_reason,''))) not between 20 and 2000 then raise exception 'VISIT_STATEMENT'; end if;
  select * into d from public.partnership_visit_disputes where id=p_dispute_id for update;
  if not found or d.status not in('open','responded') then raise exception 'VISIT_STATE'; end if;
  update public.partnership_visit_disputes set status='resolved',resolved_at=now(),resolution_reason=trim(p_reason) where id=d.id;
  insert into public.partnership_visit_dispute_events(dispute_id,actor_id,actor_snapshot,event,evidence)
    select d.id,auth.uid(),jsonb_build_object('id',p.id,'name',p.name),'resolved',jsonb_build_object('reason',trim(p_reason)) from public.profiles p where p.id=auth.uid();
  select * into v from public.partnership_visits where id=d.visit_id;
  perform visit_private.notify_participants(v,'A administração registrou uma resposta final à contestação. O registro original da visita foi preservado.');
  return true;
end; $$;
revoke all on function public.resolve_property_visit_dispute(uuid,text) from public,anon;
grant execute on function public.resolve_property_visit_dispute(uuid,text) to authenticated;

create function public.get_my_visit_notices() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'VISIT_AUTH'; end if;
  return (select coalesce(jsonb_agg(to_jsonb(n)),'[]') from (select id,title,message,created_at,data->>'visit_id' as visit_id
    from public.notifications where user_id=auth.uid() and data->>'scope'='property_visit' and not read order by created_at desc limit 20) n);
end; $$;
revoke all on function public.get_my_visit_notices() from public,anon;
grant execute on function public.get_my_visit_notices() to authenticated;
create function public.mark_my_visit_notice_read(p_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'VISIT_AUTH'; end if;
  update public.notifications set read=true,read_at=now() where id=p_id and user_id=auth.uid() and data->>'scope'='property_visit';
  return found;
end; $$;
revoke all on function public.mark_my_visit_notice_read(uuid) from public,anon;
grant execute on function public.mark_my_visit_notice_read(uuid) to authenticated;

-- Não expor helpers nem confiar em metadados editáveis do usuário.
revoke all on all functions in schema visit_private from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
