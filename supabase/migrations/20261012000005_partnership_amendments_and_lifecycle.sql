begin;

-- Fase 3B: aditivos e ciclo de vida. O contrato vigente permanece operacional
-- enquanto uma nova versão é negociada e formalizada.

alter table public.property_partnerships
  add column if not exists termination_requested_by uuid references public.profiles(id) on delete set null,
  add column if not exists termination_requested_at timestamptz,
  add column if not exists termination_reason text,
  add column if not exists status_reason text;

create table if not exists public.property_partnership_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  partnership_id uuid not null references public.property_partnerships(id) on delete restrict,
  contract_version_id uuid references public.partnership_contract_versions(id) on delete restrict,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_snapshot jsonb not null,
  event_type text not null check (event_type in (
    'amendment_proposed','amendment_activated','termination_scheduled','termination_cancelled',
    'terminated','suspended','resumed','disputed'
  )),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists property_partnership_lifecycle_events_partnership
  on public.property_partnership_lifecycle_events(partnership_id,created_at desc);
alter table public.property_partnership_lifecycle_events enable row level security;
revoke all on public.property_partnership_lifecycle_events from public,anon,authenticated;

create or replace function public.get_property_partnership_lifecycle(p_negotiation_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_partnership public.property_partnerships%rowtype;
begin
  select * into v_partnership from public.property_partnerships where negotiation_id=p_negotiation_id;
  if not found then return null; end if;
  if v_uid not in(v_partnership.captor_id,v_partnership.partner_id) and not public.is_admin() then raise exception 'Partnership access denied'; end if;
  return jsonb_build_object(
    'id',v_partnership.id,'status',v_partnership.status,'contract_version_id',v_partnership.contract_version_id,
    'starts_at',v_partnership.starts_at,'ends_at',v_partnership.ends_at,'updated_at',v_partnership.updated_at,
    'termination_requested_by',v_partnership.termination_requested_by,
    'termination_requested_at',v_partnership.termination_requested_at,
    'termination_reason',v_partnership.termination_reason,'status_reason',v_partnership.status_reason,
    'events',coalesce((select jsonb_agg(jsonb_build_object(
      'id',e.id,'event_type',e.event_type,'details',e.details,'actor',e.actor_snapshot,'created_at',e.created_at
    ) order by e.created_at desc) from public.property_partnership_lifecycle_events e where e.partnership_id=v_partnership.id),'[]'::jsonb)
  );
end;
$$;
revoke all on function public.get_property_partnership_lifecycle(uuid) from public,anon;
grant execute on function public.get_property_partnership_lifecycle(uuid) to authenticated;

create or replace function public.propose_property_partnership_amendment(
  p_negotiation_id uuid,p_expected_contract_id uuid,p_terms jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_partnership public.property_partnerships%rowtype;v_neg public.property_partnership_negotiations%rowtype;v_offer public.property_partnership_offers%rowtype;v_current public.property_partnership_term_versions%rowtype;v_next public.property_partnership_term_versions%rowtype;v_other uuid;v_snapshot jsonb;
begin
  perform public.require_partnership_aal2();
  select * into v_partnership from public.property_partnerships where negotiation_id=p_negotiation_id for update;
  if not found or v_partnership.status<>'active' or v_partnership.ends_at is not null then raise exception 'Active partnership required'; end if;
  if v_partnership.contract_version_id<>p_expected_contract_id then raise exception 'Active contract changed'; end if;
  if v_uid not in(v_partnership.captor_id,v_partnership.partner_id) then raise exception 'Partnership access denied'; end if;
  select * into v_neg from public.property_partnership_negotiations where id=p_negotiation_id for update;
  if v_neg.status<>'active' then raise exception 'Amendment already in progress'; end if;
  select * into v_offer from public.property_partnership_offers where id=v_neg.offer_id;
  select * into v_current from public.property_partnership_term_versions where id=v_neg.current_version_id;
  perform public.validate_partnership_terms(p_terms);
  v_next:=public.insert_partnership_term_version(v_neg.id,v_uid,'revision',p_terms,v_current.id);
  update public.property_partnership_negotiations set status='countered',current_version_id=v_next.id,accepted_version_id=null,responded_at=null,preliminary_accepted_at=null,updated_at=now() where id=v_neg.id;
  v_other:=case when v_uid=v_partnership.captor_id then v_partnership.partner_id else v_partnership.captor_id end;
  select jsonb_build_object('profile_id',p.id,'name',p.name,'creci',p.creci,'creci_uf',p.creci_uf) into v_snapshot from public.profiles p where p.id=v_uid;
  insert into public.property_partnership_lifecycle_events(partnership_id,contract_version_id,actor_id,actor_snapshot,event_type,details)
  values(v_partnership.id,v_partnership.contract_version_id,v_uid,v_snapshot,'amendment_proposed',jsonb_build_object('term_version_id',v_next.id,'term_version_number',v_next.version_number));
  insert into public.notifications(user_id,type,title,message,link,data)
  values(v_other,'system_alert'::public.notification_type,'Alteração contratual proposta',coalesce(v_snapshot->>'name','A outra parte')||' propôs novos termos. O contrato atual continua válido até a conclusão do aditivo.','/meus-imoveis',jsonb_build_object('scope','partnership_amendment','negotiation_id',v_neg.id,'term_version',v_next.version_number));
  return jsonb_build_object('negotiation_id',v_neg.id,'term_version',v_next.version_number,'status','countered');
end;
$$;
revoke all on function public.propose_property_partnership_amendment(uuid,uuid,jsonb) from public,anon;
grant execute on function public.propose_property_partnership_amendment(uuid,uuid,jsonb) to authenticated;

create or replace function public.schedule_property_partnership_termination(
  p_partnership_id uuid,p_expected_updated_at timestamptz,p_reason text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_partnership public.property_partnerships%rowtype;v_contract public.partnership_contract_versions%rowtype;v_notice integer;v_effective timestamptz;v_other uuid;v_snapshot jsonb;
begin
  perform public.require_partnership_aal2();
  if char_length(trim(coalesce(p_reason,''))) not between 10 and 2000 then raise exception 'Termination reason required'; end if;
  select * into v_partnership from public.property_partnerships where id=p_partnership_id for update;
  if not found or v_partnership.status<>'active' or v_uid not in(v_partnership.captor_id,v_partnership.partner_id) then raise exception 'Active partnership access required'; end if;
  if v_partnership.updated_at<>p_expected_updated_at then raise exception 'Partnership changed'; end if;
  if v_partnership.ends_at is not null then raise exception 'Termination already scheduled'; end if;
  select * into v_contract from public.partnership_contract_versions where id=v_partnership.contract_version_id;
  v_notice:=greatest(0,least(180,coalesce((v_contract.canonical_terms#>>'{terms,termination_notice_days}')::integer,0)));
  v_effective:=now()+make_interval(days=>v_notice);
  update public.property_partnerships set ends_at=v_effective,termination_requested_by=v_uid,termination_requested_at=now(),termination_reason=trim(p_reason),status=case when v_notice=0 then 'ended' else status end,ended_at=case when v_notice=0 then now() else null end,updated_at=now() where id=v_partnership.id returning * into v_partnership;
  v_other:=case when v_uid=v_partnership.captor_id then v_partnership.partner_id else v_partnership.captor_id end;
  select jsonb_build_object('profile_id',p.id,'name',p.name,'creci',p.creci,'creci_uf',p.creci_uf) into v_snapshot from public.profiles p where p.id=v_uid;
  insert into public.property_partnership_lifecycle_events(partnership_id,contract_version_id,actor_id,actor_snapshot,event_type,details)
  values(v_partnership.id,v_partnership.contract_version_id,v_uid,v_snapshot,case when v_notice=0 then 'terminated' else 'termination_scheduled' end,jsonb_build_object('effective_at',v_effective,'notice_days',v_notice,'reason',trim(p_reason)));
  insert into public.notifications(user_id,type,title,message,link,data)
  values(v_other,'system_alert'::public.notification_type,case when v_notice=0 then 'Parceria encerrada' else 'Encerramento de parceria agendado' end,case when v_notice=0 then 'A parceria foi encerrada. O histórico e as atribuições anteriores foram preservados.' else 'O encerramento foi agendado conforme o aviso prévio contratual. O histórico permanecerá preservado.' end,'/meus-imoveis',jsonb_build_object('scope','partnership_termination','partnership_id',v_partnership.id,'effective_at',v_effective,'reason',trim(p_reason)));
  return public.get_property_partnership_lifecycle(v_partnership.negotiation_id);
end;
$$;
revoke all on function public.schedule_property_partnership_termination(uuid,timestamptz,text) from public,anon;
grant execute on function public.schedule_property_partnership_termination(uuid,timestamptz,text) to authenticated;

create or replace function public.set_property_partnership_administrative_status(
  p_partnership_id uuid,p_expected_updated_at timestamptz,p_status text,p_reason text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_partnership public.property_partnerships%rowtype;v_snapshot jsonb;v_event text;
begin
  if not public.is_admin() then raise exception 'Administrative access required'; end if;
  perform public.require_partnership_aal2();
  if p_status not in('suspended','active','disputed') or char_length(trim(coalesce(p_reason,''))) not between 10 and 2000 then raise exception 'Status and justification required'; end if;
  select * into v_partnership from public.property_partnerships where id=p_partnership_id for update;
  if not found or v_partnership.updated_at<>p_expected_updated_at or v_partnership.status in('ended','expired') then raise exception 'Partnership review changed'; end if;
  v_event:=case p_status when 'suspended' then 'suspended' when 'active' then 'resumed' else 'disputed' end;
  update public.property_partnerships set status=p_status,status_reason=trim(p_reason),suspended_at=case when p_status='suspended' then now() else null end,updated_at=now() where id=v_partnership.id returning * into v_partnership;
  select jsonb_build_object('profile_id',p.id,'name',p.name,'email',p.email) into v_snapshot from public.profiles p where p.id=v_uid;
  insert into public.property_partnership_lifecycle_events(partnership_id,contract_version_id,actor_id,actor_snapshot,event_type,details)
  values(v_partnership.id,v_partnership.contract_version_id,v_uid,v_snapshot,v_event,jsonb_build_object('reason',trim(p_reason)));
  insert into public.notifications(user_id,type,title,message,link,data)
  select party_id,'system_alert'::public.notification_type,'Situação da parceria atualizada','A administração atualizou a situação da parceria. Consulte a justificativa no gerenciamento de imóveis.','/meus-imoveis',jsonb_build_object('scope','partnership_administrative_status','partnership_id',v_partnership.id,'status',p_status,'reason',trim(p_reason))
  from unnest(array[v_partnership.captor_id,v_partnership.partner_id]) party_id where party_id is not null;
  return public.get_property_partnership_lifecycle(v_partnership.negotiation_id);
end;
$$;
revoke all on function public.set_property_partnership_administrative_status(uuid,timestamptz,text,text) from public,anon;
grant execute on function public.set_property_partnership_administrative_status(uuid,timestamptz,text,text) to authenticated;

create or replace function public.preserve_partnership_activation_date()
returns trigger language plpgsql set search_path='' as $$
begin
  if old.status='active' and new.status='active' and old.contract_version_id<>new.contract_version_id then
    new.starts_at:=old.starts_at;
    insert into public.property_partnership_lifecycle_events(partnership_id,contract_version_id,actor_id,actor_snapshot,event_type,details)
    values(old.id,new.contract_version_id,auth.uid(),coalesce((select jsonb_build_object('profile_id',p.id,'name',p.name,'email',p.email) from public.profiles p where p.id=auth.uid()),'{}'::jsonb),'amendment_activated',jsonb_build_object('previous_contract_version_id',old.contract_version_id,'new_contract_version_id',new.contract_version_id));
  end if;
  return new;
end;
$$;
revoke all on function public.preserve_partnership_activation_date() from public,anon,authenticated;
drop trigger if exists preserve_partnership_activation_date on public.property_partnerships;
create trigger preserve_partnership_activation_date before update on public.property_partnerships for each row execute function public.preserve_partnership_activation_date();

create or replace function public.prevent_partnership_lifecycle_event_mutation()
returns trigger language plpgsql set search_path='' as $$begin raise exception 'Partnership lifecycle events are immutable';end;$$;
revoke all on function public.prevent_partnership_lifecycle_event_mutation() from public,anon,authenticated;
drop trigger if exists prevent_partnership_lifecycle_event_mutation on public.property_partnership_lifecycle_events;
create trigger prevent_partnership_lifecycle_event_mutation before update or delete on public.property_partnership_lifecycle_events for each row execute function public.prevent_partnership_lifecycle_event_mutation();

notify pgrst,'reload schema';
commit;
