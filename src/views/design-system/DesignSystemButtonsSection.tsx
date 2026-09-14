import React, { useState } from 'react';
import { Layers, Plus, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from '../../components/ui';

export const DesignSystemButtonsSection: React.FC = () => {
  const [loadingBtn, setLoadingBtn] = useState(false);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <Card>
        <CardHeader>
          <CardTitle>Variantes e Estilos de Botão</CardTitle>
          <CardDescription>
            Botões responsivos com estados interativos, feedback visual ao clique e suporte a ícones e loading.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Variants */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Variantes Visuais
            </h4>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary">Primary Brand</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="luxury">Luxury Gold</Button>
              <Button variant="link">Link Style</Button>
            </div>
          </div>

          {/* Sizes */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Escala de Tamanhos
            </h4>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="xs">Extra Small (xs)</Button>
              <Button size="sm">Small (sm)</Button>
              <Button size="md">Medium Default (md)</Button>
              <Button size="lg">Large (lg)</Button>
              <Button size="xl">Extra Large (xl)</Button>
            </div>
          </div>

          {/* With Icons & States */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Com Ícones & Estados
            </h4>
            <div className="flex flex-wrap items-center gap-3">
              <Button leftIcon={<Plus className="w-4 h-4" />}>
                Adicionar Anúncio
              </Button>
              <Button rightIcon={<ArrowRight className="w-4 h-4" />} variant="secondary">
                Ver no Mapa
              </Button>
              <Button
                isLoading={loadingBtn}
                onClick={() => {
                  setLoadingBtn(true);
                  setTimeout(() => setLoadingBtn(false), 2000);
                }}
              >
                {loadingBtn ? 'Processando...' : 'Clique para Testar Loading'}
              </Button>
              <Button disabled>Desabilitado</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
