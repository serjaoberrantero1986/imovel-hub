begin;

create or replace function public.is_account_deletion_anonymization(
  old_row jsonb,
  new_row jsonb,
  profile_columns text[],
  context_columns text[] default array[]::text[]
)
returns boolean language plpgsql stable set search_path = '' as $$
declare
  deletion_profile text := current_setting('webimovel.account_deletion_profile_id', true);
  changed_count integer;
  invalid_count integer;
begin
  if coalesce(deletion_profile, '') = '' then return false; end if;

  select count(*), count(*) filter (where not (
    (key = any(profile_columns) and new_row -> key = 'null'::jsonb and old_row ->> key = deletion_profile)
    or
    (key = any(context_columns) and new_row -> key = 'null'::jsonb and old_row -> key <> 'null'::jsonb)
  ))
  into changed_count, invalid_count
  from jsonb_object_keys(new_row) as keys(key)
  where new_row -> key is distinct from old_row -> key;

  return changed_count > 0 and invalid_count = 0;
end;
$$;
revoke all on function public.is_account_deletion_anonymization(jsonb,jsonb,text[],text[]) from public, anon, authenticated;

create or replace function public.prevent_contract_evidence_mutation()
returns trigger language plpgsql set search_path = '' as $$
declare profile_columns text[];
begin
  profile_columns := case tg_table_name
    when 'partnership_contract_acknowledgements' then array['profile_id']
    when 'partnership_contract_document_reviews' then array['administrator_id']
    when 'partnership_contract_documents' then array['uploaded_by']
    when 'partnership_contract_events' then array['actor_id']
    when 'partnership_sgr_submissions' then array['profile_id']
    else array[]::text[] end;
  if tg_op = 'UPDATE' and public.is_account_deletion_anonymization(to_jsonb(old), to_jsonb(new), profile_columns) then return new; end if;
  raise exception 'Contract evidence is immutable';
end;
$$;

create or replace function public.prevent_partnership_lead_evidence_mutation()
returns trigger language plpgsql set search_path = '' as $$
declare profile_columns text[];
declare context_columns text[] := array[]::text[];
begin
  if tg_table_name = 'partnership_lead_access_audit' then
    profile_columns := array['actor_id'];
  elsif tg_table_name = 'partnership_lead_attributions' then
    profile_columns := array['buyer_id','captor_id','partner_id'];
    context_columns := array['lead_id','property_id'];
  else
    profile_columns := array[]::text[];
  end if;
  if tg_op = 'UPDATE' and public.is_account_deletion_anonymization(to_jsonb(old), to_jsonb(new), profile_columns, context_columns) then return new; end if;
  raise exception 'Partnership lead evidence is immutable';
end;
$$;

create or replace function public.prevent_partnership_snapshot_mutation()
returns trigger language plpgsql set search_path = '' as $$
declare profile_columns text[];
begin
  profile_columns := case tg_table_name
    when 'property_partnership_events' then array['actor_id']
    when 'property_partnership_term_versions' then array['proposed_by']
    else array[]::text[] end;
  if tg_op = 'UPDATE' and public.is_account_deletion_anonymization(to_jsonb(old), to_jsonb(new), profile_columns) then return new; end if;
  raise exception 'Partnership snapshots are immutable';
end;
$$;

create or replace function public.prevent_partnership_lifecycle_event_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and public.is_account_deletion_anonymization(to_jsonb(old), to_jsonb(new), array['actor_id']) then return new; end if;
  raise exception 'Partnership lifecycle events are immutable';
end;
$$;

create or replace function public.protect_partnership_contract_version()
returns trigger language plpgsql set search_path = '' as $$
begin
  if public.is_account_deletion_anonymization(to_jsonb(old), to_jsonb(new), array['captor_id','partner_id','created_by']) then return new; end if;
  if new.negotiation_id<>old.negotiation_id or new.term_version_id<>old.term_version_id or new.version_number<>old.version_number
    or new.captor_id is distinct from old.captor_id or new.partner_id is distinct from old.partner_id
    or new.captor_snapshot<>old.captor_snapshot or new.partner_snapshot<>old.partner_snapshot
    or new.property_snapshot<>old.property_snapshot or new.canonical_terms<>old.canonical_terms
    or new.canonical_sha256<>old.canonical_sha256 or new.original_sgr_contract_number<>old.original_sgr_contract_number
    or new.declaration_version<>old.declaration_version or new.created_by is distinct from old.created_by
    or new.created_at<>old.created_at or new.portfolio_agreement_id is distinct from old.portfolio_agreement_id
    or new.instrument_kind<>old.instrument_kind then
    raise exception 'Canonical contract data is immutable';
  end if;
  return new;
end;
$$;

commit;
