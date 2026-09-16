import React from 'react';
import { Building2, Phone, Mail, MapPin, Instagram, Facebook, Youtube, Linkedin, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Footer: React.FC = () => {
  const { properties, setCurrentView, setFilters, openLegalPage } = useApp();

  const availableCities = React.useMemo(() => {
    return Array.from(new Set(properties.map(p => p.city?.trim()).filter(Boolean) as string[])).sort();
  }, [properties]);

  const availableNeighborhoods = React.useMemo(() => {
    return Array.from(new Set(properties.map(p => p.neighborhood?.trim()).filter(Boolean) as string[])).sort();
  }, [properties]);

  const handleCityClick = (city: string) => {
    setFilters(prev => ({ ...prev, city, searchTerm: city }));
    setCurrentView('search');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNeighborhoodClick = (neighborhood: string) => {
    setFilters(prev => ({ ...prev, searchTerm: neighborhood }));
    setCurrentView('search');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Info & Brand */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-slate-800">
          
          {/* Col 1: Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-rose-600 flex items-center justify-center text-white shadow-lg">
                <Building2 className="w-6 h-6" />
              </div>
              <span className="font-extrabold text-2xl text-white font-['Outfit']">
                Web <span className="text-rose-500">Imóvel</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              A plataforma imobiliária completa para você encontrar, vender e alugar imóveis com segurança e transparência.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>CRECI 275886-F</span>
            </div>
          </div>

          {/* Col 2: Atendimento */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">Central de Atendimento</h4>
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-center gap-2.5 text-slate-400">
                <Phone className="w-4 h-4 text-rose-500" />
                <span>(15) 99779-6315</span>
              </li>
              <li className="flex items-center gap-2.5 text-slate-400">
                <Mail className="w-4 h-4 text-rose-500" />
                <span>contato@webimovel.com.br</span>
              </li>
              <li className="flex items-start gap-2.5 text-slate-400">
                <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-1" />
                <span>Rua Francisco das Chagas, 10 - Jardim dos Ipês - Salto de Pirapora/SP</span>
              </li>
            </ul>
            <p className="text-xs text-slate-500 pt-2">
              Segunda a Sexta: 08h às 18h | Sábados: 09h às 13h
            </p>
          </div>

          {/* Col 3: Links Rápidos */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">Navegação</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button 
                  onClick={() => { setCurrentView('search'); setFilters(p => ({ ...p, purpose: 'sale' })); }} 
                  className="hover:text-rose-400 transition-colors"
                >
                  Apartamentos à venda
                </button>
              </li>
              <li>
                <button 
                  onClick={() => { setCurrentView('search'); setFilters(p => ({ ...p, purpose: 'rent' })); }} 
                  className="hover:text-rose-400 transition-colors"
                >
                  Casas e apartamentos para locação
                </button>
              </li>
              <li>
                <button 
                  onClick={() => { setCurrentView('search'); setFilters(p => ({ ...p, types: ['condo_house'] })); }} 
                  className="hover:text-rose-400 transition-colors"
                >
                  Condomínios Fechados
                </button>
              </li>
              <li>
                <button 
                  onClick={() => { setCurrentView('search'); setFilters(p => ({ ...p, purpose: 'launch' })); }} 
                  className="hover:text-rose-400 transition-colors"
                >
                  Lançamentos na Planta
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setCurrentView('comparator')} 
                  className="hover:text-rose-400 transition-colors"
                >
                  Comparador de Imóveis
                </button>
              </li>
              <li>
                <button 
                  onClick={() => openLegalPage('security')} 
                  className="hover:text-amber-400 transition-colors flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  <span>Dicas de Segurança Imobiliária</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Redes & Newsletter */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">Conecte-se</h4>
            <p className="text-xs text-slate-400">
              Receba novidades e oportunidades de investimento imobiliário em primeira mão.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Seu e-mail"
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
              <button 
                onClick={() => alert('Obrigado por se inscrever na nossa newsletter imobiliária!')}
                className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors"
              >
                Enviar
              </button>
            </div>
            <div className="flex gap-3 pt-2">
              <a href="#" className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="#" className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="#" className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                <Youtube className="w-4 h-4" />
              </a>
              <a href="#" className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </div>

        </div>

        {/* Dynamic SEO Keywords: Real Cities & Neighborhoods Grid from Database */}
        <div className="py-8 border-b border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-8 text-xs text-slate-400">
          <div>
            <h5 className="font-semibold text-slate-200 mb-2.5">Bairros com imóveis disponíveis:</h5>
            <div className="flex flex-wrap gap-2">
              {availableNeighborhoods.length > 0 ? (
                availableNeighborhoods.map(n => (
                  <button
                    key={n}
                    onClick={() => handleNeighborhoodClick(n)}
                    className="px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 hover:text-white transition-colors"
                  >
                    {n}
                  </button>
                ))
              ) : (
                <span className="text-slate-500 italic">Nenhum bairro cadastrado no momento</span>
              )}
            </div>
          </div>
          <div>
            <h5 className="font-semibold text-slate-200 mb-2.5">Cidades com imóveis disponíveis:</h5>
            <div className="flex flex-wrap gap-2">
              {availableCities.length > 0 ? (
                availableCities.map(c => (
                  <button
                    key={c}
                    onClick={() => handleCityClick(c)}
                    className="px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 hover:text-white transition-colors"
                  >
                    {c}
                  </button>
                ))
              ) : (
                <span className="text-slate-500 italic">Nenhuma cidade cadastrada no momento</span>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Copyright & Legal Links */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© 2026 Web Imóvel Brasil S/A. Todos os direitos reservados.</p>
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-5 gap-y-2">
            <button 
              onClick={() => openLegalPage('terms')} 
              className="hover:text-slate-300 transition-colors cursor-pointer text-left"
            >
              Termos de Uso
            </button>
            <button 
              onClick={() => openLegalPage('privacy')} 
              className="hover:text-slate-300 transition-colors cursor-pointer text-left"
            >
              Política de Privacidade (LGPD)
            </button>
            <button 
              onClick={() => openLegalPage('consumer')} 
              className="hover:text-slate-300 transition-colors cursor-pointer text-left"
            >
              Código de Defesa do Consumidor
            </button>
            <button 
              onClick={() => openLegalPage('cookies')} 
              className="hover:text-slate-300 transition-colors cursor-pointer text-left"
            >
              Preferências de Cookies
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
};
