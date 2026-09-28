-- Configurable property types. Existing identifiers and listings are preserved.
create table if not exists public.property_types_catalog (
  id varchar(50) primary key check (id ~ '^[a-z0-9_]+$'),
  name varchar(100) not null,
  description varchar(180) not null default '',
  icon varchar(50) not null default 'Building2',
  is_active boolean not null default true,
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.property_types_catalog(id, name, description, icon, display_order)
values
 ('apartment','Apartamento','Padrão, studio ou cobertura','Building',10),
 ('house','Casa de Bairro','Casa independente em bairro aberto','Home',20),
 ('condo_house','Casa em Condomínio','Residencial fechado','Home',30),
 ('penthouse','Cobertura','Apartamento de cobertura','Building2',40),
 ('commercial','Comercial','Sala, galpão ou loja','Store',50),
 ('land','Terreno','Lote em condomínio ou bairro aberto','Maximize2',60),
 ('rural','Imóvel Rural','Propriedade em área rural','Trees',70),
 ('studio','Studio','Imóvel compacto e integrado','Building',80),
 ('loft','Loft','Ambientes amplos e integrados','Warehouse',90),
 ('warehouse','Galpão','Imóvel industrial ou logístico','Warehouse',100),
 ('chacara','Chácara','Área de lazer e descanso','Trees',110),
 ('farm','Sítio/Fazenda','Área rural e produção','Tractor',120),
 ('launch','Lançamento','Em obras ou na planta','Sparkles',130)
on conflict (id) do nothing;

-- Drop the RPC before changing its return column type.
drop function if exists public.get_properties_within_radius(numeric,numeric,numeric,public.property_purpose,numeric,numeric,integer);

alter table public.properties alter column type drop default;
alter table public.properties alter column type type varchar(50) using type::text;
alter table public.properties alter column type set default 'apartment';

do $block$
begin
  if to_regclass('public.client_interests') is not null then
    alter table public.client_interests
      alter column property_types type text[] using property_types::text[];
  end if;
end;
$block$;

alter table public.properties drop constraint if exists properties_type_catalog_fk;
alter table public.properties add constraint properties_type_catalog_fk
  foreign key (type) references public.property_types_catalog(id) on update cascade on delete restrict;

create or replace function public.get_properties_within_radius(
  p_lat numeric, p_lng numeric, p_radius_km numeric default 10.0,
  p_purpose public.property_purpose default null, p_min_price numeric default null,
  p_max_price numeric default null, p_limit integer default 50
)
returns table (
  id uuid, code varchar(20), title varchar(200), slug varchar(250),
  purpose public.property_purpose, type varchar(50), price numeric(14,2),
  useful_area numeric(10,2), bedrooms smallint, parking_spots smallint,
  city varchar(100), neighborhood varchar(100), latitude numeric(10,7),
  longitude numeric(10,7), cover_image_url text, distance_km numeric
)
language sql stable
as $function$
  select p.id,p.code,p.title,p.slug,p.purpose,p.type,p.price,p.useful_area,p.bedrooms,p.parking_spots,
    loc.city,loc.neighborhood,loc.latitude,loc.longitude,
    (select img.url from public.property_images img where img.property_id=p.id and img.is_cover=true limit 1),
    round((6371*acos(cos(radians(p_lat))*cos(radians(loc.latitude))*cos(radians(loc.longitude)-radians(p_lng))+sin(radians(p_lat))*sin(radians(loc.latitude))))::numeric,2)
  from public.properties p join public.property_locations loc on loc.property_id=p.id
  where p.status='active' and (p_purpose is null or p.purpose=p_purpose)
    and (p_min_price is null or p.price>=p_min_price) and (p_max_price is null or p.price<=p_max_price)
    and (6371*acos(cos(radians(p_lat))*cos(radians(loc.latitude))*cos(radians(loc.longitude)-radians(p_lng))+sin(radians(p_lat))*sin(radians(loc.latitude))))<=p_radius_km
  order by 16 asc limit p_limit;
$function$;

alter table public.property_types_catalog enable row level security;
drop policy if exists "everyone reads property types catalog" on public.property_types_catalog;
create policy "everyone reads property types catalog" on public.property_types_catalog for select to anon, authenticated using (true);
drop policy if exists "administrators manage property types catalog" on public.property_types_catalog;
create policy "administrators manage property types catalog" on public.property_types_catalog for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.property_types_catalog to anon, authenticated;
grant insert, update, delete on public.property_types_catalog to authenticated;

create or replace function public.audit_property_type_configuration() returns trigger language plpgsql security definer set search_path=''
as $function$
declare v_action text;
begin
  if tg_op='INSERT' then v_action:='created';
  elsif tg_op='DELETE' then v_action:='deleted';
  elsif new.is_active is distinct from old.is_active then v_action:=case when new.is_active then 'enabled' else 'disabled' end;
  else v_action:='updated'; end if;
  insert into public.admin_configuration_audit(administrator_id,resource_type,resource_id,action,previous_value,new_value)
  values(auth.uid(),'property_type',case when tg_op='DELETE' then old.id else new.id end,v_action,
    case when tg_op='INSERT' then null else to_jsonb(old) end,case when tg_op='DELETE' then null else to_jsonb(new) end);
  if tg_op='DELETE' then return old; end if; return new;
end;$function$;
drop trigger if exists audit_property_type_configuration_trigger on public.property_types_catalog;
create trigger audit_property_type_configuration_trigger after insert or update or delete on public.property_types_catalog
for each row execute function public.audit_property_type_configuration();

do $block$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='property_types_catalog') then
    execute 'alter publication supabase_realtime add table public.property_types_catalog';
  end if;
end;$block$;
