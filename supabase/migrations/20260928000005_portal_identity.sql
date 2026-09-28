-- Visual identity for the main portal and its public image bucket.
alter table public.portal_settings
  add column if not exists identity jsonb not null default '{}'::jsonb;
alter table public.portal_settings drop constraint if exists portal_settings_identity_object_check;
alter table public.portal_settings add constraint portal_settings_identity_object_check check (jsonb_typeof(identity)='object');

update public.portal_settings set identity=jsonb_build_object(
  'portalName','Web Imóvel','slogan','Classificados & Gestão Imobiliária',
  'primaryColor','#e11d48','secondaryColor','#4f46e5','accentColor','#d97706',
  'logoUrl','','logoPath','','faviconUrl','','faviconPath','',
  'heroImageUrl','','heroImagePath','','shareImageUrl','','shareImagePath',''
) where id='default' and identity='{}'::jsonb;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('portal-assets','portal-assets',true,3145728,array['image/jpeg','image/png','image/webp','image/avif'])
on conflict(id) do update set public=true,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "public reads portal assets" on storage.objects;
create policy "public reads portal assets" on storage.objects for select to public using(bucket_id='portal-assets');
drop policy if exists "administrators upload portal assets" on storage.objects;
create policy "administrators upload portal assets" on storage.objects for insert to authenticated with check(bucket_id='portal-assets' and public.is_admin());
drop policy if exists "administrators update portal assets" on storage.objects;
create policy "administrators update portal assets" on storage.objects for update to authenticated using(bucket_id='portal-assets' and public.is_admin()) with check(bucket_id='portal-assets' and public.is_admin());
drop policy if exists "administrators delete portal assets" on storage.objects;
create policy "administrators delete portal assets" on storage.objects for delete to authenticated using(bucket_id='portal-assets' and public.is_admin());
