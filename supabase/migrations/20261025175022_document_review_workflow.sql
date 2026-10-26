begin;

create or replace function public.review_deal_document_item(p_item_id uuid,p_decision text,p_note text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_item public.deal_document_request_items%rowtype; v_request public.deal_document_requests%rowtype; v_dossier public.deal_dossiers%rowtype; v_participant public.deal_participants%rowtype; v_status text; v_remaining integer;
begin
  if v_uid is null or not public.has_satisfied_mfa() then raise exception 'DEAL_AUTH_REQUIRED'; end if;
  if p_decision not in ('approve','request_correction') then raise exception 'DEAL_DECISION_INVALID'; end if;
  select * into v_item from public.deal_document_request_items where id=p_item_id for update;
  if not found then raise exception 'DEAL_ITEM_INVALID'; end if;
  select * into v_request from public.deal_document_requests where id=v_item.request_id for update;
  select * into v_dossier from public.deal_dossiers where id=v_request.dossier_id and owner_id=v_uid;
  if not found then raise exception 'DEAL_ACCESS_DENIED'; end if;
  select * into v_participant from public.deal_participants where id=v_request.participant_id;
  if not exists(select 1 from public.deal_documents where request_item_id=v_item.id and is_current) then raise exception 'DEAL_DOCUMENT_REQUIRED'; end if;
  if p_decision='request_correction' and char_length(btrim(coalesce(p_note,'')))<3 then raise exception 'DEAL_NOTE_REQUIRED'; end if;
  v_status:=case when p_decision='approve' then 'approved' else 'correction_requested' end;
  update public.deal_document_request_items set status=v_status,decision_note=nullif(btrim(p_note),''),decided_by=v_uid,decided_at=now(),updated_at=now() where id=v_item.id;
  select count(*) into v_remaining from public.deal_document_request_items where request_id=v_request.id and required and status not in ('approved','not_applicable');
  update public.deal_document_requests set status=case when v_remaining=0 then 'completed' else status end,completed_at=case when v_remaining=0 then now() else null end,updated_at=now() where id=v_request.id;
  update public.deal_participants set status=case when v_remaining=0 then 'documents_complete' else 'documents_pending' end,updated_at=now() where id=v_participant.id;
  insert into public.deal_audit_events(dossier_id,actor_profile_id,actor_label,event_type,entity_type,entity_id,description,metadata)
  values(v_dossier.id,v_uid,'Profissional responsável',case when p_decision='approve' then 'document_approved' else 'document_correction_requested' end,'document_request_item',v_item.id,case when p_decision='approve' then 'Documento aprovado na conferência.' else 'Correção solicitada para o documento.' end,jsonb_build_object('note',nullif(btrim(p_note),''),'participant_id',v_participant.id));
  if v_participant.profile_id is not null then
    insert into public.notifications(user_id,type,title,message,link,data)
    values(v_participant.profile_id,'system_alert'::public.notification_type,case when p_decision='approve' then 'Documento aprovado' else 'Correção de documento solicitada' end,case when p_decision='approve' then 'O documento “'||v_item.label||'” foi aprovado.' else 'O documento “'||v_item.label||'” precisa de correção: '||btrim(p_note) end,'/crm',jsonb_build_object('scope',case when p_decision='approve' then 'deal_document_approved' else 'deal_document_correction_requested' end,'dossier_id',v_dossier.id,'request_item_id',v_item.id));
  end if;
  return jsonb_build_object('status',v_status,'participant_name',v_participant.name,'participant_email',v_participant.email,'item_label',v_item.label,'request_id',v_request.id,'remaining',v_remaining);
end;$$;
revoke all on function public.review_deal_document_item(uuid,text,text) from public,anon;
grant execute on function public.review_deal_document_item(uuid,text,text) to authenticated;

notify pgrst,'reload schema';
commit;
