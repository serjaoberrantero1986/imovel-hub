import React, { useState } from 'react';
import { 
  Palette, 
  Sparkles, 
  Layers, 
  Layout, 
  Type, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  XCircle, 
  ArrowRight, 
  Plus, 
  Trash2, 
  Eye, 
  Edit3, 
  Search, 
  Mail, 
  Lock, 
  Building, 
  DollarSign, 
  Share2, 
  Download, 
  MoreVertical,
  Sliders,
  Check,
  Building2,
  Calendar,
  Phone,
  ShieldCheck,
  Compass
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { 
  Button, 
  Input, 
  Textarea, 
  Select, 
  Checkbox, 
  Radio, 
  Switch, 
  Badge, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter, 
  Modal, 
  Drawer, 
  Tabs, 
  Dropdown, 
  Tooltip, 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell, 
  TableEmpty, 
  Pagination, 
  Skeleton, 
  PropertyCardSkeleton, 
  TableSkeleton, 
  Alert, 
  Breadcrumbs, 
  FormField 
} from '../components/ui';
import { Sidebar } from '../components/layout/Sidebar';
import { UserMenu } from '../components/layout/UserMenu';
import { DESIGN_TOKENS } from '../styles/tokens';
import { formatCurrency } from '../lib/utils';

export const DesignSystemView: React.FC = () => {
  const { theme, toggleTheme, addToast, setCurrentView } = useApp();

  // Active category tab in design system
  const [activeSection, setActiveSection] = useState<'tokens' | 'buttons' | 'forms' | 'cards_badges' | 'overlays' | 'tables_pagination' | 'feedback' | 'navigation'>('tokens');

  // Interactive component states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerPos, setDrawerPos] = useState<'right' | 'left' | 'bottom'>('right');
  const [activeDemoTab, setActiveDemoTab] = useState('tab-1');
  const [tabVariant, setTabVariant] = useState<'pills' | 'underline' | 'segment'>('segment');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [switch1, setSwitch1] = useState(true);
  const [switch2, setSwitch2] = useState(false);
  const [checkbox1, setCheckbox1] = useState(true);
  const [radioVal, setRadioVal] = useState('residential');
  const [inputText, setInputText] = useState('Casa em Condomínio');
  const [loadingBtn, setLoadingBtn] = useState(false);

  const sections = [
    { id: 'tokens', label: 'Tokens & Cores', icon: <Palette className="w-4 h-4" /> },
    { id: 'buttons', label: 'Botões', icon: <Layers className="w-4 h-4" /> },
    { id: 'forms', label: 'Inputs & Formulários', icon: <Edit3 className="w-4 h-4" /> },
    { id: 'cards_badges', label: 'Cards & Badges', icon: <Building2 className="w-4 h-4" /> },
    { id: 'overlays', label: 'Modais & Drawers', icon: <Sliders className="w-4 h-4" /> },
    { id: 'tables_pagination', label: 'Tabelas & Paginação', icon: <Layout className="w-4 h-4" /> },
    { id: 'feedback', label: 'Alerts, Toasts & Skeletons', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'navigation', label: 'Navegação & Breadcrumbs', icon: <Compass className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Hero */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-6 sm:p-10 text-white shadow-xl border border-slate-700/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-600/90 text-white">
                Design System v2.0
              </span>
              <span className="text-xs text-amber-300 font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                ImovelHub Pro Architecture
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight font-['Outfit']">
              Guia Completo de Componentes & Tokens
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl">
              Sistema de design moderno, modular e responsivo construído especialmente para marketplaces e CRMs imobiliários de alto padrão.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="text-white border-slate-600 hover:bg-slate-800"
              onClick={toggleTheme}
            >
              Tema: {theme === 'dark' ? '🌙 Modo Escuro' : '☀️ Modo Claro'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setCurrentView('portal')}
            >
              Ir ao Portal
            </Button>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="sticky top-20 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
          <div className="flex items-center gap-1.5 min-w-max">
            {sections.map(sec => (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeSection === sec.id
                    ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/30'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {sec.icon}
                <span>{sec.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Section: Tokens & Colors */}
        {activeSection === 'tokens' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            
            {/* Color Palette Cards */}
            <Card>
              <CardHeader>
                <CardTitle>Paleta Cromática do Marketplace</CardTitle>
                <CardDescription>
                  Matizes calibrados com alto contraste e elegância para o mercado imobiliário premium.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Brand Rose */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                    Cores de Destaque & Conversão (Brand Rose)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {[
                      { name: 'Rose 50', hex: '#fff1f2', bg: 'bg-rose-50', text: 'text-slate-800' },
                      { name: 'Rose 100', hex: '#ffe4e6', bg: 'bg-rose-100', text: 'text-slate-800' },
                      { name: 'Rose 500', hex: '#f43f5e', bg: 'bg-rose-500', text: 'text-white' },
                      { name: 'Rose 600 (Primary)', hex: '#e11d48', bg: 'bg-rose-600', text: 'text-white font-bold' },
                      { name: 'Rose 700', hex: '#be123c', bg: 'bg-rose-700', text: 'text-white' },
                      { name: 'Rose 900', hex: '#881337', bg: 'bg-rose-900', text: 'text-white' },
                    ].map(c => (
                      <div key={c.name} className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xs">
                        <div className={`h-16 ${c.bg} flex items-center justify-center p-2 text-center text-xs ${c.text}`}>
                          {c.hex}
                        </div>
                        <div className="p-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-center text-xs font-medium truncate">
                          {c.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Neutrals Slate */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                    Neutros Sofisticados (Slate / Obsidian)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {[
                      { name: 'Slate 50', hex: '#f8fafc', bg: 'bg-slate-50', text: 'text-slate-800' },
                      { name: 'Slate 200', hex: '#e2e8f0', bg: 'bg-slate-200', text: 'text-slate-800' },
                      { name: 'Slate 600', hex: '#475569', bg: 'bg-slate-600', text: 'text-white' },
                      { name: 'Slate 800', hex: '#1e293b', bg: 'bg-slate-800', text: 'text-white' },
                      { name: 'Slate 900', hex: '#0f172a', bg: 'bg-slate-900', text: 'text-white' },
                      { name: 'Slate 950 (Dark Canvas)', hex: '#090d16', bg: 'bg-slate-950', text: 'text-white font-bold' },
                    ].map(c => (
                      <div key={c.name} className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xs">
                        <div className={`h-16 ${c.bg} flex items-center justify-center p-2 text-center text-xs ${c.text}`}>
                          {c.hex}
                        </div>
                        <div className="p-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-center text-xs font-medium truncate">
                          {c.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Functional Accents */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                    Cores de Ação e Status
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                      Emerald (Sucesso / CRECI / Verificado)
                    </div>
                    <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-300 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300 text-xs font-bold">
                      Indigo (Locação / Analytics / Comparador)
                    </div>
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-bold">
                      Amber (Oportunidade / Alerta / Lançamento)
                    </div>
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-300 text-xs font-bold">
                      Red (Alerta Crítico / Exclusão / Cancelamento)
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>

            {/* Typography Scale */}
            <Card>
              <CardHeader>
                <CardTitle>Hierarquia Tipográfica</CardTitle>
                <CardDescription>
                  Par de fontes modernas: <strong>Outfit</strong> para títulos imobiliários de destaque e <strong>Plus Jakarta Sans</strong> para leitura confortável.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 space-y-3">
                  <div>
                    <span className="text-xs text-slate-400 font-mono">H1 / Display (Outfit Extrabold 36px/40px)</span>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white font-['Outfit']">
                      Mansão Suspensa em Condomínio Fechado
                    </h1>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-mono">H2 / Section Title (Outfit Bold 24px)</span>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-['Outfit']">
                      Detalhes do Imóvel & Infraestrutura de Lazer
                    </h2>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-mono">H3 / Card Title (Outfit Bold 18px)</span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white font-['Outfit']">
                      Apartamento Alto Padrão - 4 Suítes
                    </h3>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-mono">Body / Regular (Plus Jakarta Sans 14px/16px)</span>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
                      Excelente oportunidade no bairro Campolim com acabamento em mármore importado, varanda gourmet envidraçada, automação residencial completa e vista panorâmica privilegiada.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        )}

        {/* Section: Buttons */}
        {activeSection === 'buttons' && (
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
        )}

        {/* Section: Forms & Inputs */}
        {activeSection === 'forms' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <Card>
              <CardHeader>
                <CardTitle>Elementos de Formulário Imobiliário</CardTitle>
                <CardDescription>
                  Inputs tipados, selects personalizados, caixas de texto com contagem de caracteres, checkboxes, rádios e switches.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Inputs Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Título do Anúncio"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    helperText="Ex: Apartamento com 3 dormitórios no Campolim"
                    leftIcon={<Building className="w-4 h-4" />}
                    clearable
                    onClear={() => setInputText('')}
                    required
                  />

                  <Input
                    label="Valor de Venda (R$)"
                    placeholder="850.000"
                    leftIcon={<DollarSign className="w-4 h-4" />}
                    helperText="Formato monetário em Real brasileiro (BRL)"
                  />

                  <Input
                    type="email"
                    label="E-mail de Contato"
                    placeholder="corretor@imobiliaria.com.br"
                    leftIcon={<Mail className="w-4 h-4" />}
                  />

                  <Input
                    type="password"
                    label="Senha de Acesso"
                    placeholder="••••••••"
                    leftIcon={<Lock className="w-4 h-4" />}
                    helperText="Mínimo de 8 caracteres alfanuméricos"
                  />

                  <Input
                    label="Input com Erro de Validação"
                    value="valor_invalido@"
                    error="O código do imóvel inserido não foi localizado na base do CRECI."
                  />

                  <Select
                    label="Finalidade do Imóvel"
                    leftIcon={<Building className="w-4 h-4" />}
                    options={[
                      { value: 'sale', label: 'Venda (Comprar)' },
                      { value: 'rent', label: 'Locação (Alugar)' },
                      { value: 'launch', label: 'Lançamento na Planta' },
                    ]}
                  />
                </div>

                {/* Textarea */}
                <Textarea
                  label="Descrição Completa do Imóvel"
                  placeholder="Descreva os diferenciais, áreas comuns, acabamentos, insolação e proximidade a comércios..."
                  showCount
                  maxLength={500}
                  rows={4}
                  helperText="Boas descrições aumentam em até 40% a taxa de conversão em leads."
                />

                {/* Checkboxes, Radios, and Switches */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Checkboxes */}
                  <div className="space-y-3">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">Checkboxes</h5>
                    <Checkbox
                      label="Piscina privativa"
                      description="Área de lazer exclusiva da unidade"
                      checked={checkbox1}
                      onChange={e => setCheckbox1(e.target.checked)}
                    />
                    <Checkbox
                      label="Aceita permuta"
                      description="Estuda proposta por imóvel de menor valor"
                    />
                    <Checkbox
                      label="Opção Desabilitada"
                      disabled
                    />
                  </div>

                  {/* Radios */}
                  <div className="space-y-3">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">Radio Groups</h5>
                    <Radio
                      name="prop_category"
                      label="Residencial"
                      description="Casas, apartamentos e sobrados"
                      checked={radioVal === 'residential'}
                      onChange={() => setRadioVal('residential')}
                    />
                    <Radio
                      name="prop_category"
                      label="Comercial / Corporativo"
                      description="Salas, lajes e galpões"
                      checked={radioVal === 'commercial'}
                      onChange={() => setRadioVal('commercial')}
                    />
                    <Radio
                      name="prop_category"
                      label="Terreno / Lote"
                      description="Lotes em condomínio ou rua pública"
                      checked={radioVal === 'land'}
                      onChange={() => setRadioVal('land')}
                    />
                  </div>

                  {/* Switches */}
                  <div className="space-y-4">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">Switches</h5>
                    <Switch
                      label="Anúncio Ativo e Publicado"
                      description="Visível para todos os compradores no portal"
                      checked={switch1}
                      onChange={setSwitch1}
                    />
                    <Switch
                      label="Destaque Super Premium"
                      description="Aparece no topo das buscas regionais"
                      checked={switch2}
                      onChange={setSwitch2}
                    />
                  </div>

                </div>

              </CardContent>
            </Card>
          </div>
        )}

        {/* Section: Cards & Badges */}
        {activeSection === 'cards_badges' && (
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
              <Card variant="interactive" onClick={() => addToast({ type: 'info', title: 'Card Clicado!' })}>
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
        )}

        {/* Section: Overlays (Modals & Drawers) */}
        {activeSection === 'overlays' && (
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
                        { id: 'edit', label: 'Editar Imóvel', icon: <Edit3 className="w-4 h-4 text-indigo-500" />, onClick: () => addToast({ type: 'info', title: 'Editar acionado' }), shortcut: '⌘E' },
                        { id: 'share', label: 'Compartilhar Link', icon: <Share2 className="w-4 h-4 text-emerald-500" />, onClick: () => addToast({ type: 'success', title: 'Link copiado!' }) },
                        { id: 'export', label: 'Baixar Relatório PDF', icon: <Download className="w-4 h-4 text-sky-500" />, onClick: () => addToast({ type: 'info', title: 'Baixando PDF...' }) },
                        { id: 'div1', label: '', divider: true },
                        { id: 'delete', label: 'Excluir Anúncio', icon: <Trash2 className="w-4 h-4" />, danger: true, onClick: () => addToast({ type: 'error', title: 'Exclusão solicitada' }) },
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
                      addToast({ type: 'success', title: 'Proposta Enviada com Sucesso!' });
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
                      addToast({ type: 'info', title: 'Filtros aplicados à busca' });
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
        )}

        {/* Section: Tables & Pagination */}
        {activeSection === 'tables_pagination' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <Card>
              <CardHeader>
                <CardTitle>Tabela de Dados & Paginação Completa</CardTitle>
                <CardDescription>
                  Tabela limpa e modular com cabeçalhos ordenáveis, células personalizadas, badges de status e controle de paginação.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código / Imóvel</TableHead>
                      <TableHead>Tipo & Bairro</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Visualizações</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { code: '9840-APTO', title: 'Edifício Royal Park', type: 'Apartamento', neighborhood: 'Campolim', price: 950000, status: 'published', views: 432 },
                      { code: '1029-CASA', title: 'Casa no Condomínio Ibiti', type: 'Casa em Condomínio', neighborhood: 'Ibiti do Paço', price: 1450000, status: 'published', views: 289 },
                      { code: '3341-SALA', title: 'Sala Comercial Iguatemi Business', type: 'Comercial', neighborhood: 'Parque Campolim', price: 420000, status: 'pending', views: 115 },
                      { code: '7721-COBE', title: 'Cobertura Duplex com Piscina', type: 'Cobertura', neighborhood: 'Jardim América', price: 2800000, status: 'draft', views: 45 },
                    ].map(row => (
                      <TableRow key={row.code}>
                        <TableCell>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block font-['Outfit']">
                              {row.title}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">
                              #{row.code}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                            {row.type}
                          </span>
                          <span className="text-xs text-slate-400">
                            {row.neighborhood}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-slate-900 dark:text-white text-xs">
                            {formatCurrency(row.price)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={row.status === 'published' ? 'sale' : row.status === 'pending' ? 'pending' : 'draft'}
                            size="sm"
                          >
                            {row.status === 'published' ? 'Publicado' : row.status === 'pending' ? 'Em Análise' : 'Rascunho'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                            {row.views} views
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button size="xs" variant="ghost" title="Visualizar">
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="xs" variant="ghost" title="Editar">
                              <Edit3 className="w-3.5 h-3.5 text-indigo-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                <Pagination
                  currentPage={currentPage}
                  totalPages={5}
                  totalItems={48}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={setItemsPerPage}
                />

              </CardContent>
            </Card>
          </div>
        )}

        {/* Section: Feedback (Alerts, Toasts, Skeletons) */}
        {activeSection === 'feedback' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            
            {/* Alerts */}
            <Card>
              <CardHeader>
                <CardTitle>Banners de Alerta & Notificações (Alerts)</CardTitle>
                <CardDescription>
                  Avisos importantes de status, pendências do CRECI e novidades da plataforma.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                
                <Alert variant="info" title="Nova funcionalidade de IA liberada!">
                  Agora você pode gerar automaticamente descrições persuasivas para seus anúncios utilizando o assistente inteligente do ImovelHub.
                </Alert>

                <Alert variant="success" title="Credenciais Verificadas com Sucesso">
                  Seu número de registro CRECI foi validado pelo conselho. O selo de autenticidade já está ativo nos seus anúncios.
                </Alert>

                <Alert variant="warning" title="Documentação Pendente">
                  O imóvel #9840 necessita do envio do IPTU e matrícula atualizada para manter o selo de Destaque Ouro.
                </Alert>

                <Alert variant="error" title="Falha ao processar pagamento do plano">
                  Não conseguimos renovar a assinatura da Imobiliária. Atualize os dados do cartão de crédito para evitar a desativação dos anúncios.
                </Alert>

                <Alert variant="luxury" title="Coleção Private Luxury 2026">
                  Seu perfil foi selecionado para participar do programa de divulgação em portais internacionais parceiros.
                </Alert>

              </CardContent>
            </Card>

            {/* Toasts Trigger */}
            <Card>
              <CardHeader>
                <CardTitle>Notificações Flutuantes (Toasts)</CardTitle>
                <CardDescription>
                  Dispare notificações com feedback instantâneo para ações de CRUD, mensagens e favoritos.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => addToast({ type: 'success', title: 'Imóvel Cadastrado!', message: 'O anúncio já está disponível para busca.' })}
                  >
                    Toast de Sucesso
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => addToast({ type: 'info', title: 'Novo Lead Recebido', message: 'Carlos enviou uma mensagem pelo WhatsApp.' })}
                  >
                    Toast Informativo
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addToast({ type: 'warning', title: 'Limite de Fotos', message: 'Você atingiu o limite de 20 fotos por anúncio.' })}
                  >
                    Toast de Alerta
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => addToast({ type: 'error', title: 'Erro de Conexão', message: 'Não foi possível salvar as alterações no momento.' })}
                  >
                    Toast de Erro
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Skeletons */}
            <Card>
              <CardHeader>
                <CardTitle>Skeletons & Shimmer Loading</CardTitle>
                <CardDescription>
                  Estados de carregamento estruturais com efeito shimmer suave para evitar layout shift durante o carregamento de dados.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                <div>
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                    Skeleton de Card de Imóvel
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-4xl">
                    <PropertyCardSkeleton />
                    <PropertyCardSkeleton />
                    <PropertyCardSkeleton />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                    Skeleton de Tabela
                  </h5>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden">
                    <TableSkeleton rows={3} />
                  </div>
                </div>

              </CardContent>
            </Card>

          </div>
        )}

        {/* Section: Navigation & Breadcrumbs */}
        {activeSection === 'navigation' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <Card>
              <CardHeader>
                <CardTitle>Estruturas de Navegação & Breadcrumbs</CardTitle>
                <CardDescription>
                  Hierarquia de rotas, trilhas de navegação para SEO imobiliário e menus de usuário.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                
                {/* Breadcrumbs */}
                <div className="space-y-3">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Trilhas de Breadcrumb
                  </h5>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
                    <Breadcrumbs
                      homeClick={() => setCurrentView('portal')}
                      items={[
                        { label: 'Imóveis em São Paulo', onClick: () => addToast({ type: 'info', title: 'São Paulo' }) },
                        { label: 'Sorocaba', onClick: () => addToast({ type: 'info', title: 'Sorocaba' }) },
                        { label: 'Parque Campolim', onClick: () => addToast({ type: 'info', title: 'Campolim' }) },
                        { label: 'Edifício Royal Park #9840' },
                      ]}
                    />
                  </div>
                </div>

                {/* Sidebar Preview */}
                <div className="space-y-3">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Preview da Sidebar Pro
                  </h5>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-950 p-4 flex justify-center">
                    <Sidebar className="shadow-lg rounded-2xl max-h-[500px]" />
                  </div>
                </div>

              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
};
