-- Bank marketing pages commonly reject server-side reads. Keep them as editable
-- references and automate the comparable rates through the official BCB feed.
update public.mortgage_rate_sources
   set automatic = (source_type = 'bcb_odata'),
       last_status = case when source_type = 'bcb_odata' then 'pending' else 'disabled' end,
       last_message = case
         when source_type = 'bcb_odata' then null
         else 'Referência mantida para conferência manual; a atualização semanal usa o Banco Central.'
       end
 where automatic is distinct from (source_type = 'bcb_odata')
    or last_status in ('failed', 'review');
