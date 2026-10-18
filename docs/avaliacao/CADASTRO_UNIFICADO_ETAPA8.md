# Cadastro unificado — Avaliação Inteligente na etapa 8

**A avaliação deixou de ser uma página independente.** O fluxo de sete passos do cadastro/edição continua, com **Avaliação (opcional)** adicionada como o oitavo. Não há escolha inicial entre "Anunciar" ou "Avaliar".

## Jornada
- Novo anúncio: o corretor preenche normalmente e salva/publica na etapa 7. O popup então permanece aberto na etapa 8, que pode ser ignorada (botão "Concluir / Fechar").
- Edição: ao salvar, a mesma etapa 8 é oferecida, sem tornar a avaliação obrigatória.
- Meus Anúncios: botão "Avaliar" de cada anúncio próprio abre o popup diretamente no passo 8.
- Cada avaliação é privada e guarda uma cópia dos principais campos e referências das fotos, sem alterar preços públicos; versões anteriores permanecem vinculadas ao anúncio.
- Avaliação antiga permanece no banco se o anúncio for excluído, mas a tela de acesso ao histórico de anúncios excluídos não faz parte deste MVP.
- O motor de triagem permanece conservador: não produz preço, intervalo nem PTAM.

## Cadastros compartilhados
- Tipos e comodidades: o anúncio já usa os catálogos administrados em `property_types_catalog` e `features`. A etapa 8 usa os dados desse mesmo anúncio, sem segundo cadastro.
- CEP: continua usando ViaCEP para rua/bairro/cidade/UF, sem bloquear a edição manual.
- Bairros: consulta lista oficial do município IBGE e nomes informados por profissionais (`community_neighborhoods`). No campo do endereço é permitido manter nomes novos; registros novos são enviados via RPC autenticado para o município escolhido. A lista de região de atuação também é ampliada.
- A busca tolerante normaliza acentos, abreviações e caracteres, e sugere grafias próximas sem fazer correção silenciosa. O catálogo colaborativo é distinto dos dados oficiais.
- Município/catálogo colaborativo: nesta versão funciona em **São Paulo**; endereços em outros estados continuam editáveis com ViaCEP, porém não alimentam o catálogo SP.

## Mapa e privacidade
- Leaflet na etapa de localização, com confirmação manual opcional da posição do lote.
- `property_locations.coordinate_quality`: unknown, approximate, geocoded, property. O legado começa como unknown, nunca é promovido automaticamente.
- `property_public_locations` continua a fonte da posição pública aproximada. Coordenadas prediais privadas só podem ser vistas pelo titular com acesso à tabela privada (RLS e MFA); componentes públicos não recebem as coordenadas confirmadas.
- A confirmação manual prevalece sobre as heurísticas automáticas de centróide de bairro/cidade.

## Alterações no banco
- `20261018000002_valuation_linked_wizard_and_location_quality.sql`: compatibilidade com tipos cadastrados, avaliação vinculada a anúncio próprio, snapshot e precisão geográfica; proteção de vínculo feita com trigger.
- `20261018000003_collaborative_neighborhoods.sql`: nomes comunitários e RPC de contribuição autenticada. Novos bairros não passam a ser chamados de "oficiais" automaticamente.
- Migrations aditivas, sem exclusão de anúncios.

## Checklist de testes funcionais em produção
1. Anunciar normalmente sem avaliar: publicar, ignorar etapa 8, verificar anúncio no portal.
2. Editar anúncio próprio e salvar: seguir para etapa 8; sair sem criar avaliação.
3. Abrir "Avaliar" em Meus Anúncios: abrir diretamente na etapa 8 do mesmo popup.
4. Criar avaliação e comparável; voltar ao mesmo imóvel; confirmar persistência/histórico no Supabase.
5. Verificar RLS em duas contas profissionais distintas; não permitir associar avaliação ao anúncio de outro.
6. CEP com bairro preenchido; manter e editar o bairro; testar pesquisa aproximada em região de atuação (Melo/Mello, Pagliato/Paliato, Benedito/Benedicto).
7. Confirmar marcador exato e validar que visitante continua vendo somente bairro/posição pública aproximada, nunca número, CEP ou ponto privado.
8. Verificar em mobile, desktop, tema escuro e claro.

Não foram incluídos scraping de terceiros, precificação homologada, compartilhamento público de avaliações ou relatório PTAM.
