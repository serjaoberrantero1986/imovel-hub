begin;

create or replace function public.recalculate_deal_dossier(p_dossier_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_total integer;v_done integer;v_progress integer;v_blockers integer;
begin
 if v_uid is null or not public.owns_deal_dossier(p_dossier_id) or not public.has_satisfied_mfa() then raise exception 'DEAL_ACCESS_DENIED';end if;
 update public.deal_document_requests set status='expired',updated_at=now() where dossier_id=p_dossier_id and status not in('completed','revoked','expired') and token_expires_at<now();
 update public.deal_document_request_items i set status='expired',updated_at=now() from public.deal_document_requests r where r.id=i.request_id and r.dossier_id=p_dossier_id and i.valid_until<current_date and i.status='approved';
 select coalesce(sum(i.weight),0),coalesce(sum(i.weight) filter(where i.status in('approved','not_applicable')),0) into v_total,v_done
 from public.deal_document_request_items i join public.deal_document_requests r on r.id=i.request_id where r.dossier_id=p_dossier_id;
 select count(*) into v_blockers from public.deal_review_findings where dossier_id=p_dossier_id and kind='blocking' and status='open';
 v_progress:=case when v_total=0 then 10 else least(90,10+round(80.0*v_done/v_total)::integer) end;
 update public.deal_dossiers set progress=v_progress,status=case when v_total>0 and v_done=v_total and v_blockers=0 then 'ready_for_contract' else 'reviewing' end,updated_at=now() where id=p_dossier_id;
 return jsonb_build_object('progress',v_progress,'approved_weight',v_done,'total_weight',v_total,'open_blockers',v_blockers,'ready',v_total>0 and v_done=v_total and v_blockers=0);
end;$$;
revoke all on function public.recalculate_deal_dossier(uuid) from public,anon;
grant execute on function public.recalculate_deal_dossier(uuid) to authenticated;

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
 update public.deal_dossiers set progress=v_progress,status=case when v_total>0 and v_done=v_total and v_blockers=0 then 'ready_for_contract' else 'reviewing' end,updated_at=now() where id=v_dossier_id;
 return v_result||jsonb_build_object('progress',v_progress,'approved_weight',v_done,'total_weight',v_total,'open_blockers',v_blockers);
end;$$;
revoke all on function public.review_and_recalculate_deal_document_item(uuid,text,text) from public,anon;
grant execute on function public.review_and_recalculate_deal_document_item(uuid,text,text) to authenticated;

create or replace function public.move_deal_dossier_stage(p_dossier_id uuid,p_direction text) returns text
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_current text;v_stages text[]:=array['inherited_data','negotiation','participants','personal_documents','property_documents','certificates','review','contract','signatures','completed'];v_index integer;v_next text;
begin
 if v_uid is null or not public.owns_deal_dossier(p_dossier_id) or not public.has_satisfied_mfa() then raise exception 'DEAL_ACCESS_DENIED';end if;
 if p_direction not in('previous','next') then raise exception 'DEAL_STAGE_DIRECTION_INVALID';end if;
 select current_stage into v_current from public.deal_dossiers where id=p_dossier_id for update;
 v_index:=array_position(v_stages,v_current);
 if v_index is null then raise exception 'DEAL_STAGE_INVALID';end if;
 v_index:=greatest(1,least(array_length(v_stages,1),v_index+case when p_direction='next' then 1 else -1 end));
 v_next:=v_stages[v_index];
 update public.deal_dossiers set current_stage=v_next,updated_at=now() where id=p_dossier_id;
 insert into public.deal_audit_events(dossier_id,actor_profile_id,actor_label,event_type,entity_type,entity_id,description,metadata)
 values(p_dossier_id,v_uid,'Profissional responsável','dossier_stage_changed','deal_dossier',p_dossier_id,'Etapa atual do dossiê alterada.',jsonb_build_object('from',v_current,'to',v_next,'direction',p_direction));
 return v_next;
end;$$;
revoke all on function public.move_deal_dossier_stage(uuid,text) from public,anon;
grant execute on function public.move_deal_dossier_stage(uuid,text) to authenticated;

create or replace function public.add_pending_negotiation_decisions_for_participant() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.status<>'inactive' and new.role in('owner','co_owner','buyer','tenant','spouse','guarantor','representative','other') then
  insert into public.deal_negotiation_decisions(negotiation_version_id,participant_id,decision)
  select v.id,new.id,'pending' from public.deal_negotiation_versions v where v.dossier_id=new.dossier_id and v.status in('draft','presented')
  on conflict(negotiation_version_id,participant_id)do nothing;
 end if;
 return new;
end;$$;
revoke all on function public.add_pending_negotiation_decisions_for_participant() from public,anon,authenticated;
drop trigger if exists trg_add_pending_negotiation_decisions_for_participant on public.deal_participants;
create trigger trg_add_pending_negotiation_decisions_for_participant after insert on public.deal_participants for each row execute function public.add_pending_negotiation_decisions_for_participant();

insert into public.deal_negotiation_decisions(negotiation_version_id,participant_id,decision)
select v.id,p.id,'pending' from public.deal_negotiation_versions v join public.deal_participants p on p.dossier_id=v.dossier_id
where v.status in('draft','presented') and p.status<>'inactive' and p.role in('owner','co_owner','buyer','tenant','spouse','guarantor','representative','other')
on conflict(negotiation_version_id,participant_id)do nothing;

notify pgrst,'reload schema';
commit;
