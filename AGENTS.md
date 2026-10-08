# Diretrizes de Desenvolvimento e Produção

## Imagens enviadas pelos usuários
- Todo campo de imagem, atual ou futuro (perfil, logotipo, anúncios, hero, fundos e banners), deve reutilizar o editor avançado compartilhado por meio de editUserImage/ImageEditorModal.
- Validar segurança e capacidade de processamento na entrada; aplicar o limite de upload ao resultado otimizado, preservando qualidade e transparência de logotipos.
- Documentos comprobatórios devem preservar o conteúdo completo e a legibilidade: somente orientação e otimização, sem filtros estéticos. PDFs seguem o fluxo documental.
- O editor e os formulários devem acompanhar o tema claro/escuro e reutilizar o padrão visual dos formulários aprovados.

## 1. Ambiente Estritamente de Produção
- Este projeto opera exclusivamente em ambiente de PRODUÇÃO real.
- **NUNCA** adicionar botões de "Acesso Rápido para Demonstração", atalhos de preenchimento automático com contas falsas de teste, mocks de login, ou alternâncias artificiais de credenciais.
- Toda autenticação, cadastro e gestão de usuários deve ser feita de forma real através do Supabase Auth e da tabela `profiles`.
- Toda persistência de dados de imóveis, imagens, localizações, favoritos, buscas salvas e mensagens deve ser armazenada e sincronizada diretamente no banco de dados real do Supabase (`uzgeyzsgahhsnsnjgefn.supabase.co`).

## 2. Conformidade de Tipagem com o Banco de Dados PostgreSQL (Supabase)
- Todos os identificadores de tabelas do Supabase (`properties.id`, `properties.user_id`, `property_locations.id`, `property_images.id`, `profiles.id`) são do tipo `UUID` nativo do PostgreSQL.
- Ao gerar novos registros, utilize sempre `crypto.randomUUID()` para compatibilidade estrita. Nunca use strings como `"prop-" + Date.now()` ou `"m1"`.
- Respeite o schema das tabelas: a tabela `profiles` não possui a coluna `bio`, envie apenas colunas existentes (`id`, `name`, `email`, `phone`, `role`, `creci`, `agency_name`, `agency_logo`, `avatar_url`, `verified`, `updated_at`).

## 3. Prerrogativas e Acesso (Gating de Autenticação)
- O botão "Anunciar" no cabeçalho e navegações é exibido de forma permanente.
  - Se o usuário não estiver autenticado, abre o modal de Login/Cadastro solicitando autenticação.
  - Se for Comprador/Cliente logado, exibe aviso explicando que a publicação de imóveis é exclusiva para corretores e imobiliárias credenciadas.
  - Se for Corretor ou Imobiliária credenciada, abre o assistente de publicação.
- Páginas de gerenciamento de perfil e áreas restritas nunca devem exibir formulários de edição para visitantes anônimos; devem exibir tela explicativa com chamada para cadastro ou login.

## 4. Princípio Zero-Mock e Fonte Única da Verdade (Supabase)
- **PROIBIDO** o uso de mocks, dados de demonstração, leads fictícios ou arrays estáticos de cidades e bairros.
- Toda e qualquer informação visualizada no portal (vitrine da home, exploração por bairros, mapa, busca por código ou cidade, sugestões do rodapé e CRM de leads) deve ser computada e agregada estritamente a partir dos registros reais do Supabase.
- Se o banco de dados estiver com zero imóveis ou zero contatos/leads, o portal inteiro deve refletir fielmente esse estado vazio, sem inventar bairros ou números fictícios (ex: "48 imóveis no Campolim").

## 5. Protocolo Obrigatório de Transparência Antes de Alterações
- Antes de criar, alterar ou excluir qualquer função, fluxo, arquivo, tabela, campo, política ou rotina, explicar ao usuário com clareza:
  - o que será criado, alterado ou excluído;
  - quais arquivos, funções e estruturas de banco de dados serão afetados;
  - qual será o comportamento visível para o usuário;
  - quais funcionalidades existentes podem ser impactadas e como serão preservadas;
  - como a alteração será validada;
  - se o resultado está apenas local, publicado ou validado em produção.
- Não iniciar a implementação antes da concordância do usuário com a proposta, salvo quando ele autorizar expressamente a execução no mesmo pedido.
- Não introduzir funções alternativas, campos, integrações ou mudanças de arquitetura que não tenham sido descritas e aprovadas.
- Caso a investigação revele a necessidade de ampliar ou modificar o escopo aprovado, interromper a implementação, explicar a descoberta e solicitar nova confirmação.

## 6. Consistência Visual e Linguagem do Produto
- Toda página, componente ou fluxo novo ou alterado deve reutilizar o padrão visual vigente do Web Imóvel: paleta, tipografia, espaçamentos, bordas, sombras, ícones, botões, estados de carregamento, estados vazios e comportamento responsivo.
- Áreas administrativas devem parecer parte do mesmo produto e não podem adotar uma interface técnica ou visual desconectada do restante do portal.
- Todo texto visível deve estar em português do Brasil e ser compreensível para o usuário final. Não exibir nomes de tabelas, mensagens SQL, nomes internos de funções ou detalhes de infraestrutura.
- Antes de criar uma experiência sem referência visual ou funcional suficiente no projeto, interromper o trabalho e solicitar orientação ao usuário.
- Quando já existir no projeto uma página, modal, formulário, tabela ou estado equivalente aprovado, novas implementações devem reutilizar fielmente sua composição visual e responsiva; não criar uma variação paralela para a mesma função.

## 7. Dados de Teste Durante o Desenvolvimento
- Registros que o usuário identificar explicitamente como dados de teste podem ser limpos durante a evolução do produto, desde que o alcance exato e os efeitos em relacionamentos sejam informados antes da exclusão.
- Esta autorização não se estende automaticamente a contas, autenticação, documentos privados, leads, conversas ou quaisquer registros reais que não tenham sido identificados como testes.
- Limpezas de catálogos devem preservar tabelas, políticas, auditoria e a capacidade de reconstruir os registros pelo painel administrativo.

## 8. Cabeçalhos de Página
- A seção superior de título de todas as páginas deve seguir o padrão visual do cabeçalho de “Imóveis Favoritados”: área sem fundo próprio, sem faixa, card ou gradiente envolvendo o texto; etiqueta contextual pequena, título escuro, descrição discreta e ações alinhadas à direita quando existirem.
- Fundos, bordas e sombras permanecem permitidos em botões, indicadores e conteúdos abaixo do cabeçalho, mas não no contêiner do título da página.
- Novas páginas devem reutilizar esse padrão. Qualquer exceção visual precisa ser apresentada e confirmada pelo usuário antes da implementação.

## 9. Editor Visual do Portal
- Durante a edição, bloquear centralmente as ações e a navegação do portal inteiro (incluindo cabeçalho, rodapé e navegação mobile), permitindo apenas seleção, texto, rolagem e ferramentas do editor. Novos componentes não podem abrir brechas nesse bloqueio.
- Manter a prévia temporária na memória da página ao fechar/reabrir o editor; somente Publicar persiste a configuração. Os atalhos de um mesmo elemento devem usar controles e dados compartilhados, sem estados paralelos.
- O modo Editar Portal deve permitir seleção e edição no próprio elemento, com ferramentas contextuais. Não substituir esta experiência por um formulário lateral obrigatório.
- Modelos devem variar composição, ordem, tipografia e distribuição dos elementos, não apenas cores. Usar os componentes compartilhados do canvas e IDs estáveis para manter as personalizações.
- Toda funcionalidade visual nova deve ser criada como componente reutilizável e registrada no Editor visual antes de ser disponibilizada no portal; não criar páginas administrativas paralelas para editar conteúdo ou aparência de um portal.
- Configurações de aparência, ordem, visibilidade e conteúdo devem pertencer ao portal do corretor/imobiliária e manter rascunho separado da versão publicada.
- Dados operacionais e reais, como preço, disponibilidade, leads e dados de conta, não podem ser livremente editados pelo Editor visual.
- Novos blocos devem prever prévia responsiva, comportamento no celular, acessibilidade e limites de desempenho desde sua implementação inicial.
- Janelas e painéis flutuantes do editor devem reutilizar `useDraggableSurface`, permanecer limitados à área visível e oferecer restauração da posição; não criar popups de edição fixos que possam encobrir permanentemente o conteúdo.
- Elementos reposicionáveis do portal devem salvar coordenadas por breakpoint (desktop, tablet e celular). Formatação rica aplicada a uma seleção de texto deve permanecer restrita ao trecho selecionado, sem converter o estilo do bloco inteiro.
- A sessão do Editor visual é global ao portal e deve permanecer ativa ao alternar entre a página inicial, o rodapé e os documentos institucionais. Todos usam o mesmo `visual_draft` e `visual_published`; não recriar a antiga página ou rota “Configurações do Site”.
- Termos, privacidade, defesa do consumidor, segurança e cookies podem ter conteúdo e aparência personalizados, mas suas ações funcionais, links oficiais e estrutura mínima não podem ser removidos pelo editor. Blocos inseridos devem registrar seu `scope` para não aparecerem em outra página.

## 10. Entrega de Alterações
- Após toda alteração local, a resposta final deve incluir um script PowerShell para adicionar somente os arquivos daquela implementação, criar o commit e executar o `git push`.
- Quando a implementação criar ou alterar estruturas, políticas ou funções do Supabase, a resposta final também deve indicar claramente o arquivo SQL/migration que precisa ser executado antes do teste em produção.
- Arquivos pendentes de outras tarefas não podem ser incluídos automaticamente no script de push.

## 11. Autenticação, formulários e identidade compartilhada
- Em alterações de autenticação, formulários, notificações, identidade ou uploads, consultar a skill local `.agents/skills/webimovel-product-consistency/SKILL.md`.
- Notificações transitórias devem usar `addToast/ToastContainer`, em português, no canto inferior direito, incluindo boas-vindas após cadastro aceito e autenticação concluída. Decisões administrativas devem também produzir avisos persistentes para o próximo acesso.
- Reutilizar os formatadores e validadores de `src/lib/formInput.ts`. CRECI deve inserir hífen após o sexto dígito e permitir F/J; telefones usam DDD, nomes preservam acentos e pontuação legítima, e-mails são normalizados e validados sem alterar seu significado.
- A identidade de navegação e autenticação deve usar `PortalBrand` e o portal aberto. Templates de e-mail precisam acompanhar a marca aprovada e preservar os links oficiais do Supabase.
- Documentos mantêm o editor avançado compartilhado e sua composição visual, com controles documentais de orientação e otimização, sem recortes ou filtros estéticos. CIRP permite até duas imagens e mantém PDFs e certidões complementares no fluxo documental.
- Revisões administrativas de decisões exigem justificativa, histórico preservado, controle de concorrência e aviso persistente na mesma transação. Retirar aprovação preserva os anúncios existentes; alterações nessa regra exigem novo escopo aprovado.

