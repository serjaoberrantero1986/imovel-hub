begin;
create or replace function public.guard_deal_contract_version() returns trigger language plpgsql set search_path='' as $$
declare v_type text;v_contract_status text;
begin
 select d.business_type,c.status into v_type,v_contract_status from public.deal_contracts c join public.deal_dossiers d on d.id=c.dossier_id where c.id=new.contract_id;
 if new.status='ready' then
  if nullif(btrim(new.variables->>'negotiated_value'),'') is null or nullif(btrim(new.variables->>'payment_terms'),'') is null or nullif(btrim(new.variables->>'deadline'),'') is null or nullif(btrim(new.variables->>'possession_event'),'') is null or nullif(btrim(new.variables->>'forum_city'),'') is null then raise exception 'DEAL_CONTRACT_FIELDS_REQUIRED';end if;
 end if;
 if new.status='final' and v_contract_status<>'approved' then raise exception 'DEAL_CONTRACT_NOT_APPROVED';end if;
 return new;
end;$$;
drop trigger if exists trg_guard_deal_contract_version on public.deal_contract_versions;
create trigger trg_guard_deal_contract_version before insert on public.deal_contract_versions for each row execute function public.guard_deal_contract_version();
commit;
