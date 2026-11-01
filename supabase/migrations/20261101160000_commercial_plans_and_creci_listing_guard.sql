begin;

create table if not exists public.commercial_plans (
  tier text primary key check (tier in ('basic','intermediate','advanced')),
  name text not null check (char_length(trim(name)) between 2 and 60),
  description text not null check (char_length(trim(description)) between 10 and 240),
  monthly_price_cents integer not null check (monthly_price_cents between 0 and 100000000),
  active boolean not null default true,
  featured boolean not null default false,
  display_order smallint not null check (display_order between 1 and 100),
  entitlements jsonb not null default '{}'::jsonb check (jsonb_typeof(entitlements) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.commercial_plan_audit (
  id bigint generated always as identity primary key,
  tier text not null,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null check (action in ('insert','update','delete')),
  previous_data jsonb,
  next_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists commercial_plans_public_order_idx
  on public.commercial_plans (active, display_order);
create index if not exists commercial_plan_audit_tier_created_idx
  on public.commercial_plan_audit (tier, created_at desc);

alter table public.commercial_plans enable row level security;
alter table public.commercial_plan_audit enable row level security;

grant select on public.commercial_plans to anon, authenticated;
grant insert, update, delete on public.commercial_plans to authenticated;
grant select on public.commercial_plan_audit to authenticated;
revoke insert, update, delete on public.commercial_plan_audit from anon, authenticated;

drop policy if exists "public reads active commercial plans" on public.commercial_plans;
create policy "public reads active commercial plans" on public.commercial_plans
  for select to anon, authenticated
  using (active or public.is_admin());

drop policy if exists "administrators create commercial plans" on public.commercial_plans;
create policy "administrators create commercial plans" on public.commercial_plans
  for insert to authenticated with check (public.is_admin());
drop policy if exists "administrators update commercial plans" on public.commercial_plans;
create policy "administrators update commercial plans" on public.commercial_plans
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "administrators delete commercial plans" on public.commercial_plans;
create policy "administrators delete commercial plans" on public.commercial_plans
  for delete to authenticated using (public.is_admin());

drop policy if exists "administrators read commercial plan audit" on public.commercial_plan_audit;
create policy "administrators read commercial plan audit" on public.commercial_plan_audit
  for select to authenticated using (public.is_admin());

create or replace function public.audit_commercial_plan_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.commercial_plan_audit(tier, actor_id, action, previous_data, next_data)
  values (
    coalesce(new.tier, old.tier),
    auth.uid(),
    lower(tg_op),
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function public.audit_commercial_plan_change() from public, anon, authenticated;

drop trigger if exists commercial_plan_audit_trigger on public.commercial_plans;
create trigger commercial_plan_audit_trigger
after insert or update or delete on public.commercial_plans
for each row execute function public.audit_commercial_plan_change();

insert into public.commercial_plans(tier,name,description,monthly_price_cents,active,featured,display_order,entitlements)
values
('basic','Essencial','Para o corretor que quer iniciar sua presença digital e organizar os primeiros atendimentos.',5900,true,false,1,
 '{"activeListings":30,"teamUsers":1,"showcases":1,"featuredListings":false,"customShowcaseFilters":false,"valuationsPerMonth":3,"signaturesPerMonth":2,"subdomainChangesPerYear":1,"ownDomain":false,"removeBranding":false,"analytics":"summary"}'::jsonb),
('intermediate','Profissional','Para quem precisa ampliar a carteira, destacar oportunidades e acompanhar mais negócios.',11900,true,true,2,
 '{"activeListings":100,"teamUsers":3,"showcases":3,"featuredListings":true,"customShowcaseFilters":false,"valuationsPerMonth":15,"signaturesPerMonth":10,"subdomainChangesPerYear":2,"ownDomain":false,"removeBranding":false,"analytics":"detailed"}'::jsonb),
('advanced','Imobiliária','Para equipes que precisam de escala, personalização completa e gestão de uma operação maior.',24900,true,false,3,
 '{"activeListings":300,"teamUsers":10,"showcases":12,"featuredListings":true,"customShowcaseFilters":true,"valuationsPerMonth":50,"signaturesPerMonth":30,"subdomainChangesPerYear":4,"ownDomain":true,"removeBranding":true,"analytics":"complete"}'::jsonb)
on conflict (tier) do nothing;

create or replace function public.require_verified_creci_for_new_listing()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = new.user_id
      and p.role in ('broker'::public.user_role, 'agency'::public.user_role)
      and p.verified is true
      and p.creci_review_status = 'approved'
      and p.is_active is true
  ) then
    raise exception 'CRECI_APPROVAL_REQUIRED';
  end if;
  return new;
end;
$$;

drop trigger if exists require_verified_creci_for_new_listing_trigger on public.properties;
create trigger require_verified_creci_for_new_listing_trigger
before insert on public.properties
for each row execute function public.require_verified_creci_for_new_listing();

commit;

