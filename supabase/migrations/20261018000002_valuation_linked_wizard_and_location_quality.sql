begin;

-- Keep every evaluation private and associated with the listing owned by its professional.
alter table public.valuation_assessments
  drop constraint if exists valuation_assessments_property_type_check;
alter table public.valuation_assessments
  add constraint valuation_assessments_property_type_check
  check (property_type ~ '^[a-z][a-z0-9_]{0,59}$');
alter table public.valuation_comparables
  drop constraint if exists valuation_comparables_property_type_check;
alter table public.valuation_comparables
  add constraint valuation_comparables_property_type_check
  check (property_type ~ '^[a-z][a-z0-9_]{0,59}$');

alter table public.valuation_assessments
  add column source_property_id uuid references public.properties(id) on delete set null,
  add column property_snapshot jsonb not null default '{}'::jsonb,
  add column advertised_price numeric(14,2) check (advertised_price >= 0);
create index valuation_assessments_source_owner_idx
  on public.valuation_assessments (source_property_id, owner_id, created_at desc);

-- A user cannot link an appraisal to another broker's property, even with a forged client payload.
create or replace function public.guard_valuation_source_property()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.source_property_id is not null and not exists (
    select 1 from public.properties p
    where p.id = new.source_property_id and p.user_id = new.owner_id
  ) then
    raise exception 'O anúncio vinculado não pertence ao titular da avaliação.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_valuation_source_property() from public, anon, authenticated;
create trigger guard_valuation_source_property_before_write
  before insert or update of source_property_id, owner_id on public.valuation_assessments
  for each row execute function public.guard_valuation_source_property();

comment on column public.valuation_assessments.property_snapshot is
  'Cópia privada do anúncio no momento da avaliação; não altera anúncios públicos.';
comment on column public.valuation_assessments.source_property_id is
  'Referência opcional ao anúncio próprio; avaliacoes não somem quando anúncio for removido.';

-- Coordinate provenance is not equivalent to map position. Legacy records are unconfirmed.
alter table public.property_locations
  add column if not exists coordinate_quality text not null default 'unknown'
  check (coordinate_quality in ('unknown','approximate','geocoded','property'));
comment on column public.property_locations.coordinate_quality is
  'Somente property indica confirmação manual no lote; registros antigos são unknown.';

commit;
