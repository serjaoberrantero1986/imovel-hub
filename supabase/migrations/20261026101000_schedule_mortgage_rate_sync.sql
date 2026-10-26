-- Segunda-feira às 06:00 no horário de Brasília (09:00 UTC).
-- Reutiliza os segredos `project_url` e `service_role_key` do Vault, sem gravá-los no código.
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

do $$
begin
  if exists(select 1 from cron.job where jobname='weekly-mortgage-rate-sync') then
    perform cron.unschedule('weekly-mortgage-rate-sync');
  end if;
end $$;

select cron.schedule(
  'weekly-mortgage-rate-sync',
  '0 9 * * 1',
  $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name='project_url' order by created_at desc limit 1) || '/functions/v1/update-mortgage-rates',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='service_role_key' order by created_at desc limit 1)
    ),
    body := '{"scheduled":true}'::jsonb,
    timeout_milliseconds := 60000
  );
  $job$
);
