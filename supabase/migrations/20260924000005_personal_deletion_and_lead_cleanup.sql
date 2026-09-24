begin;

-- A conversation is never physically deleted by one participant. These flags
-- keep the other participant's inbox and history intact.
alter table public.conversations
  add column if not exists is_deleted_buyer boolean not null default false,
  add column if not exists is_deleted_advertiser boolean not null default false;

create or replace function public.delete_my_conversation(p_conversation_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  update public.conversations
     set is_deleted_buyer = case when buyer_id = v_uid then true else is_deleted_buyer end,
         is_deleted_advertiser = case when advertiser_id = v_uid then true else is_deleted_advertiser end,
         updated_at = now()
   where id = p_conversation_id and v_uid in (buyer_id, advertiser_id);
  if not found then raise exception 'Conversation access denied'; end if;
  return true;
end;
$$;
revoke all on function public.delete_my_conversation(uuid) from public, anon;
grant execute on function public.delete_my_conversation(uuid) to authenticated;

-- Leads are private to the advertiser. Related CRM data and contact events
-- use foreign keys with cascading deletion, while the chat remains untouched.
create or replace function public.delete_my_lead(p_lead_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_lead public.leads%rowtype;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select * into v_lead from public.leads where id = p_lead_id for update;
  if not found or v_lead.advertiser_id <> v_uid then raise exception 'Lead access denied'; end if;
  -- The CRM screen groups a signed-in person's historical contact attempts
  -- into one card, so removing that card removes the same person's attempts
  -- from this advertiser only. Anonymous leads remain individual.
  delete from public.leads
   where advertiser_id = v_uid and (
     id = p_lead_id
     or (v_lead.buyer_id is not null and buyer_id = v_lead.buyer_id)
     or (v_lead.contact_key is not null and contact_key = v_lead.contact_key)
   );
  return found;
end;
$$;
revoke all on function public.delete_my_lead(uuid) from public, anon;
grant execute on function public.delete_my_lead(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
