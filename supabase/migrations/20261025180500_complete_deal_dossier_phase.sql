begin;

create or replace function public.set_deal_document_applicability(p_item_id uuid,p_applicable boolean,p_reason text default null)
returns void language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_item public.deal_document_request_items%rowtype;v_dossier uuid;
begin
 if v_uid is null or not public.has_satisfied_mfa() then raise exception 'DEAL_AUTH_REQUIRED';end if;
 select * into v_item from public.deal_document_request_items where id=p_item_id for update;
 select dossier_id into v_dossier from public.deal_document_requests where id=v_item.request_id;
 if not found or not public.owns_deal_dossier(v_dossier) then raise exception 'DEAL_ACCESS_DENIED';end if;
 if not p_applicable and char_length(btrim(coalesce(p_reason,'')))<3 then raise exception 'DEAL_NOTE_REQUIRED';end if;
 if not p_applicable and exists(select 1 from public.deal_documents where request_item_id=p_item_id) then raise exception 'DEAL_ITEM_HAS_DOCUMENT';end if;
 update public.deal_document_request_items set status=case when p_applicable then 'requested' else 'not_applicable' end,decision_note=case when p_applicable then null else btrim(p_reason) end,decided_by=v_uid,decided_at=now(),updated_at=now() where id=p_item_id;
 insert into public.deal_audit_events(dossier_id,actor_profile_id,actor_label,event_type,entity_type,entity_id,description,metadata)
 values(v_dossier,v_uid,'Profissional responsável',case when p_applicable then 'document_requirement_reactivated' else 'document_not_applicable' end,'document_request_item',p_item_id,case when p_applicable then 'Exigência documental reativada.' else 'Documento marcado como não aplicável com justificativa.' end,jsonb_build_object('reason',nullif(btrim(p_reason),'')));
 perform public.recalculate_deal_dossier(v_dossier);
end;$$;
revoke all on function public.set_deal_document_applicability(uuid,boolean,text) from public,anon;
grant execute on function public.set_deal_document_applicability(uuid,boolean,text) to authenticated;

create or replace function public.refresh_deal_document_deadlines(p_dossier_id uuid) returns integer
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_count integer:=0;v_row record;v_window text;
begin
 if v_uid is null or not public.owns_deal_dossier(p_dossier_id) or not public.has_satisfied_mfa() then raise exception 'DEAL_ACCESS_DENIED';end if;
 for v_row in select i.id,i.label,i.valid_until,d.owner_id from public.deal_document_request_items i join public.deal_document_requests r on r.id=i.request_id join public.deal_dossiers d on d.id=r.dossier_id where d.id=p_dossier_id and i.status='approved' and i.valid_until between current_date and current_date+30 loop
  v_window:=case when v_row.valid_until<=current_date+7 then '7d' else '30d' end;
  if not exists(select 1 from public.notifications n where n.user_id=v_row.owner_id and n.data->>'scope'='deal_document_expiry' and n.data->>'request_item_id'=v_row.id::text and n.data->>'window'=v_window) then
   insert into public.notifications(user_id,type,title,message,link,data) values(v_row.owner_id,'system_alert'::public.notification_type,'Documento próximo do vencimento','“'||v_row.label||'” vence em '||(v_row.valid_until-current_date)||' dia(s).','/crm',jsonb_build_object('scope','deal_document_expiry','dossier_id',p_dossier_id,'request_item_id',v_row.id,'valid_until',v_row.valid_until,'window',v_window));v_count:=v_count+1;
  end if;
 end loop;
 perform public.recalculate_deal_dossier(p_dossier_id);return v_count;
end;$$;
revoke all on function public.refresh_deal_document_deadlines(uuid) from public,anon;
grant execute on function public.refresh_deal_document_deadlines(uuid) to authenticated;

notify pgrst,'reload schema';
commit;
