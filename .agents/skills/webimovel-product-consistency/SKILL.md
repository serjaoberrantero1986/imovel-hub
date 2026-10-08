---
name: webimovel-product-consistency
description: Aplicar os padrões do Web Imóvel ao alterar autenticação, formulários, notificações, identidade visual e uploads de imagens ou documentos neste projeto.
---

Leia o AGENTS.md na raiz antes de alterar o produto. Esta skill complementa suas regras e não concede autorização adicional.

- Use `addToast` e `ToastContainer` para notificações transitórias em português, no canto inferior direito, acompanhando os temas e o celular. Confirme o sucesso da operação antes de anunciar sucesso. Boas-vindas só devem ocorrer no cadastro aceito ou após concluir a autenticação, incluindo MFA, sem repetir na renovação da sessão.
- Decisões administrativas que exigem acompanhamento precisam de aviso persistido no Supabase, visível após novo login. Use o fluxo de avisos de CIRP para decisões de credenciamento; não confunda toast temporário com entrega persistente.
- Reutilize `src/lib/formInput.ts` em cadastro e perfil. Formate telefone com DDD, aceite nomes com acentos e pontuação legítima, normalize espaços de e-mail e valide antes de persistir. CRECI recebe hífen automático após seis dígitos e sufixo F/J maiúsculo; preserve a compatibilidade de registros existentes com quantidades variáveis de dígitos. Não masque senhas nem remova silenciosamente conteúdo válido de campos livres ou nomes comerciais.
- Todos os uploads de imagens usam `editUserImage/ImageEditorModal`, incluindo documentos. O modo documental mantém a mesma composição visual, com orientação e otimização, preservando o documento inteiro, sem recortes nem filtros estéticos. Valide a entrada e aplique o limite ao arquivo otimizado. CIRP aceita no máximo duas imagens, com limite concorrente no banco; PDFs e certidões seguem o fluxo documental.
- Use `PortalBrand` para a marca em navegação e autenticação, incluindo MFA. A identidade vem do portal aberto. Não introduza marcas fixas alternativas. Templates de e-mail devem usar o logotipo e a paleta aprovados e manter o link oficial de confirmação; aplicar o HTML no Supabase é uma etapa distinta de publicar o frontend.
- Revisões de CIRP exigem privilégio administrativo no servidor, justificativa para rejeitar ou reverter decisões, verificação de concorrência, auditoria preservada e notificação na mesma transação. Retirar aprovação remove o selo e impede novas publicações que exigem credenciamento, preservando anúncios existentes conforme o escopo aprovado.

Valide comportamento observável, estados vazios, temas, celular e condições de erro. Informe separadamente o que foi validado localmente e em produção. Entregue a migration quando houver mudanças no banco e um script de commit/push com somente os arquivos da implementação.
