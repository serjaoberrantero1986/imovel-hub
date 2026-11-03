begin;

-- Anonymous visitors may read active plans without invoking the protected
-- administrative helper. Administrators keep a separate policy for inactive
-- plans in the management screen.
drop policy if exists "public reads active commercial plans" on public.commercial_plans;
create policy "public reads active commercial plans"
  on public.commercial_plans for select to anon, authenticated
  using (active);

drop policy if exists "administrators read all commercial plans" on public.commercial_plans;
create policy "administrators read all commercial plans"
  on public.commercial_plans for select to authenticated
  using (public.is_admin());

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
  v_basic_showcases jsonb := jsonb_build_array(jsonb_build_object(
    'id', 'available-properties',
    'title', 'Imóveis Disponíveis',
    'subtitle', 'Confira os anúncios mais recentes do portal',
    'isVisible', true,
    'source', 'all',
    'purpose', 'all',
    'types', '[]'::jsonb,
    'order', 'recent',
    'limit', 6
  ));
begin
  if new.owner_profile_id is null or new.id = 'default' then return new; end if;

  -- A professional has no paid entitlement during signup. Initialise only the
  -- valid Basic showcase; the selected paid tier remains an intent until the
  -- payment webhook activates it.
  if tg_op = 'INSERT' then
    if not (new.visual_draft ? 'showcases') or new.visual_draft->'showcases' = '[]'::jsonb then
      new.visual_draft := jsonb_set(new.visual_draft, '{showcases}', v_basic_showcases, true);
    end if;
    if not (new.visual_published ? 'showcases') or new.visual_published->'showcases' = '[]'::jsonb then
      new.visual_published := jsonb_set(new.visual_published, '{showcases}', v_basic_showcases, true);
    end if;
  end if;

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

commit;
