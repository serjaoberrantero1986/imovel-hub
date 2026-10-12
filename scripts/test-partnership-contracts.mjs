import { readFileSync } from 'node:fs';

const migration = readFileSync('supabase/migrations/20261012000004_partnership_contracts_and_sgr.sql', 'utf8');
const service = readFileSync('src/lib/partnershipContracts.ts', 'utf8');
const panel = readFileSync('src/components/properties/PartnershipContractPanel.tsx', 'utf8');
const modal = readFileSync('src/components/properties/PropertyPartnershipModal.tsx', 'utf8');

const checks = [
  ['termos canônicos possuem SHA-256', /canonical_sha256 text not null/.test(migration) && /digest\(convert_to\(v_payload::text/.test(migration)],
  ['versões contratuais são sequenciais', /unique \(negotiation_id, version_number\)/.test(migration)],
  ['campos canônicos são imutáveis', /protect_partnership_contract_version/.test(migration) && /Canonical contract data is immutable/.test(migration)],
  ['aceites exigem AAL2 e hash esperado', /acknowledge_partnership_contract/.test(migration) && /require_partnership_aal2\(\)/.test(migration) && /Contract hash mismatch/.test(migration)],
  ['aceite interno não é descrito como assinatura', /não constitui a assinatura eletrônica formal/.test(panel) && /nem declara o aceite interno como assinatura/.test(migration)],
  ['bucket contratual é privado e limitado', /'partnership-contracts','partnership-contracts',false,15728640/.test(migration)],
  ['caminho de storage evita conversão insegura', /can_access_partnership_contract_path/.test(migration) && !/foldername\(name\)\)\[1\]::uuid/.test(migration)],
  ['imagens usam editor documental compartilhado', /editUserImage\(source, 'document', 2560\)/.test(service)],
  ['PDF e imagens têm assinatura mágica validada', /bytes\[0\] === 0x25/.test(service) && /bytes\[0\] === 0xff/.test(service) && /bytes\[0\] === 0x89/.test(service)],
  ['falha de registro remove arquivo órfão', /storage\.from\(BUCKET\)\.remove\(\[path\]\)/.test(service)],
  ['evidências do SGR preservam versões', /submission_version integer not null/.test(migration) && /max\(submission_version\)/.test(migration) && /prevent_contract_sgr_submission_mutation/.test(migration)],
  ['somente últimos envios coincidentes liberam análise', (migration.match(/distinct on \(party_role\)/g) || []).length >= 3 && /awaiting_verification/.test(migration)],
  ['documentos originais e revisões são separados', /partnership_contract_document_reviews/.test(migration) && !/update public\.partnership_contract_documents/.test(migration)],
  ['ativação exige administrador, AAL2 e evidências', /if not public\.is_admin\(\)/.test(migration) && /Incomplete contract evidence/.test(migration) && /Parties are no longer eligible/.test(migration)],
  ['decisão cria aviso persistente', /insert into public\.notifications/.test(migration) && /scope','partnership_contract_review/.test(migration)],
  ['parceria só fica ativa após verificação', /set status='active'/.test(migration) && /insert into public\.property_partnerships/.test(migration)],
  ['interface está no fluxo existente', /PartnershipContractPanel/.test(modal) && /get_partnership_contract_workspace/.test(service)],
  ['SGR utiliza links oficiais', /https:\/\/sgr\.cofeci\.gov\.br\//.test(panel) && /\^https:\/\/sgr\\\.cofeci\\\.gov\\\.br\//.test(migration)],
];

const failures = checks.filter(([, passed]) => !passed);
for (const [name, passed] of checks) console.log(`${passed ? '✓' : '✗'} ${name}`);
if (failures.length) {
  console.error(`\n${failures.length} verificação(ões) falharam.`);
  process.exit(1);
}
console.log(`\n${checks.length} verificações da Fase 3 passaram.`);
