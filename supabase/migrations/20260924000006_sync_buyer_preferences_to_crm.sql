begin;

-- Share only the buyer's property-search criteria with the responsible
-- advertiser. Notification choices remain private in profile_preferences.
create or replace function public.sync_profile_preferences_to_lead_crm()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.lead_crm (lead_id, meta, updated_at)
  select
    l.id,
    jsonb_build_object(
      'budget', new.preferences->'maxPrice',
      'budgetMax', new.preferences->'maxPrice',
      'preferences', jsonb_build_object(
        'purpose', new.preferences->'purpose',
        'maxPrice', new.preferences->'maxPrice'
      )
    ),
    now()
  from public.leads l
  where l.buyer_id = new.user_id
  on conflict (lead_id) do update
    set meta = coalesce(public.lead_crm.meta, '{}'::jsonb) || excluded.meta,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_sync_profile_preferences_to_lead_crm on public.profile_preferences;
create trigger trg_sync_profile_preferences_to_lead_crm
after insert or update of preferences on public.profile_preferences
for each row execute function public.sync_profile_preferences_to_lead_crm();

create or replace function public.sync_new_lead_buyer_preferences()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_preferences jsonb;
begin
  if new.buyer_id is null then return new; end if;
  select pp.preferences into v_preferences
  from public.profile_preferences pp
  where pp.user_id = new.buyer_id;
  if v_preferences is null then return new; end if;

  insert into public.lead_crm (lead_id, meta, updated_at)
  values (
    new.id,
    jsonb_build_object(
      'budget', v_preferences->'maxPrice',
      'budgetMax', v_preferences->'maxPrice',
      'preferences', jsonb_build_object(
        'purpose', v_preferences->'purpose',
        'maxPrice', v_preferences->'maxPrice'
      )
    ),
    now()
  )
  on conflict (lead_id) do update
    set meta = coalesce(public.lead_crm.meta, '{}'::jsonb) || excluded.meta,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_sync_new_lead_buyer_preferences on public.leads;
create trigger trg_sync_new_lead_buyer_preferences
after insert or update of buyer_id on public.leads
for each row execute function public.sync_new_lead_buyer_preferences();

-- Populate existing authenticated buyer leads immediately.
insert into public.lead_crm (lead_id, meta, updated_at)
select
  l.id,
  jsonb_build_object(
    'budget', pp.preferences->'maxPrice',
    'budgetMax', pp.preferences->'maxPrice',
    'preferences', jsonb_build_object(
      'purpose', pp.preferences->'purpose',
      'maxPrice', pp.preferences->'maxPrice'
    )
  ),
  now()
from public.leads l
join public.profile_preferences pp on pp.user_id = l.buyer_id
on conflict (lead_id) do update
  set meta = coalesce(public.lead_crm.meta, '{}'::jsonb) || excluded.meta,
      updated_at = now();

notify pgrst, 'reload schema';
commit;
