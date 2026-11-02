begin;

-- Leads owned by a deleted professional are removed, but transaction and
-- partnership evidence must remain available without identifying that lead.
alter table public.deal_dossiers alter column lead_id drop not null;
alter table public.deal_dossiers drop constraint deal_dossiers_lead_id_fkey;
alter table public.deal_dossiers add constraint deal_dossiers_lead_id_fkey
  foreign key (lead_id) references public.leads(id) on delete set null;

alter table public.partnership_lead_attributions alter column lead_id drop not null;
alter table public.partnership_lead_attributions drop constraint partnership_lead_attributions_lead_id_fkey;
alter table public.partnership_lead_attributions add constraint partnership_lead_attributions_lead_id_fkey
  foreign key (lead_id) references public.leads(id) on delete set null;

do $$
declare blockers text;
begin
  select string_agg(con.conname, ', ' order by con.conname) into blockers
  from pg_constraint con
  where con.contype = 'f' and con.confrelid = 'public.leads'::regclass
    and con.confdeltype in ('a','r');
  if blockers is not null then raise exception 'Unhandled lead deletion blockers: %', blockers; end if;
end;
$$;

commit;
