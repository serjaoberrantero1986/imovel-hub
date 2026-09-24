begin;

-- Preferences are not part of the publicly readable profiles table.
create table if not exists public.profile_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb
    check (jsonb_typeof(preferences) = 'object'),
  updated_at timestamptz not null default now()
);
alter table public.profile_preferences enable row level security;
revoke all on public.profile_preferences from public, anon, authenticated;
grant select, insert, update on public.profile_preferences to authenticated;
drop policy if exists "user manages own preferences" on public.profile_preferences;
create policy "user manages own preferences" on public.profile_preferences
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- One transaction: a failed preference write also rolls back the profile write.
-- Invoker rights preserve the existing profile policies and privilege guards.
create or replace function public.save_my_profile(p_profile jsonb, p_preferences jsonb default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_preferences jsonb;
  v_key text;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(p_profile) is distinct from 'object' then
    raise exception 'Invalid profile';
  end if;
  if p_preferences is not null then
    if jsonb_typeof(p_preferences) is distinct from 'object' then
      raise exception 'Invalid preferences';
    end if;
    if p_preferences ? 'purpose' and
       coalesce(p_preferences->>'purpose', '') not in ('sale', 'rent', 'all', 'seasonal', 'launch') then
      raise exception 'Invalid purpose';
    end if;
    if p_preferences ? 'maxPrice' then
      if jsonb_typeof(p_preferences->'maxPrice') <> 'number' then
        raise exception 'Invalid maximum price';
      end if;
      if (p_preferences->>'maxPrice')::numeric < 0 then
        raise exception 'Invalid maximum price';
      end if;
    end if;
    foreach v_key in array array['alertEmail', 'alertWhatsapp', 'allowPartnerContact'] loop
      if p_preferences ? v_key and jsonb_typeof(p_preferences->v_key) <> 'boolean' then
        raise exception 'Invalid notification preference';
      end if;
    end loop;
  end if;

  select * into v_profile from public.profiles where id = v_uid for update;
  if not found then raise exception 'Profile not found'; end if;
  v_profile := jsonb_populate_record(v_profile, p_profile);
  -- Explicit allowlist: never accept changes to id, role, email or verified.
  update public.profiles set
    name = v_profile.name, phone = v_profile.phone, whatsapp = v_profile.whatsapp,
    avatar_url = v_profile.avatar_url, creci = v_profile.creci, creci_uf = v_profile.creci_uf,
    creci_type = v_profile.creci_type, creci_status = v_profile.creci_status,
    creci_verified_at = v_profile.creci_verified_at, creci_protocol = v_profile.creci_protocol,
    agency_name = v_profile.agency_name, agency_logo = v_profile.agency_logo,
    city = v_profile.city, state = v_profile.state, bio = v_profile.bio,
    website = v_profile.website, instagram = v_profile.instagram, linkedin = v_profile.linkedin,
    available_weekend_visits = v_profile.available_weekend_visits, updated_at = now()
  where id = v_uid returning * into v_profile;
  if not found then raise exception 'Profile update denied'; end if;

  if p_preferences is not null then
    insert into public.profile_preferences(user_id, preferences)
    values (v_uid, p_preferences)
    on conflict (user_id) do update
      set preferences = excluded.preferences, updated_at = now();
  end if;
  select preferences into v_preferences from public.profile_preferences where user_id = v_uid;
  return jsonb_build_object('profile', to_jsonb(v_profile), 'preferences', coalesce(v_preferences, '{}'::jsonb));
end;
$$;
revoke all on function public.save_my_profile(jsonb, jsonb) from public, anon;
grant execute on function public.save_my_profile(jsonb, jsonb) to authenticated;

alter table public.conversations
  add column if not exists is_archived_buyer boolean not null default false,
  add column if not exists is_archived_advertiser boolean not null default false;

-- Keep history shared and immutable to participant deletion. Restrictive policies
-- also guard installations with older permissive ALL policies/column grants.
revoke update, delete on public.conversations from public, anon, authenticated;
revoke delete on public.messages from public, anon, authenticated;
drop policy if exists "no participant conversation deletion" on public.conversations;
create policy "no participant conversation deletion" on public.conversations
  as restrictive for delete to anon, authenticated using (false);
drop policy if exists "conversation changes through safe functions" on public.conversations;
create policy "conversation changes through safe functions" on public.conversations
  as restrictive for update to anon, authenticated using (false) with check (false);
drop policy if exists "no participant message deletion" on public.messages;
create policy "no participant message deletion" on public.messages
  as restrictive for delete to anon, authenticated using (false);

-- Prevent new conversations from pre-archiving the other participant.
drop policy if exists "new conversations start unarchived" on public.conversations;
create policy "new conversations start unarchived" on public.conversations
  as restrictive for insert to authenticated
  with check (not is_archived_buyer and not is_archived_advertiser);

create or replace function public.set_my_conversation_archive(p_conversation_id uuid, p_archived boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null or p_archived is null then raise exception 'Authentication required'; end if;
  update public.conversations
     set is_archived_buyer = case when buyer_id = v_uid then p_archived else is_archived_buyer end,
         is_archived_advertiser = case when advertiser_id = v_uid then p_archived else is_archived_advertiser end,
         updated_at = now()
   where id = p_conversation_id and v_uid in (buyer_id, advertiser_id);
  if not found then raise exception 'Conversation access denied'; end if;
  return true;
end;
$$;
revoke all on function public.set_my_conversation_archive(uuid, boolean) from public, anon;
grant execute on function public.set_my_conversation_archive(uuid, boolean) to authenticated;

-- A new incoming message restores the recipient's inbox, never deletes history.
create or replace function public.handle_new_message_sync()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.conversations
     set last_message_text = left(new.content, 200), last_message_at = new.created_at,
         advertiser_unread_count = advertiser_unread_count + case when new.sender_id = buyer_id then 1 else 0 end,
         buyer_unread_count = buyer_unread_count + case when new.sender_id = advertiser_id then 1 else 0 end,
         is_archived_advertiser = case when new.sender_id = buyer_id then false else is_archived_advertiser end,
         is_archived_buyer = case when new.sender_id = advertiser_id then false else is_archived_buyer end,
         updated_at = now()
   where id = new.conversation_id;
  return new;
end;
$$;

-- Existing lead-linking entry point must not restore BOTH participants' archives.
-- Only the buyer already linked to this lead can open it through this function.
create or replace function public.create_lead_conversation(p_lead_id uuid, p_buyer_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_lead public.leads%rowtype;
  v_conversation_id uuid;
begin
  select * into v_lead from public.leads where id = p_lead_id for update;
  if not found or p_buyer_id is null then return null; end if;
  if v_lead.buyer_id is distinct from p_buyer_id or
     (auth.uid() is not null and auth.uid() <> p_buyer_id) then
    raise exception 'Conversation access denied';
  end if;
  select id into v_conversation_id from public.conversations
   where property_id is not distinct from v_lead.property_id
     and buyer_id = p_buyer_id and advertiser_id = v_lead.advertiser_id limit 1;
  if v_conversation_id is null then
    insert into public.conversations(property_id, buyer_id, advertiser_id, last_message_text, last_message_at)
    values (v_lead.property_id, p_buyer_id, v_lead.advertiser_id,
      left(coalesce(v_lead.message, 'Novo contato recebido.'), 200), now())
    returning id into v_conversation_id;
  end if;
  if not exists (select 1 from public.messages where conversation_id = v_conversation_id) then
    insert into public.messages(conversation_id, sender_id, content)
    values (v_conversation_id, p_buyer_id, coalesce(v_lead.message, 'Olá! Tenho interesse neste imóvel.'));
  end if;
  return v_conversation_id;
end;
$$;
revoke all on function public.create_lead_conversation(uuid, uuid) from public, anon;
grant execute on function public.create_lead_conversation(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
