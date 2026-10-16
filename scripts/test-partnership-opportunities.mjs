import fs from 'node:fs';

const sql = fs.readFileSync('supabase/migrations/20261016000006_partnership_opportunity_publication.sql', 'utf8');
const listing = fs.readFileSync('supabase/migrations/20261016000005_partnership_opportunities.sql', 'utf8');
const panel = fs.readFileSync('src/components/crm/PartnershipOpportunitiesPanel.tsx', 'utf8');
const checks = [
  ['publicação exige MFA', /require_partnership_aal2\(\)/.test(sql)],
  ['publicação exige CRECI-SP', /is_eligible_sp_partnership_professional/.test(sql)],
  ['vitrine somente discovery', /o\.discovery_enabled\s*=\s*true/.test(listing)],
  ['vitrine respeita região', /partnership_member_regions/.test(listing) && /lower\(trim\(r\.city\)\)/.test(listing)],
  ['vários parceiros independentes', /property_partnership_negotiations/.test(sql) && /partner_id\s*=\s*v_uid/.test(listing)],
  ['consentimento de notificações', /notify_opportunities\s*=\s*true/.test(sql)],
  ['ação de interesse visível', /Tenho interesse/.test(panel) && /requestPartnershipOpportunity/.test(panel)],
];
for (const [label, ok] of checks) {
  if (!ok) throw new Error(`Falha: ${label}`);
  console.log(`✓ ${label}`);
}
console.log(`\n${checks.length} verificações da vitrine passaram.`);
