begin;

-- Recover a participant who sent a new message after deleting their own copy.
-- The deletion timestamp remains as the boundary, so older messages stay hidden.
update public.conversations
set is_deleted_buyer = case
      when is_deleted_buyer
       and deleted_at_buyer is not null
       and last_message_at > deleted_at_buyer
        then false
      else is_deleted_buyer
    end,
    is_deleted_advertiser = case
      when is_deleted_advertiser
       and deleted_at_advertiser is not null
       and last_message_at > deleted_at_advertiser
        then false
      else is_deleted_advertiser
    end,
    is_archived_buyer = case
      when is_deleted_buyer
       and deleted_at_buyer is not null
       and last_message_at > deleted_at_buyer
        then false
      else is_archived_buyer
    end,
    is_archived_advertiser = case
      when is_deleted_advertiser
       and deleted_at_advertiser is not null
       and last_message_at > deleted_at_advertiser
        then false
      else is_archived_advertiser
    end;

-- Any valid new message starts a fresh visible continuation for both parties.
-- Each participant still sees only messages newer than their own deletion time.
create or replace function public.handle_new_message_sync()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.conversations
     set last_message_text = left(new.content, 200),
         last_message_at = new.created_at,
         advertiser_unread_count = advertiser_unread_count + case when new.sender_id = buyer_id then 1 else 0 end,
         buyer_unread_count = buyer_unread_count + case when new.sender_id = advertiser_id then 1 else 0 end,
         is_archived_advertiser = false,
         is_archived_buyer = false,
         is_deleted_advertiser = false,
         is_deleted_buyer = false,
         updated_at = now()
   where id = new.conversation_id;
  return new;
end;
$$;

notify pgrst, 'reload schema';
commit;
