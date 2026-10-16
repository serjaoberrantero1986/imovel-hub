begin;

-- Fase 7: contestações formais sem apagar ou sobrescrever a evidência original.
create table if not exists public.partnership_visit_disputes (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.partnership_visits(id) on delete restrict,
  opened_by uuid not null references public.profiles(id) on delete restrict,
  category text not null check(category in('location','attendance','lead_attribution','conduct','other')),
  statement text not null check(char_length(trim(statement)) between 20 and 4000),
  evidence_hash text check(evidence_hash is null or evidence_hash~'^[0-9a-f]{64}$'),
  status text not null default 'open' check(status in('open','responded','resolved','dismissed')),
  opened_at timestamptz not null default now(), resolved_at timestamptz,
  resolution_reason text check(resolution_reason is null or char_length(trim(resolution_reason)) between 10 and 2000)
);

create table if not exists public.partnership_visit_dispute_responses (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references public.partnership_visit_disputes(id) on delete restrict,
  responder_id uuid not null references public.profiles(id) on delete restrict,
  statement text not null check(char_length(trim(statement)) between 20 and 4000),
  evidence_hash text check(evidence_hash is null or evidence_hash~'^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);

create table if not exists public.partnership_visit_dispute_events (
  id uuid primary key default gen_random_uuid(), dispute_id uuid not null references public.partnership_visit_disputes(id) on delete restrict,
  actor_id uuid references public.profiles(id) on delete set null, actor_snapshot jsonb not null,
  event text not null check(event in('opened','responded','resolved','dismissed')),
  evidence jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
alter table public.partnership_visit_disputes enable row level security;
alter table public.partnership_visit_dispute_responses enable row level security;
alter table public.partnership_visit_dispute_events enable row level security;
revoke all on public.partnership_visit_disputes from public,anon,authenticated;
revoke all on public.partnership_visit_dispute_responses from public,anon,authenticated;
revoke all on public.partnership_visit_dispute_events from public,anon,authenticated;

create or replace function public.open_partnership_visit_dispute(p_visit_id uuid,p_category text,p_statement text,p_evidence_hash text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_visit public.partnership_visits%rowtype; v_id uuid; v_snap jsonb;
begin
  perform public.require_partnership_aal2();
  select * into v_visit from public.partnership_visits where id=p_visit_id;
  if not found or not exists(select 1 from public.property_partnerships pp where pp.id=v_visit.partnership_id and (pp.captor_id=v_uid or pp.partner_id=v_uid)) then raise exception 'Visit access denied'; end if;
  if p_category not in('location','attendance','lead_attribution','conduct','other') then raise exception 'Invalid dispute category'; end if;
  if char_length(trim(coalesce(p_statement,''))) not between 20 and 4000 then raise exception 'Dispute statement required'; end if;
  if p_evidence_hash is not null and p_evidence_hash !~ '^[0-9a-f]{64}$' then raise exception 'Invalid evidence hash'; end if;
  insert into public.partnership_visit_disputes(visit_id,opened_by,category,statement,evidence_hash) values(p_visit_id,v_uid,p_category,trim(p_statement),p_evidence_hash) returning id into v_id;
  update public.partnership_visits set status='disputed',updated_at=now() where id=p_visit_id and status in('checked_in','completed','checked_out');
  select jsonb_build_object('profile_id',p.id,'name',p.name,'creci',p.creci) into v_snap from public.profiles p where p.id=v_uid;
  insert into public.partnership_visit_dispute_events(dispute_id,actor_id,actor_snapshot,event,evidence) values(v_id,v_uid,v_snap,'opened',jsonb_build_object('category',p_category,'evidence_hash',p_evidence_hash));
  return v_id;
end; $$;
revoke all on function public.open_partnership_visit_dispute(uuid,text,text,text) from public,anon;
grant execute on function public.open_partnership_visit_dispute(uuid,text,text,text) to authenticated;

create or replace function public.respond_partnership_visit_dispute(p_dispute_id uuid,p_statement text,p_evidence_hash text default null)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_d public.partnership_visit_disputes%rowtype; v_snap jsonb;
begin
  perform public.require_partnership_aal2();
  select d.* into v_d from public.partnership_visit_disputes d join public.partnership_visits v on v.id=d.visit_id join public.property_partnerships pp on pp.id=v.partnership_id where d.id=p_dispute_id and (pp.captor_id=v_uid or pp.partner_id=v_uid) for update;
  if not found or v_d.status not in('open','responded') then raise exception 'Open dispute not found'; end if;
  if char_length(trim(coalesce(p_statement,''))) not between 20 and 4000 then raise exception 'Response statement required'; end if;
  if p_evidence_hash is not null and p_evidence_hash !~ '^[0-9a-f]{64}$' then raise exception 'Invalid evidence hash'; end if;
  insert into public.partnership_visit_dispute_responses(dispute_id,responder_id,statement,evidence_hash) values(p_dispute_id,v_uid,trim(p_statement),p_evidence_hash);
  update public.partnership_visit_disputes set status='responded' where id=p_dispute_id;
  select jsonb_build_object('profile_id',p.id,'name',p.name,'creci',p.creci) into v_snap from public.profiles p where p.id=v_uid;
  insert into public.partnership_visit_dispute_events(dispute_id,actor_id,actor_snapshot,event,evidence) values(p_dispute_id,v_uid,v_snap,'responded',jsonb_build_object('evidence_hash',p_evidence_hash));
  return true;
end; $$;
revoke all on function public.respond_partnership_visit_dispute(uuid,text,text) from public,anon;
grant execute on function public.respond_partnership_visit_dispute(uuid,text,text) to authenticated;

create or replace function public.prevent_partnership_dispute_mutation() returns trigger language plpgsql set search_path='' as $$ begin raise exception 'Dispute evidence is immutable'; end; $$;
drop trigger if exists prevent_partnership_visit_dispute_response_mutation on public.partnership_visit_dispute_responses;
create trigger prevent_partnership_visit_dispute_response_mutation before update or delete on public.partnership_visit_dispute_responses for each row execute function public.prevent_partnership_dispute_mutation();
drop trigger if exists prevent_partnership_visit_dispute_event_mutation on public.partnership_visit_dispute_events;
create trigger prevent_partnership_visit_dispute_event_mutation before update or delete on public.partnership_visit_dispute_events for each row execute function public.prevent_partnership_dispute_mutation();
revoke all on function public.prevent_partnership_dispute_mutation() from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
