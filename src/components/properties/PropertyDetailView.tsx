import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Heart, 
  Share2, 
  Scale, 
  MapPin, 
  BedDouble, 
  Bath, 
  Car, 
  Maximize2, 
  Check, 
  Phone, 
  MessageSquare, 
  Calendar, 
  Calculator, 
  ShieldCheck, 
  Clock, 
  Eye, 
  ChevronRight, 
  Building2, 
  Compass, 
  FileText,
  X,
  Send,
  Sparkles
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AMENITIES_LIST } from '../../lib/mockData';
import { formatCurrency, formatArea, formatDateTime } from '../../lib/utils';
import { PropertyCard } from './PropertyCard';

export const PropertyDetailView: React.FC = () => {
  const { 
    properties, 
    selectedPropertyId, 
    setCurrentView, 
    toggleFavorite, 
    isFavorite, 
    comparisonIds, 
    toggleComparison,
    addLead,
    startOrOpenConversation,
    addToast 
  } = useApp();

  const property = properties.find(p => p.id === selectedPropertyId) || properties[0];

  // Gallery modal / lightbox state
  const [galleryModalOpen, setGalleryModalOpen] = useState(false);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  // Lead Form State
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadMessage, setLeadMessage] = useState(`Olá! Tenho interesse no imóvel código ${property.code}. Gostaria de mais informações e disponibilidade para visita.`);
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);

  // Visit Scheduling state
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [visitDate, setVisitDate] = useState('2026-09-05');
  const [visitTime, setVisitTime] = useState('10:00');

  // Mortgage Simulator State
  const [downPayment, setDownPayment] = useState(property.price * 0.2); // 20% default
  const [loanYears, setLoanYears] = useState(30);
  const interestRateYearly = 0.099; // 9.9% a.a.

  if (!property) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <p className="text-slate-500">Imóvel não encontrado.</p>
        <button 
          onClick={() => setCurrentView('search')}
          className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-bold"
        >
          Voltar para a Busca
        </button>
      </div>
    );
  }

  const favorited = isFavorite(property.id);
  const inComparison = comparisonIds.includes(property.id);

  const images = property.media.length > 0 ? property.media : [
    { id: '1', url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80', isCover: true, order: 1, mediaType: 'image' as const }
  ];

  // Mortgage calculation
  const financedAmount = Math.max(0, property.price - downPayment);
  const monthlyRate = interestRateYearly / 12;
  const totalMonths = loanYears * 12;
  const estimatedMonthlyInstallment = financedAmount > 0
    ? (financedAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalMonths))) / (Math.pow(1 + monthlyRate, totalMonths) - 1)
    : 0;

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      addToast({ type: 'success', title: 'Link Copiado!', message: 'O link do imóvel foi copiado para a área de transferência.' });
    }
  };

  const handleSubmitLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName.trim() || !leadPhone.trim()) {
      addToast({ type: 'warning', title: 'Campos Obrigatórios', message: 'Por favor, informe seu nome e telefone para contato.' });
      return;
    }

    setIsSubmittingLead(true);
    setTimeout(() => {
      addLead({
        propertyId: property.id,
        propertyTitle: property.title,
        propertyCode: property.code,
        propertyPrice: property.price,
        propertyImage: property.media[0]?.thumbnailUrl || property.media[0]?.url,
        advertiserId: property.userId,
        buyerName: leadName,
        buyerEmail: leadEmail || 'cliente@contato.com',
        buyerPhone: leadPhone,
        message: leadMessage,
        origin: 'portal_form',
        status: 'new'
      });
      setIsSubmittingLead(false);
      setLeadName('');
      setLeadPhone('');
      setLeadEmail('');
    }, 600);
  };

  const handleScheduleVisitSubmit = () => {
    addLead({
      propertyId: property.id,
      propertyTitle: property.title,
      propertyCode: property.code,
      propertyPrice: property.price,
      propertyImage: property.media[0]?.thumbnailUrl || property.media[0]?.url,
      advertiserId: property.userId,
      buyerName: leadName || 'Cliente Agendamento',
      buyerEmail: leadEmail || 'agendamento@cliente.com',
      buyerPhone: leadPhone || '(15) 99999-9999',
      message: `Solicitação de visita presencial para o dia ${visitDate} às ${visitTime}.`,
      origin: 'schedule_visit',
      status: 'visit_scheduled',
      scheduledVisitDate: `${visitDate}T${visitTime}:00`
    });
    setScheduleModalOpen(false);
  };

  // Similar properties
  const similarProps = properties.filter(p => p.id !== property.id && (p.city === property.city || p.type === property.type)).slice(0, 3);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-6 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Navigation Breadcrumb & Back Button */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <button 
              onClick={() => setCurrentView('search')}
              className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200 hover:text-rose-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar para a busca</span>
            </button>
            <span>/</span>
            <span>{property.purpose === 'sale' ? 'Venda' : property.purpose === 'rent' ? 'Locação' : 'Lançamento'}</span>
            <span>/</span>
            <span>{property.city}</span>
            <span>/</span>
            <span className="font-bold text-slate-900 dark:text-white truncate max-w-xs">{property.neighborhood}</span>
          </div>

          {/* Share & Favorite Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Share2 className="w-4 h-4 text-slate-500" />
              <span>Compartilhar</span>
            </button>

            <button
              onClick={() => toggleComparison(property.id)}
              className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                inComparison
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100'
              }`}
            >
              <Scale className="w-4 h-4" />
              <span>{inComparison ? 'Comparando' : 'Comparar'}</span>
            </button>

            <button
              onClick={() => toggleFavorite(property.id)}
              className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                favorited
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100'
              }`}
            >
              <Heart className={`w-4 h-4 ${favorited ? 'fill-current' : ''}`} />
              <span>{favorited ? 'Favoritado' : 'Favoritar'}</span>
            </button>
          </div>
        </div>

        {/* Title & Header Badges */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
              Cód: {property.code}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
              {property.purpose === 'sale' ? 'Venda' : property.purpose === 'rent' ? 'Locação' : 'Lançamento'}
            </span>
            {property.featured && (
              <span className="text-xs font-bold px-2.5 py-1 rounded bg-amber-500 text-slate-950 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 fill-current" />
                <span>Em Destaque</span>
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-['Outfit'] tracking-tight">
            {property.title}
          </h1>

          <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
            <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{property.addressStreet}{property.addressNumber ? `, ${property.addressNumber}` : ''} - {property.neighborhood}, {property.city} - {property.state}, CEP {property.zipCode}</span>
          </div>
        </div>

        {/* Main Photo Gallery Grid */}
        <div className="relative grid grid-cols-1 md:grid-cols-4 gap-2.5 rounded-3xl overflow-hidden shadow-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          
          {/* Main Large Photo */}
          <div 
            onClick={() => { setActivePhotoIdx(0); setGalleryModalOpen(true); }}
            className="md:col-span-2 aspect-[4/3] md:aspect-auto md:h-[460px] relative overflow-hidden cursor-pointer group"
          >
            <img
              src={images[0]?.url}
              alt={images[0]?.caption || property.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
          </div>

          {/* Sub Photos Grid */}
          <div className="hidden md:grid md:col-span-2 grid-cols-2 gap-2.5 h-[460px]">
            {images.slice(1, 5).map((img, idx) => (
              <div
                key={img.id || idx}
                onClick={() => { setActivePhotoIdx(idx + 1); setGalleryModalOpen(true); }}
                className="relative overflow-hidden cursor-pointer group rounded-xl"
              >
                <img
                  src={img.url}
                  alt={img.caption || `Foto ${idx + 2}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
              </div>
            ))}
          </div>

          {/* Trigger to open all photos */}
          <button
            onClick={() => { setActivePhotoIdx(0); setGalleryModalOpen(true); }}
            className="absolute bottom-4 right-4 px-4 py-2.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl border border-slate-200 dark:border-slate-700 text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
          >
            <Eye className="w-4 h-4 text-rose-500" />
            <span>Ver todas as {images.length} fotos</span>
          </button>
        </div>

        {/* Content Layout: Left Details + Right Sticky Contact Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN (8 cols): Specs, Description, Amenities, Mortgage */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Price & Primary Specs Card */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              <div className="flex flex-wrap items-baseline justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">Valor do Imóvel</span>
                  <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white font-['Outfit']">
                    {formatCurrency(property.price)}
                    {property.purpose === 'rent' && <span className="text-sm font-normal text-slate-500"> /mês</span>}
                  </div>
                  {property.pricePerMeter && (
                    <span className="text-xs text-slate-500 font-medium">
                      ({formatCurrency(property.pricePerMeter)} / m²)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {property.condoFee && (
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-center">
                      <div className="text-slate-400 text-[10px] uppercase">Condomínio</div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(property.condoFee)}</div>
                    </div>
                  )}
                  {property.iptuFee && (
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-center">
                      <div className="text-slate-400 text-[10px] uppercase">IPTU / Mês</div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(property.iptuFee)}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Specs Pills Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center">
                    <Maximize2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 uppercase font-semibold">Área Útil</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{property.usefulArea || property.totalArea} m²</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center">
                    <BedDouble className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 uppercase font-semibold">Quartos</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{property.bedrooms} {property.suites > 0 ? `(${property.suites} suíte)` : ''}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
                    <Bath className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 uppercase font-semibold">Banheiros</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{property.bathrooms} banheiros</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
                    <Car className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 uppercase font-semibold">Vagas</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{property.parkingSpots} vagas</div>
                  </div>
                </div>
              </div>

            </div>

            {/* Description & Details */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white font-['Outfit'] flex items-center gap-2">
                <FileText className="w-5 h-5 text-rose-500" />
                <span>Sobre o Imóvel</span>
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {property.description}
              </p>

              {property.solarOrientation && (
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 pt-2">
                  <Compass className="w-4 h-4 text-amber-500" />
                  <span>Posição Solar: Sol da {property.solarOrientation}</span>
                </div>
              )}
            </div>

            {/* Amenities & Characteristics */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white font-['Outfit']">
                Características & Comodidades
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {property.amenities.map(amenityId => {
                  const item = AMENITIES_LIST.find(a => a.id === amenityId);
                  return (
                    <div
                      key={amenityId}
                      className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200"
                    >
                      <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                      <span>{item ? item.name : amenityId}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mortgage Simulator */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white shadow-xl space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-amber-400">
                    <Calculator className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold font-['Outfit']">Simulador de Financiamento Caixa / Bancos</h3>
                    <p className="text-xs text-slate-300">Faça uma estimativa com taxa média de 9,9% a.a.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-300">Valor de Entrada:</span>
                      <span className="font-bold text-amber-400">{formatCurrency(downPayment)} ({Math.round((downPayment / property.price) * 100)}%)</span>
                    </div>
                    <input
                      type="range"
                      min={property.price * 0.1}
                      max={property.price * 0.8}
                      step={5000}
                      value={downPayment}
                      onChange={(e) => setDownPayment(Number(e.target.value))}
                      className="w-full accent-rose-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-300">Prazo do Financiamento:</span>
                      <span className="font-bold text-amber-400">{loanYears} anos ({loanYears * 12} meses)</span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={35}
                      step={5}
                      value={loanYears}
                      onChange={(e) => setLoanYears(Number(e.target.value))}
                      className="w-full accent-rose-500 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center space-y-2">
                  <span className="text-xs uppercase tracking-wider text-slate-300 font-bold">Parcela Mensal Estimada (Primeira)</span>
                  <div className="text-3xl font-extrabold text-white font-['Outfit']">
                    {formatCurrency(estimatedMonthlyInstallment)}
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Valor a financiar: {formatCurrency(financedAmount)}
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT STICKY SIDEBAR (4 cols): Broker card & Lead contact form */}
          <div className="lg:col-span-4 sticky top-24 space-y-6">
            
            {/* Lead Form Card */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-5">
              
              {/* Broker info header */}
              <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100 dark:border-slate-800">
                <img
                  src={property.advertiser.avatarUrl || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=256&q=80'}
                  alt={property.advertiser.name}
                  className="w-14 h-14 rounded-2xl object-cover ring-2 ring-rose-500/30"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {property.advertiser.name}
                    </h4>
                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                    {property.advertiser.agencyName || 'Consultor Imobiliário'}
                  </p>
                  {property.advertiser.creci && (
                    <span className="inline-block mt-0.5 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      CRECI: {property.advertiser.creci}
                    </span>
                  )}
                </div>
              </div>

              {/* Direct WhatsApp button */}
              <button
                onClick={() => startOrOpenConversation(property.id)}
                className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Conversar no WhatsApp</span>
              </button>

              {/* Agendar Visita CTA */}
              <button
                onClick={() => setScheduleModalOpen(true)}
                className="w-full py-3 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs flex items-center justify-center gap-2 transition-all"
              >
                <Calendar className="w-4 h-4 text-rose-500" />
                <span>Agendar Visita Presencial</span>
              </button>

              {/* Contact Lead Form */}
              <form onSubmit={handleSubmitLead} className="space-y-3 pt-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Ou envie uma mensagem direta:
                </div>

                <div>
                  <input
                    type="text"
                    required
                    placeholder="Seu nome completo"
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <input
                    type="tel"
                    required
                    placeholder="Seu telefone / WhatsApp (com DDD)"
                    value={leadPhone}
                    onChange={(e) => setLeadPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <input
                    type="email"
                    placeholder="Seu e-mail"
                    value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <textarea
                    rows={3}
                    value={leadMessage}
                    onChange={(e) => setLeadMessage(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingLead}
                  className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmittingLead ? 'Enviando...' : 'Enviar Mensagem'}</span>
                </button>

                <p className="text-[10px] text-slate-400 text-center leading-tight">
                  Ao enviar, você concorda com nossos Termos de Uso e Política de Privacidade.
                </p>
              </form>

            </div>

          </div>

        </div>

        {/* Similar Properties Section */}
        {similarProps.length > 0 && (
          <div className="pt-10 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white font-['Outfit']">
                  Imóveis Semelhantes em {property.city}
                </h3>
                <p className="text-xs text-slate-500">Opções na mesma faixa de valor e localização</p>
              </div>
              <button
                onClick={() => setCurrentView('search')}
                className="text-xs font-bold text-rose-600 hover:underline"
              >
                Ver todos
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {similarProps.map(simProp => (
                <PropertyCard key={simProp.id} property={simProp} />
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Lightbox Photo Gallery Modal */}
      {galleryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-white max-w-7xl mx-auto w-full">
            <div>
              <h4 className="font-bold text-sm">{property.title}</h4>
              <p className="text-xs text-slate-400">Foto {activePhotoIdx + 1} de {images.length}</p>
            </div>
            <button
              onClick={() => setGalleryModalOpen(false)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="max-w-5xl mx-auto flex items-center justify-center my-auto">
            <img
              src={images[activePhotoIdx]?.url}
              alt="Galeria"
              className="max-h-[70vh] max-w-full object-contain rounded-2xl shadow-2xl"
            />
          </div>

          <div className="max-w-7xl mx-auto w-full overflow-x-auto py-2 flex items-center gap-2 scrollbar-none justify-center">
            {images.map((img, idx) => (
              <button
                key={img.id || idx}
                onClick={() => setActivePhotoIdx(idx)}
                className={`w-16 h-12 rounded-lg overflow-hidden shrink-0 transition-all border-2 ${
                  idx === activePhotoIdx ? 'border-rose-500 scale-110' : 'border-transparent opacity-50 hover:opacity-100'
                }`}
              >
                <img src={img.url} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Schedule Visit Modal */}
      {scheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-rose-500" />
                <span>Agendar Visita com o Corretor</span>
              </h3>
              <button onClick={() => setScheduleModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Escolha a data e horário de sua preferência para visitar {property.title}. O corretor confirmará pelo WhatsApp.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Data da Visita</label>
                <input
                  type="date"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Horário</label>
                <select
                  value={visitTime}
                  onChange={(e) => setVisitTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                >
                  <option value="09:00">09:00</option>
                  <option value="10:30">10:30</option>
                  <option value="14:00">14:00</option>
                  <option value="15:30">15:30</option>
                  <option value="17:00">17:00</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setScheduleModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleScheduleVisitSubmit}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md"
              >
                Confirmar Agendamento
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
