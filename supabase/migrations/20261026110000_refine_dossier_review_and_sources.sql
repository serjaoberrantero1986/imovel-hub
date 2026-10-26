begin;

create or replace function public.review_and_recalculate_deal_document_item(p_item_id uuid,p_decision text,p_note text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_dossier_id uuid;v_result jsonb;v_total integer;v_done integer;v_progress integer;v_blockers integer;
begin
 select r.dossier_id into v_dossier_id from public.deal_document_request_items i join public.deal_document_requests r on r.id=i.request_id where i.id=p_item_id;
 if v_dossier_id is null then raise exception 'DEAL_ITEM_INVALID';end if;
 v_result:=public.review_deal_document_item(p_item_id,p_decision,p_note);
 select coalesce(sum(i.weight),0),coalesce(sum(i.weight) filter(where i.status in('approved','not_applicable')),0) into v_total,v_done from public.deal_document_request_items i join public.deal_document_requests r on r.id=i.request_id where r.dossier_id=v_dossier_id;
 select count(*) into v_blockers from public.deal_review_findings where dossier_id=v_dossier_id and kind='blocking' and status='open';
 v_progress:=case when v_total=0 then 10 else least(90,10+round(80.0*v_done/v_total)::integer) end;
 update public.deal_dossiers set progress=v_progress,current_stage=case when v_total>0 then 'review' else current_stage end,status=case when v_total>0 and v_done=v_total and v_blockers=0 then 'ready_for_contract' else 'reviewing' end,updated_at=now() where id=v_dossier_id;
 return v_result||jsonb_build_object('progress',v_progress,'approved_weight',v_done,'total_weight',v_total,'open_blockers',v_blockers);
end;$$;
revoke all on function public.review_and_recalculate_deal_document_item(uuid,text,text) from public,anon;
grant execute on function public.review_and_recalculate_deal_document_item(uuid,text,text) to authenticated;

drop policy if exists "authenticated reads certificate sources" on public.deal_certificate_sources;
create policy "authenticated reads certificate sources" on public.deal_certificate_sources for select to authenticated using(active or public.is_admin());
create policy "administrators insert certificate sources" on public.deal_certificate_sources for insert to authenticated with check(public.is_admin());
create policy "administrators update certificate sources" on public.deal_certificate_sources for update to authenticated using(public.is_admin()) with check(public.is_admin());
grant insert,update on public.deal_certificate_sources to authenticated;

create table if not exists public.deal_certificate_source_audit(
 id uuid primary key default gen_random_uuid(),source_id uuid not null references public.deal_certificate_sources(id) on delete restrict,actor_id uuid not null references public.profiles(id) on delete restrict,action text not null check(action in('created','updated','deactivated','reactivated')),before_data jsonb,after_data jsonb,created_at timestamptz not null default now()
);
alter table public.deal_certificate_source_audit enable row level security;
revoke all on public.deal_certificate_source_audit from public,anon;
grant select on public.deal_certificate_source_audit to authenticated;
create policy "administrators read certificate source audit" on public.deal_certificate_source_audit for select to authenticated using(public.is_admin());
create or replace function public.audit_deal_certificate_source()returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'DEAL_ACCESS_DENIED';end if;
 insert into public.deal_certificate_source_audit(source_id,actor_id,action,before_data,after_data)values(new.id,auth.uid(),case when tg_op='INSERT' then 'created' when old.active and not new.active then 'deactivated' when not old.active and new.active then 'reactivated' else 'updated' end,case when tg_op='UPDATE' then to_jsonb(old) end,to_jsonb(new));return new;
end;$$;
revoke all on function public.audit_deal_certificate_source() from public,anon,authenticated;
drop trigger if exists trg_audit_deal_certificate_source on public.deal_certificate_sources;
create trigger trg_audit_deal_certificate_source after insert or update on public.deal_certificate_sources for each row execute function public.audit_deal_certificate_source();

create or replace function public.prepare_negotiation_review_selected(p_actor uuid,p_negotiation_version_id uuid,p_participant_ids uuid[],p_valid_days integer default 7)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_version public.deal_negotiation_versions%rowtype;v_dossier public.deal_dossiers%rowtype;v_round uuid;v_participant record;v_token text;v_reviewers jsonb:='[]'::jsonb;v_count integer:=0;
begin
 if p_actor is null or p_valid_days not between 1 and 30 or coalesce(array_length(p_participant_ids,1),0)=0 then raise exception 'DEAL_REVIEW_INVALID';end if;
 select * into v_version from public.deal_negotiation_versions where id=p_negotiation_version_id for update;
 select * into v_dossier from public.deal_dossiers where id=v_version.dossier_id and owner_id=p_actor;
 if not found then raise exception 'DEAL_ACCESS_DENIED';end if;
 if v_version.status not in('draft','presented') then raise exception 'DEAL_NEGOTIATION_REVIEW_UNAVAILABLE';end if;
 if exists(select 1 from unnest(p_participant_ids) x(id) left join public.deal_participants p on p.id=x.id and p.dossier_id=v_dossier.id and p.status<>'inactive' where p.id is null or nullif(btrim(coalesce(p.email,'')),'') is null) then raise exception 'DEAL_REVIEWERS_EMAIL_REQUIRED';end if;
 select id into v_round from public.deal_negotiation_review_rounds where negotiation_version_id=v_version.id and status in('active','changes_requested') order by created_at desc limit 1 for update;
 if v_round is null then
  update public.deal_negotiation_review_rounds r set status='superseded',closed_at=now() from public.deal_negotiation_versions prior where prior.id=r.negotiation_version_id and prior.dossier_id=v_dossier.id and r.status in('active','changes_requested');
  insert into public.deal_negotiation_review_rounds(negotiation_version_id,expires_at,created_by)values(v_version.id,now()+make_interval(days=>p_valid_days),p_actor)returning id into v_round;
 else update public.deal_negotiation_review_rounds set expires_at=greatest(expires_at,now()+make_interval(days=>p_valid_days)),status='active',closed_at=null where id=v_round;end if;
 for v_participant in select id,name,email,role from public.deal_participants where dossier_id=v_dossier.id and id=any(p_participant_ids) order by created_at loop
  v_token:=encode(extensions.gen_random_bytes(32),'hex');v_count:=v_count+1;
  insert into public.deal_negotiation_reviewers(round_id,participant_id,token_hash,token_expires_at,status,comment,decided_at)values(v_round,v_participant.id,encode(extensions.digest(v_token,'sha256'),'hex'),now()+make_interval(days=>p_valid_days),'pending',null,null)
  on conflict(round_id,participant_id)do update set token_hash=excluded.token_hash,token_expires_at=excluded.token_expires_at,status='pending',comment=null,decided_at=null;
  v_reviewers:=v_reviewers||jsonb_build_array(jsonb_build_object('participant_id',v_participant.id,'name',v_participant.name,'email',v_participant.email,'role',v_participant.role,'token',v_token));
 end loop;
 update public.deal_negotiation_versions set status='presented' where id=v_version.id;
 insert into public.deal_audit_events(dossier_id,actor_profile_id,actor_label,event_type,entity_type,entity_id,description,metadata)values(v_dossier.id,p_actor,'Profissional responsável','negotiation_review_recipients_sent','negotiation_review_round',v_round,'Versão da negociação enviada às partes selecionadas.',jsonb_build_object('version',v_version.version,'participant_ids',p_participant_ids,'reviewer_count',v_count));
 return jsonb_build_object('round_id',v_round,'version',v_version.version,'kind',v_version.kind,'title',v_version.title,'reviewers',v_reviewers);
end;$$;
revoke all on function public.prepare_negotiation_review_selected(uuid,uuid,uuid[],integer) from public,anon,authenticated;
grant execute on function public.prepare_negotiation_review_selected(uuid,uuid,uuid[],integer) to service_role;

notify pgrst,'reload schema';
commit;
