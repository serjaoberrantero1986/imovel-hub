begin;

create or replace function public.store_supersign_webhook_secret(p_secret text)
returns void language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if current_user not in('service_role','postgres') then raise exception 'DEAL_ACCESS_DENIED';end if;
 if p_secret is null or char_length(p_secret)<20 then raise exception 'DEAL_SECRET_INVALID';end if;
 select id into v_id from vault.secrets where name='supersign_webhook_secret';
 if v_id is null then perform vault.create_secret(p_secret,'supersign_webhook_secret','HMAC do webhook SuperSign Sandbox',null);else perform vault.update_secret(v_id,p_secret,'supersign_webhook_secret','HMAC do webhook SuperSign Sandbox',null);end if;
end;$$;
revoke all on function public.store_supersign_webhook_secret(text) from public,anon,authenticated;grant execute on function public.store_supersign_webhook_secret(text) to service_role;

create or replace function public.get_supersign_webhook_secret()
returns text language plpgsql security definer set search_path='' as $$
declare v_secret text;
begin
 if current_user not in('service_role','postgres') then raise exception 'DEAL_ACCESS_DENIED';end if;
 select decrypted_secret into v_secret from vault.decrypted_secrets where name='supersign_webhook_secret' order by created_at desc limit 1;
 return v_secret;
end;$$;
revoke all on function public.get_supersign_webhook_secret() from public,anon,authenticated;grant execute on function public.get_supersign_webhook_secret() to service_role;

commit;
