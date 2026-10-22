# Avaliação guiada — etapa 8 do Web Imóveis

## Diretriz visual
Avaliação permanece exclusivamente em PropertyWizardModal → PropertyValuationStep. Reutiliza Design System v2.0: Button, Card, lucide-react, cores rose configuráveis, fonte Outfit, temas claro/escuro, bordas e layout responsivo. Consulte AGENTS.md e .agents/skills/webimovel-product-consistency/SKILL.md.

## Fluxo
Confirmar dados recuperados do cadastro → escolher portais → confirmar gasto de créditos GeckoAPI → triar automaticamente anúncios → corrigir ou excluir amostras com justificativa → consultar valor indicativo → preparar futuro dossiê técnico. O mapa só aparece na etapa 2 de cadastro, nunca na avaliação. CSV não é o caminho principal.

## Pré-requisitos OBRIGATÓRIOS para publicação
1. A conexão Supabase vinculada ao agente respondeu SEM PERMISSÃO para executar SQL. Aplicar a migração supabase/migrations/20261022000001_valuation_guided_areas_and_sources.sql por administrador do projeto uzgeyzsgahhsnsnjgefn. Conferir colunas e permissões/RLS das tabelas privadas. A migração NÃO FOI APLICADA pelo agente.
2. A Vercel imovel-hub não possui GECKO_API_TOKEN. Criá-la como variável server-side no projeto apropriado, sem prefixo VITE_. Nunca colocar token nos componentes React. Recomenda-se limite financeiro de créditos no provedor.
3. Executar CI, testes node --test, TypeScript e build; verificar preview responsivo nos temas claro/escuro antes de mesclar. Os workflows do GitHub podem ficar na fila; não declarar sucesso sem resultados.
4. Consulta real à GeckoAPI somente mediante aprovação explícita de gasto de créditos. Os testes usam contratos e exemplos sintéticos apenas no arquivo de teste, sem operação externa.

## Persistência e auditoria
Somente corretor titular autenticado inicia avaliações. O endpoint /api/valuation-search verifica JWT, RPC can_manage_my_valuations e propriedade vinculada à avaliação, reutilizando a fotografia (snapshot) do cadastro ao iniciar avaliação. A geolocalização é salva no cadastro e não é mostrada novamente. Alterações de áreas são independentes e dados legados não são inferidos nem corrigidos automaticamente.
Comparáveis persistem em valuation_comparables sob RLS, com portal, URL, ID, data de coleta, finalidade, campos estruturados e decisão manual do corretor. Anúncios sem URL HTTPS e preço positivo não entram na tabela devido às restrições atuais, mas seu total descartado aparece no resumo da pesquisa. Correções exigem justificativa. Não há histórico imutável de autoria/valores alterados nesta fase.

## Limites
O valor exibido usa mediana de preços pedidos por m² de área equivalente e requer ao menos duas ofertas. A faixa é observada, não intervalo estatístico. Não foi implantada metodologia de homogeneização NBR 14653, PTAM ou assinatura. A IA visual fica adiada. Sem migração SQL nem segredo Gecko, NÃO PUBLICAR o novo código em produção.

## Arquivos modificados
src/types/index.ts; src/lib/supabaseCrud.ts; src/lib/valuation/assessmentRepository.ts; src/lib/valuation/geckoMapping.mjs; src/components/properties/PropertyWizardModal.tsx; src/components/properties/PropertyValuationStep.tsx; lib/geckoContracts.mjs; api/valuation-search.js; supabase/migrations/20261022000001_valuation_guided_areas_and_sources.sql; scripts/test-valuation-guided.mjs; scripts/test-valuation-workspace.mjs; .github/workflows/valuation-wizard.yml; docs/AVALIACAO_GUIADA_ETAPA8.md.

## Publicação manual
Este branch já tem commits no GitHub; NÃO criar commits duplicados. Em um clone local, para enviar somente esses arquivos, confira primeiro git status e git diff e use git add -p nos arquivos citados, seguido de git commit -m "feat: avaliacao guiada etapa 8" e git push origin feat/avaliacao-guiada-etapa8-20261022. Não inclua modificações alheias. Nunca efetue o merge em produção antes dos pré-requisitos.
