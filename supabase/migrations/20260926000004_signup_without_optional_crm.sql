begin;

-- Account creation must never depend on optional CRM modules. The visible
-- funnel already has its application stages; installations without the legacy
-- crm_pipeline_stages table can therefore register buyers and brokers normally.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role;
  v_name text;
begin
  v_name := coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), split_part(new.email, '@', 1));
  v_role := case
    when new.raw_user_meta_data->>'role' = 'broker' then 'broker'::public.user_role
    else 'buyer'::public.user_role
  end;

  insert into public.profiles(id, email, name, phone, role, avatar_url, creci)
  values (
    new.id,
    lower(new.email),
    v_name,
    nullif(trim(new.raw_user_meta_data->>'phone'), ''),
    v_role,
    nullif(trim(new.raw_user_meta_data->>'avatar_url'), ''),
    case when v_role = 'broker'::public.user_role then nullif(trim(new.raw_user_meta_data->>'creci'), '') else null end
  );
  return new;
end;
$$;

notify pgrst, 'reload schema';
commit;
