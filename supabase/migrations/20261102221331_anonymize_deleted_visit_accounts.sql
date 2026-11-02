begin;

alter table public.partnership_visits
  alter column requested_by drop not null;
alter table public.partnership_visits
  drop constraint if exists partnership_visits_requested_by_fkey;
alter table public.partnership_visits
  add constraint partnership_visits_requested_by_fkey
  foreign key (requested_by) references public.profiles(id) on delete set null;

alter table public.partnership_visit_disputes
  alter column opened_by drop not null;
alter table public.partnership_visit_disputes
  drop constraint if exists partnership_visit_disputes_opened_by_fkey;
alter table public.partnership_visit_disputes
  add constraint partnership_visit_disputes_opened_by_fkey
  foreign key (opened_by) references public.profiles(id) on delete set null;

alter table public.partnership_visit_dispute_responses
  alter column responder_id drop not null;
alter table public.partnership_visit_dispute_responses
  drop constraint if exists partnership_visit_dispute_responses_responder_id_fkey;
alter table public.partnership_visit_dispute_responses
  add constraint partnership_visit_dispute_responses_responder_id_fkey
  foreign key (responder_id) references public.profiles(id) on delete set null;

create or replace function public.prevent_partnership_visit_event_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
    and old.actor_id is not null
    and new.actor_id is null
    and current_setting('webimovel.account_deletion_profile_id', true) = old.actor_id::text
    and (to_jsonb(new) - 'actor_id') = (to_jsonb(old) - 'actor_id') then
    return new;
  end if;
  raise exception 'Visit evidence is immutable';
end;
$$;

create or replace function public.prevent_partnership_dispute_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
    and old.actor_id is not null
    and new.actor_id is null
    and current_setting('webimovel.account_deletion_profile_id', true) = old.actor_id::text
    and (to_jsonb(new) - 'actor_id') = (to_jsonb(old) - 'actor_id') then
    return new;
  end if;
  raise exception 'Dispute evidence is immutable';
end;
$$;

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

  select role into v_role
  from public.profiles
  where id = v_uid
  for update;

  if not found then raise exception 'Profile not found'; end if;
  if v_role = 'admin'::public.user_role then
    raise exception 'Administrative accounts cannot be deleted';
  end if;
  if not exists (
    select 1
    from public.profiles p
    where p.id = v_uid
      and p.account_deletion_requested_at > now() - interval '15 minutes'
  ) then
    raise exception 'Account deletion confirmation expired';
  end if;

  update public.messages
  set sender_id = null,
      content = 'Mensagem removida pelo usuário excluído.'
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

  delete from public.portal_settings
  where owner_profile_id = v_uid
     or id = v_uid::text;

  perform set_config('webimovel.account_deletion_profile_id', v_uid::text, true);
  delete from auth.users where id = v_uid;
  if not found then raise exception 'Authentication account not found'; end if;

  return true;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

commit;
