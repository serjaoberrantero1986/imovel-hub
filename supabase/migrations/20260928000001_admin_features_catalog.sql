-- Administrative amenities catalog. Existing identifiers and property links are preserved.
alter table public.features
  add column if not exists is_active boolean not null default true,
  add column if not exists display_order integer not null default 0,
  add column if not exists updated_at timestamptz not null default now();

with ordered as (
  select id, row_number() over (order by category, name, id) * 10 as position
  from public.features
)
update public.features f
set display_order = ordered.position
from ordered
where f.id = ordered.id and f.display_order = 0;

alter table public.features drop constraint if exists features_category_check;
alter table public.features add constraint features_category_check
  check (category in ('lazer', 'seguranca', 'conforto', 'estrutura'));
alter table public.features drop constraint if exists features_display_order_check;
alter table public.features add constraint features_display_order_check
  check (display_order >= 0);

create index if not exists idx_features_active_order
  on public.features(is_active, display_order, name);

create table if not exists public.admin_configuration_audit (
  id uuid primary key default gen_random_uuid(),
  administrator_id uuid references public.profiles(id) on delete set null,
  resource_type text not null,
  resource_id text not null,
  action text not null check (action in ('created', 'updated', 'enabled', 'disabled', 'deleted')),
  previous_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_configuration_audit enable row level security;
drop policy if exists "admins read configuration audit" on public.admin_configuration_audit;
create policy "admins read configuration audit"
  on public.admin_configuration_audit for select to authenticated
  using (public.is_admin());

create or replace function public.audit_feature_configuration()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_action text;
begin
  if tg_op = 'INSERT' then
    v_action := 'created';
  elsif tg_op = 'DELETE' then
    v_action := 'deleted';
  elsif new.is_active is distinct from old.is_active then
    v_action := case when new.is_active then 'enabled' else 'disabled' end;
  else
    v_action := 'updated';
  end if;

  insert into public.admin_configuration_audit(
    administrator_id, resource_type, resource_id, action, previous_value, new_value
  ) values (
    auth.uid(), 'amenity', case when tg_op = 'DELETE' then old.id else new.id end, v_action,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$function$;

drop trigger if exists audit_feature_configuration_trigger on public.features;
create trigger audit_feature_configuration_trigger
after insert or update or delete on public.features
for each row execute function public.audit_feature_configuration();

drop policy if exists "Administrators manage features catalog" on public.features;
create policy "Administrators manage features catalog"
  on public.features for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.features to anon, authenticated;
grant insert, update, delete on public.features to authenticated;
grant select on public.admin_configuration_audit to authenticated;

do $block$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'features'
  ) then
    execute 'alter publication supabase_realtime add table public.features';
  end if;
end;
$block$;
