begin;

-- Permite ao corretor reaproveitar uma oferta sem apagar a triagem automática.
-- NULL = decisão automática; include/exclude = decisão manual auditável.
alter table public.valuation_comparables
  add column if not exists manual_selection text;
alter table public.valuation_comparables
  drop constraint if exists valuation_comparables_manual_selection_check;
alter table public.valuation_comparables
  add constraint valuation_comparables_manual_selection_check
  check (manual_selection is null or manual_selection in ('include','exclude'));

alter table public.valuation_candidates
  add column if not exists manual_selection text;
alter table public.valuation_candidates
  drop constraint if exists valuation_candidates_manual_selection_check;
alter table public.valuation_candidates
  add constraint valuation_candidates_manual_selection_check
  check (manual_selection is null or manual_selection in ('include','exclude'));

-- A contagem inicia em zero; valores existentes não são alterados.
alter table public.properties alter column views_count set default 0;

create table if not exists public.property_views_log (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  visitor_token text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_property_views_log_property_created
  on public.property_views_log(property_id, created_at desc);

alter table public.property_views_log enable row level security;
revoke all on public.property_views_log from public, anon, authenticated;

create or replace function public.increment_property_view(
  p_property_id uuid,
  p_visitor_token text default null,
  p_user_agent text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_recent boolean;
begin
  if not exists (
    select 1 from public.properties
    where id = p_property_id and status = 'active'
  ) then
    return;
  end if;

  if exists (
    select 1 from public.properties
    where id = p_property_id and user_id = v_user_id
  ) then
    return;
  end if;

  select exists (
    select 1 from public.property_views_log
    where property_id = p_property_id
      and created_at >= now() - interval '30 minutes'
      and ((v_user_id is not null and user_id = v_user_id)
        or (p_visitor_token is not null and visitor_token = left(p_visitor_token, 120)))
  ) into v_recent;

  if v_recent then return; end if;

  insert into public.property_views_log(property_id,user_id,visitor_token,user_agent)
  values (p_property_id,v_user_id,left(p_visitor_token,120),left(p_user_agent,500));

  update public.properties
  set views_count = coalesce(views_count,0) + 1
  where id = p_property_id and status = 'active';
end;
$$;

revoke all on function public.increment_property_view(uuid,text,text) from public;
grant execute on function public.increment_property_view(uuid,text,text) to anon, authenticated;

commit;
