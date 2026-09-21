begin;

alter table public.leads add column if not exists origin text not null default 'portal_form';

-- Internal notes never share the buyer-readable leads row.
create table public.lead_crm (
  lead_id uuid primary key references public.leads(id) on delete cascade,
  meta jsonb not null default '{}'::jsonb check (jsonb_typeof(meta) = 'object'),
  updated_at timestamptz not null default now()
);
alter table public.lead_crm enable row level security;
revoke all on public.lead_crm from anon, authenticated;
grant select, insert, update on public.lead_crm to authenticated;
create policy "advertiser manages private crm" on public.lead_crm
for all to authenticated
using (exists (select 1 from public.leads l where l.id = lead_id and l.advertiser_id = auth.uid()))
with check (exists (select 1 from public.leads l where l.id = lead_id and l.advertiser_id = auth.uid()));

-- Merge on the server, preserving other metadata keys during concurrent updates.
create function public.update_private_lead_crm(p_lead_id uuid, p_patch jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.leads where id = p_lead_id and advertiser_id = auth.uid()
  ) then raise exception 'Lead access denied'; end if;
  if jsonb_typeof(p_patch) is distinct from 'object' then
    raise exception 'CRM patch must be an object';
  end if;
  insert into public.lead_crm (lead_id, meta) values (p_lead_id, p_patch)
  on conflict (lead_id) do update
    set meta = public.lead_crm.meta || excluded.meta, updated_at = now();
end;
$$;
revoke all on function public.update_private_lead_crm(uuid, jsonb) from public, anon;
grant execute on function public.update_private_lead_crm(uuid, jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;
