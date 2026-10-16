# Aplicação controlada em produção

Execute as migrations no SQL Editor do projeto Supabase, nesta ordem:

1. `20261016000004_official_sp_neighborhood_catalog.sql`
2. `20261016000005_partnership_opportunities.sql`
3. `20261016000006_partnership_opportunity_publication.sql`
4. `20261016000007_partnership_opportunity_notifications.sql`

As migrations anteriores da rede, contratos, distribuição, leads e visitas devem estar aplicadas antes desta sequência.

## Carga oficial de bairros

No PowerShell, sem publicar a chave no repositório ou no chat:

```powershell
$env:SUPABASE_URL="https://SEU_PROJETO.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="SUA_SERVICE_ROLE_KEY"
.\scripts\import-official-sp-neighborhoods.ps1
```

## Conferência no SQL Editor

```sql
select count(*) as bairros_oficiais
from public.partnership_official_sp_neighborhoods;

select count(*) as oportunidades_publicadas
from public.property_partnership_offers
where status = 'open' and discovery_enabled = true;

select count(*) as profissionais_com_alerta
from public.partnership_network_members
where status = 'active' and notify_opportunities = true;
```

O portal só deve ser testado depois de confirmar que as três consultas executaram sem erro. A carga de bairros deve retornar registros; nenhum bairro é criado pelo usuário na interface.
