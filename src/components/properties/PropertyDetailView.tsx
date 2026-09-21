import React, { useState, useEffect } from 'react';
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
  Sparkles,
  Video
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AMENITIES_LIST } from '../../lib/mockData';
import { formatCurrency, formatArea, formatDateTime } from '../../lib/utils';
import { parseYouTubeUrl } from '../../lib/imageProcessing';
import { PropertyCard } from './PropertyCard';
import { PropertyMap } from './PropertyMap';
import { verifyHoneypot, sanitizeHtml, auditService } from '../../lib/security';
import { SwipeableImageGallery } from './SwipeableImageGallery';
import { PropertyMortgageCalculator } from './PropertyMortgageCalculator';
import { PropertyLeadContactForm } from './PropertyLeadContactForm';

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
    addToast,
    openLegalPage,
    isAuthenticated,
    currentUser,
    openAuthModal
  } = useApp();

  const property = properties.find(p => p.id === selectedPropertyId) || properties[0];
  const canSeeExactLocation = isAuthenticated && currentUser?.id === property.userId;
  const publicLocationLabel = `${property.neighborhood}, ${property.city}/${property.state}`;
  const locationLabel = canSeeExactLocation
    ? `${property.addressStreet}${property.addressNumber ? `, ${property.addressNumber}` : ''} - ${publicLocationLabel}${property.zipCode ? `, CEP ${property.zipCode}` : ''}`
    : `${publicLocationLabel} — localização aproximada; agende uma visita com o corretor.`;

  // Gallery modal / lightbox state
  const [galleryModalOpen, setGalleryModalOpen] = useState(false);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  // Lead Form State
  const [leadName, setLeadName] = useState(() => (isAuthenticated && currentUser?.id !== 'guest_buyer' ? currentUser.name : ''));
  const [leadEmail, setLeadEmail] = useState(() => (isAuthenticated && currentUser?.id !== 'guest_buyer' ? currentUser.email || '' : ''));
  const [leadPhone, setLeadPhone] = useState(() => (isAuthenticated && currentUser?.id !== 'guest_buyer' ? currentUser.phone || '' : ''));
  const [leadHoneypot, setLeadHoneypot] = useState('');
  const [leadMessage, setLeadMessage] = useState(`Olá! Tenho interesse no imóvel código ${property.code}. Gostaria de mais informações e disponibilidade para visita.`);
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);

  useEffect(() => {
    if (isAuthenticated && currentUser?.id !== 'guest_buyer') {
      if (!leadName) setLeadName(currentUser.name);
      if (!leadEmail && currentUser.email) setLeadEmail(currentUser.email);
      if (!leadPhone && currentUser.phone) setLeadPhone(currentUser.phone);
    }
  }, [isAuthenticated, currentUser]);

  // Visit Scheduling state
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [visitDate, setVisitDate] = useState('2026-09-05');
  const [visitTime, setVisitTime] = useState('10:00');

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

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      addToast({ type: 'success', title: 'Link Copiado!', message: 'O link do imóvel foi copiado para a área de transferência.' });
    }
  };

  const handleSubmitLead = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Honeypot Anti-Spambot check
    if (!verifyHoneypot(leadHoneypot)) {
      // Fake success for bots
      setIsSubmittingLead(false);
      setLeadName('');
      setLeadPhone('');
      setLeadEmail('');
      setLeadHoneypot('');
      addToast({ type: 'success', title: 'Mensagem Enviada!', message: 'O corretor responsável entrará em contato em breve.' });
      return;
    }

    if (!leadName.trim()) {
      addToast({ 
        type: 'warning', 
        title: 'Nome Obrigatório', 
        message: 'Por favor, informe seu nome completo para contato.' 
      });
      return;
    }

    const cleanPhone = leadPhone.replace(/\D/g, '');
    const hasValidPhone = cleanPhone.length >= 10;
    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadEmail.trim());

    if (!hasValidPhone && !isEmailValid) {
      addToast({ 
        type: 'warning', 
        title: 'Canal de Contato Obrigatório', 
        message: 'Para que o corretor possa responder, informe pelo menos o seu WhatsApp (com DDD) ou seu E-mail, ou faça login no portal.' 
      });
      return;
    }

    setIsSubmittingLead(true);
    try {
      const res = await addLead({
        propertyId: property.id,
        propertyTitle: property.title,
        propertyCode: property.code,
        propertyPrice: property.price,
        propertyImage: property.media[0]?.thumbnailUrl || property.media[0]?.url,
        advertiserId: property.userId,
        buyerName: sanitizeHtml(leadName),
        buyerEmail: isEmailValid ? sanitizeHtml(leadEmail) : (currentUser?.email || 'contato.portal@cliente.com.br'),
        buyerPhone: hasValidPhone ? sanitizeHtml(leadPhone) : (currentUser?.phone || leadPhone || 'Não informado'),
        message: sanitizeHtml(leadMessage),
        origin: 'portal_form',
        status: 'new'
      });

      if (res && res.success === false) {
        return;
      }

      setLeadName('');
      setLeadPhone('');
      setLeadEmail('');
      setLeadHoneypot('');
    } finally {
      setIsSubmittingLead(false);
    }
  };

  const handleScheduleVisitSubmit = async () => {
    const cleanPhone = leadPhone.replace(/\D/g, '');
    const hasValidPhone = cleanPhone.length >= 10;
    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadEmail.trim());

    if (!leadName.trim()) {
      addToast({ 
        type: 'warning', 
        title: 'Nome Obrigatório', 
        message: 'Por favor, informe seu nome completo para agendar a visita.' 
      });
      return;
    }

    if (!hasValidPhone && !isEmailValid) {
      addToast({ 
        type: 'warning', 
        title: 'Canal de Contato Obrigatório', 
        message: 'Para agendar a visita, informe pelo menos o seu WhatsApp (com DDD) ou seu E-mail, ou faça login no portal.' 
      });
      return;
    }

    const res = await addLead({
      propertyId: property.id,
      propertyTitle: property.title,
      propertyCode: property.code,
      propertyPrice: property.price,
      propertyImage: property.media[0]?.thumbnailUrl || property.media[0]?.url,
      advertiserId: property.userId,
      buyerName: sanitizeHtml(leadName),
      buyerEmail: isEmailValid ? sanitizeHtml(leadEmail) : (currentUser?.email || 'contato.portal@cliente.com.br'),
      buyerPhone: hasValidPhone ? sanitizeHtml(leadPhone) : (currentUser?.phone || leadPhone || 'Não informado'),
      message: `Solicitação de visita presencial para o dia ${visitDate} às ${visitTime}.`,
      origin: 'schedule_visit',
      status: 'visit_scheduled',
      scheduledVisitDate: `${visitDate}T${visitTime}:00`
    });
    if (res?.success) {
      setScheduleModalOpen(false);
    }
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
            <span>{locationLabel}</span>
          </div>
        </div>

        {/* Touch & Desktop Swipeable Photo Gallery */}
        <SwipeableImageGallery media={images} title={property.title} />

        {/* Content Layout: Left Details + Right Sticky Contact Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pb-20 lg:pb-0">
          
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

            {/* YouTube Video Tour Player (if available) */}
            {property.videoUrl && (() => {
              const yt = parseYouTubeUrl(property.videoUrl);
              if (!yt.isValid) return null;
              return (
                <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center">
                      <Video className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white font-['Outfit']">
                        Tour em Vídeo do Imóvel
                      </h3>
                      <p className="text-xs text-slate-500">
                        Assista ao vídeo e conheça cada detalhe deste imóvel
                      </p>
                    </div>
                  </div>

                  <div className="relative aspect-video rounded-2xl overflow-hidden bg-black shadow-lg">
                    <iframe
                      src={yt.embedUrl}
                      title="Tour do Imóvel no YouTube"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full border-0"
                    />
                  </div>
                </div>
              );
            })()}

            {/* Location & Map Section */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white font-['Outfit']">
                    Localização no Mapa
                  </h3>
                  <p className="text-xs text-slate-500">
                    {property.neighborhood}, {property.city} - {property.state}
                  </p>
                </div>
              </div>

              <div className="h-64 sm:h-80 w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                <PropertyMap
                  properties={[property]}
                  className="h-full w-full"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span>{locationLabel}</span>
                </span>
                {canSeeExactLocation && <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${property.addressStreet || ''} ${property.addressNumber || ''}, ${property.neighborhood || ''}, ${property.city || ''} - ${property.state || ''}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-rose-600 dark:text-rose-400 hover:underline font-semibold"
                >
                  Ver no Google Maps ↗
                </a>}
              </div>
            </div>

            {/* Mortgage Simulator */}
            <PropertyMortgageCalculator propertyPrice={property.price} />

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
              <PropertyLeadContactForm
                leadName={leadName}
                setLeadName={setLeadName}
                leadPhone={leadPhone}
                setLeadPhone={setLeadPhone}
                leadEmail={leadEmail}
                setLeadEmail={setLeadEmail}
                leadMessage={leadMessage}
                setLeadMessage={setLeadMessage}
                leadHoneypot={leadHoneypot}
                setLeadHoneypot={setLeadHoneypot}
                isSubmittingLead={isSubmittingLead}
                onSubmit={handleSubmitLead}
                openLegalPage={openLegalPage}
              />

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

      {/* Sticky Mobile Contact Actions Bar (Above Mobile Nav) */}
      <div className="lg:hidden fixed bottom-14 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 px-4 py-2.5 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] flex items-center justify-between gap-3 safe-bottom-fixed">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400">Valor</span>
          <div className="text-base font-black text-slate-900 dark:text-white font-['Outfit'] leading-tight">
            {formatCurrency(property.price)}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`https://wa.me/5515999999999?text=Ol%C3%A1,%20gostaria%20de%20informa%C3%A7%C3%B5es%20sobre%20o%20im%C3%B3vel%20c%C3%B3digo%20${property.code}:%20${encodeURIComponent(property.title)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] px-3 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
          >
            <MessageSquare className="w-4 h-4" />
            <span>WhatsApp</span>
          </a>

          <button
            onClick={() => setScheduleModalOpen(true)}
            className="min-h-[44px] px-4 py-2 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-600/30 active:scale-95 transition-all"
          >
            <Calendar className="w-4 h-4" />
            <span>Agendar Visita</span>
          </button>
        </div>
      </div>

    </div>
  );
};
