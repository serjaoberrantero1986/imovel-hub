import fs from 'node:fs';
import path from 'node:path';

const migrationDir='supabase/migrations';
const required=[
 '20261012000001_partnership_network_foundation.sql',
 '20261012000002_partnership_safety_and_audit.sql',
 '20261012000003_property_partnership_offers.sql',
 '20261012000004_partnership_contracts_and_sgr.sql',
 '20261012000005_partnership_amendments_and_lifecycle.sql',
 '20261012000006_partner_property_distribution.sql',
 '20261012000007_partnership_lead_protection.sql',
 '20261012000008_partnership_visits.sql',
 '20261012000009_partnership_visit_disputes.sql',
 '20261012000010_admin_partnership_overview.sql',
 '20261012000011_partnership_visit_otp_delivery.sql',
 '20261012000012_partnership_deal_outcomes.sql'
];
const checks=[];
for(const file of required){const full=path.join(migrationDir,file);checks.push([`migration presente: ${file}`,fs.existsSync(full)]);}
const all=required.map(file=>fs.readFileSync(path.join(migrationDir,file),'utf8')).join('\n');
checks.push(['território restrito a CRECI-SP',/SP/.test(all)&&/is_eligible_sp_partnership_professional/.test(all)]);
checks.push(['contratos exigem verificação externa',/status='verified'/.test(all)&&/SGR/.test(all)]);
checks.push(['lead sem exportação direta',/revoke all on public\.partnership_lead_attributions from public,anon,authenticated/.test(all)]);
checks.push(['visita sem rastreamento contínuo',!/watchPosition|biometric|facial_recognition/i.test(all)]);
checks.push(['disputas preservam histórico',/partnership_visit_dispute_events/.test(all)&&/before update or delete/.test(all)]);
checks.push(['supervisão exige administrador',/get_admin_partnership_overview[\s\S]*is_admin\(\)/.test(all)]);
checks.push(['OTP nunca persiste código bruto em tabela',/otp_hash text/.test(all)&&!/otp_code text/.test(all)]);
checks.push(['OTP enviado por função server-side',fs.existsSync('supabase/functions/send-partnership-visit-otp/index.ts')&&/api\.resend\.com\/emails/.test(fs.readFileSync('supabase/functions/send-partnership-visit-otp/index.ts','utf8'))]);
checks.push(['CORS limitado aos subdomínios Web Imóveis',/webimoveis\\\.site/.test(fs.readFileSync('supabase/functions/send-partnership-visit-otp/index.ts','utf8'))&&/allowedOrigin/.test(fs.readFileSync('supabase/functions/send-partnership-visit-otp/index.ts','utf8'))]);
for(const [label,ok] of checks){if(!ok){console.error(`✗ ${label}`);process.exitCode=1}else console.log(`✓ ${label}`);}
if(!process.exitCode) console.log(`\nPreflight aprovado: ${checks.length} verificações estruturais.`);
