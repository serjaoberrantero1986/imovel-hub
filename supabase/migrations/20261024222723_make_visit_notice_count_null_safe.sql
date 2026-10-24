create or replace function public.get_my_visit_notice_count() returns integer
language sql stable security definer set search_path='' as $$
  select count(*)::integer
  from public.notifications
  where user_id=auth.uid() and data->>'scope'='property_visit' and read is not true;
$$;

revoke all on function public.get_my_visit_notice_count() from public,anon;
grant execute on function public.get_my_visit_notice_count() to authenticated;
notify pgrst,'reload schema';
