begin;

alter table public.profiles add column if not exists account_deletion_requested_at timestamptz;

create or replace function public.begin_my_account_deletion()
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_role public.user_role;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select role into v_role from public.profiles where id = v_uid for update;
  if not found then raise exception 'Profile not found'; end if;
  if v_role = 'admin'::public.user_role then raise exception 'Administrative accounts cannot be deleted'; end if;
  update public.profiles set account_deletion_requested_at = now() where id = v_uid;
  return true;
end;
$$;
revoke all on function public.begin_my_account_deletion() from public, anon;
grant execute on function public.begin_my_account_deletion() to authenticated;

drop policy if exists "account owner removes creci files during deletion" on storage.objects;
create policy "account owner removes creci files during deletion" on storage.objects for delete to authenticated
using (
  bucket_id = 'creci-verification'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.account_deletion_requested_at > now() - interval '15 minutes')
);
drop policy if exists "account owner removes property files during deletion" on storage.objects;
create policy "account owner removes property files during deletion" on storage.objects for delete to authenticated
using (
  bucket_id = 'property-images'
  and exists (
    select 1 from public.properties p join public.profiles u on u.id = p.user_id
    where p.id::text = (storage.foldername(name))[2]
      and p.user_id = (select auth.uid())
      and u.account_deletion_requested_at > now() - interval '15 minutes'
  )
);

-- Preserve the remaining participant's copy when the other account is erased.
alter table public.messages alter column sender_id drop not null;
alter table public.messages drop constraint if exists messages_sender_id_fkey;
alter table public.messages add constraint messages_sender_id_fkey
  foreign key (sender_id) references public.profiles(id) on delete set null;

alter table public.conversations alter column buyer_id drop not null;
alter table public.conversations alter column advertiser_id drop not null;
alter table public.conversations drop constraint if exists conversations_buyer_id_fkey;
alter table public.conversations drop constraint if exists conversations_advertiser_id_fkey;
alter table public.conversations add constraint conversations_buyer_id_fkey
  foreign key (buyer_id) references public.profiles(id) on delete set null;
alter table public.conversations add constraint conversations_advertiser_id_fkey
  foreign key (advertiser_id) references public.profiles(id) on delete set null;

alter table public.creci_review_audit alter column reviewer_id drop not null;
alter table public.creci_review_audit drop constraint if exists creci_review_audit_reviewer_id_fkey;
alter table public.creci_review_audit add constraint creci_review_audit_reviewer_id_fkey
  foreign key (reviewer_id) references public.profiles(id) on delete set null;

create or replace function public.delete_my_account()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_role public.user_role;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select role into v_role from public.profiles where id = v_uid for update;
  if not found then raise exception 'Profile not found'; end if;
  if v_role = 'admin'::public.user_role then
    raise exception 'Administrative accounts cannot be deleted';
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = v_uid and p.account_deletion_requested_at > now() - interval '15 minutes'
  ) then raise exception 'Account deletion confirmation expired'; end if;

  -- Erase content authored by the departing participant without touching the
  -- other participant's messages or personal inbox copy.
  update public.messages
    set sender_id = null, content = 'Mensagem removida pelo usuário excluído.'
    where sender_id = v_uid;
  update public.conversations
    set buyer_id = case when buyer_id = v_uid then null else buyer_id end,
        advertiser_id = case when advertiser_id = v_uid then null else advertiser_id end,
        buyer_unread_count = case when buyer_id = v_uid then 0 else buyer_unread_count end,
        advertiser_unread_count = case when advertiser_id = v_uid then 0 else advertiser_unread_count end
        ,last_message_text = 'Conversa com usuário excluído'
    where buyer_id = v_uid or advertiser_id = v_uid;

  -- Restricted owner relations are removed explicitly; dependent rows cascade.
  delete from public.crm_interactions where broker_id = v_uid;
  delete from public.crm_tasks where broker_id = v_uid;
  delete from public.crm_deals where broker_id = v_uid;
  delete from public.clients where broker_id = v_uid;
  delete from public.leads where advertiser_id = v_uid;
  delete from public.properties where user_id = v_uid;

  -- Deleting the Auth identity cascades the private profile and its strictly
  -- personal rows. Shared conversations now retain only the other participant.
  delete from auth.users where id = v_uid;
  if not found then raise exception 'Authentication account not found'; end if;
  return true;
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

notify pgrst, 'reload schema';
commit;
