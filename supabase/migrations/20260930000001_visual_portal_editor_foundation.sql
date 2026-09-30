-- Foundation for private, per-portal visual editing. The current public portal
-- remains on its existing configuration until subdomain resolution is introduced.
alter table public.portal_settings
  add column if not exists visual_draft jsonb not null default '{}'::jsonb,
  add column if not exists visual_published jsonb not null default '{}'::jsonb;

alter table public.portal_settings
  drop constraint if exists portal_settings_visual_draft_object_check,
  drop constraint if exists portal_settings_visual_published_object_check;

alter table public.portal_settings
  add constraint portal_settings_visual_draft_object_check check (jsonb_typeof(visual_draft) = 'object'),
  add constraint portal_settings_visual_published_object_check check (jsonb_typeof(visual_published) = 'object');

-- Do not expose drafts through the old broad read policy. The existing default
-- institutional portal remains public; future tenant portals will be read by a
-- dedicated public resolver that returns only visual_published.
drop policy if exists "everyone reads portal settings" on public.portal_settings;
create policy "everyone reads default portal settings" on public.portal_settings
  for select to anon, authenticated
  using (id = 'default');

-- The administrator continues to manage the default institutional portal. A
-- broker or agency can only create and manage the row owned by their own profile.
drop policy if exists "portal owners create their settings" on public.portal_settings;
create policy "portal owners create their settings" on public.portal_settings
  for insert to authenticated
  with check (
    owner_profile_id = auth.uid()
    and id = auth.uid()::text
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('broker', 'agency')
    )
  );

drop policy if exists "portal owners update their settings" on public.portal_settings;
create policy "portal owners update their settings" on public.portal_settings
  for update to authenticated
  using (owner_profile_id = auth.uid())
  with check (owner_profile_id = auth.uid() and id = auth.uid()::text);

drop policy if exists "portal owners delete their settings" on public.portal_settings;
create policy "portal owners delete their settings" on public.portal_settings
  for delete to authenticated
  using (owner_profile_id = auth.uid());

drop policy if exists "portal owners read their settings" on public.portal_settings;
create policy "portal owners read their settings" on public.portal_settings
  for select to authenticated
  using (owner_profile_id = auth.uid());

comment on column public.portal_settings.visual_draft is 'Private visual configuration saved by a portal owner before publication.';
comment on column public.portal_settings.visual_published is 'Published visual configuration to be resolved by the portal subdomain.';
