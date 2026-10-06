begin;

alter table public.profiles
  add column if not exists available_weekend_visits boolean not null default false;

-- Public pages need a deliberately small projection instead of unrestricted
-- SELECT access to profiles (which also contains CPF/CNPJ and private settings).
drop policy if exists "Public profile basic info is viewable by all" on public.profiles;
drop policy if exists "Profile owners and admins can read profiles" on public.profiles;
create policy "Profile owners and admins can read profiles"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id or public.is_admin());

create or replace view public.public_profile_cards
with (security_barrier = true)
as
select
  id,
  name,
  email,
  phone,
  whatsapp,
  avatar_url,
  role,
  creci,
  bio,
  agency_name,
  agency_logo,
  verified,
  rating,
  total_deals,
  city,
  state,
  website,
  instagram,
  linkedin,
  available_weekend_visits
from public.profiles
where is_active = true
  and role in ('owner', 'broker', 'agency');

create or replace view public.conversation_participant_cards
with (security_barrier = true)
as
select
  p.id,
  p.name,
  p.email,
  p.role,
  p.avatar_url,
  p.verified,
  p.agency_name
from public.profiles p
where p.is_active = true
  and (
    p.id = (select auth.uid())
    or exists (
      select 1
      from public.conversations c
      where (c.buyer_id = (select auth.uid()) or c.advertiser_id = (select auth.uid()))
        and (c.buyer_id = p.id or c.advertiser_id = p.id)
    )
  );

revoke all on public.public_profile_cards from public;
revoke all on public.conversation_participant_cards from public;
grant select on public.public_profile_cards to anon, authenticated;
grant select on public.conversation_participant_cards to authenticated;

-- A buyer cannot create a listing. Unverified professionals may keep drafts or
-- submit for review, but only a verified professional may make it public.
drop policy if exists "Brokers and owners can insert properties" on public.properties;
create policy "Verified professionals can insert properties"
  on public.properties for insert
  to authenticated
  with check (
    public.is_admin()
    or (
      (select auth.uid()) = user_id
      and exists (
        select 1 from public.profiles p
        where p.id = (select auth.uid())
          and p.is_active = true
          and p.role in ('owner', 'broker', 'agency')
          and (properties.status <> 'active' or p.verified = true)
      )
    )
  );

drop policy if exists "Listing owners can update their own properties" on public.properties;
create policy "Professionals can update permitted properties"
  on public.properties for update
  to authenticated
  using (
    public.is_admin()
    or (select auth.uid()) = user_id
    or (team_id is not null and team_id = public.get_auth_team_id())
  )
  with check (
    public.is_admin()
    or (
      (
        (select auth.uid()) = user_id
        or (team_id is not null and team_id = public.get_auth_team_id())
      )
      and exists (
        select 1 from public.profiles p
        where p.id = (select auth.uid())
          and p.is_active = true
          and p.role in ('owner', 'broker', 'agency')
          and (properties.status <> 'active' or p.verified = true)
      )
    )
  );

drop policy if exists "Listing owners can delete their own properties" on public.properties;
create policy "Professionals can delete permitted properties"
  on public.properties for delete
  to authenticated
  using (
    public.is_admin()
    or (select auth.uid()) = user_id
    or (team_id is not null and team_id = public.get_auth_team_id())
  );

commit;
