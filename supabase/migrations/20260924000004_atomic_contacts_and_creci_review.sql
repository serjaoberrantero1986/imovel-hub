begin;

-- A single lead represents one contact for one advertiser. Contact attempts and
-- properties remain in a private history rather than becoming duplicate cards.
alter table public.leads add column if not exists contact_key text;
create unique index if not exists uq_leads_advertiser_contact_key
  on public.leads(advertiser_id, contact_key) where contact_key is not null;

create table if not exists public.lead_contact_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  message text not null,
  origin text not null default 'portal_form',
  created_at timestamptz not null default now()
);
create index if not exists idx_lead_contact_events_lead_created
  on public.lead_contact_events(lead_id, created_at desc);
alter table public.lead_contact_events enable row level security;
revoke all on public.lead_contact_events from public, anon, authenticated;
grant select on public.lead_contact_events to authenticated;
drop policy if exists "advertiser reads own lead contact events" on public.lead_contact_events;
create policy "advertiser reads own lead contact events" on public.lead_contact_events
  for select to authenticated using (
    exists (
      select 1 from public.leads l
      where l.id = lead_contact_events.lead_id and l.advertiser_id = (select auth.uid())
    )
  );

-- This is the only public entry point for a property contact. It either reuses
-- the advertiser's existing lead or creates it, then records the event and,
-- for an authenticated buyer, creates/reuses the chat in the same transaction.
create or replace function public.submit_property_contact(
  p_property_id uuid,
  p_name text,
  p_email text default null,
  p_phone text default null,
  p_message text default null,
  p_origin text default 'portal_form'
)
returns table (lead_id uuid, conversation_id uuid, created_lead boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_advertiser_id uuid;
  v_buyer_id uuid := auth.uid();
  v_lead_id uuid;
  v_conversation_id uuid;
  v_contact_key text;
  v_name text;
  v_email text;
  v_phone text;
  v_message text;
  v_created boolean := false;
begin
  if p_property_id is null then raise exception 'Property is required'; end if;
  select p.user_id into v_advertiser_id from public.properties p where p.id = p_property_id;
  if v_advertiser_id is null then raise exception 'Property not found'; end if;

  v_name := left(trim(coalesce(p_name, '')), 150);
  v_email := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_phone := nullif(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g'), '');
  v_message := left(trim(coalesce(p_message, '')), 4000);
  if v_name = '' then raise exception 'Name is required'; end if;
  if v_email is not null and v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Invalid email';
  end if;
  if v_phone is not null and length(v_phone) < 10 then raise exception 'Invalid phone'; end if;
  if v_email is null and v_phone is null then raise exception 'A contact channel is required'; end if;
  if v_message = '' then raise exception 'Message is required'; end if;
  if p_origin not in ('portal_form', 'schedule_visit') then raise exception 'Invalid contact origin'; end if;

  -- A signed-in buyer is identified by account, not by editable form values.
  if v_buyer_id is not null then
    select pr.name, lower(nullif(trim(pr.email), '')), nullif(regexp_replace(coalesce(pr.whatsapp, pr.phone, ''), '[^0-9]', '', 'g'), '')
      into v_name, v_email, v_phone
      from public.profiles pr where pr.id = v_buyer_id;
    if v_name is null or v_name = '' then raise exception 'Buyer profile not found'; end if;
    if v_email is null and v_phone is null then raise exception 'Complete your profile with email or telephone before contacting an advertiser'; end if;
    v_contact_key := 'account:' || v_buyer_id::text;
  elsif v_email is not null then
    v_contact_key := 'email:' || encode(extensions.digest(v_email, 'sha256'), 'hex');
  else
    v_contact_key := 'phone:' || encode(extensions.digest(v_phone, 'sha256'), 'hex');
  end if;

  -- Existing visitor contacts are absorbed when that visitor later signs in
  -- with the same contact channel. No previous data is deleted.
  select l.id into v_lead_id from public.leads l
   where l.advertiser_id = v_advertiser_id and (
     l.contact_key = v_contact_key
     or (v_buyer_id is not null and l.buyer_id = v_buyer_id)
     or (v_email is not null and lower(coalesce(l.email, '')) = v_email)
     or (v_phone is not null and regexp_replace(coalesce(l.phone, ''), '[^0-9]', '', 'g') = v_phone)
   )
   order by l.created_at asc limit 1 for update;

  if v_lead_id is null then
    insert into public.leads (property_id, advertiser_id, buyer_id, name, email, phone, message, origin, status, contact_key)
    values (p_property_id, v_advertiser_id, v_buyer_id, v_name, v_email, v_phone, v_message, p_origin, 'new', v_contact_key)
    on conflict (advertiser_id, contact_key) where contact_key is not null do update set
      buyer_id = coalesce(public.leads.buyer_id, excluded.buyer_id),
      email = coalesce(public.leads.email, excluded.email), phone = coalesce(public.leads.phone, excluded.phone),
      message = excluded.message, updated_at = now()
    returning id, (xmax = 0) into v_lead_id, v_created;
  else
    update public.leads set
      buyer_id = coalesce(buyer_id, v_buyer_id), contact_key = v_contact_key,
      name = coalesce(nullif(name, ''), v_name), email = coalesce(email, v_email),
      phone = coalesce(phone, v_phone), message = v_message, updated_at = now()
    where id = v_lead_id;
  end if;

  if v_buyer_id is not null then
    select c.id into v_conversation_id from public.conversations c
     where c.property_id = p_property_id and c.buyer_id = v_buyer_id and c.advertiser_id = v_advertiser_id
     order by c.created_at asc limit 1 for update;
    if v_conversation_id is null then
      insert into public.conversations (property_id, buyer_id, advertiser_id, last_message_text, last_message_at)
      values (p_property_id, v_buyer_id, v_advertiser_id, left(v_message, 200), now())
      returning id into v_conversation_id;
    end if;
    insert into public.messages (conversation_id, sender_id, content)
    values (v_conversation_id, v_buyer_id, v_message);
  end if;

  insert into public.lead_contact_events (lead_id, property_id, conversation_id, message, origin)
  values (v_lead_id, p_property_id, v_conversation_id, v_message, p_origin);
  return query select v_lead_id, v_conversation_id, v_created;
end;
$$;
revoke all on function public.submit_property_contact(uuid, text, text, text, text, text) from public;
grant execute on function public.submit_property_contact(uuid, text, text, text, text, text) to anon, authenticated;

-- The current browser-only CRECI check is not an official registry lookup.
-- Keep every new request pending until a documented official review approves it.
alter table public.profiles add column if not exists creci_review_status text not null default 'not_requested'
  check (creci_review_status in ('not_requested', 'pending', 'approved', 'rejected', 'expired'));
alter table public.profiles add column if not exists creci_reviewed_at timestamptz;
alter table public.profiles add column if not exists creci_review_expires_at timestamptz;
create table if not exists public.creci_review_records (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  reviewer_id uuid references public.profiles(id) on delete set null,
  decision text not null check (decision in ('pending', 'approved', 'rejected')),
  note text,
  updated_at timestamptz not null default now()
);
alter table public.creci_review_records enable row level security;
revoke all on public.creci_review_records from public, anon, authenticated;
grant select on public.creci_review_records to authenticated;
drop policy if exists "profile or admin reads creci review record" on public.creci_review_records;
create policy "profile or admin reads creci review record" on public.creci_review_records
  for select to authenticated using (
    profile_id = (select auth.uid())
    or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
  );
create table if not exists public.creci_verification_documents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  document_kind text not null check (document_kind in ('cirp', 'regularity_certificate')),
  created_at timestamptz not null default now()
);
alter table public.creci_verification_documents enable row level security;
revoke all on public.creci_verification_documents from public, anon, authenticated;
grant select, insert, delete on public.creci_verification_documents to authenticated;
drop policy if exists "user manages own creci evidence" on public.creci_verification_documents;
create policy "user manages own creci evidence" on public.creci_verification_documents
  for all to authenticated using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

-- A broker can request review but can never grant their own verified status.
create or replace function public.guard_profile_verification_fields()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return new; end if;
  if current_setting('app.creci_review_write', true) = 'on' then return new; end if;
  if auth.uid() = old.id then
    new.verified := old.verified;
    new.creci_review_status := old.creci_review_status;
    new.creci_reviewed_at := old.creci_reviewed_at;
    new.creci_review_expires_at := old.creci_review_expires_at;
    if new.creci is distinct from old.creci
       or new.creci_uf is distinct from old.creci_uf
       or new.creci_type is distinct from old.creci_type then
      new.verified := false;
      new.creci_status := 'pending';
      new.creci_review_status := 'pending';
      new.creci_reviewed_at := null;
      new.creci_review_expires_at := null;
    else
      new.creci_status := old.creci_status;
    end if;
    return new;
  end if;
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin') then
    raise exception 'Only an administrator may review CRECI credentials';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_guard_profile_verification_fields on public.profiles;
create trigger trg_guard_profile_verification_fields
before update on public.profiles for each row execute function public.guard_profile_verification_fields();

create or replace function public.request_my_creci_review()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_profile public.profiles%rowtype;
begin
  select * into v_profile from public.profiles where id = auth.uid() for update;
  if not found then raise exception 'Authentication required'; end if;
  if nullif(trim(v_profile.creci), '') is null or nullif(trim(v_profile.creci_uf), '') is null then
    raise exception 'Provide CRECI number and state before requesting review';
  end if;
  perform set_config('app.creci_review_write', 'on', true);
  update public.profiles set verified = false, creci_status = 'pending',
    creci_review_status = 'pending', creci_reviewed_at = null,
    creci_review_expires_at = null, updated_at = now()
  where id = auth.uid() returning * into v_profile;
  insert into public.creci_review_records(profile_id, reviewer_id, decision, note)
  values (auth.uid(), null, 'pending', null)
  on conflict (profile_id) do update set reviewer_id = null, decision = 'pending', note = null, updated_at = now();
  return to_jsonb(v_profile);
end;
$$;
revoke all on function public.request_my_creci_review() from public, anon;
grant execute on function public.request_my_creci_review() to authenticated;

create or replace function public.review_creci_request(
  p_profile_id uuid, p_approved boolean, p_note text default null, p_expires_at timestamptz default null
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin') then
    raise exception 'Only an administrator may review CRECI credentials';
  end if;
  perform set_config('app.creci_review_write', 'on', true);
  update public.profiles set verified = p_approved,
    creci_status = case when p_approved then 'verified' else 'invalid' end,
    creci_review_status = case when p_approved then 'approved' else 'rejected' end,
    creci_reviewed_at = now(), creci_review_expires_at = case when p_approved then p_expires_at else null end,
    updated_at = now()
  where id = p_profile_id;
  if not found then raise exception 'Profile not found'; end if;
  insert into public.creci_review_records(profile_id, reviewer_id, decision, note)
  values (p_profile_id, auth.uid(), case when p_approved then 'approved' else 'rejected' end, left(nullif(trim(p_note), ''), 1000))
  on conflict (profile_id) do update set reviewer_id = excluded.reviewer_id, decision = excluded.decision,
    note = excluded.note, updated_at = now();
end;
$$;
revoke all on function public.review_creci_request(uuid, boolean, text, timestamptz) from public, anon;
grant execute on function public.review_creci_request(uuid, boolean, text, timestamptz) to authenticated;

notify pgrst, 'reload schema';
commit;
