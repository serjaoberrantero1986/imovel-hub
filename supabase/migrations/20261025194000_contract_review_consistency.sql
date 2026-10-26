begin;
create or replace function public.supersede_contract_review_on_new_version() returns trigger language plpgsql security definer set search_path='' as $$
begin update public.deal_contract_review_rounds rr set status='superseded',closed_at=now() from public.deal_contract_versions v where v.id=rr.contract_version_id and v.contract_id=new.contract_id and rr.status in('active','changes_requested','unanimously_approved');return new;end;$$;
drop trigger if exists trg_supersede_contract_review on public.deal_contract_versions;create trigger trg_supersede_contract_review before insert on public.deal_contract_versions for each row execute function public.supersede_contract_review_on_new_version();

create or replace function public.notify_contract_review_decision() returns trigger language plpgsql security definer set search_path='' as $$
declare v_owner uuid;v_dossier uuid;v_version integer;v_name text;
begin if new.status is not distinct from old.status or new.status not in('accepted','changes_requested') then return new;end if;
 select c.created_by,c.dossier_id,v.version,p.name into v_owner,v_dossier,v_version,v_name from public.deal_contract_review_rounds rr join public.deal_contract_versions v on v.id=rr.contract_version_id join public.deal_contracts c on c.id=v.contract_id join public.deal_participants p on p.id=new.participant_id where rr.id=new.round_id;
 insert into public.notifications(user_id,type,title,message,link,data) values(v_owner,'system_alert'::public.notification_type,case when new.status='accepted' then 'Minuta aceita' else 'Alterações solicitadas na minuta' end,coalesce(v_name,'Um participante')||case when new.status='accepted' then ' concordou com a versão ' else ' solicitou alterações na versão ' end||v_version||' da minuta.','/crm',jsonb_build_object('scope','deal_contract_review_decision','dossier_id',v_dossier,'round_id',new.round_id,'reviewer_id',new.id,'decision',new.status,'version',v_version));return new;end;$$;
drop trigger if exists trg_notify_contract_review_decision on public.deal_contract_reviewers;create trigger trg_notify_contract_review_decision after update of status on public.deal_contract_reviewers for each row execute function public.notify_contract_review_decision();
commit;
