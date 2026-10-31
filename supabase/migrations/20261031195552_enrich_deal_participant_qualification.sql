begin;

alter table public.deal_participants
  add column if not exists person_type text not null default 'individual' check(person_type in ('individual','company')),
  add column if not exists cpf_cnpj text,
  add column if not exists rg text,
  add column if not exists rg_issuer text,
  add column if not exists nationality text,
  add column if not exists marital_status text,
  add column if not exists property_regime text,
  add column if not exists profession text,
  add column if not exists postal_code text,
  add column if not exists street text,
  add column if not exists address_number text,
  add column if not exists address_complement text,
  add column if not exists neighborhood text,
  add column if not exists city text,
  add column if not exists state text;

update public.deal_participants set cpf_cnpj=document_number where cpf_cnpj is null and document_number is not null;

alter table public.deal_negotiation_versions add column if not exists qualification_snapshot jsonb not null default '[]'::jsonb;

create or replace function public.manage_deal_participant(
 p_participant_id uuid,p_name text,p_email text,p_phone text,p_role text,p_action text default 'update',p_qualification jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_participant public.deal_participants%rowtype;v_old_email text;v_dossier uuid;
begin
 if (select auth.uid()) is null then raise exception 'DEAL_AUTH_REQUIRED';end if;
 select * into v_participant from public.deal_participants where id=p_participant_id for update;
 if not found or not public.owns_deal_dossier(v_participant.dossier_id) or not public.has_satisfied_mfa() then raise exception 'DEAL_ACCESS_DENIED';end if;
 if p_action not in('update','deactivate','reactivate') or char_length(btrim(coalesce(p_name,'')))<2 then raise exception 'DEAL_PARTICIPANT_INVALID';end if;
 v_old_email:=lower(coalesce(v_participant.email,''));v_dossier:=v_participant.dossier_id;
 update public.deal_participants set name=btrim(p_name),email=nullif(lower(btrim(coalesce(p_email,''))),''),phone=nullif(btrim(coalesce(p_phone,'')),''),role=p_role,
  person_type=case when p_qualification->>'person_type'='company' then 'company' else 'individual' end,
  cpf_cnpj=nullif(btrim(p_qualification->>'cpf_cnpj'),''),document_number=nullif(btrim(p_qualification->>'cpf_cnpj'),''),rg=nullif(btrim(p_qualification->>'rg'),''),rg_issuer=nullif(btrim(p_qualification->>'rg_issuer'),''),nationality=nullif(btrim(p_qualification->>'nationality'),''),marital_status=nullif(btrim(p_qualification->>'marital_status'),''),property_regime=nullif(btrim(p_qualification->>'property_regime'),''),profession=nullif(btrim(p_qualification->>'profession'),''),postal_code=nullif(btrim(p_qualification->>'postal_code'),''),street=nullif(btrim(p_qualification->>'street'),''),address_number=nullif(btrim(p_qualification->>'address_number'),''),address_complement=nullif(btrim(p_qualification->>'address_complement'),''),neighborhood=nullif(btrim(p_qualification->>'neighborhood'),''),city=nullif(btrim(p_qualification->>'city'),''),state=upper(nullif(btrim(p_qualification->>'state'),'')),
  status=case when p_action='deactivate' then 'inactive' when p_action='reactivate' then 'pending' else status end,updated_at=now() where id=p_participant_id;
 if p_action='deactivate' or v_old_email<>lower(btrim(coalesce(p_email,''))) then update public.deal_contract_reviewers set token_expires_at=now(),revoked_at=now() where participant_id=p_participant_id and status in('new','viewing');end if;
 insert into public.deal_audit_events(dossier_id,actor_profile_id,actor_label,event_type,entity_type,entity_id,description,metadata) values(v_dossier,(select auth.uid()),'Profissional responsável','participant_'||p_action,'participant',p_participant_id,case when p_action='deactivate' then 'Participante retirado do fluxo ativo, com histórico preservado.' when p_action='reactivate' then 'Participante reativado no fluxo.' else 'Dados e qualificação do participante atualizados.' end,jsonb_build_object('email_changed',v_old_email<>lower(btrim(coalesce(p_email,'')))));
 return jsonb_build_object('participant_id',p_participant_id,'email_changed',v_old_email<>lower(btrim(coalesce(p_email,''))));
end;$$;
revoke all on function public.manage_deal_participant(uuid,text,text,text,text,text,jsonb) from public,anon;
grant execute on function public.manage_deal_participant(uuid,text,text,text,text,text,jsonb) to authenticated;

create or replace function public.create_deal_negotiation_version(p_dossier_id uuid,p_kind text,p_title text,p_terms jsonb,p_notes text default null,p_status text default 'draft') returns uuid language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_version integer;v_id uuid;v_hash text;v_participant record;v_qualification jsonb;
begin
 if v_uid is null or not public.owns_deal_dossier(p_dossier_id) or not public.has_satisfied_mfa() then raise exception 'DEAL_ACCESS_DENIED';end if;
 if p_kind not in('proposal','counterproposal','consolidated_terms') or p_status not in('draft','presented') or char_length(btrim(coalesce(p_title,'')))<3 or jsonb_typeof(p_terms)<>'object' then raise exception 'DEAL_NEGOTIATION_INVALID';end if;
 select coalesce(jsonb_agg(to_jsonb(p) order by p.created_at),'[]'::jsonb) into v_qualification from public.deal_participants p where p.dossier_id=p_dossier_id and p.status<>'inactive';
 select coalesce(max(version),0)+1 into v_version from public.deal_negotiation_versions where dossier_id=p_dossier_id;
 v_hash:=encode(extensions.digest(convert_to(jsonb_build_object('version',v_version,'kind',p_kind,'title',btrim(p_title),'terms',p_terms,'notes',nullif(btrim(coalesce(p_notes,'')),''),'parties',v_qualification)::text,'UTF8'),'sha256'),'hex');
 update public.deal_negotiation_versions set status='superseded' where dossier_id=p_dossier_id and status in('draft','presented');
 insert into public.deal_negotiation_versions(dossier_id,version,kind,status,title,terms,notes,content_hash,created_by,qualification_snapshot) values(p_dossier_id,v_version,p_kind,p_status,btrim(p_title),p_terms,nullif(btrim(coalesce(p_notes,'')),''),v_hash,v_uid,v_qualification) returning id into v_id;
 for v_participant in select id from public.deal_participants where dossier_id=p_dossier_id and role in('owner','co_owner','buyer','tenant','spouse','representative') and status<>'inactive' loop insert into public.deal_negotiation_decisions(negotiation_version_id,participant_id,decision) values(v_id,v_participant.id,'pending');end loop;
 update public.deal_dossiers set current_stage='negotiation',progress=greatest(progress,15),updated_at=now() where id=p_dossier_id;
 insert into public.deal_audit_events(dossier_id,actor_profile_id,actor_label,event_type,entity_type,entity_id,description,metadata) values(p_dossier_id,v_uid,'Profissional responsável','negotiation_version_created','negotiation_version',v_id,'Versão '||v_version||' da negociação registrada.',jsonb_build_object('version',v_version,'kind',p_kind,'status',p_status,'content_hash',v_hash));return v_id;
end;$$;

create or replace function public.get_public_negotiation_review(p_token text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_reviewer public.deal_negotiation_reviewers%rowtype;v_result jsonb;
begin
 select * into v_reviewer from public.deal_negotiation_reviewers where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') for update;
 if not found or v_reviewer.token_expires_at<=now() or not exists(select 1 from public.deal_negotiation_review_rounds where id=v_reviewer.round_id and status in('active','changes_requested')) then raise exception 'DEAL_LINK_INVALID';end if;
 update public.deal_negotiation_reviewers set status=case when status='pending' then 'viewing' else status end,last_accessed_at=now() where id=v_reviewer.id;
 select jsonb_build_object('reviewer_id',v_reviewer.id,'status',case when v_reviewer.status='pending' then 'viewing' else v_reviewer.status end,'expires_at',v_reviewer.token_expires_at,'participant',jsonb_build_object('name',p.name,'role',p.role),'version',v.version,'kind',v.kind,'title',v.title,'terms',v.terms,'notes',v.notes,'content_hash',v.content_hash,'parties',v.qualification_snapshot,'property_title',coalesce(pr.title,v.title)) into v_result from public.deal_negotiation_review_rounds r join public.deal_negotiation_versions v on v.id=r.negotiation_version_id join public.deal_participants p on p.id=v_reviewer.participant_id join public.deal_dossiers d on d.id=v.dossier_id left join public.properties pr on pr.id=d.property_id where r.id=v_reviewer.round_id;return v_result;
end;$$;

notify pgrst,'reload schema';
commit;
