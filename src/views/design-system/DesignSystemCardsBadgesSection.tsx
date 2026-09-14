import React from 'react';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Badge, Button } from '../../components/ui';

export const DesignSystemCardsBadgesSection: React.FC<{
  onShowToast: (title: string) => void;
}> = ({ onShowToast }) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Badges Showcase */}
      <Card>
        <CardHeader>
          <CardTitle>Badges & Status Imobiliários</CardTitle>
          <CardDescription>
            Pills e etiquetas contextuais para status de negociação, tags e validações de credenciais.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="sale" dot>Venda</Badge>
            <Badge variant="rent" dot>Aluguel</Badge>
            <Badge variant="launch" dot>Lançamento</Badge>
            <Badge variant="verified" dot>CRECI Verificado</Badge>
            <Badge variant="exclusive" dot>Exclusividade</Badge>
            <Badge variant="luxury" dot>Coleção Luxury</Badge>
            <Badge variant="featured">Super Destaque</Badge>
            <Badge variant="success">Proposta Aceita</Badge>
            <Badge variant="warning">Em Negociação</Badge>
            <Badge variant="danger">Preço Reduzido</Badge>
            <Badge variant="pending">Aguardando Moderação</Badge>
            <Badge variant="draft">Rascunho</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Cards Showcase */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Default Card */}
        <Card variant="default">
          <CardHeader>
            <div className="flex justify-between items-center">
              <Badge variant="sale">Venda</Badge>
              <span className="text-xs font-bold text-rose-600">R$ 1.250.000</span>
            </div>
            <CardTitle>Card Padrão (Default)</CardTitle>
            <CardDescription>Jardim América • Sorocaba/SP</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Borda suave e sombra sutil projetada para listagens limpas e escaneabilidade.
            </p>
          </CardContent>
          <CardFooter>
            <span className="text-xs text-slate-400">Ref: 9812-JARD</span>
            <Button size="xs" variant="outline">Ver Detalhes</Button>
          </CardFooter>
        </Card>

        {/* Elevated Card */}
        <Card variant="elevated" hoverEffect>
          <CardHeader>
            <div className="flex justify-between items-center">
              <Badge variant="luxury">Luxury</Badge>
              <span className="text-xs font-bold text-amber-500">R$ 3.800.000</span>
            </div>
            <CardTitle>Card Elevado c/ Hover</CardTitle>
            <CardDescription>Fazenda Boa Vista • Porto Feliz</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Elevação com hover transform para cartões de imóveis em destaque e banners interativos.
            </p>
          </CardContent>
          <CardFooter>
            <span className="text-xs text-slate-400">4 Suítes • 650m²</span>
            <Button size="xs" variant="primary">Agendar Visita</Button>
          </CardFooter>
        </Card>

        {/* Interactive Card */}
        <Card variant="interactive" onClick={() => onShowToast('Card Clicado!')}>
          <CardHeader>
            <div className="flex justify-between items-center">
              <Badge variant="verified">Corretor Pro</Badge>
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
            </div>
            <CardTitle>Card Interativo (Clickable)</CardTitle>
            <CardDescription>Clique em qualquer parte para testar ação</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Especialmente projetado para itens de dashboard, métricas e cartões de corretores parceiros.
            </p>
          </CardContent>
          <CardFooter>
            <span className="text-xs text-indigo-600 font-semibold">14 Imóveis Ativos</span>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
