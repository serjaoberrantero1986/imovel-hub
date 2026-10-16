import fs from 'node:fs';
const m=fs.readFileSync('supabase/migrations/20261012000010_admin_partnership_overview.sql','utf8');
const c=[['somente administradores',/is_admin\(\)/.test(m)],['sem PII de leads',!/(email|phone|message|contact_key)/i.test(m)],['subdomínios dos dois portais',/captor_slug[\s\S]*partner_slug/.test(m)],['contagem de imóveis',/property_title[\s\S]*property_status/.test(m)],['contagem de leads e visitas',/leads_count[\s\S]*visits_count/.test(m)],['sem acesso anônimo',/revoke all on function public\.get_admin_partnership_overview\(\) from public,anon/.test(m)],['status controlado',/status in\('active','suspended','disputed'\)/.test(m)]];
for(const [n,ok] of c){if(!ok){console.error(`✗ ${n}`);process.exitCode=1}else console.log(`✓ ${n}`)}
if(!process.exitCode)console.log(`\n${c.length} verificações da supervisão passaram.`);
