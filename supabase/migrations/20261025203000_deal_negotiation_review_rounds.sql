begin;

create table if not exists public.deal_negotiation_review_rounds(
 id uuid primary key default gen_random_uuid(),
 negotiation_version_id uuid not null references public.deal_negotiation_versions(id) on delete restrict,
 status text not null default 'active' check(status in('active','changes_requested','unanimously_accepted','superseded','expired')),
 expires_at timestamptz not null,
 created_by uuid not null references public.profiles(id) on delete restrict,
 created_at timestamptz not null default now(),
 closed_at timestamptz
);
create index if not exists idx_deal_negotiation_review_rounds_version on public.deal_negotiation_review_rounds(negotiation_version_id,created_at desc);

create table if not exists public.deal_negotiation_reviewers(
 id uuid primary key default gen_random_uuid(),
 round_id uuid not null references public.deal_negotiation_review_rounds(id) on delete cascade,
 participant_id uuid not null references public.deal_participants(id) on delete restrict,
 token_hash text not null unique,
 token_expires_at timestamptz not null,
 status text not null default 'pending' check(status in('pending','viewing','accepted','changes_requested')),
 comment text,
 last_accessed_at timestamptz,
 decided_at timestamptz,
 created_at timestamptz not null default now(),
 unique(round_id,participant_id)
);
create index if not exists idx_deal_negotiation_reviewers_round on public.deal_negotiation_reviewers(round_id,status);

alter table public.deal_negotiation_review_rounds enable row level security;
alter table public.deal_negotiation_reviewers enable row level security;
revoke all on public.deal_negotiation_review_rounds,public.deal_negotiation_reviewers from public,anon;
grant select on public.deal_negotiation_review_rounds,public.deal_negotiation_reviewers to authenticated;
create policy "owners read negotiation review rounds" on public.deal_negotiation_review_rounds for select to authenticated
 using(exists(select 1 from public.deal_negotiation_versions v where v.id=negotiation_version_id and public.owns_deal_dossier(v.dossier_id)) and public.has_satisfied_mfa());
create policy "owners read negotiation reviewers" on public.deal_negotiation_reviewers for select to authenticated
 using(exists(select 1 from public.deal_negotiation_review_rounds r join public.deal_negotiation_versions v on v.id=r.negotiation_version_id where r.id=round_id and public.owns_deal_dossier(v.dossier_id)) and public.has_satisfied_mfa());

create or replace function public.prepare_negotiation_review(p_actor uuid,p_negotiation_version_id uuid,p_valid_days integer default 7)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_version public.deal_negotiation_versions%rowtype;v_dossier public.deal_dossiers%rowtype;v_round uuid;v_participant record;v_token text;v_reviewers jsonb:='[]'::jsonb;v_expected integer;v_with_email integer;
begin
 if p_actor is null or p_valid_days not between 1 and 30 then raise exception 'DEAL_REVIEW_INVALID';end if;
 select * into v_version from public.deal_negotiation_versions where id=p_negotiation_version_id for update;
 if not found then raise exception 'DEAL_NEGOTIATION_INVALID';end if;
 select * into v_dossier from public.deal_dossiers where id=v_version.dossier_id and owner_id=p_actor;
 if not found then raise exception 'DEAL_ACCESS_DENIED';end if;
 if v_version.status not in('draft','presented') then raise exception 'DEAL_NEGOTIATION_REVIEW_UNAVAILABLE';end if;
 select count(*),count(*)filter(where nullif(btrim(coalesce(email,'')),'') is not null) into v_expected,v_with_email from public.deal_participants where dossier_id=v_dossier.id and role in('owner','co_owner','buyer','tenant','spouse','representative') and status<>'inactive';
 if v_expected=0 then raise exception 'DEAL_REVIEWERS_REQUIRED';end if;
 if v_expected<>v_with_email then raise exception 'DEAL_REVIEWERS_EMAIL_REQUIRED';end if;
 update public.deal_negotiation_review_rounds r set status='superseded',closed_at=now() from public.deal_negotiation_versions prior where prior.id=r.negotiation_version_id and prior.dossier_id=v_dossier.id and r.status in('active','changes_requested');
 insert into public.deal_negotiation_review_rounds(negotiation_version_id,expires_at,created_by) values(v_version.id,now()+make_interval(days=>p_valid_days),p_actor) returning id into v_round;
 for v_participant in select id,name,email,role from public.deal_participants where dossier_id=v_dossier.id and role in('owner','co_owner','buyer','tenant','spouse','representative') and status<>'inactive' order by created_at loop
  v_token:=encode(extensions.gen_random_bytes(32),'hex');
  insert into public.deal_negotiation_reviewers(round_id,participant_id,token_hash,token_expires_at) values(v_round,v_participant.id,encode(extensions.digest(v_token,'sha256'),'hex'),now()+make_interval(days=>p_valid_days));
  v_reviewers:=v_reviewers||jsonb_build_array(jsonb_build_object('participant_id',v_participant.id,'name',v_participant.name,'email',v_participant.email,'role',v_participant.role,'token',v_token));
 end loop;
 update public.deal_negotiation_versions set status='presented' where id=v_version.id;
 insert into public.deal_audit_events(dossier_id,actor_profile_id,actor_label,event_type,entity_type,entity_id,description,metadata) values(v_dossier.id,p_actor,'Profissional responsável','negotiation_review_started','negotiation_review_round',v_round,'Proposta enviada simultaneamente às partes para manifestação.',jsonb_build_object('version',v_version.version,'reviewer_count',v_expected,'expires_at',now()+make_interval(days=>p_valid_days)));
 return jsonb_build_object('round_id',v_round,'version',v_version.version,'kind',v_version.kind,'title',v_version.title,'reviewers',v_reviewers);
end;$$;
revoke all on function public.prepare_negotiation_review(uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.prepare_negotiation_review(uuid,uuid,integer) to service_role;

create or replace function public.get_public_negotiation_review(p_token text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_reviewer public.deal_negotiation_reviewers%rowtype;v_result jsonb;
begin
 select * into v_reviewer from public.deal_negotiation_reviewers where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') for update;
 if not found or v_reviewer.token_expires_at<=now() then raise exception 'DEAL_LINK_INVALID';end if;
 if not exists(select 1 from public.deal_negotiation_review_rounds where id=v_reviewer.round_id and status in('active','changes_requested')) then raise exception 'DEAL_LINK_INVALID';end if;
 update public.deal_negotiation_reviewers set status=case when status='pending' then 'viewing' else status end,last_accessed_at=now() where id=v_reviewer.id;
 select jsonb_build_object('reviewer_id',v_reviewer.id,'status',case when v_reviewer.status='pending' then 'viewing' else v_reviewer.status end,'expires_at',v_reviewer.token_expires_at,'participant',jsonb_build_object('name',p.name,'role',p.role),'version',v.version,'kind',v.kind,'title',v.title,'terms',v.terms,'notes',v.notes,'content_hash',v.content_hash,'property_title',coalesce(pr.title,v.title)) into v_result
 from public.deal_negotiation_review_rounds r join public.deal_negotiation_versions v on v.id=r.negotiation_version_id join public.deal_participants p on p.id=v_reviewer.participant_id join public.deal_dossiers d on d.id=v.dossier_id left join public.properties pr on pr.id=d.property_id where r.id=v_reviewer.round_id;
 return v_result;
end;$$;
revoke all on function public.get_public_negotiation_review(text) from public,anon,authenticated;
grant execute on function public.get_public_negotiation_review(text) to service_role;

create or replace function public.submit_public_negotiation_review(p_token text,p_decision text,p_comment text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_reviewer public.deal_negotiation_reviewers%rowtype;v_round public.deal_negotiation_review_rounds%rowtype;v_total integer;v_accepted integer;v_dossier uuid;v_version integer;
begin
 if p_decision not in('accept','request_changes') or (p_decision='request_changes' and char_length(btrim(coalesce(p_comment,'')))<3) then raise exception 'DEAL_REVIEW_INVALID';end if;
 select * into v_reviewer from public.deal_negotiation_reviewers where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') for update;
 if not found or v_reviewer.token_expires_at<=now() then raise exception 'DEAL_LINK_INVALID';end if;
 select * into v_round from public.deal_negotiation_review_rounds where id=v_reviewer.round_id for update;
 if not found or v_round.status not in('active','changes_requested') then raise exception 'DEAL_LINK_INVALID';end if;
 update public.deal_negotiation_reviewers set status=case when p_decision='accept' then 'accepted' else 'changes_requested' end,comment=nullif(btrim(coalesce(p_comment,'')),''),decided_at=now() where id=v_reviewer.id;
 select count(*),count(*)filter(where status='accepted') into v_total,v_accepted from public.deal_negotiation_reviewers where round_id=v_round.id;
 update public.deal_negotiation_review_rounds set status=case when p_decision='request_changes' then 'changes_requested' when v_total=v_accepted then 'unanimously_accepted' else 'active' end,closed_at=case when v_total=v_accepted then now() else null end where id=v_round.id;
 select v.dossier_id,v.version into v_dossier,v_version from public.deal_negotiation_versions v where v.id=v_round.negotiation_version_id;
 if v_total=v_accepted then update public.deal_negotiation_versions set status='accepted',accepted_at=now() where id=v_round.negotiation_version_id;end if;
 insert into public.deal_audit_events(dossier_id,actor_label,event_type,entity_type,entity_id,description,metadata) values(v_dossier,'Participante da negociação','negotiation_review_decision','negotiation_reviewer',v_reviewer.id,case when p_decision='accept' then 'Participante concordou com a versão da negociação.' else 'Participante solicitou alterações na versão da negociação.' end,jsonb_build_object('version',v_version,'decision',p_decision,'round_id',v_round.id));
 return jsonb_build_object('accepted',v_accepted,'total',v_total,'unanimous',v_total=v_accepted,'decision',p_decision);
end;$$;
revoke all on function public.submit_public_negotiation_review(text,text,text) from public,anon,authenticated;
grant execute on function public.submit_public_negotiation_review(text,text,text) to service_role;

create or replace function public.notify_negotiation_review_decision() returns trigger language plpgsql security definer set search_path='' as $$
declare v_owner uuid;v_dossier uuid;v_name text;v_version integer;
begin
 if new.status not in('accepted','changes_requested') or new.status is not distinct from old.status then return new;end if;
 select d.owner_id,d.id,p.name,v.version into v_owner,v_dossier,v_name,v_version from public.deal_negotiation_review_rounds r join public.deal_negotiation_versions v on v.id=r.negotiation_version_id join public.deal_dossiers d on d.id=v.dossier_id join public.deal_participants p on p.id=new.participant_id where r.id=new.round_id;
 insert into public.notifications(user_id,type,title,message,link,data) values(v_owner,'system_alert'::public.notification_type,case when new.status='accepted' then 'Proposta aceita' else 'Alteração solicitada na proposta' end,coalesce(v_name,'Um participante')||case when new.status='accepted' then ' concordou com a versão ' else ' solicitou alterações na versão ' end||v_version||' da negociação.','/crm',jsonb_build_object('scope','deal_negotiation_review_decision','dossier_id',v_dossier,'round_id',new.round_id,'reviewer_id',new.id,'decision',new.status,'version',v_version));
 return new;
end;$$;
revoke all on function public.notify_negotiation_review_decision() from public,anon,authenticated;
drop trigger if exists trg_notify_negotiation_review_decision on public.deal_negotiation_reviewers;
create trigger trg_notify_negotiation_review_decision after update of status on public.deal_negotiation_reviewers for each row execute function public.notify_negotiation_review_decision();

revoke insert,update on public.deal_negotiation_versions,public.deal_negotiation_decisions from authenticated;

create or replace function public.create_deal_negotiation_version(
 p_dossier_id uuid,p_kind text,p_title text,p_terms jsonb,p_notes text default null,p_status text default 'draft'
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_version integer;v_id uuid;v_hash text;v_participant record;
begin
 if v_uid is null or not public.owns_deal_dossier(p_dossier_id) or not public.has_satisfied_mfa() then raise exception 'DEAL_ACCESS_DENIED';end if;
 if p_kind not in('proposal','counterproposal','consolidated_terms') or p_status not in('draft','presented') then raise exception 'DEAL_NEGOTIATION_INVALID';end if;
 if char_length(btrim(coalesce(p_title,'')))<3 or jsonb_typeof(p_terms)<>'object' then raise exception 'DEAL_NEGOTIATION_INVALID';end if;
 select coalesce(max(version),0)+1 into v_version from public.deal_negotiation_versions where dossier_id=p_dossier_id;
 v_hash:=encode(extensions.digest(convert_to(jsonb_build_object('version',v_version,'kind',p_kind,'title',btrim(p_title),'terms',p_terms,'notes',nullif(btrim(coalesce(p_notes,'')),''))::text,'UTF8'),'sha256'),'hex');
 update public.deal_negotiation_versions set status='superseded' where dossier_id=p_dossier_id and status in('draft','presented');
 insert into public.deal_negotiation_versions(dossier_id,version,kind,status,title,terms,notes,content_hash,created_by) values(p_dossier_id,v_version,p_kind,p_status,btrim(p_title),p_terms,nullif(btrim(coalesce(p_notes,'')),''),v_hash,v_uid) returning id into v_id;
 for v_participant in select id from public.deal_participants where dossier_id=p_dossier_id and role in('owner','co_owner','buyer','tenant','spouse','representative') and status<>'inactive' loop insert into public.deal_negotiation_decisions(negotiation_version_id,participant_id,decision) values(v_id,v_participant.id,'pending');end loop;
 update public.deal_dossiers set current_stage='negotiation',progress=greatest(progress,15),updated_at=now() where id=p_dossier_id;
 insert into public.deal_audit_events(dossier_id,actor_profile_id,actor_label,event_type,entity_type,entity_id,description,metadata) values(p_dossier_id,v_uid,'Profissional responsável','negotiation_version_created','negotiation_version',v_id,'Versão '||v_version||' da negociação registrada.',jsonb_build_object('version',v_version,'kind',p_kind,'status',p_status,'content_hash',v_hash));
 return v_id;
end;$$;
revoke all on function public.create_deal_negotiation_version(uuid,text,text,jsonb,text,text) from public,anon;
grant execute on function public.create_deal_negotiation_version(uuid,text,text,jsonb,text,text) to authenticated;

notify pgrst,'reload schema';
commit;
