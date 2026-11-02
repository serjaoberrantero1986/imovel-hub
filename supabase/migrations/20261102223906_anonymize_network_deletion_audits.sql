begin;

create or replace function public.audit_partnership_connection_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid();
begin
  if v_actor is not null and not exists (select 1 from public.profiles where id = v_actor) then v_actor := null; end if;
  insert into public.partnership_network_events(
    actor_id, participant_ids, entity_type, entity_id, action, previous_data, current_data
  ) values (
    v_actor,
    array[coalesce(new.requester_id, old.requester_id), coalesce(new.recipient_id, old.recipient_id)],
    'connection', coalesce(new.id, old.id), lower(tg_op),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );
  return coalesce(new, old);
end;
$$;

create or replace function public.audit_partnership_report_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid();
begin
  if v_actor is not null and not exists (select 1 from public.profiles where id = v_actor) then v_actor := null; end if;
  insert into public.partnership_network_events(
    actor_id, participant_ids, entity_type, entity_id, action, previous_data, current_data
  ) values (
    v_actor,
    array_remove(array[coalesce(new.reporter_id, old.reporter_id), coalesce(new.reported_profile_id, old.reported_profile_id)], null),
    'report', coalesce(new.id, old.id), lower(tg_op),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );
  return coalesce(new, old);
end;
$$;

commit;
