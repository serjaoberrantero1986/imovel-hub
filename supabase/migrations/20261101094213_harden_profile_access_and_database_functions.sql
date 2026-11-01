-- Restrict profile rows to their owner. Public professional data is exposed
-- only through the existing, field-limited RPCs.
drop policy if exists "MFA protects private operations" on public.profiles;
drop policy if exists "public can read profiles" on public.profiles;
drop policy if exists "user updates own profile" on public.profiles;
drop policy if exists "users read own profile updates" on public.profiles;
drop policy if exists "users read own profile" on public.profiles;
drop policy if exists "users update own profile" on public.profiles;

create policy "users read own profile"
on public.profiles for select
to authenticated
using (
  id = (select auth.uid())
  and public.has_satisfied_mfa()
);

create policy "users update own profile"
on public.profiles for update
to authenticated
using (
  id = (select auth.uid())
  and public.has_satisfied_mfa()
)
with check (
  id = (select auth.uid())
  and public.has_satisfied_mfa()
);

-- Preserve the participant-card API without letting the view bypass RLS by
-- itself. The privileged function performs the ownership/participation check.
create or replace function public.get_my_conversation_participant_cards()
returns table (
  id uuid,
  name text,
  email text,
  role public.user_role,
  avatar_url text,
  verified boolean,
  agency_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct
    profile.id,
    profile.name,
    profile.email,
    profile.role,
    profile.avatar_url,
    profile.verified,
    profile.agency_name
  from public.profiles profile
  where (select auth.uid()) is not null
    and public.has_satisfied_mfa()
    and profile.is_active = true
    and (
      profile.id = (select auth.uid())
      or exists (
        select 1
        from public.conversations conversation
        where (conversation.buyer_id = (select auth.uid()) or conversation.advertiser_id = (select auth.uid()))
          and (conversation.buyer_id = profile.id or conversation.advertiser_id = profile.id)
      )
    );
$$;

revoke all on function public.get_my_conversation_participant_cards() from public, anon;
grant execute on function public.get_my_conversation_participant_cards() to authenticated;

create or replace view public.conversation_participant_cards
with (security_invoker = true, security_barrier = true)
as
select * from public.get_my_conversation_participant_cards();

revoke all on public.conversation_participant_cards from public, anon;
grant select on public.conversation_participant_cards to authenticated;

-- Pin name resolution for the three functions reported by the database linter.
alter function public.set_updated_at() set search_path = '';
alter function public.handle_updated_at() set search_path = '';
alter function public.get_properties_within_radius(numeric, numeric, numeric, public.property_purpose, numeric, numeric, integer) set search_path = '';

-- Trigger functions are invoked by their triggers and must not be callable as
-- public RPCs. This removes accidental grants without changing trigger behavior.
do $$
declare
  trigger_function record;
begin
  for trigger_function in
    select procedure.oid::regprocedure as signature
    from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.prosecdef
      and procedure.prorettype = 'trigger'::regtype
  loop
    execute format(
      'revoke all on function %s from public, anon, authenticated',
      trigger_function.signature
    );
  end loop;
end;
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Keep extensions outside the exposed public schema.
alter extension unaccent set schema extensions;

-- Evaluate auth.uid() once per statement instead of once for every candidate
-- row. Policy semantics stay unchanged.
do $$
declare
  policy_record record;
  using_expression text;
  check_expression text;
  alteration text;
begin
  for policy_record in
    select
      namespace.nspname as schema_name,
      relation.relname as table_name,
      policy.polname as policy_name,
      pg_get_expr(policy.polqual, policy.polrelid) as using_expression,
      pg_get_expr(policy.polwithcheck, policy.polrelid) as check_expression
    from pg_policy policy
    join pg_class relation on relation.oid = policy.polrelid
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and (
        coalesce(pg_get_expr(policy.polqual, policy.polrelid), '') like '%auth.uid()%'
        or coalesce(pg_get_expr(policy.polwithcheck, policy.polrelid), '') like '%auth.uid()%'
      )
      and (
        coalesce(pg_get_expr(policy.polqual, policy.polrelid), '') not like '%SELECT auth.uid()%'
        or coalesce(pg_get_expr(policy.polwithcheck, policy.polrelid), '') not like '%SELECT auth.uid()%'
      )
  loop
    using_expression := replace(policy_record.using_expression, 'auth.uid()', '(select auth.uid())');
    check_expression := replace(policy_record.check_expression, 'auth.uid()', '(select auth.uid())');
    alteration := format('alter policy %I on %I.%I', policy_record.policy_name, policy_record.schema_name, policy_record.table_name);
    if using_expression is not null then
      alteration := alteration || format(' using (%s)', using_expression);
    end if;
    if check_expression is not null then
      alteration := alteration || format(' with check (%s)', check_expression);
    end if;
    execute alteration;
  end loop;
end;
$$;
