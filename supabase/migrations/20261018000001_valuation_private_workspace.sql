begin;

-- Avaliações comerciais preliminares privadas; nenhum valor automático ou PTAM.
create table public.valuation_assessments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 3 and 180),
  property_type text not null check (property_type in ('house', 'apartment', 'land', 'commercial', 'other')),
  state char(2) not null check (state ~ '^[A-Z]{2}$'),
  city text not null check (char_length(trim(city)) between 2 and 120),
  neighborhood text not null default '' check (char_length(neighborhood) <= 120),
  street text not null default '' check (char_length(street) <= 200),
  street_number text not null default '' check (char_length(street_number) <= 20),
  land_area numeric(12,2) check (land_area > 0),
  built_area numeric(12,2) check (built_area > 0),
  bedrooms smallint check (bedrooms between 0 and 50),
  bathrooms smallint check (bathrooms between 0 and 50),
  parking_spots smallint check (parking_spots between 0 and 50),
  condominium boolean not null default false,
  latitude numeric(10,7) check (latitude between -90 and 90),
  longitude numeric(10,7) check (longitude between -180 and 180),
  coordinate_quality text not null default 'unknown' check (coordinate_quality in ('property', 'unknown')),
  notes text not null default '' check (char_length(notes) <= 3000),
  status text not null default 'draft' check (status in ('draft', 'under_review', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id),
  check ((latitude is null and longitude is null and coordinate_quality = 'unknown')
    or (latitude is not null and longitude is not null and coordinate_quality = 'property'))
);

create table public.valuation_comparables (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null,
  owner_id uuid not null,
  source_type text not null check (source_type in ('olx', 'facebook_marketplace', 'real_estate_agency', 'portal', 'other')),
  source_name text not null check (char_length(trim(source_name)) between 2 and 120),
  listing_url text not null check (char_length(listing_url) between 12 and 2000 and listing_url ~* '^https://[^[:space:]]+$'),
  listing_reference text check (char_length(listing_reference) <= 120),
  property_type text not null check (property_type in ('house', 'apartment', 'land', 'commercial', 'other')),
  asking_price numeric(14,2) not null check (asking_price > 0),
  land_area numeric(12,2) check (land_area > 0),
  built_area numeric(12,2) check (built_area > 0),
  bedrooms smallint check (bedrooms between 0 and 50),
  bathrooms smallint check (bathrooms between 0 and 50),
  parking_spots smallint check (parking_spots between 0 and 50),
  condominium boolean,
  latitude numeric(10,7) check (latitude between -90 and 90),
  longitude numeric(10,7) check (longitude between -180 and 180),
  coordinate_quality text not null default 'unknown' check (coordinate_quality in ('property','street','neighborhood','city','unknown')),
  availability text not null default 'unknown' check (availability in ('active','unknown','sold','withdrawn')),
  market_zone_verified boolean not null default false,
  reviewed_by_broker boolean not null default false,
  conflicting_data boolean not null default false,
  multi_unit boolean not null default false,
  unfinished boolean not null default false,
  notes text not null default '' check (char_length(notes) <= 3000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (assessment_id, owner_id) references public.valuation_assessments(id, owner_id) on delete cascade,
  check ((latitude is null and longitude is null and coordinate_quality = 'unknown')
    or (latitude is not null and longitude is not null and coordinate_quality <> 'unknown'))
);

create index valuation_assessments_owner_created_idx
  on public.valuation_assessments (owner_id, created_at desc);
create index valuation_comparables_assessment_created_idx
  on public.valuation_comparables (assessment_id, created_at desc);
create index valuation_comparables_owner_idx
  on public.valuation_comparables (owner_id);

alter table public.valuation_assessments enable row level security;
alter table public.valuation_comparables enable row level security;

revoke all on public.valuation_assessments from public, anon, authenticated;
revoke all on public.valuation_comparables from public, anon, authenticated;
grant select, insert, update, delete on public.valuation_assessments to authenticated;
grant select, insert, update, delete on public.valuation_comparables to authenticated;

-- A role não basta: exige perfil ativo e MFA satisfeita quando cadastrada.
create or replace function public.can_manage_my_valuations(p_owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_owner_id = auth.uid()
    and public.has_satisfied_mfa()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_active = true
        and p.role::text in ('broker', 'agency')
    );
$$;
revoke all on function public.can_manage_my_valuations(uuid) from public, anon;
grant execute on function public.can_manage_my_valuations(uuid) to authenticated;

create policy "Avaliações: leitura somente do titular"
  on public.valuation_assessments for select to authenticated
  using (public.can_manage_my_valuations(owner_id));
create policy "Avaliações: inserção somente do titular"
  on public.valuation_assessments for insert to authenticated
  with check (public.can_manage_my_valuations(owner_id));
create policy "Avaliações: atualização somente do titular"
  on public.valuation_assessments for update to authenticated
  using (public.can_manage_my_valuations(owner_id))
  with check (public.can_manage_my_valuations(owner_id));
create policy "Avaliações: exclusão somente do titular"
  on public.valuation_assessments for delete to authenticated
  using (public.can_manage_my_valuations(owner_id));

create policy "Comparáveis: leitura somente do titular"
  on public.valuation_comparables for select to authenticated
  using (public.can_manage_my_valuations(owner_id));
create policy "Comparáveis: inserção somente do titular"
  on public.valuation_comparables for insert to authenticated
  with check (public.can_manage_my_valuations(owner_id));
create policy "Comparáveis: atualização somente do titular"
  on public.valuation_comparables for update to authenticated
  using (public.can_manage_my_valuations(owner_id))
  with check (public.can_manage_my_valuations(owner_id));
create policy "Comparáveis: exclusão somente do titular"
  on public.valuation_comparables for delete to authenticated
  using (public.can_manage_my_valuations(owner_id));

-- Atualizado no banco, não a partir do relógio do cliente.
create or replace function public.touch_valuation_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger valuation_assessments_updated_at
  before update on public.valuation_assessments for each row
  execute function public.touch_valuation_updated_at();
create trigger valuation_comparables_updated_at
  before update on public.valuation_comparables for each row
  execute function public.touch_valuation_updated_at();

comment on table public.valuation_assessments is 'Rascunhos privados de avaliações comerciais preliminares; não são PTAM.';
comment on table public.valuation_comparables is 'Links e atributos inseridos por corretores para revisão; não são vendas verificadas.';

commit;
