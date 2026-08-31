import React, { useState, useEffect } from 'react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Building, 
  MapPin, 
  Sparkles, 
  DollarSign, 
  Image as ImageIcon, 
  FileText, 
  CheckCircle2, 
  Upload, 
  Trash2, 
  Plus, 
  Star,
  Layers,
  Home
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Property, PropertyType, PropertyPurpose, PropertyMedia } from '../../types';
import { AMENITIES_LIST, POPULAR_CITIES, POPULAR_NEIGHBORHOODS } from '../../lib/mockData';
import { formatCurrency } from '../../lib/utils';
import { PropertyImageManager } from '../media/PropertyImageManager';

export const PropertyWizardModal: React.FC = () => {
  const { 
    isWizardOpen, 
    setIsWizardOpen, 
    editingProperty, 
    setEditingProperty, 
    addProperty, 
    updateProperty,
    openPropertyDetail 
  } = useApp();

  const [currentStep, setCurrentStep] = useState(1);

  // Form State
  const [purpose, setPurpose] = useState<PropertyPurpose>('sale');
  const [type, setType] = useState<PropertyType>('apartment');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  // Location
  const [zipCode, setZipCode] = useState('18047-600');
  const [addressStreet, setAddressStreet] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('Campolim');
  const [city, setCity] = useState('Sorocaba');
  const [state, setState] = useState('SP');
  const [condoName, setCondoName] = useState('');

  // Specs
  const [usefulArea, setUsefulArea] = useState<number>(120);
  const [totalArea, setTotalArea] = useState<number>(180);
  const [bedrooms, setBedrooms] = useState<number>(3);
  const [suites, setSuites] = useState<number>(1);
  const [bathrooms, setBathrooms] = useState<number>(3);
  const [parkingSpots, setParkingSpots] = useState<number>(2);
  const [solarOrientation, setSolarOrientation] = useState<'manhã' | 'tarde' | 'ambas'>('manhã');

  // Pricing
  const [price, setPrice] = useState<number>(850000);
  const [condoFee, setCondoFee] = useState<number>(750);
  const [iptuFee, setIptuFee] = useState<number>(210);
  const [acceptsFinancing, setAcceptsFinancing] = useState(true);
  const [acceptsExchange, setAcceptsExchange] = useState(false);

  // Amenities & Media
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(['academia', 'piscina', 'churrasqueira', 'elevador']);
  const [mediaList, setMediaList] = useState<PropertyMedia[]>([
    { id: 'm1', url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80', isCover: true, order: 1, mediaType: 'image', caption: 'Sala de Estar Integrada', category: 'sala' },
    { id: 'm2', url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80', isCover: false, order: 2, mediaType: 'image', caption: 'Fachada do Edifício', category: 'fachada' },
    { id: 'm3', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80', isCover: false, order: 3, mediaType: 'image', caption: 'Varanda Gourmet', category: 'lazer' }
  ]);
  const [videoUrl, setVideoUrl] = useState('');

  // Pre-fill when editing
  useEffect(() => {
    if (editingProperty) {
      setPurpose(editingProperty.purpose);
      setType(editingProperty.type);
      setTitle(editingProperty.title);
      setDescription(editingProperty.description);
      setZipCode(editingProperty.zipCode);
      setAddressStreet(editingProperty.addressStreet);
      setAddressNumber(editingProperty.addressNumber || '');
      setNeighborhood(editingProperty.neighborhood);
      setCity(editingProperty.city);
      setState(editingProperty.state);
      setCondoName(editingProperty.condoName || '');
      setUsefulArea(editingProperty.usefulArea);
      setTotalArea(editingProperty.totalArea);
      setBedrooms(editingProperty.bedrooms);
      setSuites(editingProperty.suites);
      setBathrooms(editingProperty.bathrooms);
      setParkingSpots(editingProperty.parkingSpots);
      setSolarOrientation(editingProperty.solarOrientation || 'manhã');
      setPrice(editingProperty.price);
      setCondoFee(editingProperty.condoFee || 0);
      setIptuFee(editingProperty.iptuFee || 0);
      setAcceptsFinancing(editingProperty.acceptsFinancing ?? true);
      setAcceptsExchange(editingProperty.acceptsExchange ?? false);
      setSelectedAmenities(editingProperty.amenities || []);
      setMediaList(editingProperty.media.length > 0 ? editingProperty.media : []);
      setVideoUrl(editingProperty.videoUrl || '');
    } else {
      // Default new
      setTitle('');
      setDescription('');
      setAddressStreet('Av. Professora Izoraida Marques Peres');
      setAddressNumber('1200');
      setVideoUrl('');
    }
  }, [editingProperty]);

  if (!isWizardOpen) return null;

  const steps = [
    { number: 1, title: 'Finalidade & Tipo', icon: Building },
    { number: 2, title: 'Localização', icon: MapPin },
    { number: 3, title: 'Dimensões & Cômodos', icon: Layers },
    { number: 4, title: 'Valores', icon: DollarSign },
    { number: 5, title: 'Fotos & Mídia', icon: ImageIcon },
    { number: 6, title: 'Descrição & Lazer', icon: FileText },
    { number: 7, title: 'Revisão & Publicar', icon: CheckCircle2 }
  ];

  const handleAmenityToggle = (id: string) => {
    setSelectedAmenities(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleSaveListing = () => {
    const propertyData = {
      title: title || `${type === 'apartment' ? 'Apartamento' : 'Casa'} com ${bedrooms} quartos no ${neighborhood}`,
      slug: (title || `${type}-${neighborhood}`).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: description || 'Excelente imóvel com acabamentos de alto padrão, localização privilegiada e total infraestrutura.',
      type,
      purpose,
      status: 'active' as const,
      price,
      condoFee,
      iptuFee,
      pricePerMeter: usefulArea ? Math.round(price / usefulArea) : undefined,
      acceptsFinancing,
      acceptsExchange,
      totalArea,
      usefulArea,
      bedrooms,
      suites,
      bathrooms,
      parkingSpots,
      solarOrientation,
      addressStreet,
      addressNumber,
      neighborhood,
      city,
      state,
      zipCode,
      condoName: condoName || undefined,
      latitude: -23.5015 + (Math.random() - 0.5) * 0.04,
      longitude: -47.4580 + (Math.random() - 0.5) * 0.04,
      featured: true,
      isExclusive: false,
      amenities: selectedAmenities,
      media: mediaList,
      videoUrl: videoUrl.trim() || undefined
    };

    if (editingProperty) {
      updateProperty(editingProperty.id, propertyData);
      openPropertyDetail(editingProperty.id);
    } else {
      const created = addProperty(propertyData);
      openPropertyDetail(created.id);
    }

    setIsWizardOpen(false);
    setEditingProperty(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-xs font-extrabold uppercase">
                {editingProperty ? 'Editar Imóvel' : 'Novo Anúncio'}
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white font-['Outfit']">
                {editingProperty ? `Editando: ${editingProperty.code}` : 'Publicar Imóvel na ImovelHub'}
              </h2>
            </div>
            <p className="text-xs text-slate-500">Passo {currentStep} de 7 • {steps[currentStep - 1]?.title}</p>
          </div>

          <button
            onClick={() => { setIsWizardOpen(false); setEditingProperty(null); }}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto scrollbar-none">
          <div className="flex items-center justify-between min-w-[500px]">
            {steps.map((step) => {
              const isPassed = currentStep > step.number;
              const isCurrent = currentStep === step.number;
              return (
                <button
                  key={step.number}
                  onClick={() => setCurrentStep(step.number)}
                  className={`flex items-center gap-2 text-xs font-bold transition-all ${
                    isCurrent
                      ? 'text-rose-600 dark:text-rose-400'
                      : isPassed
                      ? 'text-slate-700 dark:text-slate-300'
                      : 'text-slate-400 opacity-60'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-extrabold ${
                    isCurrent
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                      : isPassed
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {isPassed ? <Check className="w-3.5 h-3.5" /> : step.number}
                  </div>
                  <span className="hidden md:inline">{step.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Body Scrollable Container */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* STEP 1: Finalidade & Tipo */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Qual a finalidade deste anúncio?</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: 'sale', label: 'Venda', desc: 'Vender meu imóvel' },
                    { id: 'rent', label: 'Locação', desc: 'Aluguel mensal' },
                    { id: 'launch', label: 'Lançamento', desc: 'Na planta / Em obras' },
                    { id: 'seasonal', label: 'Temporada', desc: 'Diárias e feriados' }
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPurpose(item.id as any)}
                      className={`p-4 rounded-2xl text-left border-2 transition-all ${
                        purpose === item.id
                          ? 'border-rose-600 bg-rose-50/50 dark:bg-rose-950/30 shadow-md'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-bold text-sm text-slate-900 dark:text-white">{item.label}</div>
                      <div className="text-xs text-slate-500 mt-1">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Tipo de Imóvel</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'apartment', label: 'Apartamento Padrão' },
                    { id: 'condo_house', label: 'Casa em Condomínio' },
                    { id: 'house', label: 'Casa de Bairro (Rua)' },
                    { id: 'penthouse', label: 'Cobertura Duplex/Triplex' },
                    { id: 'land', label: 'Terreno / Lote' },
                    { id: 'commercial', label: 'Sala / Prédio Comercial' }
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setType(item.id as any)}
                      className={`p-4 rounded-2xl text-left border-2 transition-all ${
                        type === item.id
                          ? 'border-rose-600 bg-rose-50/50 dark:bg-rose-950/30 shadow-md'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-bold text-sm text-slate-900 dark:text-white">{item.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Localização */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">CEP</label>
                  <input
                    type="text"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    placeholder="18047-600"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Condomínio / Edifício (Opcional)</label>
                  <input
                    type="text"
                    value={condoName}
                    onChange={(e) => setCondoName(e.target.value)}
                    placeholder="Ex: Condomínio Alphaville, Edifício Olga Di Prado"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-3">
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Logradouro / Rua / Avenida</label>
                  <input
                    type="text"
                    value={addressStreet}
                    onChange={(e) => setAddressStreet(e.target.value)}
                    placeholder="Ex: Av. Professora Izoraida Marques Peres"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Número</label>
                  <input
                    type="text"
                    value={addressNumber}
                    onChange={(e) => setAddressNumber(e.target.value)}
                    placeholder="1200"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Bairro</label>
                  <input
                    type="text"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Cidade</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Estado</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Dimensões & Cômodos */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Área Útil / Privativa (m²)</label>
                  <input
                    type="number"
                    value={usefulArea}
                    onChange={(e) => setUsefulArea(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Área Total / Construída (m²)</label>
                  <input
                    type="number"
                    value={totalArea}
                    onChange={(e) => setTotalArea(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Dormitórios</label>
                  <input
                    type="number"
                    min={0}
                    value={bedrooms}
                    onChange={(e) => setBedrooms(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Suítes</label>
                  <input
                    type="number"
                    min={0}
                    value={suites}
                    onChange={(e) => setSuites(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Banheiros</label>
                  <input
                    type="number"
                    min={1}
                    value={bathrooms}
                    onChange={(e) => setBathrooms(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Vagas de Garagem</label>
                  <input
                    type="number"
                    min={0}
                    value={parkingSpots}
                    onChange={(e) => setParkingSpots(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Incidência Solar</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'manhã', label: 'Sol da Manhã' },
                    { id: 'tarde', label: 'Sol da Tarde' },
                    { id: 'ambas', label: 'Sol o Dia Todo' }
                  ].map(sol => (
                    <button
                      key={sol.id}
                      type="button"
                      onClick={() => setSolarOrientation(sol.id as any)}
                      className={`p-3 rounded-xl text-xs font-bold border ${
                        solarOrientation === sol.id
                          ? 'border-rose-600 bg-rose-50 dark:bg-rose-950/40 text-rose-600'
                          : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {sol.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Valores */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Preço de {purpose === 'rent' ? 'Locação (mês)' : 'Venda'} (R$)</label>
                  <input
                    type="number"
                    step={1000}
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-base font-extrabold text-rose-600"
                  />
                  <span className="text-[11px] text-slate-400">{formatCurrency(price)}</span>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Taxa de Condomínio (R$)</label>
                  <input
                    type="number"
                    value={condoFee}
                    onChange={(e) => setCondoFee(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">IPTU Mensal (R$)</label>
                  <input
                    type="number"
                    value={iptuFee}
                    onChange={(e) => setIptuFee(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <label className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptsFinancing}
                    onChange={(e) => setAcceptsFinancing(e.target.checked)}
                    className="w-5 h-5 rounded text-rose-600 focus:ring-rose-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Aceita Financiamento Bancário</span>
                    <span className="text-[11px] text-slate-500">Documentação 100% regularizada</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptsExchange}
                    onChange={(e) => setAcceptsExchange(e.target.checked)}
                    className="w-5 h-5 rounded text-rose-600 focus:ring-rose-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Aceita Permuta / Troca</span>
                    <span className="text-[11px] text-slate-500">Estuda imóveis de menor valor ou automóveis</span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* STEP 5: Fotos & Mídia */}
          {currentStep === 5 && (
            <div className="space-y-6 animate-in fade-in">
              <PropertyImageManager
                propertyId={editingProperty?.id || 'new-listing'}
                propertyOwnerId={editingProperty?.userId}
                mediaList={mediaList}
                onMediaChange={setMediaList}
                videoUrl={videoUrl}
                onVideoUrlChange={setVideoUrl}
              />
            </div>
          )}

          {/* STEP 6: Descrição & Lazer */}
          {currentStep === 6 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 mb-1 block">Título Chamativo do Anúncio</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Apartamento de Luxo com 3 Suítes e Varanda Gourmet no Campolim"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 mb-1 block">Descrição Detalhada do Imóvel</label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva os acabamentos, armários embutidos, iluminação, vista, segurança e diferenciais..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white leading-relaxed resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Marque as Comodidades Presentes</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {AMENITIES_LIST.map(amenity => {
                    const isSelected = selectedAmenities.includes(amenity.id);
                    return (
                      <button
                        key={amenity.id}
                        type="button"
                        onClick={() => handleAmenityToggle(amenity.id)}
                        className={`p-2.5 rounded-xl text-xs font-semibold text-left flex items-center justify-between border transition-all ${
                          isSelected
                            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-700 dark:text-rose-300 font-bold'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className="truncate">{amenity.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-rose-600 shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: Revisão & Publicação */}
          {currentStep === 7 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded font-bold">
                      {purpose === 'sale' ? 'Venda' : 'Locação'} • {type}
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
                      {title || 'Imóvel sem título'}
                    </h3>
                    <p className="text-xs text-slate-500">{neighborhood}, {city} - {state}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400">Preço</span>
                    <div className="text-xl font-extrabold text-rose-600">{formatCurrency(price)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center text-xs py-2 border-y border-slate-200 dark:border-slate-700">
                  <div><span className="text-slate-400">Área:</span> <strong>{usefulArea} m²</strong></div>
                  <div><span className="text-slate-400">Quartos:</span> <strong>{bedrooms} ({suites} suítes)</strong></div>
                  <div><span className="text-slate-400">Banheiros:</span> <strong>{bathrooms}</strong></div>
                  <div><span className="text-slate-400">Vagas:</span> <strong>{parkingSpots}</strong></div>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-300">
                  {mediaList.length} fotos anexadas • {selectedAmenities.length} comodidades selecionadas
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
            disabled={currentStep === 1}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Anterior</span>
          </button>

          <div className="flex gap-2">
            {currentStep < 7 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => Math.min(7, prev + 1))}
                className="px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold flex items-center gap-1.5 shadow-md"
              >
                <span>Próximo Passo</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSaveListing}
                className="px-8 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white text-sm font-extrabold shadow-lg shadow-rose-600/30 flex items-center gap-2 active:scale-98"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{editingProperty ? 'Salvar Alterações' : 'Publicar Anúncio Agora'}</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
