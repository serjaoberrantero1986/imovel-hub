begin;

create or replace function public.get_my_deal_notification_count()
returns integer
language sql
security definer
set search_path=''
as $$
  select count(*)::integer
  from public.notifications
  where user_id=auth.uid()
    and not read
    and coalesce(data->>'scope','') like 'deal\_%' escape '\';
$$;

create or replace function public.get_my_deal_notifications(p_limit integer default 30)
returns jsonb
language sql
security definer
set search_path=''
as $$
  select coalesce(jsonb_agg(to_jsonb(n) order by n.created_at desc),'[]'::jsonb)
  from (
    select id,type,title,message,link,data,read,created_at,read_at
    from public.notifications
    where user_id=auth.uid()
      and coalesce(data->>'scope','') like 'deal\_%' escape '\'
    order by created_at desc
    limit least(greatest(coalesce(p_limit,30),1),100)
  ) n;
$$;

create or replace function public.mark_my_deal_notifications_read(p_dossier_id uuid default null)
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare v_count integer;
begin
  update public.notifications
  set read=true,read_at=coalesce(read_at,now())
  where user_id=auth.uid()
    and not read
    and coalesce(data->>'scope','') like 'deal\_%' escape '\'
    and (p_dossier_id is null or data->>'dossier_id'=p_dossier_id::text);
  get diagnostics v_count=row_count;
  return v_count;
end;
$$;

revoke all on function public.get_my_deal_notification_count() from public,anon;
revoke all on function public.get_my_deal_notifications(integer) from public,anon;
revoke all on function public.mark_my_deal_notifications_read(uuid) from public,anon;
grant execute on function public.get_my_deal_notification_count() to authenticated;
grant execute on function public.get_my_deal_notifications(integer) to authenticated;
grant execute on function public.mark_my_deal_notifications_read(uuid) to authenticated;

notify pgrst,'reload schema';
commit;
