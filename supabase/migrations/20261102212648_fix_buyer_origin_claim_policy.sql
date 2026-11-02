begin;

drop policy if exists "unbound buyers claim their origin portal" on public.portal_account_bindings;
create policy "unbound buyers claim their origin portal"
  on public.portal_account_bindings for insert to authenticated
  with check (
    (select auth.uid()) = profile_id
    and account_scope = 'buyer'
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'buyer'::public.user_role
    )
  );

commit;
