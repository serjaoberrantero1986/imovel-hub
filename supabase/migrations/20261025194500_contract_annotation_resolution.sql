begin;
grant update(status,updated_at) on public.deal_contract_annotations to authenticated;
commit;
