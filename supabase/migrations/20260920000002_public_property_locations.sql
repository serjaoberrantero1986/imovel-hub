-- Public map data: never store a street address or precise coordinates here.
create table if not exists public.property_public_locations (
  property_id uuid primary key references public.properties(id) on delete cascade,
  neighborhood text not null,
  city text not null,
  state text not null,
  latitude numeric(10,7) not null,
  longitude numeric(10,7) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.property_public_locations enable row level security;

create policy "visitors read public property locations"
on public.property_public_locations for select to anon, authenticated
using (exists (
  select 1 from public.properties p
  where p.id = property_id and p.status = 'active'
));

create policy "owners manage public property locations"
on public.property_public_locations for all to authenticated
using (exists (
  select 1 from public.properties p where p.id = property_id and p.user_id = auth.uid()
))
with check (exists (
  select 1 from public.properties p where p.id = property_id and p.user_id = auth.uid()
));

-- Remove anonymous access to the private address table. Existing owner policy
-- continues to allow each advertiser to manage its own exact address.
drop policy if exists "public reads visible locations" on public.property_locations;
