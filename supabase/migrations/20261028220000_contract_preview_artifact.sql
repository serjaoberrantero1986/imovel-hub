begin;

alter table public.deal_contract_versions
  add column if not exists preview_pdf_path text,
  add column if not exists preview_pdf_hash text,
  add column if not exists preview_generated_at timestamptz;

comment on column public.deal_contract_versions.preview_pdf_path is 'Caminho privado do PDF integral previamente conferido pelo profissional.';
comment on column public.deal_contract_versions.preview_pdf_hash is 'SHA-256 do PDF conferido e reutilizado no envio para revisão.';
comment on column public.deal_contract_versions.preview_generated_at is 'Data de geração da prévia integral desta versão imutável.';

commit;
