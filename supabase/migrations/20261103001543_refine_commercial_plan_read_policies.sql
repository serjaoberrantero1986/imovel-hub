begin;

drop policy if exists "public reads active commercial plans" on public.commercial_plans;
drop policy if exists "administrators read all commercial plans" on public.commercial_plans;

create policy "anonymous visitors read active commercial plans"
  on public.commercial_plans for select to anon
  using (active);

create policy "authenticated users read allowed commercial plans"
  on public.commercial_plans for select to authenticated
  using (active or public.is_admin());

commit;
