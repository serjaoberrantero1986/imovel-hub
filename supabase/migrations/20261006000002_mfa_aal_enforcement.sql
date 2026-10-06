begin;

-- Some production databases predate the canonical profiles migration. Keep
-- the soft-activation flag available before rebuilding the protected views.
alter table public.profiles
  add column if not exists is_active boolean not null default true;

-- Accounts without a factor continue at AAL1. Once a verified TOTP factor exists,
-- every private data operation requires the session to have completed MFA (AAL2).
create or replace function public.has_satisfied_mfa()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    auth.uid() is not null
    and (
      not exists (
        select 1
        from auth.mfa_factors factor
        where factor.user_id = auth.uid()
          and factor.status = 'verified'
      )
      or coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
    );
$$;

revoke all on function public.has_satisfied_mfa() from public, anon;
grant execute on function public.has_satisfied_mfa() to authenticated;

-- Administrative SECURITY DEFINER functions already depend on is_admin().
-- Including the AAL check here protects those RPCs as well.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_satisfied_mfa() and exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'::public.user_role
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- This RPC opens the short deletion window used by delete_my_account().
-- Requiring MFA here prevents an AAL1 session from preparing a deletion.
create or replace function public.begin_my_account_deletion()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_role public.user_role;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not public.has_satisfied_mfa() then raise exception 'MFA verification required'; end if;
  select role into v_role from public.profiles where id = v_uid for update;
  if not found then raise exception 'Profile not found'; end if;
  if v_role = 'admin'::public.user_role then raise exception 'Administrative accounts cannot be deleted'; end if;
  update public.profiles set account_deletion_requested_at = now() where id = v_uid;
  return true;
end;
$$;
revoke all on function public.begin_my_account_deletion() from public, anon;
grant execute on function public.begin_my_account_deletion() to authenticated;

-- Keep conversation identities private until an enrolled factor is completed.
create or replace view public.conversation_participant_cards
with (security_barrier = true)
as
select p.id, p.name, p.email, p.role, p.avatar_url, p.verified, p.agency_name
from public.profiles p
where p.is_active = true
  and public.has_satisfied_mfa()
  and (
    p.id = auth.uid()
    or exists (
      select 1 from public.conversations c
      where (c.buyer_id = auth.uid() or c.advertiser_id = auth.uid())
        and (c.buyer_id = p.id or c.advertiser_id = p.id)
    )
  );
revoke all on public.conversation_participant_cards from public;
grant select on public.conversation_participant_cards to authenticated;

do $$
declare
  protected_table text;
  protected_tables text[] := array[
    'profiles',
    'profile_preferences',
    'teams',
    'properties',
    'property_locations',
    'property_images',
    'property_features',
    'property_views_log',
    'favorites',
    'saved_searches',
    'leads',
    'clients',
    'client_interests',
    'crm_pipeline_stages',
    'crm_deals',
    'crm_interactions',
    'crm_tasks',
    'conversations',
    'messages',
    'notifications',
    'reports',
    'audit_logs',
    'creci_verification_documents',
    'creci_review_records',
    'creci_review_audit'
  ];
begin
  foreach protected_table in array protected_tables loop
    if to_regclass(format('public.%I', protected_table)) is not null then
      execute format('drop policy if exists "MFA protects private operations" on public.%I', protected_table);
      execute format(
        'create policy "MFA protects private operations" on public.%I as restrictive for all to authenticated using (public.has_satisfied_mfa()) with check (public.has_satisfied_mfa())',
        protected_table
      );
    end if;
  end loop;
end;
$$;

-- Portal customization remains publicly readable. Only authenticated writes
-- from an account with MFA enrolled require AAL2.
drop policy if exists "MFA protects portal mutations" on public.portal_settings;
drop policy if exists "MFA protects portal inserts" on public.portal_settings;
drop policy if exists "MFA protects portal updates" on public.portal_settings;
drop policy if exists "MFA protects portal deletes" on public.portal_settings;
create policy "MFA protects portal inserts"
  on public.portal_settings as restrictive
  for insert to authenticated
  with check (public.has_satisfied_mfa());
create policy "MFA protects portal updates"
  on public.portal_settings as restrictive
  for update to authenticated
  using (public.has_satisfied_mfa())
  with check (public.has_satisfied_mfa());
create policy "MFA protects portal deletes"
  on public.portal_settings as restrictive
  for delete to authenticated
  using (public.has_satisfied_mfa());

-- Storage paths already have bucket/ownership policies. Mutations always
-- require the enrolled factor, while public assets remain readable during the
-- MFA challenge. Only the private CRECI bucket also requires AAL2 for reads.
drop policy if exists "MFA protects authenticated storage" on storage.objects;
drop policy if exists "MFA protects private storage reads" on storage.objects;
drop policy if exists "MFA protects storage inserts" on storage.objects;
drop policy if exists "MFA protects storage updates" on storage.objects;
drop policy if exists "MFA protects storage deletes" on storage.objects;

create policy "MFA protects private storage reads"
  on storage.objects as restrictive
  for select to authenticated
  using (bucket_id <> 'creci-verification' or public.has_satisfied_mfa());

create policy "MFA protects storage inserts"
  on storage.objects as restrictive
  for insert to authenticated
  with check (public.has_satisfied_mfa());

create policy "MFA protects storage updates"
  on storage.objects as restrictive
  for update to authenticated
  using (public.has_satisfied_mfa())
  with check (public.has_satisfied_mfa());

create policy "MFA protects storage deletes"
  on storage.objects as restrictive
  for delete to authenticated
  using (public.has_satisfied_mfa());

commit;
