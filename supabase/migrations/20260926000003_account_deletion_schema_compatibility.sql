begin;

-- Production installations can have only the CRM modules they actually use.
-- Optional relations are cleaned dynamically so their absence never aborts an
-- otherwise valid account deletion transaction.
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
  if v_role = 'admin'::public.user_role then raise exception 'Administrative accounts cannot be deleted'; end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = v_uid and p.account_deletion_requested_at > now() - interval '15 minutes'
  ) then raise exception 'Account deletion confirmation expired'; end if;

  update public.messages
    set sender_id = null, content = 'Mensagem removida pelo usuário excluído.'
    where sender_id = v_uid;
  update public.conversations
    set buyer_id = case when buyer_id = v_uid then null else buyer_id end,
        advertiser_id = case when advertiser_id = v_uid then null else advertiser_id end,
        buyer_unread_count = case when buyer_id = v_uid then 0 else buyer_unread_count end,
        advertiser_unread_count = case when advertiser_id = v_uid then 0 else advertiser_unread_count end,
        last_message_text = 'Conversa com usuário excluído'
    where buyer_id = v_uid or advertiser_id = v_uid;

  if to_regclass('public.crm_interactions') is not null then
    execute 'delete from public.crm_interactions where broker_id = $1' using v_uid;
  end if;
  if to_regclass('public.crm_tasks') is not null then
    execute 'delete from public.crm_tasks where broker_id = $1' using v_uid;
  end if;
  if to_regclass('public.crm_deals') is not null then
    execute 'delete from public.crm_deals where broker_id = $1' using v_uid;
  end if;
  if to_regclass('public.clients') is not null then
    execute 'delete from public.clients where broker_id = $1' using v_uid;
  end if;
  if to_regclass('public.leads') is not null then
    execute 'delete from public.leads where advertiser_id = $1' using v_uid;
  end if;
  if to_regclass('public.properties') is not null then
    execute 'delete from public.properties where user_id = $1' using v_uid;
  end if;

  delete from auth.users where id = v_uid;
  if not found then raise exception 'Authentication account not found'; end if;
  return true;
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

notify pgrst, 'reload schema';
commit;
