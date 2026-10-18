# Web Imóveis — Módulo de Avaliação | Fase 1

Esta etapa adiciona o **motor isolado de auditoria de amostras** ao repositório, sem alterar telas, autenticação, migrations, dados reais ou deploy. Não é um PTAM.

## Utilização
```js
import { auditComparables } from './src/lib/valuation/engine.mjs';
const resultado = auditComparables(imovelAvaliado, anunciosObtidosLegalmente);
```

O motor aceita dados de imóveis e referências de fontes autorizadas ou informadas manualmente pelo corretor (OLX, Marketplace e sites próprios). **Não faz scraping, não acessa plataformas e não possui anúncios fictícios no produto.** Os exemplos das verificações existem apenas nos testes.

Ele mede distâncias por Haversine, certifica raios exclusivamente quando ambos os imóveis possuem coordenadas prediais, evita duplicidade automática com identificador verificável, código do mesmo publicador ou link canônico, aplica regras de aceitação/pendência/rejeição e explica os motivos. Similaridade visual isolada não prova duplicidade.

Status *aceito* significa apenas elegibilidade cadastral para análise posterior. **Não libera valor, intervalo estatístico, ajuste percentual ou parecer**, independentemente da quantidade de amostras.

## Testes
`node --test scripts/test-valuation-engine.mjs`

## Próxima fase — depende de escopo aprovado
Formulário autenticado, navegação e persistência por corretor no Supabase com RLS e MFA; importação assistida de links sem violar regras de plataformas; painel de amostras e revisão. Uma migration e testes de isolamento entre contas serão obrigatórios antes do uso em produção.
