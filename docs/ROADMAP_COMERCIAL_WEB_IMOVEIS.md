# Roteiro comercial do Web Imóveis

Atualizado em: 1º de novembro de 2026

Este arquivo é a referência de continuidade da transformação do Web Imóveis em SaaS. Ajustes finos podem ser feitos dentro de uma etapa, mas nenhuma etapa é considerada concluída sem seus critérios de validação.

## Decisões vigentes

- `webimoveis.site`: landing page comercial.
- `app.webimoveis.site`: área autenticada central; profissionais aprovados entram em CRM & Leads.
- Portais em uso: `souzanegocios.webimoveis.site` e `priconsultora.webimoveis.site`.
- Planos: Essencial (R$ 59), Profissional (R$ 119) e Imobiliária (R$ 249).
- Provedor de cobrança escolhido: Asaas.
- Checkout inicial: hospedado pelo Asaas; confirmação exclusivamente por webhook idempotente.
- O corretor precisa concluir a validação do CRECI antes de criar o primeiro anúncio.
- Imóveis atuais dos subdomínios são dados de teste, embora estejam em produção.

## Etapa 1 — Landing e catálogo comercial

Estado: em implementação.

- Landing moderna no domínio raiz.
- Catálogo de planos armazenado no Supabase.
- Administração de nome, preço, descrição, destaque, ordem, disponibilidade e limites.
- CTAs preparados para contratação, sem cobrança real nesta etapa.
- Preservação dos portais profissionais.

Critério de conclusão: landing publicada e responsiva; administrador consegue alterar os três planos; alterações aparecem na landing.

## Etapa 2 — Navegação e credenciamento

Estado: em implementação parcial.

- Login iniciado em portal retorna ao portal.
- Login direto no app abre CRM & Leads.
- Profissional não aprovado é direcionado ao perfil/credenciamento.
- Criação de anúncio bloqueada até aprovação do CRECI, inclusive no banco.
- Primeiro anúncio sugerido após aprovação.

Critério de conclusão: testar comprador, corretor pendente, corretor aprovado e administrador em celular e desktop.

## Etapa 3 — Motor de planos

Estado: vitrines e destaques já possuem base; demais limites planejados.

- Imóveis ativos, usuários, vitrines, destaques e filtros.
- Avaliações e assinaturas incluídas.
- Mudanças de subdomínio e domínio próprio.
- Consumo, excedentes e histórico.

Critério de conclusão: todas as permissões são validadas no servidor e exibidas claramente no produto.

## Etapa 4 — Asaas

Estado: decidido; não iniciado.

- Cadastro pendente vinculado ao plano.
- Checkout hospedado.
- Webhook com assinatura verificada, idempotência e auditoria.
- Ativação, renovação, atraso, tolerância, cancelamento, upgrade e downgrade.
- Portal de cobrança e compras adicionais.

Critério de conclusão: fluxo Sandbox completo e posteriormente uma cobrança real controlada.

## Etapa 5 — Recursos comerciais adicionais

Estado: planejado.

- Equipes e permissões.
- Analytics avançado e exportação.
- Automação e distribuição de leads.
- Domínio próprio e remoção de marca.
- Pacotes adicionais e implantação assistida.
- Emissão de NFS-e, após validação fiscal.

## Etapa 6 — Crescimento

Estado: futuro.

- Plano anual, cupons, indicação e recuperação de checkout.
- Testes A/B e métricas de conversão.
- Upgrades por uso e planos empresariais personalizados.

