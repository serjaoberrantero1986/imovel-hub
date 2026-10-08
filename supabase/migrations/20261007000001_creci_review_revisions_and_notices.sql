begin;

-- Older installations may not have the notifications module. Bootstrap only
-- its canonical dependencies, without requiring chat tables or touching data.
do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_type t
    join pg_catalog.pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'notification_type'
  ) then
    create type public.notification_type as enum (
      'lead_received', 'visit_scheduled', 'proposal_received',
      'property_approved', 'price_change', 'chat_message', 'system_alert'
    );
  end if;
end;
$$;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type public.notification_type not null,
  title varchar(150) not null,
  message text not null,
  link text,
  data jsonb default '{}'::jsonb,
  read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_user_unread
  on public.notifications(user_id, created_at desc) where read = false;
create index if not exists idx_notifications_creci_review
  on public.notifications(user_id, created_at desc) where data->>'scope' = 'creci_review';

alter table public.notifications enable row level security;
drop policy if exists "owners read persistent creci notices" on public.notifications;
create policy "owners read persistent creci notices" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "MFA protects persistent creci notices" on public.notifications;
create policy "MFA protects persistent creci notices" on public.notifications
  as restrictive for all to authenticated
  using (public.has_satisfied_mfa()) with check (public.has_satisfied_mfa());

-- Saving changed credentials invalidates approval but is not a submitted review.
-- This avoids locking documents and rejecting the explicit request immediately
-- after its own profile save.
create or replace function public.guard_profile_verification_fields()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return new; end if;
  if current_setting('app.creci_review_write', true) = 'on' then return new; end if;
  if auth.uid() = old.id then
    new.verified := old.verified;
    new.creci_review_status := old.creci_review_status;
    new.creci_reviewed_at := old.creci_reviewed_at;
    new.creci_review_expires_at := old.creci_review_expires_at;
    if new.creci is distinct from old.creci or new.creci_uf is distinct from old.creci_uf or new.creci_type is distinct from old.creci_type then
      if old.creci_review_status = 'pending' and exists (select 1 from public.creci_review_records r where r.profile_id = old.id and r.decision = 'pending') then
        raise exception 'Aguarde a análise antes de alterar seu registro';
      end if;
      new.verified := false;
      new.creci_status := 'pending';
      new.creci_review_status := 'not_requested';
      new.creci_reviewed_at := null;
      new.creci_review_expires_at := null;
    else new.creci_status := old.creci_status;
    end if;
    return new;
  end if;
  if not public.is_admin() then raise exception 'Acesso administrativo necessário'; end if;
  return new;
end;
$$;

create or replace function public.request_my_creci_review()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_profile public.profiles%rowtype;
begin
  if not public.has_satisfied_mfa() then raise exception 'Autenticação necessária'; end if;
  select * into v_profile from public.profiles where id = auth.uid() for update;
  if not found then raise exception 'Autenticação necessária'; end if;
  if v_profile.role not in ('broker', 'agency') then raise exception 'Somente profissionais imobiliários podem solicitar análise'; end if;
  if v_profile.creci_review_status = 'pending' and exists (select 1 from public.creci_review_records r where r.profile_id = auth.uid() and r.decision = 'pending') then
    raise exception 'Já existe uma análise pendente';
  end if;
  if nullif(trim(v_profile.creci), '') is null or nullif(trim(v_profile.creci_uf), '') is null then raise exception 'Informe o número e a UF do CRECI'; end if;
  if not exists (select 1 from public.creci_verification_documents d where d.profile_id = auth.uid() and d.document_kind = 'cirp') then
    raise exception 'Anexe a CIRP antes de solicitar a análise';
  end if;
  perform set_config('app.creci_review_write', 'on', true);
  update public.profiles set verified = false, creci_status = 'pending', creci_review_status = 'pending',
    creci_reviewed_at = null, creci_review_expires_at = null, updated_at = now()
    where id = auth.uid() returning * into v_profile;
  insert into public.creci_review_records(profile_id, reviewer_id, decision, note)
    values (auth.uid(), null, 'pending', null)
    on conflict (profile_id) do update set reviewer_id = null, decision = 'pending', note = null, updated_at = now();
  return to_jsonb(v_profile);
end;
$$;
revoke all on function public.request_my_creci_review() from public, anon;
grant execute on function public.request_my_creci_review() to authenticated;

-- Administrative tabs reuse the existing decisions, documents and immutable audit.
create or replace function public.get_creci_reviews()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_result jsonb;
begin
  if not public.is_admin() then raise exception 'Acesso administrativo necessário'; end if;
  select coalesce(jsonb_agg(item order by item->>'updated_at' desc), '[]'::jsonb) into v_result
  from (
    select jsonb_build_object(
      'profile_id', p.id, 'name', p.name, 'email', p.email, 'creci', p.creci,
      'creci_uf', p.creci_uf, 'status', p.creci_review_status, 'updated_at', p.updated_at,
      'requested_at', r.updated_at, 'reviewed_at', p.creci_reviewed_at,
      'expires_at', p.creci_review_expires_at,
      'documents', coalesce((select jsonb_agg(to_jsonb(d) order by d.created_at)
        from public.creci_verification_documents d where d.profile_id = p.id), '[]'::jsonb),
      'history', coalesce((select jsonb_agg(jsonb_build_object(
        'id', a.id, 'decision', a.decision, 'note', a.note, 'created_at', a.created_at,
        'reviewer_name', reviewer.name, 'expires_at', a.expires_at
      ) order by a.created_at desc) from public.creci_review_audit a
        left join public.profiles reviewer on reviewer.id = a.reviewer_id
        where a.profile_id = p.id), '[]'::jsonb)
    ) item
    from public.profiles p
    left join public.creci_review_records r on r.profile_id = p.id
    where p.role in ('broker', 'agency') and p.creci_review_status in ('pending', 'approved', 'rejected', 'expired')
      and (p.creci_review_status <> 'pending' or r.decision = 'pending')
  ) rows;
  return v_result;
end;
$$;
revoke all on function public.get_creci_reviews() from public, anon;
grant execute on function public.get_creci_reviews() to authenticated;

create or replace function public.review_creci_decision(
  p_profile_id uuid, p_approved boolean, p_note text, p_expires_at timestamptz,
  p_expected_revision timestamptz
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_profile public.profiles%rowtype;
  v_note text := nullif(trim(p_note), '');
  v_decision text := case when p_approved then 'approved' else 'rejected' end;
begin
  if not public.is_admin() then raise exception 'Acesso administrativo necessário'; end if;
  select * into v_profile from public.profiles where id = p_profile_id for update;
  if p_approved is null then raise exception 'Informe a decisão da análise'; end if;
  if not found or v_profile.role not in ('broker', 'agency') or v_profile.creci_review_status not in ('pending', 'approved', 'rejected', 'expired') then
    raise exception 'Cadastro indisponível para análise';
  end if;
  if p_expected_revision is null or v_profile.updated_at is distinct from p_expected_revision then
    raise exception 'O cadastro foi atualizado. Atualize a lista antes de decidir';
  end if;
  if v_profile.creci_review_status = v_decision then raise exception 'Esta decisão já está registrada'; end if;
  if (not p_approved or v_profile.creci_review_status <> 'pending') and v_note is null then
    raise exception 'Informe a justificativa da decisão';
  end if;
  if length(v_note) > 1000 then raise exception 'A justificativa deve ter até 1000 caracteres'; end if;
  if p_approved and p_expires_at is not null and p_expires_at <= now() then raise exception 'A validade deve ser futura'; end if;
  if p_approved and not exists (select 1 from public.creci_verification_documents d where d.profile_id = p_profile_id and d.document_kind = 'cirp') then
    raise exception 'Anexe a CIRP antes da aprovação';
  end if;
  perform set_config('app.creci_review_write', 'on', true);
  update public.profiles set verified = p_approved,
    creci_status = case when p_approved then 'verified' else 'invalid' end,
    creci_review_status = v_decision, creci_reviewed_at = now(),
    creci_review_expires_at = case when p_approved then p_expires_at else null end,
    updated_at = now() where id = p_profile_id;
  insert into public.creci_review_records(profile_id, reviewer_id, decision, note)
  values (p_profile_id, auth.uid(), v_decision, v_note)
  on conflict (profile_id) do update set reviewer_id = excluded.reviewer_id,
    decision = excluded.decision, note = excluded.note, updated_at = now();
  insert into public.creci_review_audit(profile_id, reviewer_id, decision, note, expires_at)
  values (p_profile_id, auth.uid(), v_decision, v_note, case when p_approved then p_expires_at else null end);
  insert into public.notifications(user_id, type, title, message, link, data)
  values (p_profile_id, 'system_alert',
    case when p_approved then 'Seu registro profissional foi aprovado' else 'Seu registro profissional precisa de correção' end,
    case when p_approved then 'Sua documentação foi aprovada e o selo profissional foi liberado.'
      else 'A aprovação não está ativa. Confira o motivo abaixo, corrija os dados ou documentos e solicite uma nova análise.' end
      || case when v_note is not null then E'\nMotivo: ' || v_note else '' end,
    'profile', jsonb_build_object('scope', 'creci_review', 'decision', v_decision, 'previous_decision', v_profile.creci_review_status));
end;
$$;
revoke all on function public.review_creci_decision(uuid, boolean, text, timestamptz, timestamptz) from public, anon;
grant execute on function public.review_creci_decision(uuid, boolean, text, timestamptz, timestamptz) to authenticated;

-- Preserve the legacy pending-only API, now with the same atomic audit and notice.
create or replace function public.review_creci_request(
  p_profile_id uuid, p_approved boolean, p_note text default null, p_expires_at timestamptz default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare v_revision timestamptz;
begin
  if not public.is_admin() then raise exception 'Acesso administrativo necessário'; end if;
  select updated_at into v_revision from public.profiles
    where id = p_profile_id and creci_review_status = 'pending' for update;
  if not found then raise exception 'Solicitação pendente não encontrada'; end if;
  perform public.review_creci_decision(p_profile_id, p_approved, p_note, p_expires_at, v_revision);
end;
$$;

-- Lock the owner row so concurrent uploads cannot exceed two CIRP images.
create or replace function public.enforce_cirp_image_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  if tg_op = 'DELETE' then
    update public.profiles set updated_at = now() where id = old.profile_id;
    return old;
  end if;
  update public.profiles set updated_at = now() where id = new.profile_id;
  if new.document_kind = 'cirp' and new.mime_type in ('image/jpeg', 'image/png') then
    select count(*) into v_count from public.creci_verification_documents
      where profile_id = new.profile_id and document_kind = 'cirp'
      and mime_type in ('image/jpeg', 'image/png') and id <> new.id;
    if v_count >= 2 then raise exception 'É permitido anexar no máximo duas imagens da CIRP'; end if;
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_cirp_image_limit() from public, anon, authenticated;
drop trigger if exists enforce_cirp_image_limit on public.creci_verification_documents;
create trigger enforce_cirp_image_limit before insert or update or delete on public.creci_verification_documents
  for each row execute function public.enforce_cirp_image_limit();

-- Decision notices are server-authored. A user can acknowledge only their own notice.
revoke insert, update, delete on public.notifications from public, anon, authenticated;
grant select on public.notifications to authenticated;
create or replace function public.mark_my_creci_notification_read(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_satisfied_mfa() then raise exception 'Autenticação necessária'; end if;
  update public.notifications set read = true, read_at = now()
    where id = p_id and user_id = auth.uid() and data->>'scope' = 'creci_review';
  if not found then raise exception 'Aviso não encontrado'; end if;
end;
$$;
revoke all on function public.mark_my_creci_notification_read(uuid) from public, anon;
grant execute on function public.mark_my_creci_notification_read(uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
