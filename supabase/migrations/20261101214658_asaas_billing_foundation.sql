begin;

create table public.commercial_checkout_attempts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  plan_tier text not null references public.commercial_plans(tier),
  provider text not null default 'asaas' check (provider = 'asaas'),
  environment text not null default 'sandbox' check (environment in ('sandbox','production')),
  external_reference text not null unique,
  asaas_checkout_id text unique,
  checkout_url text,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'BRL' check (currency = 'BRL'),
  status text not null default 'creating' check (status in ('creating','pending','paid','canceled','expired','failed')),
  expires_at timestamptz,
  paid_at timestamptz,
  failure_code text,
  failure_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.commercial_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  plan_tier text not null references public.commercial_plans(tier),
  checkout_attempt_id uuid references public.commercial_checkout_attempts(id) on delete set null,
  provider text not null default 'asaas' check (provider = 'asaas'),
  environment text not null default 'sandbox' check (environment in ('sandbox','production')),
  asaas_customer_id text,
  asaas_subscription_id text unique,
  status text not null default 'pending' check (status in ('pending','active','past_due','suspended','canceled','expired')),
  amount_cents integer not null check (amount_cents > 0),
  current_period_start timestamptz,
  current_period_end timestamptz,
  activated_at timestamptz,
  canceled_at timestamptz,
  last_payment_status text,
  last_payment_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.asaas_webhook_events (
  id bigint generated always as identity primary key,
  provider_event_id text not null unique,
  environment text not null check (environment in ('sandbox','production')),
  event_type text not null,
  resource_type text,
  external_resource_id text,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  processing_status text not null default 'pending' check (processing_status in ('pending','processing','processed','ignored','failed')),
  error_message text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create unique index commercial_subscriptions_one_current_per_profile_idx
  on public.commercial_subscriptions(profile_id, environment)
  where status in ('pending','active','past_due','suspended');
create index commercial_checkout_attempts_profile_created_idx
  on public.commercial_checkout_attempts(profile_id, created_at desc);
create index commercial_checkout_attempts_status_created_idx
  on public.commercial_checkout_attempts(status, created_at)
  where status in ('creating','pending');
create index commercial_subscriptions_profile_status_idx
  on public.commercial_subscriptions(profile_id, status);
create index asaas_webhook_events_pending_idx
  on public.asaas_webhook_events(processing_status, received_at)
  where processing_status in ('pending','failed');

alter table public.commercial_checkout_attempts enable row level security;
alter table public.commercial_subscriptions enable row level security;
alter table public.asaas_webhook_events enable row level security;

grant select on public.commercial_checkout_attempts, public.commercial_subscriptions to authenticated;
revoke insert, update, delete on public.commercial_checkout_attempts, public.commercial_subscriptions from anon, authenticated;
revoke all on public.asaas_webhook_events from anon, authenticated;

create policy "professionals read own checkout attempts"
  on public.commercial_checkout_attempts for select to authenticated
  using ((select auth.uid()) = profile_id or public.is_admin());
create policy "professionals read own subscriptions"
  on public.commercial_subscriptions for select to authenticated
  using ((select auth.uid()) = profile_id or public.is_admin());

create or replace function public.process_asaas_billing_event(p_event_id text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.asaas_webhook_events%rowtype;
  v_checkout jsonb;
  v_subscription jsonb;
  v_payment jsonb;
  v_attempt public.commercial_checkout_attempts%rowtype;
  v_current public.commercial_subscriptions%rowtype;
  v_external_reference text;
  v_external_id text;
  v_now timestamptz := now();
begin
  select * into v_event
  from public.asaas_webhook_events
  where provider_event_id = p_event_id
  for update;

  if not found then return 'missing'; end if;
  if v_event.processing_status in ('processed','ignored') then return v_event.processing_status; end if;

  update public.asaas_webhook_events
  set processing_status = 'processing', error_message = null
  where id = v_event.id;

  v_checkout := v_event.payload->'checkout';
  v_subscription := v_event.payload->'subscription';
  v_payment := v_event.payload->'payment';

  if v_event.event_type like 'CHECKOUT_%' then
    v_external_id := nullif(v_checkout->>'id','');
    v_external_reference := nullif(v_checkout->>'externalReference','');
    select * into v_attempt
    from public.commercial_checkout_attempts
    where (v_external_id is not null and asaas_checkout_id = v_external_id)
       or (v_external_reference is not null and external_reference = v_external_reference)
    order by created_at desc limit 1;

    if not found then
      update public.asaas_webhook_events set processing_status='ignored', processed_at=v_now where id=v_event.id;
      return 'ignored';
    end if;

    if v_event.event_type = 'CHECKOUT_PAID' then
      update public.commercial_checkout_attempts
      set status='paid', paid_at=coalesce(paid_at,v_now), updated_at=v_now
      where id=v_attempt.id;

      select * into v_current from public.commercial_subscriptions
      where profile_id=v_attempt.profile_id and environment=v_attempt.environment
        and status in ('pending','active','past_due','suspended')
      order by created_at desc limit 1 for update;

      if found then
        update public.commercial_subscriptions
        set plan_tier=v_attempt.plan_tier, checkout_attempt_id=v_attempt.id,
            status='active', amount_cents=v_attempt.amount_cents,
            activated_at=coalesce(activated_at,v_now), current_period_start=v_now,
            current_period_end=v_now + interval '1 month', updated_at=v_now
        where id=v_current.id;
      else
        insert into public.commercial_subscriptions(
          profile_id,plan_tier,checkout_attempt_id,environment,status,amount_cents,
          activated_at,current_period_start,current_period_end
        ) values (
          v_attempt.profile_id,v_attempt.plan_tier,v_attempt.id,v_attempt.environment,'active',v_attempt.amount_cents,
          v_now,v_now,v_now + interval '1 month'
        );
      end if;

      insert into public.notifications(user_id,type,title,message,link,data)
      values (v_attempt.profile_id,'system_alert','Plano ativado',
        'Seu pagamento foi confirmado e o plano já está ativo.','/profile',
        jsonb_build_object('scope','commercial_subscription','plan_tier',v_attempt.plan_tier,'checkout_attempt_id',v_attempt.id));
    elsif v_event.event_type = 'CHECKOUT_CANCELED' then
      update public.commercial_checkout_attempts set status='canceled',updated_at=v_now where id=v_attempt.id and status<>'paid';
    elsif v_event.event_type = 'CHECKOUT_EXPIRED' then
      update public.commercial_checkout_attempts set status='expired',updated_at=v_now where id=v_attempt.id and status<>'paid';
    elsif v_event.event_type = 'CHECKOUT_CREATED' then
      update public.commercial_checkout_attempts set status='pending',updated_at=v_now where id=v_attempt.id and status='creating';
    end if;

  elsif v_event.event_type like 'SUBSCRIPTION_%' then
    v_external_id := nullif(v_subscription->>'id','');
    v_external_reference := nullif(v_subscription->>'externalReference','');
    select * into v_current from public.commercial_subscriptions
    where (v_external_id is not null and asaas_subscription_id=v_external_id)
       or (v_external_reference is not null and checkout_attempt_id in (
         select attempt.id from public.commercial_checkout_attempts attempt where attempt.external_reference=v_external_reference
       ))
    order by created_at desc limit 1 for update;

    if not found then
      update public.asaas_webhook_events set processing_status='ignored',processed_at=v_now where id=v_event.id;
      return 'ignored';
    end if;

    update public.commercial_subscriptions
    set asaas_subscription_id=coalesce(asaas_subscription_id,v_external_id),
        asaas_customer_id=coalesce(asaas_customer_id,nullif(v_subscription->>'customer','')),
        status=case
          when v_event.event_type in ('SUBSCRIPTION_INACTIVATED','SUBSCRIPTION_DELETED') then 'canceled'
          else status end,
        canceled_at=case when v_event.event_type in ('SUBSCRIPTION_INACTIVATED','SUBSCRIPTION_DELETED') then v_now else canceled_at end,
        updated_at=v_now
    where id=v_current.id;

  elsif v_event.event_type like 'PAYMENT_%' then
    v_external_id := nullif(v_payment->>'subscription','');
    if v_external_id is null then
      update public.asaas_webhook_events set processing_status='ignored',processed_at=v_now where id=v_event.id;
      return 'ignored';
    end if;
    select * into v_current from public.commercial_subscriptions
      where asaas_subscription_id=v_external_id limit 1 for update;
    if not found then
      update public.asaas_webhook_events set processing_status='ignored',processed_at=v_now where id=v_event.id;
      return 'ignored';
    end if;

    update public.commercial_subscriptions
    set status=case
          when v_event.event_type in ('PAYMENT_RECEIVED','PAYMENT_CONFIRMED') then 'active'
          when v_event.event_type='PAYMENT_OVERDUE' then 'past_due'
          when v_event.event_type in ('PAYMENT_REFUNDED','PAYMENT_CHARGEBACK_REQUESTED') then 'suspended'
          else status end,
        last_payment_status=v_event.event_type,
        last_payment_at=case when v_event.event_type in ('PAYMENT_RECEIVED','PAYMENT_CONFIRMED') then v_now else last_payment_at end,
        current_period_start=case when v_event.event_type in ('PAYMENT_RECEIVED','PAYMENT_CONFIRMED') then v_now else current_period_start end,
        current_period_end=case when v_event.event_type in ('PAYMENT_RECEIVED','PAYMENT_CONFIRMED') then v_now+interval '1 month' else current_period_end end,
        updated_at=v_now
    where id=v_current.id;
  else
    update public.asaas_webhook_events set processing_status='ignored',processed_at=v_now where id=v_event.id;
    return 'ignored';
  end if;

  update public.asaas_webhook_events
  set processing_status='processed',processed_at=v_now,error_message=null
  where id=v_event.id;
  return 'processed';
exception when others then
  update public.asaas_webhook_events
  set processing_status='failed',processed_at=now(),error_message=left(sqlerrm,500)
  where provider_event_id=p_event_id;
  raise;
end;
$$;

revoke all on function public.process_asaas_billing_event(text) from public, anon, authenticated;
grant execute on function public.process_asaas_billing_event(text) to service_role;

commit;
