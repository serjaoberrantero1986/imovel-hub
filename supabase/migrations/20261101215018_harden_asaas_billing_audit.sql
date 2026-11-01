begin;

grant select on public.asaas_webhook_events to authenticated;

create policy "administrators read asaas webhook events"
  on public.asaas_webhook_events for select to authenticated
  using (public.is_admin());

create index commercial_checkout_attempts_plan_tier_idx
  on public.commercial_checkout_attempts(plan_tier);
create index commercial_subscriptions_plan_tier_idx
  on public.commercial_subscriptions(plan_tier);
create index commercial_subscriptions_checkout_attempt_idx
  on public.commercial_subscriptions(checkout_attempt_id)
  where checkout_attempt_id is not null;

commit;
