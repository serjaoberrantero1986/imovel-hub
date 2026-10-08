begin;

-- Older installations may already have this table with a restrictive foreign
-- key. Preserve configuration history when the acting account is later erased.
alter table public.admin_configuration_audit
  alter column administrator_id drop not null;
alter table public.admin_configuration_audit
  drop constraint if exists admin_configuration_audit_administrator_id_fkey;
alter table public.admin_configuration_audit
  add constraint admin_configuration_audit_administrator_id_fkey
  foreign key (administrator_id) references public.profiles(id) on delete set null;

-- Storage cleanup happens after the database transaction succeeds. The queue
-- deliberately has no profile foreign key so it survives account deletion and
-- can be inspected or retried by trusted server-side maintenance.
create table if not exists public.account_deletion_cleanup_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  storage_items jsonb not null default '[]'::jsonb,
  status text not null default 'prepared'
    check (status in ('prepared', 'database_failed', 'cleanup_pending', 'completed')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_account_deletion_cleanup_status
  on public.account_deletion_cleanup_queue(status, created_at);

alter table public.account_deletion_cleanup_queue enable row level security;
revoke all on public.account_deletion_cleanup_queue from public, anon, authenticated;

-- Reinstall the schema-compatible function so deployments that skipped the
-- compatibility migration do not fail when optional CRM modules are absent.
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
