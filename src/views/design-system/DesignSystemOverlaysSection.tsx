import React, { useState } from 'react';
import { 
  DollarSign, 
  MoreVertical, 
  Edit3, 
  Share2, 
  Download, 
  Trash2, 
  ShieldCheck 
} from 'lucide-react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  Button, 
  Modal, 
  Drawer, 
  Dropdown, 
  Tooltip, 
  Tabs, 
  Input, 
  Textarea, 
  Select, 
  Checkbox 
} from '../../components/ui';

export const DesignSystemOverlaysSection: React.FC<{
  onToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void;
}> = ({ onToast }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerPos, setDrawerPos] = useState<'right' | 'left' | 'bottom'>('right');
  const [activeDemoTab, setActiveDemoTab] = useState('tab-1');
  const [tabVariant, setTabVariant] = useState<'pills' | 'underline' | 'segment'>('segment');

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <Card>
        <CardHeader>
          <CardTitle>Modais, Drawers, Dropdowns & Tooltips</CardTitle>
          <CardDescription>
            Camadas de sobreposição acessíveis com bloqueio de scroll, controle por teclado (ESC) e transições fluidas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Modal Trigger */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white font-['Outfit']">
                Modal de Diálogo
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Janela centralizada com backdrop blur e suporte a cabeçalho, corpo rolável e ações no rodapé.
              </p>
              <Button onClick={() => setIsModalOpen(true)}>
                Abrir Modal Exemplo
              </Button>
            </div>

            {/* Drawer Trigger */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white font-['Outfit']">
                Drawer Lateral / Painel Deslizante
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Excelente para filtros avançados de busca, CRM e edição rápida de formulários.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => { setDrawerPos('right'); setIsDrawerOpen(true); }}>
                  Direita (Right)
                </Button>
                <Button variant="secondary" size="sm" onClick={() => { setDrawerPos('left'); setIsDrawerOpen(true); }}>
                  Esquerda (Left)
                </Button>
                <Button variant="secondary" size="sm" onClick={() => { setDrawerPos('bottom'); setIsDrawerOpen(true); }}>
                  Inferior (Bottom)
                </Button>
              </div>
            </div>
          </div>

          {/* Dropdown & Tooltip Demo */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-4">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white font-['Outfit']">
              Dropdowns & Tooltips
            </h4>
            <div className="flex flex-wrap items-center gap-6">
              {/* Dropdown */}
              <Dropdown
                trigger={
                  <Button variant="outline" size="sm" rightIcon={<MoreVertical className="w-4 h-4" />}>
                    Ações do Anúncio
                  </Button>
                }
                items={[
                  { id: 'edit', label: 'Editar Imóvel', icon: <Edit3 className="w-4 h-4 text-indigo-500" />, onClick: () => onToast('info', 'Editar acionado'), shortcut: '⌘E' },
                  { id: 'share', label: 'Compartilhar Link', icon: <Share2 className="w-4 h-4 text-emerald-500" />, onClick: () => onToast('success', 'Link copiado!') },
                  { id: 'export', label: 'Baixar Relatório PDF', icon: <Download className="w-4 h-4 text-sky-500" />, onClick: () => onToast('info', 'Baixando PDF...') },
                  { id: 'div1', label: '', divider: true },
                  { id: 'delete', label: 'Excluir Anúncio', icon: <Trash2 className="w-4 h-4" />, danger: true, onClick: () => onToast('error', 'Exclusão solicitada') },
                ]}
              />

              {/* Tooltips */}
              <Tooltip content="Métrica atualizada em tempo real a cada 5 minutos" position="top">
                <Button variant="secondary" size="sm">
                  Hover para Tooltip Superior
                </Button>
              </Tooltip>

              <Tooltip content="Verificado pelo Conselho Regional de Corretores de Imóveis" position="bottom">
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold cursor-help bg-emerald-50 dark:bg-emerald-950/60 px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800">
                  <ShieldCheck className="w-4 h-4" />
                  <span>CRECI 100% Regularizado</span>
                </div>
              </Tooltip>
            </div>
          </div>

          {/* Tabs Demo */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white font-['Outfit']">
                Componente de Abas (Tabs)
              </h4>
              <div className="flex gap-1 text-xs">
                {(['segment', 'pills', 'underline'] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => setTabVariant(v)}
                    className={`px-2.5 py-1 rounded-lg font-semibold ${
                      tabVariant === v ? 'bg-rose-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <Tabs
              variant={tabVariant}
              activeTab={activeDemoTab}
              onChange={setActiveDemoTab}
              tabs={[
                { id: 'tab-1', label: 'Todos os Imóveis', badge: 14 },
                { id: 'tab-2', label: 'À Venda', badge: 9 },
                { id: 'tab-3', label: 'Locação', badge: 5 },
                { id: 'tab-4', label: 'Arquivados', disabled: true },
              ]}
            />

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
              Conteúdo ativo renderizado para a aba: <strong className="text-slate-900 dark:text-white font-bold">{activeDemoTab}</strong>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal Instance */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Confirmar Proposta Imobiliária"
        description="Envie sua intenção de compra ou agendamento para o corretor responsável."
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setIsModalOpen(false);
                onToast('success', 'Proposta Enviada com Sucesso!');
              }}
            >
              Confirmar Envio
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-sm">
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            Você está prestes a registrar um interesse formal no anúncio <strong>#9840-APTO (Edifício Le Quartier)</strong>.
          </p>
          <Input label="Valor da Proposta Inicial" placeholder="R$ 790.000" leftIcon={<DollarSign className="w-4 h-4" />} />
          <Textarea label="Mensagem para o Corretor" placeholder="Gostaria de agendar visita neste sábado às 10h e saber sobre as condições de financiamento." rows={3} />
        </div>
      </Modal>

      {/* Drawer Instance */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        position={drawerPos}
        title="Filtros Avançados de Busca"
        description="Refine sua busca por bairros, condomínios e comodidades."
        footer={
          <>
            <Button variant="outline" onClick={() => setIsDrawerOpen(false)}>
              Limpar
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setIsDrawerOpen(false);
                onToast('info', 'Filtros aplicados à busca');
              }}
            >
              Aplicar Filtros (14 Resultados)
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Tipo de Imóvel"
            options={[
              { value: 'all', label: 'Todos os tipos' },
              { value: 'apartment', label: 'Apartamento' },
              { value: 'house', label: 'Casa de Rua' },
              { value: 'condo_house', label: 'Casa em Condomínio' },
            ]}
          />
          <Input label="Preço Mínimo (R$)" placeholder="300.000" />
          <Input label="Preço Máximo (R$)" placeholder="2.500.000" />
          <div className="space-y-2 pt-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Comodidades</span>
            <Checkbox label="Portaria 24 horas" defaultChecked />
            <Checkbox label="Varanda Gourmet" defaultChecked />
            <Checkbox label="Piscina Aquecida" />
            <Checkbox label="Academia Completa" />
            <Checkbox label="Aceita Animais (Pet Friendly)" defaultChecked />
          </div>
        </div>
      </Drawer>
    </div>
  );
};
