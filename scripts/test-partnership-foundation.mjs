import { readFileSync } from 'node:fs';

const migrationPath = 'supabase/migrations/20261012000001_partnership_network_foundation.sql';
const safetyMigrationPath = 'supabase/migrations/20261012000002_partnership_safety_and_audit.sql';
const servicePath = 'src/lib/partnershipNetwork.ts';
const panelPath = 'src/components/profile/PartnershipNetworkPanel.tsx';

const migration = readFileSync(migrationPath, 'utf8');
const safetyMigration = readFileSync(safetyMigrationPath, 'utf8');
const service = readFileSync(servicePath, 'utf8');
const panel = readFileSync(panelPath, 'utf8');

const checks = [
  ['tabela de membros', /create table if not exists public\.partnership_network_members/i.test(migration)],
  ['tabela de regiões', /create table if not exists public\.partnership_member_regions/i.test(migration)],
  ['tabela de conexões', /create table if not exists public\.partnership_connections/i.test(migration)],
  ['restrição territorial SP', /state char\(2\).*check \(state = 'SP'\)/i.test(migration)],
  ['elegibilidade CRECI-SP', /creci_review_status = 'approved'[\s\S]*creci_review_expires_at/i.test(migration) && /creci_uf[\s\S]*= 'SP'/i.test(migration)],
  ['proteção MFA', (migration.match(/has_satisfied_mfa\(\)/g) || []).length >= 6],
  ['RLS nas três tabelas', (migration.match(/enable row level security/g) || []).length === 3],
  ['sem escrita direta autenticada', (migration.match(/revoke all on public\.partnership_/g) || []).length === 3],
  ['conexão única por par', /partnership_connections_unique_pair/i.test(migration)],
  ['especialidades limitadas pelo banco', /specialties <@ array\['capture','marketing','visits','negotiation','documents','closing'\]/i.test(migration)],
  ['notificações persistentes', /insert into public\.notifications/g.test(migration)],
  ['serviço usa RPCs seguras', /get_my_partnership_network/.test(service) && /save_my_partnership_membership/.test(service) && /request_partnership_connection/.test(service)],
  ['interface esclarece que não compartilha imóveis', /não compartilha seus imóveis automaticamente/i.test(panel)],
  ['interface limita vinte regiões', /regions\.length >= 20/.test(panel)],
  ['auditoria imutável e sem escrita direta', /create table if not exists public\.partnership_network_events/i.test(safetyMigration) && /revoke all on public\.partnership_network_events from public, anon, authenticated/i.test(safetyMigration)],
  ['auditoria automática de adesões e conexões', /audit_partnership_membership_change/i.test(safetyMigration) && /audit_partnership_connection_change/i.test(safetyMigration)],
  ['denúncias privadas', /create table if not exists public\.partnership_reports/i.test(safetyMigration) && /report_partnership_professional/i.test(safetyMigration)],
  ['bloqueio remove descoberta mútua', /not public\.are_partnership_profiles_blocked\(v_uid, p\.id\)/i.test(safetyMigration)],
  ['interface oferece denúncia e bloqueio', /Denunciar profissional/.test(panel) && /blockPartnershipProfessional/.test(panel)],
  ['migration complementar é retrocompatível', /add column if not exists specialties/i.test(safetyMigration) && /create or replace function public\.save_my_partnership_membership/i.test(safetyMigration)],
];

const failures = checks.filter(([, passed]) => !passed);
for (const [name, passed] of checks) console.log(`${passed ? '✓' : '✗'} ${name}`);
if (failures.length) {
  console.error(`\n${failures.length} verificação(ões) falharam.`);
  process.exit(1);
}
console.log(`\n${checks.length} verificações da Fase 1 passaram.`);
