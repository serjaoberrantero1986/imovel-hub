-- Public portal content, ready to receive one record per portal in the future.
create table if not exists public.portal_settings (
  id varchar(50) primary key check (id ~ '^[a-z0-9_-]+$'),
  owner_profile_id uuid references public.profiles(id) on delete set null,
  footer jsonb not null default '{}'::jsonb check (jsonb_typeof(footer) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.portal_settings(id, footer)
values ('default', jsonb_build_object(
  'brandDescription','A plataforma imobiliária completa para você encontrar, vender e alugar imóveis com segurança e transparência.',
  'creci','CRECI 275886-F','professionalName','Edson Ricardo Souza Delgado de Oliveira',
  'serviceTitle','Central de Atendimento','phone','(15) 99779-6315','email','contato@webimovel.com.br',
  'address','Rua Francisco das Chagas, 10 - Jardim dos Ipês - Salto de Pirapora/SP',
  'businessHours','Segunda a Sexta: 08h às 18h | Sábados: 09h às 13h',
  'navigationTitle','Navegação','connectionTitle','Conecte-se',
  'newsletterText','Receba novidades e oportunidades de investimento imobiliário em primeira mão.',
  'instagramUrl','','facebookUrl','','youtubeUrl','','linkedinUrl','',
  'copyrightText','© 2026 Web Imóvel Brasil S/A. Todos os direitos reservados.'
)) on conflict (id) do nothing;

alter table public.portal_settings enable row level security;
drop policy if exists "everyone reads portal settings" on public.portal_settings;
create policy "everyone reads portal settings" on public.portal_settings for select to anon, authenticated using (true);
drop policy if exists "administrators manage portal settings" on public.portal_settings;
create policy "administrators manage portal settings" on public.portal_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.portal_settings to anon, authenticated;
grant insert, update, delete on public.portal_settings to authenticated;

create or replace function public.audit_portal_settings() returns trigger language plpgsql security definer set search_path=''
as $function$
begin
  insert into public.admin_configuration_audit(administrator_id,resource_type,resource_id,action,previous_value,new_value)
  values(auth.uid(),'portal_settings',case when tg_op='DELETE' then old.id else new.id end,
    case when tg_op='INSERT' then 'created' when tg_op='DELETE' then 'deleted' else 'updated' end,
    case when tg_op='INSERT' then null else to_jsonb(old) end,
    case when tg_op='DELETE' then null else to_jsonb(new) end);
  if tg_op='DELETE' then return old; end if; return new;
end;$function$;
drop trigger if exists audit_portal_settings_trigger on public.portal_settings;
create trigger audit_portal_settings_trigger after insert or update or delete on public.portal_settings for each row execute function public.audit_portal_settings();

do $block$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='portal_settings') then
    execute 'alter publication supabase_realtime add table public.portal_settings';
  end if;
end;$block$;
