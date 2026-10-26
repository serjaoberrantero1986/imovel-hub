begin;

create table if not exists public.deal_signature_envelopes(
 id uuid primary key default gen_random_uuid(),dossier_id uuid not null references public.deal_dossiers(id) on delete restrict,
 contract_version_id uuid not null references public.deal_contract_versions(id) on delete restrict,provider text not null default 'supersign' check(provider='supersign'),
 environment text not null default 'sandbox' check(environment in('sandbox','production')),external_envelope_id text unique,
 status text not null default 'preparing' check(status in('preparing','uploading','sent','partially_signed','completed','declined','expired','voided','failed')),
 idempotency_key text not null unique,document_id text,sealed_storage_path text,validation_data jsonb not null default '{}'::jsonb,
 error_code text,error_message text,created_by uuid not null references public.profiles(id) on delete restrict,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),completed_at timestamptz,
 unique(contract_version_id,environment)
);
create index if not exists idx_deal_signature_envelopes_dossier on public.deal_signature_envelopes(dossier_id,created_at desc);

create table if not exists public.deal_signature_participants(
 id uuid primary key default gen_random_uuid(),envelope_id uuid not null references public.deal_signature_envelopes(id) on delete cascade,
 deal_participant_id uuid not null references public.deal_participants(id) on delete restrict,external_participant_id text not null,
 signing_order integer not null check(signing_order>0),qualification text not null,status text not null default 'pending' check(status in('pending','notified','signed','declined','email_failed')),
 signed_at timestamptz,updated_at timestamptz not null default now(),unique(envelope_id,deal_participant_id),unique(envelope_id,external_participant_id)
);

create table if not exists public.deal_signature_webhook_events(
 id uuid primary key default gen_random_uuid(),provider_event_id text not null unique,event_type text not null,external_envelope_id text,
 payload jsonb not null,payload_hash text not null,received_at timestamptz not null default now(),processed_at timestamptz,processing_status text not null default 'received' check(processing_status in('received','processed','ignored','failed')),error_message text
);

alter table public.deal_signature_envelopes enable row level security;alter table public.deal_signature_participants enable row level security;alter table public.deal_signature_webhook_events enable row level security;
revoke all on public.deal_signature_envelopes,public.deal_signature_participants,public.deal_signature_webhook_events from public,anon,authenticated;
grant select on public.deal_signature_envelopes,public.deal_signature_participants to authenticated;
create policy "owners read signature envelopes" on public.deal_signature_envelopes for select to authenticated using(public.owns_deal_dossier(dossier_id) and public.has_satisfied_mfa());
create policy "owners read signature participants" on public.deal_signature_participants for select to authenticated using(exists(select 1 from public.deal_signature_envelopes e where e.id=envelope_id and public.owns_deal_dossier(e.dossier_id)) and public.has_satisfied_mfa());

create or replace function public.get_deal_signature_status(p_dossier_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_result jsonb;
begin
 if auth.uid() is null or not public.owns_deal_dossier(p_dossier_id) or not public.has_satisfied_mfa() then raise exception 'DEAL_ACCESS_DENIED';end if;
 select jsonb_build_object('envelope',to_jsonb(e),'participants',coalesce((select jsonb_agg(to_jsonb(sp)||jsonb_build_object('name',dp.name,'role',dp.role) order by sp.signing_order) from public.deal_signature_participants sp join public.deal_participants dp on dp.id=sp.deal_participant_id where sp.envelope_id=e.id),'[]'::jsonb)) into v_result from public.deal_signature_envelopes e where e.dossier_id=p_dossier_id order by e.created_at desc limit 1;
 return coalesce(v_result,'{}'::jsonb);
end;$$;
revoke all on function public.get_deal_signature_status(uuid) from public,anon;grant execute on function public.get_deal_signature_status(uuid) to authenticated;

notify pgrst,'reload schema';commit;
