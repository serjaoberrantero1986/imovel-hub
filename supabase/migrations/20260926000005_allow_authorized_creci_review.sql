-- Preserve client-side privilege protection while allowing the two audited
-- SECURITY DEFINER CRECI workflows to update protected profile fields.
create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $function$
begin
  if current_setting('app.creci_review_write', true) = 'on' then
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'A função do perfil não pode ser alterada pelo cliente.';
  end if;

  if new.verified is distinct from old.verified then
    raise exception 'A verificação do perfil não pode ser alterada pelo cliente.';
  end if;

  if new.email is distinct from old.email then
    raise exception 'O e-mail é gerenciado pelo Supabase Auth.';
  end if;

  return new;
end;
$function$;

create or replace function public.request_my_creci_review()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_profile public.profiles%rowtype;
begin
  select * into v_profile from public.profiles where id = auth.uid() for update;
  if not found then raise exception 'Autenticação necessária'; end if;
  if v_profile.role not in ('broker', 'agency') then raise exception 'Somente profissionais imobiliários podem solicitar análise'; end if;
  if v_profile.creci_review_status = 'pending' then raise exception 'Já existe uma análise pendente'; end if;
  if nullif(trim(v_profile.creci), '') is null or nullif(trim(v_profile.creci_uf), '') is null then
    raise exception 'Informe o número e a UF do CRECI antes de solicitar a análise';
  end if;
  if not exists (
    select 1 from public.creci_verification_documents d
    where d.profile_id = auth.uid() and d.document_kind = 'cirp'
  ) then
    raise exception 'Anexe a CIRP antes de solicitar a análise';
  end if;

  perform set_config('app.creci_review_write', 'on', true);
  update public.profiles
  set verified = false,
      creci_status = 'pending',
      creci_review_status = 'pending',
      creci_reviewed_at = null,
      creci_review_expires_at = null,
      updated_at = now()
  where id = auth.uid()
  returning * into v_profile;

  insert into public.creci_review_records(profile_id, reviewer_id, decision, note)
  values (auth.uid(), null, 'pending', null)
  on conflict (profile_id) do update
  set reviewer_id = null, decision = 'pending', note = null, updated_at = now();

  return to_jsonb(v_profile);
end;
$function$;

revoke all on function public.request_my_creci_review() from public, anon;
grant execute on function public.request_my_creci_review() to authenticated;
