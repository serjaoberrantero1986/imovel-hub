begin;

create table if not exists public.partnership_deal_outcomes (
  id uuid primary key default gen_random_uuid(),
  partnership_id uuid not null references public.property_partnerships(id) on delete restrict,
  contract_version_id uuid not null references public.partnership_contract_versions(id) on delete restrict,
  property_id uuid not null references public.properties(id) on delete restrict,
  lead_id uuid references public.leads(id) on delete set null,
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  outcome text not null check(outcome in('won_sale','won_rent','lost','withdrawn','pending_documentation','no_agreement')),
  outcome_at timestamptz not null default now(),
  note text check(note is null or char_length(trim(note)) between 10 and 2000),
  evidence_hash text check(evidence_hash is null or evidence_hash~'^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);
create index if not exists partnership_deal_outcomes_partnership on public.partnership_deal_outcomes(partnership_id,outcome_at desc);
alter table public.partnership_deal_outcomes enable row level security;
revoke all on public.partnership_deal_outcomes from public,anon,authenticated;

create or replace function public.record_partnership_deal_outcome(p_partnership_id uuid,p_lead_id uuid,p_outcome text,p_note text default null,p_evidence_hash text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_pp public.property_partnerships%rowtype; v_id uuid; v_snap jsonb;
begin
  perform public.require_partnership_aal2();
  select * into v_pp from public.property_partnerships where id=p_partnership_id and status in('active','ended','suspended','disputed');
  if not found or not(v_pp.captor_id=v_uid or v_pp.partner_id=v_uid) then raise exception 'Partnership access denied'; end if;
  if p_outcome not in('won_sale','won_rent','lost','withdrawn','pending_documentation','no_agreement') then raise exception 'Invalid outcome'; end if;
  if p_note is not null and char_length(trim(p_note)) not between 10 and 2000 then raise exception 'Outcome note invalid'; end if;
  if p_evidence_hash is not null and p_evidence_hash !~ '^[0-9a-f]{64}$' then raise exception 'Invalid evidence hash'; end if;
  insert into public.partnership_deal_outcomes(partnership_id,contract_version_id,property_id,lead_id,recorded_by,outcome,note,evidence_hash) values(v_pp.id,v_pp.contract_version_id,v_pp.property_id,p_lead_id,v_uid,p_outcome,nullif(trim(p_note),''),p_evidence_hash) returning id into v_id;
  select jsonb_build_object('profile_id',p.id,'name',p.name,'creci',p.creci) into v_snap from public.profiles p where p.id=v_uid;
  insert into public.partnership_visit_events(visit_id,actor_id,actor_snapshot,event,evidence)
  select v.id,v_uid,v_snap,'completed',jsonb_build_object('deal_outcome_id',v_id,'outcome',p_outcome)
  from public.partnership_visits v where v.partnership_id=v_pp.id and v.status='completed' and (p_lead_id is null or v.lead_id=p_lead_id) order by v.check_out_at desc limit 1;
  return v_id;
end; $$;
revoke all on function public.record_partnership_deal_outcome(uuid,uuid,text,text,text) from public,anon;
grant execute on function public.record_partnership_deal_outcome(uuid,uuid,text,text,text) to authenticated;

create or replace function public.prevent_partnership_deal_outcome_mutation() returns trigger language plpgsql set search_path='' as $$ begin raise exception 'Deal outcome is immutable'; end; $$;
drop trigger if exists prevent_partnership_deal_outcome_mutation on public.partnership_deal_outcomes;
create trigger prevent_partnership_deal_outcome_mutation before update or delete on public.partnership_deal_outcomes for each row execute function public.prevent_partnership_deal_outcome_mutation();
revoke all on function public.prevent_partnership_deal_outcome_mutation() from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
