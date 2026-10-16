begin;

-- Fase 4: inventário público por portal. Um imóvel continua existindo uma única
-- vez em properties; portais parceiros recebem apenas a referência autorizada.

create or replace function public.get_portal_property_inventory(p_portal_owner_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare v_result jsonb;
begin
  if p_portal_owner_id is null then return '[]'::jsonb; end if;
  select coalesce(jsonb_agg(item order by item->>'updated_at' desc),'[]'::jsonb) into v_result
  from (
    select jsonb_build_object(
      'property_id',p.id,'source','owner','updated_at',p.updated_at,'partnership',null
    ) item
    from public.properties p
    where p.user_id=p_portal_owner_id and p.status='active'

    union all

    select jsonb_build_object(
      'property_id',p.id,'source','partnership','updated_at',p.updated_at,
      'partnership',jsonb_build_object(
        'id',pp.id,'contract_version_id',pp.contract_version_id,
        'captor',jsonb_build_object('profile_id',captor.id,'name',captor.name,'creci',captor.creci,'creci_uf',captor.creci_uf),
        'partner',jsonb_build_object('profile_id',partner.id,'name',partner.name,'creci',partner.creci,'creci_uf',partner.creci_uf),
        'property_updated_at',p.updated_at,
        'notice','Disponibilidade e informações mantidas pelo captador.'
      )
    ) item
    from public.property_partnerships pp
    join public.properties p on p.id=pp.property_id and p.status='active'
    join public.partnership_contract_versions cv on cv.id=pp.contract_version_id and cv.status='verified'
    join public.profiles captor on captor.id=pp.captor_id
    join public.profiles partner on partner.id=pp.partner_id
    where pp.partner_id=p_portal_owner_id
      and pp.status='active'
      and (pp.ends_at is null or pp.ends_at>now())
      and coalesce((cv.canonical_terms#>>'{terms,allow_partner_portal}')::boolean,false)
      and public.is_eligible_sp_partnership_professional(pp.captor_id)
      and public.is_eligible_sp_partnership_professional(pp.partner_id)
      and exists(select 1 from public.property_locations l where l.property_id=p.id and upper(l.state)='SP')
  ) inventory;
  return v_result;
end;
$$;
revoke all on function public.get_portal_property_inventory(uuid) from public;
grant execute on function public.get_portal_property_inventory(uuid) to anon,authenticated;

create table if not exists public.partnership_listing_reports (
  id uuid primary key default gen_random_uuid(),
  partnership_id uuid not null references public.property_partnerships(id) on delete restrict,
  property_id uuid references public.properties(id) on delete set null,
  reporter_id uuid references public.profiles(id) on delete set null,
  reporter_snapshot jsonb not null,
  reason text not null check (char_length(trim(reason)) between 10 and 2000),
  status text not null default 'open' check (status in ('open','reviewed','dismissed','resolved')),
  reported_on date not null default current_date,
  created_at timestamptz not null default now(),
  unique(partnership_id,reporter_id,reported_on)
);
alter table public.partnership_listing_reports enable row level security;
revoke all on public.partnership_listing_reports from public,anon,authenticated;

create or replace function public.report_outdated_partner_listing(p_partnership_id uuid,p_reason text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_partnership public.property_partnerships%rowtype;v_profile public.profiles%rowtype;v_id uuid;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if char_length(trim(coalesce(p_reason,''))) not between 10 and 2000 then raise exception 'Report reason required'; end if;
  select * into v_partnership from public.property_partnerships where id=p_partnership_id;
  if not found or v_partnership.status<>'active' or (v_partnership.ends_at is not null and v_partnership.ends_at<=now()) then raise exception 'Active partnership not found'; end if;
  if v_uid in(v_partnership.captor_id,v_partnership.partner_id) then raise exception 'Parties cannot report their own listing'; end if;
  select * into v_profile from public.profiles where id=v_uid;
  insert into public.partnership_listing_reports(partnership_id,property_id,reporter_id,reporter_snapshot,reason)
  values(v_partnership.id,v_partnership.property_id,v_uid,jsonb_build_object('profile_id',v_profile.id,'name',v_profile.name,'email',v_profile.email),trim(p_reason))
  on conflict(partnership_id,reporter_id,reported_on) do update set reason=excluded.reason,created_at=now()
  returning id into v_id;
  insert into public.notifications(user_id,type,title,message,link,data)
  select party_id,'system_alert'::public.notification_type,'Informação de anúncio em parceria sinalizada','Um usuário informou que algum dado pode estar desatualizado. Confira o imóvel e registre as correções necessárias.','/meus-imoveis',jsonb_build_object('scope','partnership_listing_report','report_id',v_id,'partnership_id',v_partnership.id,'property_id',v_partnership.property_id)
  from unnest(array[v_partnership.captor_id,v_partnership.partner_id]) party_id where party_id is not null;
  return v_id;
end;
$$;
revoke all on function public.report_outdated_partner_listing(uuid,text) from public,anon;
grant execute on function public.report_outdated_partner_listing(uuid,text) to authenticated;

notify pgrst,'reload schema';
commit;
