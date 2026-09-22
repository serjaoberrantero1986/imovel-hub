begin;

-- Complete the production chat schema without replacing existing conversations.
alter table public.conversations
  add column if not exists last_message_text text,
  add column if not exists last_message_at timestamptz not null default now(),
  add column if not exists buyer_unread_count integer not null default 0,
  add column if not exists advertiser_unread_count integer not null default 0,
  add column if not exists is_archived_buyer boolean not null default false,
  add column if not exists is_archived_advertiser boolean not null default false;

alter table public.messages
  add column if not exists read_at timestamptz;

create or replace function public.handle_new_message_sync()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_conversation public.conversations%rowtype;
begin
  select * into v_conversation from public.conversations where id = new.conversation_id;
  if found then
    update public.conversations
       set last_message_text = left(new.content, 200),
           last_message_at = new.created_at,
           advertiser_unread_count = case when new.sender_id = v_conversation.buyer_id then advertiser_unread_count + 1 else advertiser_unread_count end,
           buyer_unread_count = case when new.sender_id = v_conversation.advertiser_id then buyer_unread_count + 1 else buyer_unread_count end,
           updated_at = now()
     where id = new.conversation_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_new_message_sync on public.messages;
create trigger trg_new_message_sync
after insert on public.messages
for each row execute function public.handle_new_message_sync();

create or replace function public.create_lead_conversation(p_lead_id uuid, p_buyer_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_lead public.leads%rowtype;
  v_conversation_id uuid;
begin
  select * into v_lead from public.leads where id = p_lead_id;
  if not found or v_lead.advertiser_id is null or p_buyer_id is null then
    return null;
  end if;
  if auth.uid() is not null and auth.uid() <> p_buyer_id then
    raise exception 'Conversation access denied';
  end if;

  select id into v_conversation_id
    from public.conversations
   where property_id is not distinct from v_lead.property_id
     and buyer_id = p_buyer_id
     and advertiser_id = v_lead.advertiser_id
   limit 1;

  if v_conversation_id is null then
    insert into public.conversations (property_id, buyer_id, advertiser_id, last_message_text, last_message_at)
    values (v_lead.property_id, p_buyer_id, v_lead.advertiser_id, left(coalesce(v_lead.message, 'Novo contato recebido.'), 200), now())
    returning id into v_conversation_id;
  else
    update public.conversations
       set is_archived_buyer = false, is_archived_advertiser = false
     where id = v_conversation_id;
  end if;

  if not exists (
    select 1 from public.messages
    where conversation_id = v_conversation_id
  ) then
    insert into public.messages (conversation_id, sender_id, content)
    values (
      v_conversation_id,
      p_buyer_id,
      coalesce(v_lead.message, 'Olá! Tenho interesse neste imóvel e gostaria de mais informações.')
    );
  end if;

  return v_conversation_id;
end;
$$;

revoke all on function public.create_lead_conversation(uuid, uuid) from public, anon;
grant execute on function public.create_lead_conversation(uuid, uuid) to authenticated;

create or replace function public.link_visitor_leads_to_new_buyer()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_lead_id uuid;
begin
  for v_lead_id in
    update public.leads
       set buyer_id = new.id, updated_at = now()
     where buyer_id is null
       and email is not null
       and lower(email) = lower(new.email)
     returning id
  loop
    perform public.create_lead_conversation(v_lead_id, new.id);
  end loop;
  return new;
end;
$$;

drop trigger if exists on_auth_user_link_visitor_leads on auth.users;
create trigger on_auth_user_link_visitor_leads
after insert on auth.users
for each row execute function public.link_visitor_leads_to_new_buyer();

-- Also connect visitor leads whose buyers already created an account.
do $$
declare r record;
begin
  for r in
    update public.leads l
       set buyer_id = u.id, updated_at = now()
      from auth.users u
     where l.buyer_id is null
       and l.email is not null
       and lower(l.email) = lower(u.email)
     returning l.id as lead_id, u.id as buyer_id
  loop
    perform public.create_lead_conversation(r.lead_id, r.buyer_id);
  end loop;
end;
$$;

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_conversation public.conversations%rowtype;
begin
  select * into v_conversation from public.conversations where id = p_conversation_id;
  if not found or auth.uid() not in (v_conversation.buyer_id, v_conversation.advertiser_id) then
    raise exception 'Conversation access denied';
  end if;

  update public.messages
     set read_at = now()
   where conversation_id = p_conversation_id
     and sender_id <> auth.uid()
     and read_at is null;

  update public.conversations
     set buyer_unread_count = case when v_conversation.buyer_id = auth.uid() then 0 else buyer_unread_count end,
         advertiser_unread_count = case when v_conversation.advertiser_id = auth.uid() then 0 else advertiser_unread_count end
   where id = p_conversation_id;
end;
$$;

revoke all on function public.mark_conversation_read(uuid) from public, anon;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.leads;
exception when duplicate_object then null;
end;
$$;
do $$
begin
  alter publication supabase_realtime add table public.conversations;
exception when duplicate_object then null;
end;
$$;
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end;
$$;

notify pgrst, 'reload schema';
commit;
