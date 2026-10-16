import { readFileSync } from 'node:fs';

const migration = readFileSync('supabase/migrations/20261012000005_partnership_amendments_and_lifecycle.sql', 'utf8');
const service = readFileSync('src/lib/partnershipContracts.ts', 'utf8');
const panel = readFileSync('src/components/properties/PartnershipContractPanel.tsx', 'utf8');

const checks = [
  ['aditivo exige parceria e contrato ativos', /Active partnership required/.test(migration) && /Active contract changed/.test(migration)],
  ['aditivo exige MFA AAL2', /propose_property_partnership_amendment[\s\S]*require_partnership_aal2\(\)/.test(migration)],
  ['termos novos geram versão sem sobrescrita', /insert_partnership_term_version\(v_neg.id,v_uid,'revision'/.test(migration)],
  ['contrato vigente permanece ativo durante aditivo', /O contrato atual continua válido até a conclusão do aditivo/.test(migration) && /property_partnerships set status='countered'/.test(migration) === false],
  ['ativação do aditivo preserva data inicial', /preserve_partnership_activation_date/.test(migration) && /new.starts_at:=old.starts_at/.test(migration)],
  ['encerramento usa aviso prévio contratual', /termination_notice_days/.test(migration) && /make_interval\(days=>v_notice\)/.test(migration)],
  ['encerramento exige motivo e concorrência', /Termination reason required/.test(migration) && /v_partnership.updated_at<>p_expected_updated_at/.test(migration)],
  ['histórico e contratos não são apagados', !/delete from public\.(property_partnerships|partnership_contract)/i.test(migration)],
  ['suspensão administrativa exige MFA e justificativa', /set_property_partnership_administrative_status/.test(migration) && /Status and justification required/.test(migration)],
  ['decisões geram notificações persistentes', (migration.match(/insert into public\.notifications/g) || []).length >= 3],
  ['eventos de ciclo de vida são imutáveis', /prevent_partnership_lifecycle_event_mutation/.test(migration)],
  ['interface oferece aditivo completo', /Propor aditivo/.test(panel) && /renderTermsEditor\(amendmentTerms,setAmendmentTerms\)/.test(panel)],
  ['interface explica contrato vigente', /não substituem o contrato vigente/.test(panel)],
  ['interface oferece encerramento justificado', /Encerrar parceria/.test(panel) && /terminationReason\.trim\(\)\.length < 10/.test(panel)],
  ['serviço usa RPCs transacionais', /propose_property_partnership_amendment/.test(service) && /schedule_property_partnership_termination/.test(service)],
];

const failures = checks.filter(([, passed]) => !passed);
for (const [name, passed] of checks) console.log(`${passed ? '✓' : '✗'} ${name}`);
if (failures.length) { console.error(`\n${failures.length} verificação(ões) falharam.`); process.exit(1); }
console.log(`\n${checks.length} verificações do ciclo contratual passaram.`);
