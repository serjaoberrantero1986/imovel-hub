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

## Atualização — preservação de anúncios, créditos e mapa

- **Localização do cadastro:** o ícone agora é um SVG embutido no Leaflet; não depende dos caminhos dos PNG padrão após compilar no Vite. A confirmação do lote e a guarda privada de coordenadas não foram alteradas.
- **Recepção do provedor:** o endpoint `/api/valuation-search` preserva `body.items` (até 300 itens da página) e calcula a auditoria geográfica separadamente; cidade ausente ou distinta não elimina candidatos antecipadamente. Em listas acima do limite operacional, `limited=true` sinaliza paginação pendente, sem afirmar completude.
- **Tabela de candidatos:** `valuation_candidates` guarda fonte, ID/URL, dados estruturados, fragmentos públicos dos dados originais, indicador de revisão, justificativas e exclusão do corretor. A migração `20261022000002_valuation_candidates_preserved.sql` foi aplicada ao projeto Supabase `web-imovel`, com FK composta e políticas RLS ligadas ao titular habilitado.
- **Triagem e conferência:** todos os candidatos retornados entram na lista; as informações não confirmadas permanecem pendentes, **fora do indicativo**. É possível revisar finalidade (venda/locação), URL, metragem, município, preço e tipologia; a cópia original da listagem fica preservada. Registros manuais anteriores continuam operacionais em `valuation_comparables`.
- **Saldo e confirmação:** `GET /api/valuation-credits` consulta `GET /v1/me/credits` somente após autenticação e autorização, usando segredo exclusivamente no servidor. A interface apresenta saldo **compartilhado** do fornecedor, custo **estimado** (base provisória de 1 crédito/consulta PLP), saldo projetado e autorização na própria tela. O custo real pode diferir entre endpoints e deve ser aferido no painel da GeckoAPI; a diferença do saldo compartilhado antes e depois pode incluir outras consultas simultâneas. Não existe carteira individual por corretor nesta versão.
- A aplicação da migração ocorre ANTES da implantação do frontend. Nenhuma chamada real `/v1/extract` foi usada nos testes de implementação; fluxos de 50 anúncios foram validados com dados sintéticos.
- **Aviso de migração de sessões antigas:** os resultados que já foram descartados por versões anteriores não podem ser recuperados do banco, pois nunca foram salvos. Para captá-los será necessária uma nova consulta autorizada, sujeita a cobrança.

## Proteção contra avaliações desatualizadas — 22/10/2026

**Causa encontrada no banco:** o anúncio `VCO-SP-3416` foi editado de comercial/Votorantim para chácara/Salto de Pirapora, porém uma avaliação pré-existente preservava a tipologia e cidade originais. Seus 50 anúncios OLX continuam no histórico privado; não são reutilizados em avaliações novas.

**Mitigações implementadas:**
- `src/lib/valuation/subjectConsistency.mjs` compara identidade, tipologia, finalidade, cidade, UF, bairro, área útil, área total/terreno e área construída entre cadastro e avaliação. Preço anunciado e dados meramente textuais não entram nesta trava.
- O assistente identifica avaliação antiga, demonstra quais campos mudaram e oferece **Criar avaliação atualizada** sem apagar o histórico. A pesquisa de uma avaliação desatualizada fica bloqueada mesmo se o corretor tentou avançar por uma aba antiga.
- **Controle autoritativo no servidor:** `api/valuation-search.js` consulta `properties`, `property_locations` e `valuation_assessments` sob autenticação e titularidade (RLS). Diferenças retornam **HTTP 409 ASSESSMENT_STALE** antes de qualquer chamada paga à GeckoAPI. O mesmo acontece se a localização atual não está disponível.
- OLX: `lib/geckoContracts.mjs` usa categorias comprovadas nas páginas oficiais para chácara (`imoveis/terrenos/sitios-e-chacaras/compra`), terreno, apartamento e casa **à venda**, acrescidas de cidade/UF e região quando mapeada. Tipologias/negócios OLX sem categoria validada falham **antes da cobrança**, sem recorrer à categoria genérica `imoveis`.
- O backend confronta a URL pública de consulta efetiva (`data.requestUrl` da GeckoAPI) com os filtros enviados usando `auditOlxRequestUrl`. Quando não há comprovação de categoria/cidade/UF, preserva os anúncios como **não utilizáveis no indicativo**, mostra o motivo e grava metadados da consulta em `captured_data.searchContext`.
- Anúncios antigos não editados são reinterpretados localmente a partir dos dados originais preservados: títulos `SALA COMERCIAL` não devem aparecer com tipologia desconhecida. A triagem lista **todos** os motivos de inadequação (tipo, localização, finalidade, área, link), sem apagar candidatos.
- O escopo do imóvel é apresentado também na confirmação do consumo de créditos.
- Testes automáticos e verificações puras sem consulta paga à API: `scripts/test-valuation-subject-safety.mjs`. A funcionalidade precisa continuar usando o único rodapé e o visual do cadastro.

**Fontes verificadas sem executar extrações pagas:**
- https://geckoapi.com.br/docs/olx-com-br-plp/
- https://www.olx.com.br/imoveis/terrenos/sitios-e-chacaras/compra/estado-sp/regiao-de-sorocaba

**Operação:** use uma NOVA avaliação, não reutilize a antiga com dados comerciais. A primeira consulta real autorizada pelo corretor servirá para confirmar o comportamento do provedor com município/categoria solicitados. Não afirmar resultados de mercado ou consumo de créditos sem essa consulta.

## Retorno da conferência e reaproveitamento — 23/10/2026

- **Diagnóstico comprovado em produção antes da correção:** dois candidatos consecutivos foram gravados com resposta 200 e dados preservados ao reabrir. Uma área de 1.200 m² frente a 700 m² foi corretamente classificada como Excluídos pela tolerância vigente. Não se comprovou perda de dados nem falha dos contadores nesses testes.
- **Falha de experiência reproduzida:** valor numérico inválido impedia a gravação, mas o erro ficava no início da etapa, fora da área visível. O reaproveitamento com finalidade desconhecida também gravava a decisão e exibia sua pendência fora da tela. Isso explica uma situação em que o botão parece não responder, mas não prova qual foi o dado da tentativa original relatada.
- **Correção:** validação junto aos campos e resumo junto ao botão Salvar, com descrições acessíveis, preservação do preenchimento em falha e avisos pelo ToastContainer existente. Após resposta confirmada de persistência, o cartão informa o grupo e o motivo calculados com a linha retornada. Reaproveitamento bloqueado por dados essenciais é explicitamente distinguido de inclusão efetiva.
- O cartão recém-alterado permanece visível, identificado como exceção, até a troca de filtro quando mudar de grupo ou estiver fora da página carregada. Os contadores continuam derivados da triagem real; não há inclusão fictícia no grupo filtrado.
- **Preservado:** Aproveitados / Conferência / Excluídos, tolerâncias, requisitos mínimos, observações opcionais, justificativa manual de 3 caracteres, dados originais e avaliações anteriores. Sem migration, alteração de políticas, mudança do motor de cálculo ou nova extração GeckoAPI.
- **Verificação local:** `node --test scripts/test-valuation-*.mjs`, TypeScript e build. `scripts/test-valuation-review-feedback.mjs` exercita os handlers reais com persistência isolada de teste, dois anúncios consecutivos, validações, falhas, retorno pós-gravação, reaproveitamento e filtros. Incluído no workflow existente. A validação interativa da versão publicada deve ocorrer em `webimoveis.site`, sem consulta paga.
