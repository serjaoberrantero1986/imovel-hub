begin;

-- A assinatura de oito parâmetros deve exigir o consentimento de notificações.
-- Com DEFAULT, chamadas legadas de sete parâmetros também correspondiam a esta
-- sobrecarga e o PostgreSQL recusava ambas como ambíguas antes de salvar.
drop function public.save_my_partnership_membership(boolean,boolean,boolean,boolean,text[],text,jsonb,boolean);

create function public.save_my_partnership_membership(
  p_enabled boolean,
  p_accepts_sale boolean,
  p_accepts_rent boolean,
  p_accepts_launch boolean,
  p_specialties text[],
  p_introduction text,
  p_regions jsonb,
  p_notify_opportunities boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  v_result := public.save_my_partnership_membership(
    p_enabled,
    p_accepts_sale,
    p_accepts_rent,
    p_accepts_launch,
    p_specialties,
    p_introduction,
    p_regions
  );

  update public.partnership_network_members
  set notify_opportunities = coalesce(p_notify_opportunities, false),
      updated_at = now()
  where profile_id = auth.uid();

  return public.get_my_partnership_network();
end;
$$;

revoke all on function public.save_my_partnership_membership(boolean,boolean,boolean,boolean,text[],text,jsonb,boolean) from public, anon;
grant execute on function public.save_my_partnership_membership(boolean,boolean,boolean,boolean,text[],text,jsonb,boolean) to authenticated;

notify pgrst, 'reload schema';

commit;
