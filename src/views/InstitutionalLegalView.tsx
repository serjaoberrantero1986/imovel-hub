import React from 'react';
import { 
  FileText, 
  Scale, 
  AlertTriangle, 
  Cookie, 
  ChevronRight, 
  ArrowLeft, 
  CheckCircle2, 
  Lock, 
  Eye, 
  FileSearch, 
  Mail, 
  Phone, 
  ExternalLink,
  HelpCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CanvasInsertedBlocks, EditableBox, EditableText } from '../components/visual-editor/PortalCanvas';

export type LegalTab = 'terms' | 'privacy' | 'consumer' | 'security' | 'cookies';

interface InstitutionalLegalViewProps {
  initialTab?: LegalTab;
}

export const InstitutionalLegalView: React.FC<InstitutionalLegalViewProps> = ({ initialTab = 'terms' }) => {
  const { setCurrentView, addToast, activeLegalTab, setActiveLegalTab } = useApp();
  const activeTab = activeLegalTab || initialTab;
  const setActiveTab = (tab: LegalTab) => setActiveLegalTab(tab);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors py-10 lg:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Navigation Breadcrumb & Back */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <button
            onClick={() => {
              setCurrentView('portal');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Voltar ao Portal</span>
          </button>

        </div>

        {/* Page Header */}
        <div className="mb-10 max-w-4xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-xs font-extrabold uppercase">Central Jurídica</span>
            <span className="text-xs text-slate-400 font-medium">Transparência e segurança</span>
          </div>
          <EditableText hideable={false} as="h1" id="legal.header.title" label="Título da Central Jurídica" className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-['Outfit'] mt-1">Termos Legais e Proteção ao Usuário</EditableText>
          <EditableText hideable={false} as="p" id="legal.header.description" label="Descrição da Central Jurídica" className="text-xs sm:text-sm text-slate-500 leading-relaxed">O Web Imóvel Brasil atua com total rigor ético e em estrita conformidade com a Lei Geral de Proteção de Dados (LGPD), Marco Civil da Internet e Código de Defesa do Consumidor.</EditableText>
        </div>

        {/* Grid Layout: Tabs Sidebar + Document Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Tabs Menu Sidebar */}
          <div className="lg:col-span-4 space-y-2 sticky top-24">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-3 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1.5">
              
              <button
                onClick={() => {
                  setActiveTab('terms');
                  window.scrollTo({ top: 180, behavior: 'smooth' });
                }}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-left font-semibold text-xs transition-all cursor-pointer ${
                  activeTab === 'terms'
                    ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 shadow-sm'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${activeTab === 'terms' ? 'bg-rose-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <EditableText hideable={false} id="legal.nav.terms.title" label="Nome de Termos" className="block font-bold">Termos de Uso</EditableText>
                    <EditableText hideable={false} id="legal.nav.terms.description" label="Resumo de Termos" className="text-[10px] text-slate-400 font-normal">Regras da plataforma e anúncios</EditableText>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => {
                  setActiveTab('privacy');
                  window.scrollTo({ top: 180, behavior: 'smooth' });
                }}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-left font-semibold text-xs transition-all cursor-pointer ${
                  activeTab === 'privacy'
                    ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 shadow-sm'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${activeTab === 'privacy' ? 'bg-rose-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <EditableText hideable={false} id="legal.nav.privacy.title" label="Nome de Privacidade" className="block font-bold">Política de Privacidade (LGPD)</EditableText>
                    <EditableText hideable={false} id="legal.nav.privacy.description" label="Resumo de Privacidade" className="text-[10px] text-slate-400 font-normal">Tratamento e proteção de dados</EditableText>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => {
                  setActiveTab('consumer');
                  window.scrollTo({ top: 180, behavior: 'smooth' });
                }}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-left font-semibold text-xs transition-all cursor-pointer ${
                  activeTab === 'consumer'
                    ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 shadow-sm'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${activeTab === 'consumer' ? 'bg-rose-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                    <Scale className="w-4 h-4" />
                  </div>
                  <div>
                    <EditableText hideable={false} id="legal.nav.consumer.title" label="Nome de Consumidor" className="block font-bold">Defesa do Consumidor (CDC)</EditableText>
                    <EditableText hideable={false} id="legal.nav.consumer.description" label="Resumo de Consumidor" className="text-[10px] text-slate-400 font-normal">Lei 8.078/90 e canais oficiais</EditableText>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => {
                  setActiveTab('security');
                  window.scrollTo({ top: 180, behavior: 'smooth' });
                }}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-left font-semibold text-xs transition-all cursor-pointer ${
                  activeTab === 'security'
                    ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 shadow-sm'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${activeTab === 'security' ? 'bg-rose-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <EditableText hideable={false} id="legal.nav.security.title" label="Nome de Segurança" className="block font-bold">Dicas de Segurança Imobiliária</EditableText>
                    <EditableText hideable={false} id="legal.nav.security.description" label="Resumo de Segurança" className="text-[10px] text-slate-400 font-normal">Como prevenir golpes e fraudes</EditableText>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => {
                  setActiveTab('cookies');
                  window.scrollTo({ top: 180, behavior: 'smooth' });
                }}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-left font-semibold text-xs transition-all cursor-pointer ${
                  activeTab === 'cookies'
                    ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 shadow-sm'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${activeTab === 'cookies' ? 'bg-rose-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                    <Cookie className="w-4 h-4" />
                  </div>
                  <div>
                    <EditableText hideable={false} id="legal.nav.cookies.title" label="Nome de Cookies" className="block font-bold">Política de Cookies</EditableText>
                    <EditableText hideable={false} id="legal.nav.cookies.description" label="Resumo de Cookies" className="text-[10px] text-slate-400 font-normal">Preferências e rastreamento</EditableText>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

            </div>
          </div>

          {/* Document Content Area */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-sm space-y-8">
            
            {/* 1. TERMOS DE USO */}
            {activeTab === 'terms' && (
              <EditableBox hideable={false} id="legal.terms.document" label="Documento Termos de Uso" className="space-y-6 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400">Documento Legal</span>
                  <EditableText hideable={false} as="h2" id="legal.terms.title" label="Título de Termos" className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-['Outfit'] mt-1">Termos e Condições Gerais de Uso</EditableText>
                </div>

                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs">
                  <EditableText hideable={false} id="legal.terms.summary" label="Resumo dos Termos" defaultHtml="<strong>Resumo Rápido:</strong> O Web Imóvel Brasil é um portal tecnológico de classificados imobiliários. Facilitamos o encontro entre compradores, proprietários, corretores e imobiliárias. Não intermediamos pagamentos nem somos proprietários dos imóveis anunciados por terceiros."/>
                </div>

                <section className="space-y-3">
                  <EditableText hideable={false} as="h3" id="legal.terms.object.title" label="Título do objeto" className="text-base font-bold text-slate-900 dark:text-white">1. Objeto e Natureza da Plataforma</EditableText>
                  <EditableText hideable={false} as="p" id="legal.terms.object.body" label="Texto do objeto" defaultHtml="O presente Termo regula o acesso e a utilização dos serviços disponibilizados pela <strong>Web Imóvel Brasil S/A</strong> (CNPJ: 20.433.428/0001-35). A plataforma atua como provedora de aplicação de internet, oferecendo um catálogo digital para divulgação e pesquisa de imóveis para compra, venda e locação."/>
                </section>

                <section className="space-y-3">
                  <EditableText hideable={false} as="h3" id="legal.terms.registration.title" label="Título de cadastro" className="text-base font-bold text-slate-900 dark:text-white">2. Cadastro, Veracidade e Responsabilidades do Anunciante</EditableText>
                  <EditableText hideable={false} as="p" id="legal.terms.registration.intro" label="Introdução de cadastro">Ao cadastrar um imóvel ou perfil de corretor/imobiliária, o usuário declara sob as penas da lei que:</EditableText>
                  <EditableText hideable={false} as="div" id="legal.terms.registration.list" label="Lista de responsabilidades" className="text-xs sm:text-sm" defaultHtml="<ul><li>Possui autorização formal de venda/locação assinada pelo legítimo proprietário ou é titular do imóvel;</li><li>Todas as características (área útil, quartos, valores de condomínio e IPTU) refletem a documentação oficial atualizada do bem;</li><li>Corretores autônomos e imobiliárias possuem inscrição ativa e regular perante o Conselho Regional de Corretores de Imóveis (CRECI);</li><li>É expressamente vedado publicar anúncios falsos, duplicados com códigos diferentes com o intuito de manipular os algoritmos de busca, ou imóveis já alienados.</li></ul>"/>
                </section>

                <section className="space-y-3">
                  <EditableText hideable={false} as="h3" id="legal.terms.transactions.title" label="Título de transações" className="text-base font-bold text-slate-900 dark:text-white">3. Isenção de Responsabilidade sobre Transações Financeiras</EditableText>
                  <EditableText hideable={false} as="p" id="legal.terms.transactions.body" label="Texto de transações">O Web Imóvel Brasil não participa da elaboração de escrituras, contratos de locação, vistorias físicas ou da transferência de sinal/arras entre as partes. Qualquer negociação financeira é de exclusiva responsabilidade entre o interessado e o anunciante credenciado.</EditableText>
                  <EditableText hideable={false} as="p" id="legal.terms.transactions.warning" label="Recomendação de transações">Recomendamos expressamente que nenhuma quantia seja repassada a título de sinal sem prévia conferência da certidão de ônus e matrícula atualizada do imóvel junto ao Cartório de Registro de Imóveis competente.</EditableText>
                </section>

                <section className="space-y-3">
                  <EditableText hideable={false} as="h3" id="legal.terms.intellectual.title" label="Título de propriedade intelectual" className="text-base font-bold text-slate-900 dark:text-white">4. Propriedade Intelectual e Proibição de Raspagem (Scraping)</EditableText>
                  <EditableText hideable={false} as="p" id="legal.terms.intellectual.body" label="Texto de propriedade intelectual">A identidade visual, logotipos, banco de dados compilado, algoritmos e código-fonte são de propriedade exclusiva do Web Imóvel Brasil. É estritamente vedada a utilização de scripts automatizados, robôs, crawlers ou scrapers para extrair dados da plataforma sem autorização prévia por escrito.</EditableText>
                </section>

                <section className="space-y-3">
                  <EditableText hideable={false} as="h3" id="legal.terms.jurisdiction.title" label="Título do foro" className="text-base font-bold text-slate-900 dark:text-white">5. Foro e Legislação Aplicável</EditableText>
                  <EditableText hideable={false} as="p" id="legal.terms.jurisdiction.body" label="Texto do foro">Estes Termos são regidos pelas leis da República Federativa do Brasil. Para a solução de quaisquer controvérsias oriundas do presente instrumento, fica eleito o Foro da Comarca de Sorocaba, Estado de São Paulo, com renúncia expressa a qualquer outro.</EditableText>
                </section>
              </EditableBox>
            )}

            {/* 2. POLÍTICA DE PRIVACIDADE & LGPD */}
            {activeTab === 'privacy' && (
              <EditableBox hideable={false} id="legal.privacy.document" label="Documento Política de Privacidade" className="space-y-6 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400">Privacidade de Dados</span>
                  <EditableText hideable={false} as="h2" id="legal.privacy.title" label="Título de Privacidade" className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-['Outfit'] mt-1">Política de Privacidade e Proteção de Dados (LGPD)</EditableText>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200 text-xs">
                  <EditableText hideable={false} id="legal.privacy.summary" label="Resumo da Privacidade" defaultHtml="<strong>Conformidade LGPD:</strong> Tratamos seus dados pessoais em total conformidade com a Lei Federal nº 13.709/2018. Você tem total controle para visualizar, retificar ou solicitar a exclusão definitiva dos seus dados a qualquer momento."/>
                </div>

                <section className="space-y-3">
                  <EditableText hideable={false} as="h3" id="legal.privacy.collection.title" label="Título dos dados coletados" className="text-base font-bold text-slate-900 dark:text-white">1. Dados Pessoais que Coletamos</EditableText>
                  <EditableText hideable={false} as="div" id="legal.privacy.collection.body" label="Dados pessoais coletados" className="text-xs sm:text-sm" defaultHtml="<p>Coletamos apenas as informações estritamente necessárias para a prestação dos serviços imobiliários:</p><ul><li><strong>Dados de Identificação:</strong> Nome completo, e-mail e número de telefone/WhatsApp fornecidos voluntariamente em formulários de contato com anunciantes;</li><li><strong>Dados de Anunciantes/Corretores:</strong> Registro no CRECI, CPF/CNPJ, dados cadastrais e endereço do imóvel anunciado;</li><li><strong>Dados de Navegação:</strong> Endereço IP, tipo de navegador, páginas visualizadas e filtros de busca salvos para personalização da experiência.</li></ul>"/>
                </section>

                <section className="space-y-3">
                  <EditableText hideable={false} as="h3" id="legal.privacy.purpose.title" label="Título da finalidade" className="text-base font-bold text-slate-900 dark:text-white">2. Finalidade e Base Legal do Tratamento</EditableText>
                  <EditableText hideable={false} as="p" id="legal.privacy.purpose.intro" label="Introdução da finalidade">Seus dados são tratados com base nas seguintes hipóteses legais previstas no Art. 7º da LGPD:</EditableText>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                      <EditableText hideable={false} id="legal.privacy.leads.title" label="Título sobre leads" className="block text-xs text-slate-900 dark:text-white mb-1">Encaminhamento de Leads</EditableText>
                      <EditableText hideable={false} id="legal.privacy.leads.body" label="Texto sobre leads" className="text-[11px] text-slate-500">Conectar você ao corretor ou proprietário do imóvel do seu interesse.</EditableText>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                      <EditableText hideable={false} id="legal.privacy.antifraud.title" label="Título antifraude" className="block text-xs text-slate-900 dark:text-white mb-1">Segurança e Anti-Fraude</EditableText>
                      <EditableText hideable={false} id="legal.privacy.antifraud.body" label="Texto antifraude" className="text-[11px] text-slate-500">Validação de credenciais CRECI e prevenção de anúncios fraudulentos.</EditableText>
                    </div>
                  </div>
                </section>

                <section className="space-y-3">
                  <EditableText hideable={false} as="h3" id="legal.privacy.rights.title" label="Título dos direitos" className="text-base font-bold text-slate-900 dark:text-white">3. Seus Direitos como Titular de Dados (Art. 18 LGPD)</EditableText>
                  <EditableText hideable={false} as="div" id="legal.privacy.rights.body" label="Direitos do titular" className="text-xs sm:text-sm" defaultHtml="<p>Você tem o direito de solicitar a qualquer momento:</p><ul><li>Confirmação da existência de tratamento e acesso aos dados;</li><li>Correção de dados incompletos, inexatos ou desatualizados;</li><li>Anonimização, bloqueio ou eliminação de dados desnecessários;</li><li>Revogação do consentimento concedido anteriormente.</li></ul><p>Para exercer seus direitos, envie uma mensagem ao Encarregado de Proteção de Dados (DPO): <strong>privacidade@webimovel.com.br</strong>.</p>"/>
                </section>
              </EditableBox>
            )}

            {/* 3. CÓDIGO DE DEFESA DO CONSUMIDOR */}
            {activeTab === 'consumer' && (
              <EditableBox hideable={false} id="legal.consumer.document" label="Documento Defesa do Consumidor" className="space-y-6 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400">Legislação Federal</span>
                  <EditableText hideable={false} as="h2" id="legal.consumer.title" label="Título de Consumidor" className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-['Outfit'] mt-1">Código de Defesa do Consumidor (CDC)</EditableText>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-900 dark:text-indigo-200 text-xs">
                  <EditableText hideable={false} id="legal.consumer.summary" label="Resumo do Consumidor" defaultHtml="<strong>Cumprimento da Lei Federal nº 12.291/2010 e Decreto nº 7.962/2013 (Comércio Eletrônico):</strong> Disponibilizamos a consulta direta ao Código de Defesa do Consumidor e aos canais de apoio ao cidadão."/>
                </div>

                <section className="space-y-3">
                  <EditableText hideable={false} as="h3" id="legal.consumer.rights.title" label="Título dos direitos do consumidor" className="text-base font-bold text-slate-900 dark:text-white">Direitos Básicos do Consumidor na Intermediação Imobiliária</EditableText>
                  <EditableText hideable={false} as="p" id="legal.consumer.rights.body" label="Texto dos direitos do consumidor">A Lei Federal nº 8.078 de 11 de setembro de 1990 estabelece normas de proteção e defesa do consumidor, de ordem pública e interesse social. No contexto da busca imobiliária, destacam-se:</EditableText>
                  <div className="space-y-3 pt-1">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-1">
                      <EditableText hideable={false} id="legal.consumer.clear.title" label="Título informação clara" className="text-xs text-slate-900 dark:text-white">Informação Clara e Precisa (Art. 6º, III):</EditableText>
                      <EditableText hideable={false} as="p" id="legal.consumer.clear.body" label="Texto informação clara" className="text-xs text-slate-500">O consumidor tem direito à especificação correta sobre metragem, taxas condominiais, IPTU e condições de financiamento do imóvel anunciado.</EditableText>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-1">
                      <EditableText hideable={false} id="legal.consumer.advertising.title" label="Título publicidade enganosa" className="text-xs text-slate-900 dark:text-white">Proteção Contra Publicidade Enganosa (Art. 37):</EditableText>
                      <EditableText hideable={false} as="p" id="legal.consumer.advertising.body" label="Texto publicidade enganosa" className="text-xs text-slate-500">É expressamente proibida qualquer propaganda que induza o consumidor a erro sobre as reais condições, localização ou disponibilidade do imóvel.</EditableText>
                    </div>
                  </div>
                </section>

                <section className="space-y-4 pt-2">
                  <EditableText hideable={false} as="h3" id="legal.consumer.law.title" label="Título da legislação" className="text-base font-bold text-slate-900 dark:text-white">Consulta ao Texto Integral da Legislação</EditableText>
                  <EditableText hideable={false} as="p" id="legal.consumer.law.body" label="Texto da legislação">Você pode consultar a íntegra atualizada da Lei nº 8.078/1990 diretamente no portal oficial da Presidência da República:</EditableText>
                  <a
                    href="https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs hover:opacity-90 transition-opacity"
                  >
                    <EditableText hideable={false} id="legal.consumer.law.button" label="Texto do link oficial">Acessar Lei nº 8.078 no Portal do Planalto</EditableText>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </section>

                <section className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                  <EditableText hideable={false} as="h3" id="legal.consumer.agencies.title" label="Título dos órgãos" className="text-base font-bold text-slate-900 dark:text-white">Órgãos de Proteção ao Consumidor (PROCON)</EditableText>
                  <EditableText hideable={false} as="div" id="legal.consumer.agencies.body" label="Canais de proteção" className="text-xs text-slate-500" defaultHtml="<p>Em caso de divergências não solucionadas diretamente com o fornecedor ou prestador de serviços:</p><ul><li><strong>PROCON Sorocaba:</strong> Av. Comendador Pereira Inácio, 460 - Vergueiro / Telefone: 151</li><li><strong>Portal Consumidor.gov.br:</strong> Plataforma pública oficial do Ministério da Justiça</li></ul>"/>
                </section>
              </EditableBox>
            )}

            {/* 4. DICAS DE SEGURANÇA IMOBILIÁRIA (ANTI-FRAUDE) */}
            {activeTab === 'security' && (
              <EditableBox hideable={false} id="legal.security.document" label="Documento Dicas de Segurança" className="space-y-6 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400">Guia Prático Anti-Golpes</span>
                  <EditableText hideable={false} as="h2" id="legal.security.title" label="Título de Segurança" className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-['Outfit'] mt-1">Dicas de Segurança e Prevenção de Fraudes</EditableText>
                </div>

                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-900 dark:text-rose-200 text-xs">
                  <EditableText hideable={false} id="legal.security.summary" label="Alerta de segurança" defaultHtml={'<strong>Atenção Máxima:</strong> Golpistas costumam utilizar fotos roubadas de imóveis de alto padrão e anunciá-los por valores muito abaixo do mercado para exigir transferências de "sinal" ou "reserva". Proteja-se seguindo nossas recomendações.'}/>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center font-bold text-sm">
                      1
                    </div>
                    <EditableText hideable={false} id="legal.security.pix.title" label="Título sobre pagamentos" className="block text-slate-900 dark:text-white text-xs">Nunca Faça PIX ou Depósito Prévio</EditableText>
                    <EditableText hideable={false} as="p" id="legal.security.pix.body" label="Texto sobre pagamentos" className="text-xs text-slate-500 leading-relaxed">Jamais transfira qualquer quantia para "segurar a chave" ou "garantir a fila de visitas" antes de visitar o imóvel pessoalmente e conferir a documentação.</EditableText>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center font-bold text-sm">
                      2
                    </div>
                    <EditableText hideable={false} id="legal.security.creci.title" label="Título sobre CRECI" className="block text-slate-900 dark:text-white text-xs">Exija o Número do CRECI</EditableText>
                    <EditableText hideable={false} as="p" id="legal.security.creci.body" label="Texto sobre CRECI" className="text-xs text-slate-500 leading-relaxed">Corretores de imóveis devem possuir registro ativo no CRECI do estado. Nosso portal possui validador de CRECI em tempo real para os anunciantes cadastrados.</EditableText>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center font-bold text-sm">
                      3
                    </div>
                    <EditableText hideable={false} id="legal.security.registry.title" label="Título sobre matrícula" className="block text-slate-900 dark:text-white text-xs">Confira a Certidão de Matrícula</EditableText>
                    <EditableText hideable={false} as="p" id="legal.security.registry.body" label="Texto sobre matrícula" className="text-xs text-slate-500 leading-relaxed">Antes de fechar qualquer contrato de compra e venda, solicite a Certidão de Matrícula e Ônus Reais atualizada (expedida nos últimos 30 dias) no Cartório de Registro de Imóveis.</EditableText>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center font-bold text-sm">
                      4
                    </div>
                    <EditableText hideable={false} id="legal.security.prices.title" label="Título sobre preços" className="block text-slate-900 dark:text-white text-xs">Desconfie de Preços Muito Baixos</EditableText>
                    <EditableText hideable={false} as="p" id="legal.security.prices.body" label="Texto sobre preços" className="text-xs text-slate-500 leading-relaxed">Se o valor do aluguel ou da venda estiver muito discrepante em relação à média dos outros imóveis do mesmo condomínio ou bairro, redobre a atenção.</EditableText>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-between gap-4">
                  <div className="text-xs">
                    <EditableText hideable={false} id="legal.security.report.title" label="Título da denúncia" className="text-slate-900 dark:text-white block">Suspeita de Anúncio Fraudulento?</EditableText>
                    <EditableText hideable={false} id="legal.security.report.body" label="Texto da denúncia" className="text-slate-500">Nossa equipe de moderação remove anúncios irregulares com máxima prioridade.</EditableText>
                  </div>
                  <button
                    onClick={() => {
                      addToast({
                        type: 'info',
                        title: 'Canal de Denúncia',
                        message: 'Envie o código do imóvel para denuncia@webimovel.com.br ou pelo nosso WhatsApp de suporte.'
                      });
                    }}
                    className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shrink-0 cursor-pointer"
                  >
                    <EditableText hideable={false} id="legal.security.report.button" label="Botão de denúncia">Reportar Imóvel</EditableText>
                  </button>
                </div>
              </EditableBox>
            )}

            {/* 5. POLÍTICA DE COOKIES */}
            {activeTab === 'cookies' && (
              <EditableBox hideable={false} id="legal.cookies.document" label="Documento Política de Cookies" className="space-y-6 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400">Cookies e Navegação</span>
                  <EditableText hideable={false} as="h2" id="legal.cookies.title" label="Título de Cookies" className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-['Outfit'] mt-1">Política de Cookies e Rastreamento</EditableText>
                </div>

                <section className="space-y-3">
                  <EditableText hideable={false} as="h3" id="legal.cookies.about.title" label="Título sobre cookies" className="text-base font-bold text-slate-900 dark:text-white">O que são Cookies?</EditableText>
                  <EditableText hideable={false} as="p" id="legal.cookies.about.body" label="Texto sobre cookies">Cookies são pequenos arquivos de texto armazenados no seu navegador para registrar preferências, garantir a segurança da sessão e oferecer recursos personalizados como imóveis favoritos e comparações salvas.</EditableText>
                </section>

                <section className="space-y-3">
                  <EditableText hideable={false} as="h3" id="legal.cookies.types.title" label="Título dos tipos de cookies" className="text-base font-bold text-slate-900 dark:text-white">Tipos de Cookies Utilizados</EditableText>
                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                      <EditableText hideable={false} id="legal.cookies.essential.title" label="Título dos cookies essenciais" className="text-xs text-slate-900 dark:text-white block mb-1">Cookies Essenciais (Obrigatórios)</EditableText>
                      <EditableText hideable={false} id="legal.cookies.essential.body" label="Texto dos cookies essenciais" className="text-xs text-slate-500">Necessários para o login, segurança da conta e funcionamento das buscas no portal. Não podem ser desativados.</EditableText>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                      <EditableText hideable={false} id="legal.cookies.preference.title" label="Título dos cookies de preferência" className="text-xs text-slate-900 dark:text-white block mb-1">Cookies de Preferência e Funcionalidade</EditableText>
                      <EditableText hideable={false} id="legal.cookies.preference.body" label="Texto dos cookies de preferência" className="text-xs text-slate-500">Lembram suas configurações de tema (claro/escuro), cidades preferidas e histórico recente de imóveis consultados.</EditableText>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                      <EditableText hideable={false} id="legal.cookies.analytics.title" label="Título dos cookies analíticos" className="text-xs text-slate-900 dark:text-white block mb-1">Cookies Analíticos de Desempenho</EditableText>
                      <EditableText hideable={false} id="legal.cookies.analytics.body" label="Texto dos cookies analíticos" className="text-xs text-slate-500">Ajudam a entender quais bairros e tipos de imóveis têm maior procura para aprimorar as recomendações da plataforma.</EditableText>
                    </div>
                  </div>
                </section>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      localStorage.setItem('cookie_consent', 'accepted');
                      addToast({
                        type: 'success',
                        title: 'Preferências Atualizadas',
                        message: 'Seu consentimento de cookies foi registrado com sucesso.'
                      });
                    }}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    <EditableText hideable={false} id="legal.cookies.button" label="Botão de consentimento">Aceitar e Salvar Preferências</EditableText>
                  </button>
                </div>
              </EditableBox>
            )}
            <CanvasInsertedBlocks scope={`legal.${activeTab}`}/>
          </div>

        </div>

      </div>
    </div>
  );
};
