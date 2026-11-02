begin;

-- Financial records must remain available for reconciliation after the profile
-- is removed, while no longer identifying the deleted account.
alter table public.commercial_checkout_attempts alter column profile_id drop not null;
alter table public.commercial_checkout_attempts drop constraint commercial_checkout_attempts_profile_id_fkey;
alter table public.commercial_checkout_attempts add constraint commercial_checkout_attempts_profile_id_fkey
  foreign key (profile_id) references public.profiles(id) on delete set null;

alter table public.commercial_subscriptions alter column profile_id drop not null;
alter table public.commercial_subscriptions drop constraint commercial_subscriptions_profile_id_fkey;
alter table public.commercial_subscriptions add constraint commercial_subscriptions_profile_id_fkey
  foreign key (profile_id) references public.profiles(id) on delete set null;

-- Historical actors are anonymized instead of blocking self-deletion.
do $$
declare
  item record;
begin
  for item in select * from (values
    ('deal_certificate_source_audit','actor_id','deal_certificate_source_audit_actor_id_fkey'),
    ('deal_contract_review_rounds','created_by','deal_contract_review_rounds_created_by_fkey'),
    ('deal_contract_versions','created_by','deal_contract_versions_created_by_fkey'),
    ('deal_contracts','created_by','deal_contracts_created_by_fkey'),
    ('deal_document_requests','requested_by','deal_document_requests_requested_by_fkey'),
    ('deal_dossier_snapshots','created_by','deal_dossier_snapshots_created_by_fkey'),
    ('deal_dossiers','owner_id','deal_dossiers_owner_id_fkey'),
    ('deal_negotiation_review_rounds','created_by','deal_negotiation_review_rounds_created_by_fkey'),
    ('deal_negotiation_versions','created_by','deal_negotiation_versions_created_by_fkey'),
    ('deal_participants','created_by','deal_participants_created_by_fkey'),
    ('deal_review_findings','created_by','deal_review_findings_created_by_fkey'),
    ('deal_signature_envelopes','created_by','deal_signature_envelopes_created_by_fkey'),
    ('partnership_deal_outcomes','recorded_by','partnership_deal_outcomes_recorded_by_fkey'),
    ('partnership_portfolio_agreements','captor_id','partnership_portfolio_agreements_captor_id_fkey'),
    ('partnership_portfolio_agreements','partner_id','partnership_portfolio_agreements_partner_id_fkey'),
    ('partnership_visits','responsible_id','partnership_visits_responsible_id_fkey')
  ) as targets(table_name,column_name,constraint_name)
  loop
    execute format('alter table public.%I alter column %I drop not null', item.table_name, item.column_name);
    execute format('alter table public.%I drop constraint %I', item.table_name, item.constraint_name);
    execute format('alter table public.%I add constraint %I foreign key (%I) references public.profiles(id) on delete set null',
      item.table_name, item.constraint_name, item.column_name);
  end loop;
end;
$$;

-- Property evidence also remains, detached from the deleted listing.
do $$
declare
  item record;
begin
  for item in select * from (values
    ('partnership_contract_property_scope','property_id','partnership_contract_property_scope_property_id_fkey'),
    ('partnership_deal_outcomes','property_id','partnership_deal_outcomes_property_id_fkey'),
    ('partnership_visits','property_id','partnership_visits_property_id_fkey')
  ) as targets(table_name,column_name,constraint_name)
  loop
    execute format('alter table public.%I alter column %I drop not null', item.table_name, item.column_name);
    execute format('alter table public.%I drop constraint %I', item.table_name, item.constraint_name);
    execute format('alter table public.%I add constraint %I foreign key (%I) references public.properties(id) on delete set null',
      item.table_name, item.constraint_name, item.column_name);
  end loop;
end;
$$;

create or replace function public.prevent_partnership_scope_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE'
    and current_setting('webimovel.account_deletion_profile_id', true) <> ''
    and old.property_id is not null and new.property_id is null
    and (to_jsonb(new) - 'property_id') = (to_jsonb(old) - 'property_id') then
    return new;
  end if;
  raise exception 'Contract property scope is immutable';
end;
$$;

create or replace function public.prevent_partnership_deal_outcome_mutation()
returns trigger language plpgsql set search_path = '' as $$
declare
  deletion_profile text := current_setting('webimovel.account_deletion_profile_id', true);
begin
  if tg_op = 'UPDATE'
    and deletion_profile <> ''
    and (old.property_id is not distinct from new.property_id or (old.property_id is not null and new.property_id is null))
    and (old.recorded_by is not distinct from new.recorded_by or (old.recorded_by::text = deletion_profile and new.recorded_by is null))
    and (old.property_id is distinct from new.property_id or old.recorded_by is distinct from new.recorded_by)
    and (to_jsonb(new) - 'property_id' - 'recorded_by') = (to_jsonb(old) - 'property_id' - 'recorded_by') then
    return new;
  end if;
  raise exception 'Deal outcome is immutable';
end;
$$;

create or replace function public.delete_my_account()
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_role public.user_role;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select role into v_role from public.profiles where id = v_uid for update;
  if not found then raise exception 'Profile not found'; end if;
  if v_role = 'admin'::public.user_role then raise exception 'Administrative accounts cannot be deleted'; end if;
  if not exists (select 1 from public.profiles p where p.id = v_uid and p.account_deletion_requested_at > now() - interval '15 minutes') then
    raise exception 'Account deletion confirmation expired';
  end if;

  -- Set before listing removal so immutable evidence triggers can authorize only
  -- the nullification performed by this deletion transaction.
  perform set_config('webimovel.account_deletion_profile_id', v_uid::text, true);

  update public.messages set sender_id = null, content = 'Mensagem removida pelo usuário excluído.' where sender_id = v_uid;
  update public.conversations
    set buyer_id = case when buyer_id = v_uid then null else buyer_id end,
        advertiser_id = case when advertiser_id = v_uid then null else advertiser_id end,
        buyer_unread_count = case when buyer_id = v_uid then 0 else buyer_unread_count end,
        advertiser_unread_count = case when advertiser_id = v_uid then 0 else advertiser_unread_count end,
        last_message_text = 'Conversa com usuário excluído'
    where buyer_id = v_uid or advertiser_id = v_uid;

  if to_regclass('public.crm_interactions') is not null then execute 'delete from public.crm_interactions where broker_id = $1' using v_uid; end if;
  if to_regclass('public.crm_tasks') is not null then execute 'delete from public.crm_tasks where broker_id = $1' using v_uid; end if;
  if to_regclass('public.crm_deals') is not null then execute 'delete from public.crm_deals where broker_id = $1' using v_uid; end if;
  if to_regclass('public.clients') is not null then execute 'delete from public.clients where broker_id = $1' using v_uid; end if;
  if to_regclass('public.leads') is not null then execute 'delete from public.leads where advertiser_id = $1' using v_uid; end if;
  if to_regclass('public.properties') is not null then execute 'delete from public.properties where user_id = $1' using v_uid; end if;

  delete from public.portal_settings where owner_profile_id = v_uid or id = v_uid::text;
  delete from auth.users where id = v_uid;
  if not found then raise exception 'Authentication account not found'; end if;
  return true;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- Migration-time guard: every direct profile blocker must be handled. The
-- listing owner FK is intentionally retained because the RPC removes listings.
do $$
declare blockers text;
begin
  select string_agg(con.conname, ', ' order by con.conname) into blockers
  from pg_constraint con
  where con.contype = 'f' and con.confrelid = 'public.profiles'::regclass
    and con.confdeltype in ('a','r') and con.conname <> 'properties_user_id_fkey';
  if blockers is not null then raise exception 'Unhandled profile deletion blockers: %', blockers; end if;

  select string_agg(con.conname, ', ' order by con.conname) into blockers
  from pg_constraint con
  where con.contype = 'f' and con.confrelid = 'public.properties'::regclass
    and con.confdeltype in ('a','r');
  if blockers is not null then raise exception 'Unhandled property deletion blockers: %', blockers; end if;
end;
$$;

commit;
