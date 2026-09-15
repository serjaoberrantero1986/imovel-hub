# Diretrizes de Desenvolvimento e Produção

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
