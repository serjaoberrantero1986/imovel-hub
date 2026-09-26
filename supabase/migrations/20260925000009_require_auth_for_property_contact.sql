begin;

-- Portal messages and visit requests require an authenticated participant so
-- every conversation and message keeps its existing buyer/sender identity.
revoke execute on function public.submit_property_contact(uuid, text, text, text, text, text) from public, anon;
grant execute on function public.submit_property_contact(uuid, text, text, text, text, text) to authenticated;

notify pgrst, 'reload schema';
commit;
