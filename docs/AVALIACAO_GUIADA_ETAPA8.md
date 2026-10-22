# Avaliação guiada — etapa 8 do Web Imóveis

## Diretriz visual
Avaliação permanece exclusivamente em PropertyWizardModal → PropertyValuationStep. Reutiliza Design System v2.0: Button, Card, lucide-react, cores rose configuráveis, fonte Outfit, temas claro/escuro, bordas e layout responsivo. Consulte AGENTS.md e .agents/skills/webimovel-product-consistency/SKILL.md.

## Fluxo
Confirmar dados recuperados do cadastro → escolher portais → confirmar gasto de créditos GeckoAPI → triar automaticamente anúncios → corrigir ou excluir amostras com justificativa → consultar valor indicativo → preparar futuro dossiê técnico. O mapa só aparece na etapa 2 de cadastro, nunca na avaliação. CSV não é o caminho principal.

## Verificações de publicação e pendências
1. Migração aplicada em 22/10/2026 no projeto Supabase correto **web-imovel** (`mpqitqzcksusgbheiynz`), com as colunas de `properties` e `valuation_comparables` verificadas. As regras RLS e as políticas existentes permanecem ativas. A migração está versionada em `supabase/migrations/20261022000001_valuation_guided_areas_and_sources.sql`.
2. A Vercel imovel-hub não possui GECKO_API_TOKEN. Criá-la como variável server-side no projeto apropriado, sem prefixo VITE_. Nunca colocar token nos componentes React. Recomenda-se limite financeiro de créditos no provedor.
3. Executar CI, testes node --test, TypeScript e build; verificar preview responsivo nos temas claro/escuro antes de mesclar. Os workflows do GitHub podem ficar na fila; não declarar sucesso sem resultados.
4. Consulta real à GeckoAPI somente mediante aprovação explícita de gasto de créditos. Os testes usam contratos e exemplos sintéticos apenas no arquivo de teste, sem operação externa.

## Persistência e auditoria
Somente corretor titular autenticado inicia avaliações. O endpoint /api/valuation-search verifica JWT, RPC can_manage_my_valuations e propriedade vinculada à avaliação, reutilizando a fotografia (snapshot) do cadastro ao iniciar avaliação. A geolocalização é salva no cadastro e não é mostrada novamente. Alterações de áreas são independentes e dados legados não são inferidos nem corrigidos automaticamente.
Comparáveis persistem em valuation_comparables sob RLS, com portal, URL, ID, data de coleta, finalidade, campos estruturados e decisão manual do corretor. Anúncios sem URL HTTPS e preço positivo não entram na tabela devido às restrições atuais, mas seu total descartado aparece no resumo da pesquisa. Correções exigem justificativa. Não há histórico imutável de autoria/valores alterados nesta fase.

## Limites
O valor exibido usa mediana de preços pedidos por m² de área equivalente e requer ao menos duas ofertas. A faixa é observada, não intervalo estatístico. Não foi implantada metodologia de homogeneização NBR 14653, PTAM ou assinatura. A IA visual fica adiada. A migração SQL já foi aplicada. O frontend pode ser publicado no domínio de produção após CI; até a instalação server-side do token GeckoAPI, o serviço de pesquisa retorna indisponibilidade controlada (503) sem consumir créditos.

## Arquivos modificados
src/types/index.ts; src/lib/supabaseCrud.ts; src/lib/valuation/assessmentRepository.ts; src/lib/valuation/geckoMapping.mjs; src/components/properties/PropertyWizardModal.tsx; src/components/properties/PropertyValuationStep.tsx; lib/geckoContracts.mjs; api/valuation-search.js; supabase/migrations/20261022000001_valuation_guided_areas_and_sources.sql; scripts/test-valuation-guided.mjs; scripts/test-valuation-workspace.mjs; .github/workflows/valuation-wizard.yml; docs/AVALIACAO_GUIADA_ETAPA8.md.

## Publicação manual
Este branch já tem commits no GitHub; NÃO criar commits duplicados. Em um clone local, para enviar somente esses arquivos, confira primeiro git status e git diff e use git add -p nos arquivos citados, seguido de git commit -m "feat: avaliacao guiada etapa 8" e git push origin feat/avaliacao-guiada-etapa8-20261022. Não inclua modificações alheias. Nunca efetue o merge em produção antes dos pré-requisitos.

## Refinamento mobile e navegação única — 22/10/2026

- Cabeçalho em tela pequena: preservar logo, botão Anunciar, foto/ícone real do usuário e botão de menu; comparador, favoritos, mensagens, parcerias e tema continuam acessíveis no menu de usuário, no menu inferior ou nas respectivas páginas, mas não disputam espaço no topo. O botão Perfil do menu inferior abre o mesmo `UserMenu`; o acesso a **Meus Anúncios** permanece no menu compartilhado.
- A etapa 8 utiliza quatro fases progressivas (Imóvel, Pesquisar, Analisar e Resultado); não apresenta mapa, CSV nem formulário completo de anúncios na primeira tela. O dossiê ainda não implementado aparece apenas como detalhe opcional na tela de resultado.
- O rodapé do `PropertyWizardModal` controla Voltar e ação principal da fase ativa através de uma ref tipada do `PropertyValuationStep`; não existem dois conjuntos de botões de avanço competindo. O botão X continua permitindo fechar, e o preço do imóvel permanece inalterado.
- O atalho flutuante **Editar portal** é temporariamente oculto enquanto o cadastro/avaliação estiver aberto, sem encerrar a sessão do editor.
- A entrega é feita em **um único commit na branch de prévia**, sem merge automático para produção. A migração do Supabase, a chave GeckoAPI e a validação de CI ainda são requisitos antes da publicação do motor de pesquisa em produção.

## Preferência de publicação (confirmada em 22/10/2026)

O proprietário utiliza `https://webimoveis.site/` como ambiente de testes da aplicação, mesmo durante o desenvolvimento. Alterações futuras devem ser preparadas localmente e submetidas ao GitHub em um único commit/push consolidado por implementação, com publicação no domínio principal após as verificações essenciais. Evitar séries de commits intermediários que disparem builds de prévia desnecessários. Migrações devem preceder o código que as utiliza. A pesquisa paga GeckoAPI requer configuração do segredo e confirmação de consumo pelo corretor, mas a ausência desse segredo não impede testar cadastro, menus e fluxo guiado.
