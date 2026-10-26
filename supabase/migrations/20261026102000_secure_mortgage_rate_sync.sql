-- Keep the weekly rate updater independent from the project's service-role key.
do $$
begin
  if not exists (select 1 from vault.decrypted_secrets where name = 'mortgage_rate_sync_secret') then
    perform vault.create_secret(gen_random_uuid()::text, 'mortgage_rate_sync_secret', 'Authentication for the weekly mortgage-rate updater');
  end if;
end;
$$;

create or replace function public.verify_mortgage_rate_sync_secret(candidate text)
returns boolean
language sql
security definer
set search_path = vault, pg_temp
as $$
  select exists (
    select 1
      from vault.decrypted_secrets
     where name = 'mortgage_rate_sync_secret'
       and decrypted_secret = candidate
  );
$$;

revoke all on function public.verify_mortgage_rate_sync_secret(text) from public, anon, authenticated;
grant execute on function public.verify_mortgage_rate_sync_secret(text) to service_role;

select cron.unschedule(jobid)
  from cron.job
 where jobname = 'weekly-mortgage-rate-sync';

select cron.schedule(
  'weekly-mortgage-rate-sync',
  '0 9 * * 1',
  $job$
  select net.http_post(
    url := 'https://mpqitqzcksusgbheiynz.supabase.co/functions/v1/update-mortgage-rates',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-mortgage-cron-secret', (
        select decrypted_secret
          from vault.decrypted_secrets
         where name = 'mortgage_rate_sync_secret'
         limit 1
      )
    ),
    body := '{"trigger":"scheduled"}'::jsonb
  );
  $job$
);
