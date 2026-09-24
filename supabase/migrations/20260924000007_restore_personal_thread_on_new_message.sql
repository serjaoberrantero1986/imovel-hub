begin;

-- Record the personal deletion boundary. The other participant keeps the full
-- history; if a later message arrives, the recipient sees a fresh thread from
-- that message forward.
alter table public.conversations
  add column if not exists deleted_at_buyer timestamptz,
  add column if not exists deleted_at_advertiser timestamptz;

-- Recover conversations that received a message while still marked deleted by
-- the previous implementation. Only the latest unread message becomes visible.
update public.conversations
set deleted_at_buyer = case
      when is_deleted_buyer and buyer_unread_count > 0 and last_message_at is not null
        then last_message_at - interval '1 microsecond'
      when is_deleted_buyer then coalesce(deleted_at_buyer, now())
      else deleted_at_buyer
    end,
    deleted_at_advertiser = case
      when is_deleted_advertiser and advertiser_unread_count > 0 and last_message_at is not null
        then last_message_at - interval '1 microsecond'
      when is_deleted_advertiser then coalesce(deleted_at_advertiser, now())
      else deleted_at_advertiser
    end,
    is_deleted_buyer = case
      when is_deleted_buyer and buyer_unread_count > 0 then false
      else is_deleted_buyer
    end,
    is_deleted_advertiser = case
      when is_deleted_advertiser and advertiser_unread_count > 0 then false
      else is_deleted_advertiser
    end;

create or replace function public.delete_my_conversation(p_conversation_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  update public.conversations
     set is_deleted_buyer = case when buyer_id = v_uid then true else is_deleted_buyer end,
         is_deleted_advertiser = case when advertiser_id = v_uid then true else is_deleted_advertiser end,
         deleted_at_buyer = case when buyer_id = v_uid then now() else deleted_at_buyer end,
         deleted_at_advertiser = case when advertiser_id = v_uid then now() else deleted_at_advertiser end,
         buyer_unread_count = case when buyer_id = v_uid then 0 else buyer_unread_count end,
         advertiser_unread_count = case when advertiser_id = v_uid then 0 else advertiser_unread_count end,
         updated_at = now()
   where id = p_conversation_id and v_uid in (buyer_id, advertiser_id);
  if not found then raise exception 'Conversation access denied'; end if;
  return true;
end;
$$;
revoke all on function public.delete_my_conversation(uuid) from public, anon;
grant execute on function public.delete_my_conversation(uuid) to authenticated;

create or replace function public.handle_new_message_sync()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.conversations
     set last_message_text = left(new.content, 200),
         last_message_at = new.created_at,
         advertiser_unread_count = advertiser_unread_count + case when new.sender_id = buyer_id then 1 else 0 end,
         buyer_unread_count = buyer_unread_count + case when new.sender_id = advertiser_id then 1 else 0 end,
         is_archived_advertiser = case when new.sender_id = buyer_id then false else is_archived_advertiser end,
         is_archived_buyer = case when new.sender_id = advertiser_id then false else is_archived_buyer end,
         is_deleted_advertiser = case when new.sender_id = buyer_id then false else is_deleted_advertiser end,
         is_deleted_buyer = case when new.sender_id = advertiser_id then false else is_deleted_buyer end,
         updated_at = now()
   where id = new.conversation_id;
  return new;
end;
$$;

notify pgrst, 'reload schema';
commit;
