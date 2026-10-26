begin;

-- Merely opening a request must not imply that any document was delivered.
create or replace function public.get_public_deal_document_request(p_token text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_request public.deal_document_requests%rowtype; v_result jsonb;
begin
  if p_token is null or length(p_token)<>64 then raise exception 'DEAL_LINK_INVALID'; end if;
  select * into v_request from public.deal_document_requests where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') for update;
  if not found or v_request.status in ('revoked','completed') or v_request.token_expires_at<=now() then raise exception 'DEAL_LINK_INVALID'; end if;
  update public.deal_document_requests set last_accessed_at=now(),updated_at=now() where id=v_request.id;
  select jsonb_build_object(
    'request_id',v_request.id,'dossier_id',v_request.dossier_id,'participant_id',v_request.participant_id,
    'instructions',v_request.instructions,'expires_at',v_request.token_expires_at,'status',v_request.status,
    'participant',jsonb_build_object('name',dp.name,'role',dp.role),
    'property',jsonb_build_object('title',coalesce(p.title,'Imóvel'),'code',coalesce(p.code,'')),
    'items',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'label',i.label,'description',i.description,'required',i.required,'allows_multiple',i.allows_multiple,'status',i.status,
      'files',coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'name',d.original_name,'mime_type',d.mime_type,'size',d.file_size,'version',d.version,'created_at',d.created_at) order by d.version desc) from public.deal_documents d where d.request_item_id=i.id),'[]'::jsonb)) order by i.created_at)
      from public.deal_document_request_items i where i.request_id=v_request.id),'[]'::jsonb)) into v_result
  from public.deal_participants dp join public.deal_dossiers dd on dd.id=v_request.dossier_id left join public.properties p on p.id=dd.property_id where dp.id=v_request.participant_id;
  return v_result;
end;$$;
revoke all on function public.get_public_deal_document_request(text) from public,anon,authenticated;
grant execute on function public.get_public_deal_document_request(text) to service_role;

-- Register the immutable version and create a detailed persistent notice for the professional.
create or replace function public.complete_public_deal_document_upload(
  p_token text,p_item_id uuid,p_storage_path text,p_original_name text,p_mime_type text,p_file_size bigint
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_request public.deal_document_requests%rowtype; v_item public.deal_document_request_items%rowtype; v_participant uuid; v_participant_name text; v_document uuid; v_version integer; v_remaining integer; v_property_title text;
begin
  if p_token is null or length(p_token)<>64 then raise exception 'DEAL_LINK_INVALID'; end if;
  select * into v_request from public.deal_document_requests where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') for update;
  if not found or v_request.status in ('revoked','completed') or v_request.token_expires_at<=now() then raise exception 'DEAL_LINK_INVALID'; end if;
  select * into v_item from public.deal_document_request_items where id=p_item_id and request_id=v_request.id for update;
  if not found or v_item.status in ('approved','not_applicable') then raise exception 'DEAL_ITEM_INVALID'; end if;
  if p_mime_type not in ('application/pdf','image/jpeg','image/png') or p_file_size not between 1 and 15728640 then raise exception 'DEAL_FILE_INVALID'; end if;
  if p_storage_path not like v_request.dossier_id::text||'/'||p_item_id::text||'/%' then raise exception 'DEAL_FILE_INVALID'; end if;
  select coalesce(max(version),0)+1 into v_version from public.deal_documents where request_item_id=p_item_id;
  update public.deal_documents set is_current=false where request_item_id=p_item_id and is_current;
  insert into public.deal_documents(dossier_id,participant_id,request_item_id,storage_path,original_name,mime_type,file_size,version,is_current,uploaded_via_request)
  values(v_request.dossier_id,v_request.participant_id,p_item_id,p_storage_path,left(p_original_name,255),p_mime_type,p_file_size,v_version,true,true) returning id into v_document;
  update public.deal_document_request_items set status='received',decision_note=null,decided_by=null,decided_at=null,updated_at=now() where id=p_item_id;
  select count(*) into v_remaining from public.deal_document_request_items where request_id=v_request.id and required and status not in ('received','under_review','approved','not_applicable');
  update public.deal_document_requests set status=case when v_remaining=0 then 'received' else 'partially_received' end,updated_at=now() where id=v_request.id;
  update public.deal_participants set status=case when v_remaining=0 then 'documents_complete' else 'documents_pending' end,updated_at=now() where id=v_request.participant_id returning id,name into v_participant,v_participant_name;
  select coalesce(p.title,'Imóvel') into v_property_title from public.deal_dossiers dd left join public.properties p on p.id=dd.property_id where dd.id=v_request.dossier_id;
  insert into public.deal_audit_events(dossier_id,actor_label,event_type,entity_type,entity_id,description,metadata)
  values(v_request.dossier_id,'Participante externo','document_uploaded','document',v_document,'Documento enviado por link temporário.',jsonb_build_object('participant_id',v_participant,'request_item_id',p_item_id,'version',v_version));
  insert into public.notifications(user_id,type,title,message,link,data)
  values(v_request.requested_by,'system_alert'::public.notification_type,'Documento recebido',coalesce(v_participant_name,'Um participante')||' enviou “'||v_item.label||'” para '||coalesce(v_property_title,'o imóvel')||'.','/crm',jsonb_build_object('scope','deal_document_uploaded','dossier_id',v_request.dossier_id,'participant_id',v_participant,'request_item_id',p_item_id,'document_id',v_document,'version',v_version));
  return v_document;
end;$$;
revoke all on function public.complete_public_deal_document_upload(text,uuid,text,text,text,bigint) from public,anon,authenticated;
grant execute on function public.complete_public_deal_document_upload(text,uuid,text,text,text,bigint) to service_role;

notify pgrst,'reload schema';
commit;
