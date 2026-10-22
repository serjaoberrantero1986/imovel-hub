begin;

-- Áreas declaradas separadamente. Zero em imóveis antigos continua significando
-- "não informado", não é convertido nem corrigido automaticamente.
alter table public.properties
  add column if not exists built_area numeric(10,2);
alter table public.properties
  drop constraint if exists chk_properties_built_area;
alter table public.properties
  add constraint chk_properties_built_area check (built_area is null or built_area > 0);
comment on column public.properties.built_area is
  'Área construída informada pelo profissional. Não inferir a partir de área útil nem da área total/terreno.';

-- Proveniência e decisões do corretor permanecem privadas pela RLS já existente.
alter table public.valuation_comparables
  add column if not exists usable_area numeric(12,2),
  add column if not exists total_area numeric(12,2),
  add column if not exists listing_title text not null default '',
  add column if not exists listing_city text not null default '',
  add column if not exists listing_state text not null default '',
  add column if not exists listing_neighborhood text not null default '',
  add column if not exists offer_purpose text not null default 'unknown',
  add column if not exists excluded_by_broker boolean not null default false,
  add column if not exists exclusion_reason text not null default '',
  add column if not exists collected_at timestamptz;

alter table public.valuation_comparables
  drop constraint if exists valuation_comparables_usable_area_check,
  add constraint valuation_comparables_usable_area_check check (usable_area is null or usable_area > 0),
  drop constraint if exists valuation_comparables_total_area_check,
  add constraint valuation_comparables_total_area_check check (total_area is null or total_area > 0),
  drop constraint if exists valuation_comparables_offer_purpose_check,
  add constraint valuation_comparables_offer_purpose_check check (offer_purpose in ('sale','rent','unknown')),
  drop constraint if exists valuation_comparables_listing_text_length_check,
  add constraint valuation_comparables_listing_text_length_check check (
    char_length(listing_title)<=250 and char_length(listing_city)<=120 and
    char_length(listing_state)<=2 and char_length(listing_neighborhood)<=120 and
    char_length(exclusion_reason)<=500
  );

create index if not exists valuation_comparables_assessment_listing_idx
 on public.valuation_comparables (assessment_id, source_name, listing_reference);

comment on column public.valuation_comparables.excluded_by_broker is
  'Decisão manual do titular da avaliação, separada da elegibilidade automática.';
comment on column public.valuation_comparables.offer_purpose is
  'Finalidade identificada da oferta; unknown não significa venda confirmada.';
comment on column public.valuation_comparables.collected_at is
  'Momento da captura pela pesquisa, não a data de publicação do anúncio.';

commit;
