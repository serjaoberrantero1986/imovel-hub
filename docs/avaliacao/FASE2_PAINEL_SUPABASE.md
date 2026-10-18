# Web Imóveis — Espaço privado de avaliação (fase 2)

**Dependência:** PR #1 (motor de auditoria). Este PR é empilhado sobre a branch da fase 1 e não deve ser mesclado na `main` antes dela.

## O que muda
- Nova visualização **Avaliação Inteligente**, acessível aos corretores e imobiliárias autenticados por meio do menu profissional e do painel.
- Cadastro de rascunhos de avaliações, com endereço, área de terreno/construção e coordenadas prediais opcionais.
- Histórico por proprietário e inclusão manual de links HTTPS da OLX, Facebook Marketplace, sites de imobiliárias e portais.
- Auditoria de duplicidade e requisitos do motor da fase 1, com estados aceito / pendente / rejeitado e justificativas.
- Exibição de raios apenas para coordenadas prediais, sem estimativa de valor monetário.

## Migration SQL — ação necessária antes de validar no ambiente real
`supabase/migrations/20261018000001_valuation_private_workspace.sql`

A migration **não foi aplicada em produção**. Antes de publicar a interface, revisar e executar essa migration no projeto Supabase correto, preferencialmente validando num ambiente de testes isolado. Cria `valuation_assessments`, `valuation_comparables`, políticas RLS por `auth.uid()` e MFA, checagem de perfil profissional ativo e FK composta `(assessment_id, owner_id)`. Não altera tabelas de anúncios, CRM, contratos ou credenciais existentes.

Dados privados não são públicos, nem compartilhados entre corretores. Uma localização de rua não é certificada como distância predial. Não há scraping de terceiros, IA visual, importação automática, estimador estatístico, PTAM ou emissão de PDFs nesta fase.

## Validação local
```bash
bun install --frozen-lockfile
node --test scripts/test-valuation-engine.mjs scripts/test-valuation-workspace.mjs
bun run lint
bun run build
```
A execução local dos testes de SQL é apenas uma verificação estrutural; políticas RLS e operações entre contas precisam ser testadas em um banco Supabase isolado, com usuários reais de papéis distintos e cenários de MFA, antes de liberar para produção.

## Fluxos para conferência depois de aplicar a migration
1. Corretor autenticado: cria avaliação e revisita seu histórico; sem dados, exibe estado vazio.
2. Segundo corretor: não consegue ler nem alterar avaliação ou comparáveis do primeiro, inclusive tentando trocar `owner_id`.
3. Comprador ou anônimo: não consulta nem grava tabelas privadas.
4. Corretor com MFA cadastrado sem desafio concluído: acesso bloqueado pela RLS.
5. Link externo inválido: formulário rejeita; anúncio válido persistido fica pendente até verificação.
6. Ao sair da conta, histórico anterior desaparece imediatamente da interface.
7. Verificar interface em tema claro e escuro, desktop e celular.

## Arquivos
- `src/views/ValuationView.tsx`
- `src/lib/valuation/assessmentRepository.ts`
- `src/App.tsx`, `src/context/appTypes.ts`, `src/components/layout/UserMenu.tsx`, `src/components/layout/Sidebar.tsx`, `src/views/BrokerDashboardView.tsx`
- `supabase/migrations/20261018000001_valuation_private_workspace.sql`
- `scripts/test-valuation-workspace.mjs`, `.github/workflows/valuation-workspace.yml`

### Publicação
Branch e PR em rascunho. Nenhum deploy ou migração executada por estas alterações.
