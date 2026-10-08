-- Preserve configuration audit history when the acting profile is being deleted.
-- Cascading updates (such as portal_settings.owner_profile_id -> null) can fire
-- audit triggers after the profile is no longer available to satisfy the audit FK.

begin;

create or replace function public.audit_feature_configuration()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_action text;
  v_administrator_id uuid;
begin
  select p.id
    into v_administrator_id
    from public.profiles p
   where p.id = auth.uid();

  if tg_op = 'INSERT' then
    v_action := 'created';
  elsif tg_op = 'DELETE' then
    v_action := 'deleted';
  elsif new.is_active is distinct from old.is_active then
    v_action := case when new.is_active then 'enabled' else 'disabled' end;
  else
    v_action := 'updated';
  end if;

  insert into public.admin_configuration_audit(
    administrator_id, resource_type, resource_id, action, previous_value, new_value
  ) values (
    v_administrator_id,
    'amenity',
    case when tg_op = 'DELETE' then old.id else new.id end,
    v_action,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$function$;

create or replace function public.audit_property_type_configuration()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_action text;
  v_administrator_id uuid;
begin
  select p.id
    into v_administrator_id
    from public.profiles p
   where p.id = auth.uid();

  if tg_op = 'INSERT' then
    v_action := 'created';
  elsif tg_op = 'DELETE' then
    v_action := 'deleted';
  elsif new.is_active is distinct from old.is_active then
    v_action := case when new.is_active then 'enabled' else 'disabled' end;
  else
    v_action := 'updated';
  end if;

  insert into public.admin_configuration_audit(
    administrator_id, resource_type, resource_id, action, previous_value, new_value
  ) values (
    v_administrator_id,
    'property_type',
    case when tg_op = 'DELETE' then old.id else new.id end,
    v_action,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$function$;

create or replace function public.audit_portal_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_administrator_id uuid;
begin
  select p.id
    into v_administrator_id
    from public.profiles p
   where p.id = auth.uid();

  insert into public.admin_configuration_audit(
    administrator_id, resource_type, resource_id, action, previous_value, new_value
  ) values (
    v_administrator_id,
    'portal_settings',
    case when tg_op = 'DELETE' then old.id else new.id end,
    case when tg_op = 'INSERT' then 'created' when tg_op = 'DELETE' then 'deleted' else 'updated' end,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$function$;

commit;
