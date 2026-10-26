begin;

alter table public.deal_document_request_items add column if not exists category text not null default 'other';
alter table public.deal_document_request_items add column if not exists valid_until date;
alter table public.deal_document_request_items add column if not exists weight smallint not null default 1 check(weight between 1 and 5);

update public.deal_document_request_items i set category=c.category
from public.deal_document_catalog c where c.key=i.catalog_key and i.category='other';

create or replace function public.fill_deal_document_item_category() returns trigger language plpgsql set search_path='' as $$
begin select coalesce(c.category,'other') into new.category from public.deal_document_catalog c where c.key=new.catalog_key; return new; end;$$;
drop trigger if exists trg_fill_deal_document_item_category on public.deal_document_request_items;
create trigger trg_fill_deal_document_item_category before insert on public.deal_document_request_items for each row execute function public.fill_deal_document_item_category();

create table if not exists public.deal_review_findings(
 id uuid primary key default gen_random_uuid(), dossier_id uuid not null references public.deal_dossiers(id) on delete cascade,
 request_item_id uuid references public.deal_document_request_items(id) on delete set null,
 kind text not null check(kind in ('data_difference','blocking','reservation')),
 field_name text, registered_value text, document_value text, description text not null,
 status text not null default 'open' check(status in ('open','resolved','accepted')),
 resolution_note text, created_by uuid not null references public.profiles(id) on delete restrict,
 resolved_by uuid references public.profiles(id) on delete set null, resolved_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists idx_deal_findings_dossier on public.deal_review_findings(dossier_id,status,created_at desc);

create table if not exists public.deal_dossier_snapshots(
 id uuid primary key default gen_random_uuid(), dossier_id uuid not null references public.deal_dossiers(id) on delete restrict,
 version integer not null check(version>0), purpose text not null default 'contract_basis',
 content jsonb not null, content_hash text not null, created_by uuid not null references public.profiles(id) on delete restrict,
 created_at timestamptz not null default now(), unique(dossier_id,version)
);
create index if not exists idx_deal_snapshots_dossier on public.deal_dossier_snapshots(dossier_id,version desc);

alter table public.deal_review_findings enable row level security;
alter table public.deal_dossier_snapshots enable row level security;
revoke all on public.deal_review_findings,public.deal_dossier_snapshots from public,anon;
grant select,insert,update on public.deal_review_findings to authenticated;
grant select on public.deal_dossier_snapshots to authenticated;
create policy "owners manage deal findings" on public.deal_review_findings for all to authenticated
 using(public.owns_deal_dossier(dossier_id) and public.has_satisfied_mfa())
 with check(public.owns_deal_dossier(dossier_id) and created_by=auth.uid() and public.has_satisfied_mfa());
create policy "owners read deal snapshots" on public.deal_dossier_snapshots for select to authenticated
 using(public.owns_deal_dossier(dossier_id) and public.has_satisfied_mfa());

create or replace function public.recalculate_deal_dossier(p_dossier_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_total integer; v_done integer; v_progress integer; v_blockers integer;
begin
 if v_uid is null or not public.owns_deal_dossier(p_dossier_id) or not public.has_satisfied_mfa() then raise exception 'DEAL_ACCESS_DENIED'; end if;
 update public.deal_document_requests set status='expired',updated_at=now() where dossier_id=p_dossier_id and status not in('completed','revoked','expired') and token_expires_at<now();
 update public.deal_document_request_items i set status='expired',updated_at=now() from public.deal_document_requests r where r.id=i.request_id and r.dossier_id=p_dossier_id and i.valid_until<current_date and i.status='approved';
 select coalesce(sum(weight),0),coalesce(sum(weight) filter(where status in ('approved','not_applicable')),0) into v_total,v_done
 from public.deal_document_request_items i join public.deal_document_requests r on r.id=i.request_id where r.dossier_id=p_dossier_id;
 select count(*) into v_blockers from public.deal_review_findings where dossier_id=p_dossier_id and kind='blocking' and status='open';
 v_progress:=case when v_total=0 then 10 else least(90,10+round(80.0*v_done/v_total)::integer) end;
 update public.deal_dossiers set progress=v_progress,current_stage=case when v_total>0 then 'review' else current_stage end,
  status=case when v_total>0 and v_done=v_total and v_blockers=0 then 'ready_for_contract' else 'reviewing' end,updated_at=now() where id=p_dossier_id;
 return jsonb_build_object('progress',v_progress,'approved_weight',v_done,'total_weight',v_total,'open_blockers',v_blockers,'ready',v_total>0 and v_done=v_total and v_blockers=0);
end;$$;
revoke all on function public.recalculate_deal_dossier(uuid) from public,anon;
grant execute on function public.recalculate_deal_dossier(uuid) to authenticated;

create or replace function public.create_deal_dossier_snapshot(p_dossier_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_version integer; v_content jsonb; v_hash text; v_id uuid; v_metrics jsonb;
begin
 if v_uid is null or not public.owns_deal_dossier(p_dossier_id) or not public.has_satisfied_mfa() then raise exception 'DEAL_ACCESS_DENIED'; end if;
 v_metrics:=public.recalculate_deal_dossier(p_dossier_id);
 if not coalesce((v_metrics->>'ready')::boolean,false) then raise exception 'DEAL_DOSSIER_NOT_READY'; end if;
 select jsonb_build_object('dossier',to_jsonb(d),'participants',coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at) from public.deal_participants p where p.dossier_id=d.id),'[]'::jsonb),
  'documents',coalesce((select jsonb_agg(jsonb_build_object('item_id',i.id,'label',i.label,'category',i.category,'status',i.status,'valid_until',i.valid_until,'document_id',doc.id,'storage_path',doc.storage_path,'version',doc.version,'mime_type',doc.mime_type,'file_size',doc.file_size) order by i.category,i.label) from public.deal_document_request_items i join public.deal_document_requests r on r.id=i.request_id left join public.deal_documents doc on doc.request_item_id=i.id and doc.is_current where r.dossier_id=d.id),'[]'::jsonb),
  'findings',coalesce((select jsonb_agg(to_jsonb(f) order by f.created_at) from public.deal_review_findings f where f.dossier_id=d.id),'[]'::jsonb),'created_at',now()) into v_content
 from public.deal_dossiers d where d.id=p_dossier_id;
 v_hash:=encode(extensions.digest(convert_to(v_content::text,'UTF8'),'sha256'),'hex');
 select coalesce(max(version),0)+1 into v_version from public.deal_dossier_snapshots where dossier_id=p_dossier_id;
 insert into public.deal_dossier_snapshots(dossier_id,version,content,content_hash,created_by) values(p_dossier_id,v_version,v_content,v_hash,v_uid) returning id into v_id;
 insert into public.deal_audit_events(dossier_id,actor_profile_id,actor_label,event_type,entity_type,entity_id,description,metadata) values(p_dossier_id,v_uid,'Profissional responsável','dossier_snapshot_created','dossier_snapshot',v_id,'Fotografia imutável do dossiê criada para o contrato.',jsonb_build_object('version',v_version,'hash',v_hash));
 return v_id;
end;$$;
revoke all on function public.create_deal_dossier_snapshot(uuid) from public,anon;
grant execute on function public.create_deal_dossier_snapshot(uuid) to authenticated;

notify pgrst,'reload schema';
commit;
