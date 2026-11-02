begin;

create or replace function public.audit_partnership_membership_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
begin
  -- During account deletion the profile can already have been removed by the
  -- auth cascade. Preserve the audit event with an anonymous actor.
  if v_actor is not null and not exists (select 1 from public.profiles where id = v_actor) then
    v_actor := null;
  end if;
  insert into public.partnership_network_events(
    actor_id, participant_ids, entity_type, entity_id, action, previous_data, current_data
  ) values (
    v_actor, array[coalesce(new.profile_id, old.profile_id)], 'membership',
    coalesce(new.profile_id, old.profile_id), lower(tg_op),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );
  return coalesce(new, old);
end;
$$;

commit;
