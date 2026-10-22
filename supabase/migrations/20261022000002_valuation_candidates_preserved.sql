-- Histórico de candidatos capturados ANTES de qualquer triagem.
-- Um anúncio sem URL/preço continua disponível para conferência, mas não entra no indicador.
create table if not exists public.valuation_candidates (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null,
  owner_id uuid not null,
  source_name text not null,
  source_key text not null,
  listing_url text,
  listing_title text not null default '',
  captured_data jsonb not null default '{}'::jsonb,
  normalized_data jsonb not null default '{}'::jsonb,
  reviewed_by_broker boolean not null default false,
  review_note text not null default '',
  excluded_by_broker boolean not null default false,
  exclusion_reason text not null default '',
  collected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valuation_candidates_owner_fk
    foreign key (assessment_id,owner_id)
    references public.valuation_assessments(id,owner_id) on delete cascade,
  constraint valuation_candidates_source_check
    check (char_length(source_name) between 2 and 120 and char_length(source_key) between 1 and 300),
  constraint valuation_candidates_title_check check (char_length(listing_title) <= 250),
  constraint valuation_candidates_url_check check (listing_url is null or
    (char_length(listing_url)<=2000 and listing_url ~* '^https://[^[:space:]]+$')),
  constraint valuation_candidates_notes_check check (
    char_length(review_note)<=1500 and char_length(exclusion_reason)<=500),
  constraint valuation_candidates_payload_check check (
    pg_column_size(captured_data)<40000 and pg_column_size(normalized_data)<15000),
  constraint valuation_candidates_unique_source unique(assessment_id,source_name,source_key)
);
create index if not exists valuation_candidates_owner_lookup
  on public.valuation_candidates(assessment_id,owner_id,collected_at desc);
alter table public.valuation_candidates enable row level security;
revoke all on public.valuation_candidates from anon;
grant select,insert,update,delete on public.valuation_candidates to authenticated;
drop policy if exists "Candidatos: leitura do titular" on public.valuation_candidates;
create policy "Candidatos: leitura do titular" on public.valuation_candidates
  for select to authenticated using (
    owner_id=(select auth.uid()) and
    public.can_manage_my_valuations(owner_id)
  );
drop policy if exists "Candidatos: inserção do titular" on public.valuation_candidates;
create policy "Candidatos: inserção do titular" on public.valuation_candidates
  for insert to authenticated with check (
    owner_id=(select auth.uid()) and
    public.can_manage_my_valuations(owner_id)
  );
drop policy if exists "Candidatos: alteração do titular" on public.valuation_candidates;
create policy "Candidatos: alteração do titular" on public.valuation_candidates
  for update to authenticated using (
    owner_id=(select auth.uid()) and public.can_manage_my_valuations(owner_id)
  ) with check (
    owner_id=(select auth.uid()) and public.can_manage_my_valuations(owner_id)
  );
drop policy if exists "Candidatos: exclusão do titular" on public.valuation_candidates;
create policy "Candidatos: exclusão do titular" on public.valuation_candidates
  for delete to authenticated using (
    owner_id=(select auth.uid()) and public.can_manage_my_valuations(owner_id)
  );
comment on table public.valuation_candidates is
 'Candidatos de pesquisa preservados; não equivalem a comparáveis elegíveis ou validados.';
