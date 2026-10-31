begin;

alter table public.deal_contract_reviewers
  add column if not exists recipient_name text,
  add column if not exists recipient_email text,
  add column if not exists sent_at timestamptz,
  add column if not exists revoked_at timestamptz,
  add column if not exists send_count integer not null default 0;

create or replace function public.manage_deal_participant(
  p_participant_id uuid,p_name text,p_email text,p_phone text,p_role text,p_action text default 'update'
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_participant public.deal_participants%rowtype;v_old_email text;v_dossier uuid;
begin
  if (select auth.uid()) is null then raise exception 'DEAL_AUTH_REQUIRED'; end if;
  select * into v_participant from public.deal_participants where id=p_participant_id for update;
  if not found or not public.owns_deal_dossier(v_participant.dossier_id) or not public.has_satisfied_mfa() then raise exception 'DEAL_ACCESS_DENIED'; end if;
  if p_action not in ('update','deactivate','reactivate') then raise exception 'DEAL_PARTICIPANT_ACTION_INVALID'; end if;
  if char_length(btrim(coalesce(p_name,'')))<2 then raise exception 'DEAL_PARTICIPANT_INVALID'; end if;
  v_old_email:=lower(coalesce(v_participant.email,''));v_dossier:=v_participant.dossier_id;
  update public.deal_participants set name=btrim(p_name),email=nullif(lower(btrim(coalesce(p_email,''))),''),phone=nullif(btrim(coalesce(p_phone,'')),''),role=p_role,
    status=case when p_action='deactivate' then 'inactive' when p_action='reactivate' then 'pending' else status end,updated_at=now() where id=p_participant_id;
  if p_action='deactivate' or v_old_email<>lower(btrim(coalesce(p_email,''))) then
    update public.deal_contract_reviewers set token_expires_at=now(),revoked_at=now()
      where participant_id=p_participant_id and status in('new','viewing');
  end if;
  insert into public.deal_audit_events(dossier_id,actor_profile_id,actor_label,event_type,entity_type,entity_id,description,metadata)
    values(v_dossier,(select auth.uid()),'Profissional responsável','participant_'||p_action,'participant',p_participant_id,
      case when p_action='deactivate' then 'Participante retirado do fluxo ativo, com histórico preservado.' when p_action='reactivate' then 'Participante reativado no fluxo.' else 'Dados do participante atualizados.' end,
      jsonb_build_object('email_changed',v_old_email<>lower(btrim(coalesce(p_email,'')))));
  return jsonb_build_object('participant_id',p_participant_id,'email_changed',v_old_email<>lower(btrim(coalesce(p_email,''))));
end;$$;
revoke all on function public.manage_deal_participant(uuid,text,text,text,text,text) from public,anon;
grant execute on function public.manage_deal_participant(uuid,text,text,text,text,text) to authenticated;

create or replace function public.prepare_contract_review(p_actor uuid,p_contract_version_id uuid,p_pdf_path text,p_pdf_hash text,p_participant_ids uuid[],p_valid_days integer default 10) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_version public.deal_contract_versions%rowtype;v_contract public.deal_contracts%rowtype;v_round uuid;v_reviewer uuid;v_participant public.deal_participants%rowtype;v_token text;v_reviewers jsonb:='[]';
begin
 select * into v_version from public.deal_contract_versions where id=p_contract_version_id and status='ready';if not found then raise exception 'DEAL_CONTRACT_VERSION_INVALID';end if;
 select * into v_contract from public.deal_contracts where id=v_version.contract_id and created_by=p_actor;if not found then raise exception 'DEAL_ACCESS_DENIED';end if;
 if p_pdf_path not like v_contract.dossier_id::text||'/%' or length(p_pdf_hash)<>64 then raise exception 'DEAL_PDF_INVALID';end if;
 if coalesce(array_length(p_participant_ids,1),0)=0 then raise exception 'DEAL_REVIEWERS_REQUIRED';end if;
 update public.deal_contract_review_rounds rr set status='superseded',closed_at=now() from public.deal_contract_versions ov where ov.id=rr.contract_version_id and ov.contract_id=v_contract.id and ov.id<>v_version.id and rr.status in('active','changes_requested');
 insert into public.deal_contract_review_rounds(contract_version_id,pdf_storage_path,pdf_hash,expires_at,created_by) values(v_version.id,p_pdf_path,p_pdf_hash,now()+make_interval(days=>least(greatest(p_valid_days,1),30)),p_actor) on conflict(contract_version_id) do update set pdf_storage_path=excluded.pdf_storage_path,pdf_hash=excluded.pdf_hash,expires_at=excluded.expires_at,status='active',closed_at=null returning id into v_round;
 for v_participant in select * from public.deal_participants where dossier_id=v_contract.dossier_id and id=any(p_participant_ids) and status<>'inactive' and nullif(btrim(email),'') is not null loop
   v_token:=encode(extensions.gen_random_bytes(32),'hex');
   insert into public.deal_contract_reviewers(round_id,participant_id,token_hash,token_expires_at,recipient_name,recipient_email,sent_at,send_count,revoked_at)
   values(v_round,v_participant.id,encode(extensions.digest(v_token,'sha256'),'hex'),now()+make_interval(days=>least(greatest(p_valid_days,1),30)),v_participant.name,v_participant.email,now(),1,null)
   on conflict(round_id,participant_id) do update set status='new',token_hash=excluded.token_hash,token_expires_at=excluded.token_expires_at,recipient_name=excluded.recipient_name,recipient_email=excluded.recipient_email,sent_at=now(),send_count=public.deal_contract_reviewers.send_count+1,revoked_at=null,last_accessed_at=null,decided_at=null,general_comment=null returning id into v_reviewer;
   v_reviewers:=v_reviewers||jsonb_build_array(jsonb_build_object('reviewer_id',v_reviewer,'participant_id',v_participant.id,'name',v_participant.name,'email',v_participant.email,'token',v_token));
 end loop;
 if jsonb_array_length(v_reviewers)=0 then raise exception 'DEAL_REVIEWERS_REQUIRED';end if;
 update public.deal_contracts set status='in_review',updated_at=now() where id=v_contract.id;
 return jsonb_build_object('round_id',v_round,'dossier_id',v_contract.dossier_id,'version',v_version.version,'reviewers',v_reviewers);
end;$$;
revoke all on function public.prepare_contract_review(uuid,uuid,text,text,uuid[],integer) from public,anon,authenticated;
grant execute on function public.prepare_contract_review(uuid,uuid,text,text,uuid[],integer) to service_role;

notify pgrst,'reload schema';
commit;
