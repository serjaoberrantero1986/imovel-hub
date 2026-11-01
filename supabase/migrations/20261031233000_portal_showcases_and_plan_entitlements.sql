begin;

create table if not exists public.portal_plan_entitlements (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  plan_tier text not null default 'basic' check (plan_tier in ('basic','intermediate','advanced')),
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.portal_plan_entitlements enable row level security;
grant select on public.portal_plan_entitlements to authenticated;
revoke insert, update, delete on public.portal_plan_entitlements from anon, authenticated;

drop policy if exists "professionals read own portal plan" on public.portal_plan_entitlements;
create policy "professionals read own portal plan" on public.portal_plan_entitlements
  for select to authenticated
  using ((select auth.uid()) = profile_id or public.is_admin());

-- Contas profissionais já existentes conservam todos os recursos atuais.
insert into public.portal_plan_entitlements(profile_id, plan_tier)
select id, 'advanced'
from public.profiles
where role in ('broker'::public.user_role, 'agency'::public.user_role)
on conflict (profile_id) do nothing;

create or replace function public.validate_property_feature_entitlement()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_tier text;
begin
  if new.featured is true and (tg_op = 'INSERT' or old.featured is false) then
    select e.plan_tier into v_tier
    from public.portal_plan_entitlements e
    where e.profile_id = new.user_id
      and (e.valid_until is null or e.valid_until > now());
    if coalesce(v_tier, 'basic') = 'basic' then
      raise exception 'FEATURED_PLAN_REQUIRED';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists validate_property_feature_entitlement_trigger on public.properties;
create trigger validate_property_feature_entitlement_trigger
before insert or update of featured on public.properties
for each row execute function public.validate_property_feature_entitlement();

create or replace function public.validate_portal_showcase_entitlement()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_tier text;
  v_showcases jsonb;
  v_count integer;
  v_item jsonb;
  v_intermediate_allowed boolean;
begin
  if new.owner_profile_id is null or new.id = 'default' then return new; end if;
  select e.plan_tier into v_tier
  from public.portal_plan_entitlements e
  where e.profile_id = new.owner_profile_id
    and (e.valid_until is null or e.valid_until > now());
  v_tier := coalesce(v_tier, 'basic');
  v_showcases := coalesce(new.visual_published->'showcases', new.visual_draft->'showcases', '[]'::jsonb);
  if jsonb_typeof(v_showcases) <> 'array' then raise exception 'INVALID_SHOWCASES'; end if;
  v_count := jsonb_array_length(v_showcases);

  if v_tier = 'basic' then
    if v_count <> 1 then raise exception 'BASIC_SHOWCASE_LIMIT'; end if;
    v_item := v_showcases->0;
    if coalesce(v_item->>'source','all') <> 'all'
      or coalesce(v_item->>'purpose','all') <> 'all'
      or coalesce(jsonb_array_length(coalesce(v_item->'types','[]'::jsonb)),0) <> 0
      or coalesce(v_item->>'order','recent') <> 'recent'
      or v_item ?| array['city','minPrice','maxPrice','minArea','maxArea']
    then raise exception 'BASIC_SHOWCASE_FILTER_NOT_ALLOWED'; end if;
  elsif v_tier = 'intermediate' then
    if v_count < 1 or v_count > 3 then raise exception 'INTERMEDIATE_SHOWCASE_LIMIT'; end if;
    for v_item in select value from jsonb_array_elements(v_showcases) loop
      v_intermediate_allowed := not (v_item ?| array['city','minPrice','maxPrice','minArea','maxArea']) and (
        (coalesce(v_item->>'source','all')='featured' and coalesce(v_item->>'purpose','all')='all') or
        (coalesce(v_item->>'source','all')='all' and coalesce(v_item->>'purpose','all') in ('sale','rent','seasonal','launch')) or
        (coalesce(v_item->>'source','all')='all' and coalesce(v_item->>'purpose','all')='all' and coalesce(v_item->'types','[]'::jsonb) <@ '["farm","rural"]'::jsonb)
      );
      if not v_intermediate_allowed then raise exception 'INTERMEDIATE_CUSTOM_FILTER_NOT_ALLOWED'; end if;
    end loop;
  elsif v_count > 12 then
    raise exception 'ADVANCED_SHOWCASE_LIMIT';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_portal_showcase_entitlement_trigger on public.portal_settings;
create trigger validate_portal_showcase_entitlement_trigger
before insert or update of visual_draft, visual_published on public.portal_settings
for each row execute function public.validate_portal_showcase_entitlement();

commit;
