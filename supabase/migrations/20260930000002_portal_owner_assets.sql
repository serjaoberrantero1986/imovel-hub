-- Portal owners may manage only the optimized visual assets stored below their
-- own profile id. Public reading remains enabled by the existing bucket policy.
drop policy if exists "portal owners upload their assets" on storage.objects;
create policy "portal owners upload their assets" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'portal-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('broker', 'agency')
    )
  );

drop policy if exists "portal owners update their assets" on storage.objects;
create policy "portal owners update their assets" on storage.objects
  for update to authenticated
  using (bucket_id = 'portal-assets' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'portal-assets' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "portal owners delete their assets" on storage.objects;
create policy "portal owners delete their assets" on storage.objects
  for delete to authenticated
  using (bucket_id = 'portal-assets' and (storage.foldername(name))[1] = auth.uid()::text);
