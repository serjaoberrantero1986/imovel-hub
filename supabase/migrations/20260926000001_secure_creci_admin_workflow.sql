begin;

-- Keep this migration self-contained: some production installations predate
-- the migration that originally introduced this helper.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'::public.user_role
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- Public signup metadata can never bootstrap an administrator account.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_role public.user_role;
  v_name text;
  v_profile_id uuid;
begin
  v_name := coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), split_part(new.email, '@', 1));
  v_role := case when new.raw_user_meta_data->>'role' = 'broker' then 'broker'::public.user_role else 'buyer'::public.user_role end;
  insert into public.profiles(id, email, name, phone, role, avatar_url)
  values (new.id, new.email, v_name, new.raw_user_meta_data->>'phone', v_role, new.raw_user_meta_data->>'avatar_url')
  returning id into v_profile_id;
  if v_role = 'broker' then
    insert into public.crm_pipeline_stages(broker_id, title, stage_key, color, display_order, is_won_stage, is_lost_stage)
    values
      (v_profile_id, 'Novos Leads', 'new', '#3b82f6', 1, false, false),
      (v_profile_id, 'Em Atendimento', 'in_contact', '#6366f1', 2, false, false),
      (v_profile_id, 'Visita Agendada', 'visit_scheduled', '#eab308', 3, false, false),
      (v_profile_id, 'Proposta Enviada', 'proposal_sent', '#f97316', 4, false, false),
      (v_profile_id, 'Fechamento / Ganho', 'won', '#10b981', 5, true, false),
      (v_profile_id, 'Perdido', 'lost', '#ef4444', 6, false, true);
  end if;
  return new;
end;
$$;

-- Profile identity and privilege fields are never writable directly from a browser.
drop policy if exists "profiles_update_policy" on public.profiles;
drop policy if exists "Users can update own profile or admin" on public.profiles;
drop policy if exists "profiles_insert_policy" on public.profiles;
drop policy if exists "Enable insert for authenticated users only" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;

revoke insert, update, delete on public.profiles from public, anon, authenticated;

-- Normal profile editing remains available only through its explicit allowlist RPC.
alter function public.save_my_profile(jsonb, jsonb) security definer;

create policy "users read own profile updates"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

alter table public.profiles add column if not exists creci_review_status text not null default 'not_requested'
  check (creci_review_status in ('not_requested', 'pending', 'approved', 'rejected', 'expired'));
alter table public.profiles add column if not exists creci_reviewed_at timestamptz;
alter table public.profiles add column if not exists creci_review_expires_at timestamptz;

create table if not exists public.creci_review_records (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  reviewer_id uuid references public.profiles(id) on delete set null,
  decision text not null check (decision in ('pending', 'approved', 'rejected')),
  note text,
  updated_at timestamptz not null default now()
);
alter table public.creci_review_records enable row level security;
revoke all on public.creci_review_records from public, anon, authenticated;
grant select on public.creci_review_records to authenticated;
drop policy if exists "profile or admin reads creci review record" on public.creci_review_records;
create policy "profile or admin reads creci review record" on public.creci_review_records
  for select to authenticated using (profile_id = (select auth.uid()) or public.is_admin());

create table if not exists public.creci_verification_documents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  document_kind text not null check (document_kind in ('cirp', 'regularity_certificate')),
  created_at timestamptz not null default now()
);
alter table public.creci_verification_documents enable row level security;
revoke all on public.creci_verification_documents from public, anon, authenticated;
grant select, insert, delete on public.creci_verification_documents to authenticated;

create or replace function public.guard_profile_verification_fields()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return new; end if;
  if current_setting('app.creci_review_write', true) = 'on' then return new; end if;
  if auth.uid() = old.id then
    new.id := old.id;
    new.email := old.email;
    new.role := old.role;
    new.verified := old.verified;
    new.creci_review_status := old.creci_review_status;
    new.creci_reviewed_at := old.creci_reviewed_at;
    new.creci_review_expires_at := old.creci_review_expires_at;
    if new.creci is distinct from old.creci
       or new.creci_uf is distinct from old.creci_uf
       or new.creci_type is distinct from old.creci_type then
      new.verified := false;
      new.creci_status := 'pending';
      new.creci_review_status := 'not_requested';
      new.creci_reviewed_at := null;
      new.creci_review_expires_at := null;
    else
      new.creci_status := old.creci_status;
    end if;
    return new;
  end if;
  if not public.is_admin() then
    raise exception 'Only an administrator may review CRECI credentials';
  end if;
  return new;
end;
$$;

alter table public.creci_verification_documents
  add column if not exists original_name text not null default 'documento',
  add column if not exists mime_type text not null default 'application/octet-stream',
  add column if not exists file_size bigint not null default 0 check (file_size between 0 and 8388608);

drop policy if exists "user manages own creci evidence" on public.creci_verification_documents;
create policy "user reads own creci evidence" on public.creci_verification_documents
  for select to authenticated using (profile_id = (select auth.uid()));
create policy "admin reads creci evidence" on public.creci_verification_documents
  for select to authenticated using (public.is_admin());
create policy "user inserts own creci evidence" on public.creci_verification_documents
  for insert to authenticated with check (
    profile_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('broker', 'agency'))
  );
create policy "user deletes unlocked creci evidence" on public.creci_verification_documents
  for delete to authenticated using (
    profile_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.creci_review_status in ('not_requested', 'rejected', 'expired'))
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('creci-verification', 'creci-verification', false, 8388608, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "owners upload creci documents" on storage.objects;
drop policy if exists "owners read creci documents" on storage.objects;
drop policy if exists "admins read creci documents" on storage.objects;
drop policy if exists "owners delete unlocked creci documents" on storage.objects;
create policy "owners upload creci documents" on storage.objects for insert to authenticated
  with check (bucket_id = 'creci-verification' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "owners read creci documents" on storage.objects for select to authenticated
  using (bucket_id = 'creci-verification' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "admins read creci documents" on storage.objects for select to authenticated
  using (bucket_id = 'creci-verification' and public.is_admin());
create policy "owners delete unlocked creci documents" on storage.objects for delete to authenticated
  using (
    bucket_id = 'creci-verification'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.creci_review_status in ('not_requested', 'rejected', 'expired'))
  );

create table if not exists public.creci_review_audit (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete restrict,
  decision text not null check (decision in ('approved', 'rejected')),
  note text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.creci_review_audit enable row level security;
revoke all on public.creci_review_audit from public, anon, authenticated;
grant select on public.creci_review_audit to authenticated;
create policy "admins read creci audit" on public.creci_review_audit for select to authenticated using (public.is_admin());
create policy "owners read own creci audit" on public.creci_review_audit for select to authenticated using (profile_id = (select auth.uid()));

create or replace function public.request_my_creci_review()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_profile public.profiles%rowtype;
begin
  select * into v_profile from public.profiles where id = auth.uid() for update;
  if not found then raise exception 'Authentication required'; end if;
  if v_profile.role not in ('broker', 'agency') then raise exception 'Only real-estate professionals may request review'; end if;
  if v_profile.creci_review_status = 'pending' then raise exception 'A review is already pending'; end if;
  if nullif(trim(v_profile.creci), '') is null or nullif(trim(v_profile.creci_uf), '') is null then
    raise exception 'Provide CRECI number and state before requesting review';
  end if;
  if not exists (select 1 from public.creci_verification_documents d where d.profile_id = auth.uid()) then
    raise exception 'Attach at least one verification document';
  end if;
  perform set_config('app.creci_review_write', 'on', true);
  update public.profiles set verified = false, creci_status = 'pending',
    creci_review_status = 'pending', creci_reviewed_at = null,
    creci_review_expires_at = null, updated_at = now()
  where id = auth.uid() returning * into v_profile;
  insert into public.creci_review_records(profile_id, reviewer_id, decision, note)
  values (auth.uid(), null, 'pending', null)
  on conflict (profile_id) do update set reviewer_id = null, decision = 'pending', note = null, updated_at = now();
  return to_jsonb(v_profile);
end;
$$;
revoke all on function public.request_my_creci_review() from public, anon;
grant execute on function public.request_my_creci_review() to authenticated;

create or replace function public.review_creci_request(
  p_profile_id uuid, p_approved boolean, p_note text default null, p_expires_at timestamptz default null
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Only an administrator may review CRECI credentials'; end if;
  if not exists (select 1 from public.profiles p where p.id = p_profile_id and p.creci_review_status = 'pending') then
    raise exception 'Pending request not found';
  end if;
  if not exists (select 1 from public.creci_verification_documents d where d.profile_id = p_profile_id) then
    raise exception 'The request has no verification document';
  end if;
  if not p_approved and nullif(trim(p_note), '') is null then raise exception 'A rejection reason is required'; end if;
  perform set_config('app.creci_review_write', 'on', true);
  update public.profiles set verified = p_approved,
    creci_status = case when p_approved then 'verified' else 'invalid' end,
    creci_review_status = case when p_approved then 'approved' else 'rejected' end,
    creci_reviewed_at = now(), creci_review_expires_at = case when p_approved then p_expires_at else null end,
    updated_at = now() where id = p_profile_id;
  insert into public.creci_review_records(profile_id, reviewer_id, decision, note)
  values (p_profile_id, auth.uid(), case when p_approved then 'approved' else 'rejected' end, left(nullif(trim(p_note), ''), 1000))
  on conflict (profile_id) do update set reviewer_id = excluded.reviewer_id, decision = excluded.decision,
    note = excluded.note, updated_at = now();
  insert into public.creci_review_audit(profile_id, reviewer_id, decision, note, expires_at)
  values (p_profile_id, auth.uid(), case when p_approved then 'approved' else 'rejected' end, left(nullif(trim(p_note), ''), 1000), case when p_approved then p_expires_at else null end);
end;
$$;
revoke all on function public.review_creci_request(uuid, boolean, text, timestamptz) from public, anon;
grant execute on function public.review_creci_request(uuid, boolean, text, timestamptz) to authenticated;

create or replace function public.get_pending_creci_reviews()
returns table(profile_id uuid, name text, email text, creci text, creci_uf text, requested_at timestamptz, documents jsonb)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  return query
  select p.id, p.name::text, p.email::text, p.creci::text, p.creci_uf::text, r.updated_at,
    coalesce(jsonb_agg(jsonb_build_object(
      'id', d.id, 'profile_id', d.profile_id, 'storage_path', d.storage_path,
      'document_kind', d.document_kind, 'original_name', d.original_name,
      'mime_type', d.mime_type, 'file_size', d.file_size, 'created_at', d.created_at
    ) order by d.created_at) filter (where d.id is not null), '[]'::jsonb)
  from public.profiles p
  join public.creci_review_records r on r.profile_id = p.id and r.decision = 'pending'
  left join public.creci_verification_documents d on d.profile_id = p.id
  where p.creci_review_status = 'pending'
  group by p.id, p.name, p.email, p.creci, p.creci_uf, r.updated_at
  order by r.updated_at;
end;
$$;
revoke all on function public.get_pending_creci_reviews() from public, anon;
grant execute on function public.get_pending_creci_reviews() to authenticated;

notify pgrst, 'reload schema';
commit;
