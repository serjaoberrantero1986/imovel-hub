import { readFileSync } from 'node:fs';

const migration = readFileSync('supabase/migrations/20261012000003_property_partnership_offers.sql', 'utf8');
const service = readFileSync('src/lib/propertyPartnerships.ts', 'utf8');
const modal = readFileSync('src/components/properties/PropertyPartnershipModal.tsx', 'utf8');
const management = readFileSync('src/views/MyPropertiesView.tsx', 'utf8');

const responsibilityKeys = [
  'owner_relationship','buyer_relationship','visit_scheduling','visit_accompaniment',
  'proposal_receipt','proposal_presentation','negotiation','document_review',
  'transaction_instrument','signature_closing','key_delivery','honorarium_accountability',
];

const checks = [
  ['ofertas vinculadas ao imóvel canônico', /property_id uuid references public\.properties\(id\) on delete set null/i.test(migration) && /property_partnership_offers_one_open_per_property/i.test(migration)],
  ['negociação independente por parceiro', /unique \(offer_id, partner_id\)/i.test(migration)],
  ['snapshots versionados e imutáveis', /unique \(negotiation_id, version_number\)/i.test(migration) && /prevent_partnership_snapshot_mutation/i.test(migration)],
  ['percentuais totalizam cem no banco', /captor_share \+ partner_share = 100\.00/i.test(migration)],
  ['percentuais sincronizados na interface', /partner_share: 100 - bounded/.test(modal) && /setCaptorShare\(100 - share\)/.test(modal)],
  ['prazo determinado ou indeterminado', /duration_kind in \('fixed', 'indefinite'\)/i.test(migration)],
  ['exclusividades separadas', /original_authorization_exclusive/i.test(migration) && /partnership_exclusive/i.test(migration)],
  ['publicidade granular versionada', ['allow_partner_portal','allow_social_media','allow_paid_ads','allow_external_portals','allow_material_adaptation'].every(value => migration.includes(value))],
  ['doze responsabilidades completas', responsibilityKeys.every(value => migration.includes(value)) && responsibilityKeys.every(value => service.includes(value))],
  ['concorrência por versão esperada', /p_expected_version/i.test(migration) && /for update/i.test(migration)],
  ['MFA AAL2 obrigatório nos termos', /AAL2 required for partnership terms/i.test(migration) && (migration.match(/require_partnership_aal2\(\)/g) || []).length >= 3],
  ['restrição a imóvel em SP', /Only properties in SP are eligible/i.test(migration)],
  ['destinatários compatíveis com região e finalidade', /Partner region or purpose does not match property/i.test(migration) && /partnership_member_regions region/i.test(migration)],
  ['somente captador proprietário cria oferta', /v_property\.user_id <> v_uid/i.test(migration)],
  ['aceite permanece preliminar', /preliminarily_accepted/i.test(migration) && /não ativa a parceria/i.test(modal)],
  ['contraproposta disponível às duas partes', /respondAsCaptor/.test(modal) && /setCounterTerms/.test(modal)],
  ['notificações persistentes', (migration.match(/insert into public\.notifications/g) || []).length >= 2],
  ['RLS e privilégio mínimo', (migration.match(/enable row level security/g) || []).length === 5 && (migration.match(/revoke all on public\.property_partnership_/g) || []).length === 5],
  ['integração no gerenciamento de imóveis', /PropertyPartnershipModal/.test(management) && /Ofertas de Parceria/.test(management)],
  ['exclusão preserva snapshots sem bloquear conta', /property_snapshot jsonb not null/i.test(migration) && /captor_snapshot jsonb not null/i.test(migration) && /partner_snapshot jsonb not null/i.test(migration) && /proposed_by_snapshot jsonb not null/i.test(migration)],
  ['cancelamento encerra negociações e notifica', /cancel_property_partnership_offer/i.test(migration) && /Oferta de parceria cancelada/i.test(migration)],
];

const failures = checks.filter(([, passed]) => !passed);
for (const [name, passed] of checks) console.log(`${passed ? '✓' : '✗'} ${name}`);
if (failures.length) {
  console.error(`\n${failures.length} verificação(ões) falharam.`);
  process.exit(1);
}
console.log(`\n${checks.length} verificações da Fase 2 passaram.`);
