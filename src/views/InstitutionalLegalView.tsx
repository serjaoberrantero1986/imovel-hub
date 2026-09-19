import React, { useState } from 'react';
import { 
  ShieldCheck, 
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

export type LegalTab = 'terms' | 'privacy' | 'consumer' | 'security' | 'cookies';

interface InstitutionalLegalViewProps {
  initialTab?: LegalTab;
}

export const InstitutionalLegalView: React.FC<InstitutionalLegalViewProps> = ({ initialTab = 'terms' }) => {
  const { setCurrentView, addToast } = useApp();
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);

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

          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
            <span>Última atualização: Setembro/2026</span>
          </div>
        </div>

        {/* Hero Header */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 rounded-3xl p-8 sm:p-12 text-white shadow-xl relative overflow-hidden mb-10">
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none opacity-50" />
          <div className="relative z-10 max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Central Jurídica, Transparência & Segurança</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold font-['Outfit'] tracking-tight">
              Termos Legais e Proteção ao Usuário
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              O Web Imóvel Brasil atua com total rigor ético e em estrita conformidade com a Lei Geral de Proteção de Dados (LGPD), Marco Civil da Internet e Código de Defesa do Consumidor.
            </p>
          </div>
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
                    <span className="block font-bold">Termos de Uso</span>
                    <span className="text-[10px] text-slate-400 font-normal">Regras da plataforma e anúncios</span>
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
                    <span className="block font-bold">Política de Privacidade (LGPD)</span>
                    <span className="text-[10px] text-slate-400 font-normal">Tratamento e proteção de dados</span>
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
                    <span className="block font-bold">Defesa do Consumidor (CDC)</span>
                    <span className="text-[10px] text-slate-400 font-normal">Lei 8.078/90 e canais oficiais</span>
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
                    <span className="block font-bold">Dicas de Segurança Imobiliária</span>
                    <span className="text-[10px] text-slate-400 font-normal">Como prevenir golpes e fraudes</span>
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
                    <span className="block font-bold">Política de Cookies</span>
                    <span className="text-[10px] text-slate-400 font-normal">Preferências e rastreamento</span>
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
              <div className="space-y-6 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400">Documento Legal</span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-['Outfit'] mt-1">
                    Termos e Condições Gerais de Uso
                  </h2>
                </div>

                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs">
                  <strong>Resumo Rápido:</strong> O Web Imóvel Brasil é um portal tecnológico de classificados imobiliários. Facilitamos o encontro entre compradores, proprietários, corretores e imobiliárias. Não intermediamos pagamentos nem somos proprietários dos imóveis anunciados por terceiros.
                </div>

                <section className="space-y-3">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">1. Objeto e Natureza da Plataforma</h3>
                  <p>
                    O presente Termo regula o acesso e a utilização dos serviços disponibilizados pela <strong>Web Imóvel Brasil S/A</strong> (CNPJ: 20.433.428/0001-35). A plataforma atua como provedora de aplicação de internet, oferecendo um catálogo digital para divulgação e pesquisa de imóveis para compra, venda e locação.
                  </p>
                </section>

                <section className="space-y-3">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">2. Cadastro, Veracidade e Responsabilidades do Anunciante</h3>
                  <p>
                    Ao cadastrar um imóvel ou perfil de corretor/imobiliária, o usuário declara sob as penas da lei que:
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                    <li>Possui autorização formal de venda/locação assinada pelo legítimo proprietário ou é titular do imóvel;</li>
                    <li>Todas as características (área útil, quartos, valores de condomínio e IPTU) refletem a documentação oficial atualizada do bem;</li>
                    <li>Corretores autônomos e imobiliárias possuem inscrição ativa e regular perante o Conselho Regional de Corretores de Imóveis (CRECI);</li>
                    <li>É expressamente vedado publicar anúncios falsos, duplicados com códigos diferentes com o intuito de manipular os algoritmos de busca, ou imóveis já alienados.</li>
                  </ul>
                </section>

                <section className="space-y-3">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">3. Isenção de Responsabilidade sobre Transações Financeiras</h3>
                  <p>
                    O Web Imóvel Brasil não participa da elaboração de escrituras, contratos de locação, vistorias físicas ou da transferência de sinal/arras entre as partes. Qualquer negociação financeira é de exclusiva responsabilidade entre o interessado e o anunciante credenciado.
                  </p>
                  <p>
                    Recomendamos expressamente que nenhuma quantia seja repassada a título de sinal sem prévia conferência da certidão de ônus e matrícula atualizada do imóvel junto ao Cartório de Registro de Imóveis competente.
                  </p>
                </section>

                <section className="space-y-3">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">4. Propriedade Intelectual e Proibição de Raspagem (Scraping)</h3>
                  <p>
                    A identidade visual, logotipos, banco de dados compilado, algoritmos e código-fonte são de propriedade exclusiva do Web Imóvel Brasil. É estritamente vedada a utilização de scripts automatizados, robôs, crawlers ou scrapers para extrair dados da plataforma sem autorização prévia por escrito.
                  </p>
                </section>

                <section className="space-y-3">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">5. Foro e Legislação Aplicável</h3>
                  <p>
                    Estes Termos são regidos pelas leis da República Federativa do Brasil. Para a solução de quaisquer controvérsias oriundas do presente instrumento, fica eleito o Foro da Comarca de Sorocaba, Estado de São Paulo, com renúncia expressa a qualquer outro.
                  </p>
                </section>
              </div>
            )}

            {/* 2. POLÍTICA DE PRIVACIDADE & LGPD */}
            {activeTab === 'privacy' && (
              <div className="space-y-6 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400">Privacidade de Dados</span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-['Outfit'] mt-1">
                    Política de Privacidade e Proteção de Dados (LGPD)
                  </h2>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200 text-xs">
                  <strong>Conformidade LGPD:</strong> Tratamos seus dados pessoais em total conformidade com a Lei Federal nº 13.709/2018. Você tem total controle para visualizar, retificar ou solicitar a exclusão definitiva dos seus dados a qualquer momento.
                </div>

                <section className="space-y-3">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">1. Dados Pessoais que Coletamos</h3>
                  <p>Coletamos apenas as informações estritamente necessárias para a prestação dos serviços imobiliários:</p>
                  <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                    <li><strong>Dados de Identificação:</strong> Nome completo, e-mail e número de telefone/WhatsApp fornecidos voluntariamente em formulários de contato com anunciantes;</li>
                    <li><strong>Dados de Anunciantes/Corretores:</strong> Registro no CRECI, CPF/CNPJ, dados cadastrais e endereço do imóvel anunciado;</li>
                    <li><strong>Dados de Navegação:</strong> Endereço IP, tipo de navegador, páginas visualizadas e filtros de busca salvos para personalização da experiência.</li>
                  </ul>
                </section>

                <section className="space-y-3">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">2. Finalidade e Base Legal do Tratamento</h3>
                  <p>Seus dados são tratados com base nas seguintes hipóteses legais previstas no Art. 7º da LGPD:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                      <strong className="block text-xs text-slate-900 dark:text-white mb-1">Encaminhamento de Leads</strong>
                      <span className="text-[11px] text-slate-500">Conectar você ao corretor ou proprietário do imóvel do seu interesse.</span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                      <strong className="block text-xs text-slate-900 dark:text-white mb-1">Segurança e Anti-Fraude</strong>
                      <span className="text-[11px] text-slate-500">Validação de credenciais CRECI e prevenção de anúncios fraudulentos.</span>
                    </div>
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">3. Seus Direitos como Titular de Dados (Art. 18 LGPD)</h3>
                  <p>Você tem o direito de solicitar a qualquer momento:</p>
                  <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                    <li>Confirmação da existência de tratamento e acesso aos dados;</li>
                    <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
                    <li>Anonimização, bloqueio ou eliminação de dados desnecessários;</li>
                    <li>Revogação do consentimento concedido anteriormente.</li>
                  </ul>
                  <p className="pt-2">
                    Para exercer seus direitos, basta enviar uma mensagem direta para o nosso Encarregado de Proteção de Dados (DPO) pelo e-mail: <strong className="text-rose-600 dark:text-rose-400">privacidade@webimovel.com.br</strong>.
                  </p>
                </section>
              </div>
            )}

            {/* 3. CÓDIGO DE DEFESA DO CONSUMIDOR */}
            {activeTab === 'consumer' && (
              <div className="space-y-6 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400">Legislação Federal</span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-['Outfit'] mt-1">
                    Código de Defesa do Consumidor (CDC)
                  </h2>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-900 dark:text-indigo-200 text-xs">
                  <strong>Cumprimento da Lei Federal nº 12.291/2010 e Decreto nº 7.962/2013 (Comércio Eletrônico):</strong> Disponibilizamos a consulta direta ao Código de Defesa do Consumidor e aos canais de apoio ao cidadão.
                </div>

                <section className="space-y-3">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Direitos Básicos do Consumidor na Intermediação Imobiliária</h3>
                  <p>
                    A Lei Federal nº 8.078 de 11 de setembro de 1990 estabelece normas de proteção e defesa do consumidor, de ordem pública e interesse social. No contexto da busca imobiliária, destacam-se:
                  </p>
                  <div className="space-y-3 pt-1">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-1">
                      <strong className="text-xs text-slate-900 dark:text-white">Informação Clara e Precisa (Art. 6º, III):</strong>
                      <p className="text-xs text-slate-500">
                        O consumidor tem direito à especificação correta sobre metragem, taxas condominiais, IPTU e condições de financiamento do imóvel anunciado.
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-1">
                      <strong className="text-xs text-slate-900 dark:text-white">Proteção Contra Publicidade Enganosa (Art. 37):</strong>
                      <p className="text-xs text-slate-500">
                        É expressamente proibida qualquer propaganda que induza o consumidor a erro sobre as reais condições, localização ou disponibilidade do imóvel.
                      </p>
                    </div>
                  </div>
                </section>

                <section className="space-y-4 pt-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Consulta ao Texto Integral da Legislação</h3>
                  <p>
                    Você pode consultar a íntegra atualizada da Lei nº 8.078/1990 diretamente no portal oficial da Presidência da República:
                  </p>
                  <a
                    href="https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs hover:opacity-90 transition-opacity"
                  >
                    <span>Acessar Lei nº 8.078 no Portal do Planalto</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </section>

                <section className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Órgãos de Proteção ao Consumidor (PROCON)</h3>
                  <p className="text-xs">
                    Em caso de divergências não solucionadas diretamente com o fornecedor ou prestador de serviços:
                  </p>
                  <ul className="text-xs space-y-1 text-slate-500">
                    <li>• <strong>PROCON Sorocaba:</strong> Av. Comendador Pereira Inácio, 460 - Vergueiro / Telefone: 151</li>
                    <li>• <strong>Portal Consumidor.gov.br:</strong> Plataforma pública oficial do Ministério da Justiça</li>
                  </ul>
                </section>
              </div>
            )}

            {/* 4. DICAS DE SEGURANÇA IMOBILIÁRIA (ANTI-FRAUDE) */}
            {activeTab === 'security' && (
              <div className="space-y-6 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400">Guia Prático Anti-Golpes</span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-['Outfit'] mt-1">
                    Dicas de Segurança e Prevenção de Fraudes
                  </h2>
                </div>

                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-900 dark:text-rose-200 text-xs">
                  <strong>Atenção Máxima:</strong> Golpistas costumam utilizar fotos roubadas de imóveis de alto padrão e anunciá-los por valores muito abaixo do mercado para exigir transferências de "sinal" ou "reserva". Proteja-se seguindo nossas recomendações.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center font-bold text-sm">
                      1
                    </div>
                    <strong className="block text-slate-900 dark:text-white text-xs">
                      Nunca Faça PIX ou Depósito Prévio
                    </strong>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Jamais transfira qualquer quantia para "segurar a chave" ou "garantir a fila de visitas" antes de visitar o imóvel pessoalmente e conferir a documentação.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center font-bold text-sm">
                      2
                    </div>
                    <strong className="block text-slate-900 dark:text-white text-xs">
                      Exija o Número do CRECI
                    </strong>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Corretores de imóveis devem possuir registro ativo no CRECI do estado. Nosso portal possui validador de CRECI em tempo real para os anunciantes cadastrados.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center font-bold text-sm">
                      3
                    </div>
                    <strong className="block text-slate-900 dark:text-white text-xs">
                      Confira a Certidão de Matrícula
                    </strong>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Antes de fechar qualquer contrato de compra e venda, solicite a Certidão de Matrícula e Ônus Reais atualizada (expedida nos últimos 30 dias) no Cartório de Registro de Imóveis.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center font-bold text-sm">
                      4
                    </div>
                    <strong className="block text-slate-900 dark:text-white text-xs">
                      Desconfie de Preços Muito Baixos
                    </strong>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Se o valor do aluguel ou da venda estiver muito discrepante em relação à média dos outros imóveis do mesmo condomínio ou bairro, redobre a atenção.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-between gap-4">
                  <div className="text-xs">
                    <strong className="text-slate-900 dark:text-white block">Suspeita de Anúncio Fraudulento?</strong>
                    <span className="text-slate-500">Nossa equipe de moderação remove anúncios irregulares com máxima prioridade.</span>
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
                    Reportar Imóvel
                  </button>
                </div>
              </div>
            )}

            {/* 5. POLÍTICA DE COOKIES */}
            {activeTab === 'cookies' && (
              <div className="space-y-6 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400">Cookies e Navegação</span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-['Outfit'] mt-1">
                    Política de Cookies e Rastreamento
                  </h2>
                </div>

                <section className="space-y-3">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">O que são Cookies?</h3>
                  <p>
                    Cookies são pequenos arquivos de texto armazenados no seu navegador para registrar preferências, garantir a segurança da sessão e oferecer recursos personalizados como imóveis favoritos e comparações salvas.
                  </p>
                </section>

                <section className="space-y-3">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Tipos de Cookies Utilizados</h3>
                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                      <strong className="text-xs text-slate-900 dark:text-white block mb-1">Cookies Essenciais (Obrigatórios)</strong>
                      <span className="text-xs text-slate-500">
                        Necessários para o login, segurança da conta e funcionamento das buscas no portal. Não podem ser desativados.
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                      <strong className="text-xs text-slate-900 dark:text-white block mb-1">Cookies de Preferência e Funcionalidade</strong>
                      <span className="text-xs text-slate-500">
                        Lembram suas configurações de tema (claro/escuro), cidades preferidas e histórico recente de imóveis consultados.
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                      <strong className="text-xs text-slate-900 dark:text-white block mb-1">Cookies Analíticos de Desempenho</strong>
                      <span className="text-xs text-slate-500">
                        Ajudam a entender quais bairros e tipos de imóveis têm maior procura para aprimorar as recomendações da plataforma.
                      </span>
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
                    Aceitar e Salvar Preferências
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
};
