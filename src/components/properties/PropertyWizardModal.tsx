import React, { useState, useEffect, useRef } from 'react';
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
  Home,
  Loader2,
  AlertCircle,
  Search
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Property, PropertyType, PropertyPurpose, PropertyMedia } from '../../types';
import { AMENITIES_LIST } from '../../lib/mockData';
import { formatCurrency, getPropertyTypeLabel, getPropertyPurposeLabel, generatePropertyCode } from '../../lib/utils';
import { PropertyImageManager } from '../media/PropertyImageManager';
import { geocodeAddress, resolvePropertyCoordinates } from '../../lib/geocoding';

// Tipos oficiais cadastrados no banco de dados e no portal
const PORTAL_PROPERTY_TYPES: { id: PropertyType; label: string; desc: string }[] = [
  { id: 'apartment', label: 'Apartamento', desc: 'Padrão, studio ou cobertura' },
  { id: 'house', label: 'Casa de Bairro', desc: 'Casa solta de rua' },
  { id: 'condo_house', label: 'Casa em Condomínio', desc: 'Residencial fechado' },
  { id: 'land', label: 'Terreno', desc: 'Lote, condomínio ou rua' },
  { id: 'chacara', label: 'Chácara', desc: 'Área de lazer e descanso' },
  { id: 'farm', label: 'Sítio/Fazenda', desc: 'Área rural e produção' },
  { id: 'commercial', label: 'Comercial', desc: 'Sala, galpão ou loja' },
  { id: 'launch', label: 'Lançamento', desc: 'Em obras ou na planta' },
];

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<{ message: string; details?: string } | null>(null);

  // Form State
  const [purpose, setPurpose] = useState<PropertyPurpose>('sale');
  const [type, setType] = useState<PropertyType>('apartment');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  // Location
  const [zipCode, setZipCode] = useState('');
  const [addressStreet, setAddressStreet] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [condoName, setCondoName] = useState('');

  // Geocoding Coordinates State
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeStatus, setGeocodeStatus] = useState<string | null>(null);

  // CEP Status & Auto-focus
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [cepStatusMessage, setCepStatusMessage] = useState<string | null>(null);
  const addressNumberRef = useRef<HTMLInputElement>(null);

  // Specs
  const [usefulArea, setUsefulArea] = useState<number>(0);
  const [totalArea, setTotalArea] = useState<number>(0);
  const [bedrooms, setBedrooms] = useState<number>(0);
  const [suites, setSuites] = useState<number>(0);
  const [bathrooms, setBathrooms] = useState<number>(1);
  const [parkingSpots, setParkingSpots] = useState<number>(0);
  const [solarOrientation, setSolarOrientation] = useState<'manhã' | 'tarde' | 'ambas'>('manhã');

  // Pricing
  const [price, setPrice] = useState<number>(0);
  const [condoFee, setCondoFee] = useState<number>(0);
  const [iptuFee, setIptuFee] = useState<number>(0);
  const [acceptsFinancing, setAcceptsFinancing] = useState(true);
  const [acceptsExchange, setAcceptsExchange] = useState(false);

  // Amenities & Media - Inicializado estritamente vazio (Zero imagens fictícias!)
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [mediaList, setMediaList] = useState<PropertyMedia[]>([]);
  const [videoUrl, setVideoUrl] = useState('');

  // Pre-fill when editing or reset when creating
  useEffect(() => {
    setStepError(null);
    setCepStatusMessage(null);

    if (editingProperty) {
      setPurpose(editingProperty.purpose);
      setType(editingProperty.type);
      setTitle(editingProperty.title);
      setDescription(editingProperty.description);
      setZipCode(editingProperty.zipCode || '');
      setAddressStreet(editingProperty.addressStreet || '');
      setAddressNumber(editingProperty.addressNumber || '');
      setNeighborhood(editingProperty.neighborhood || '');
      setCity(editingProperty.city || '');
      setState(editingProperty.state || '');
      setCondoName(editingProperty.condoName || '');
      setUsefulArea(editingProperty.usefulArea || 0);
      setTotalArea(editingProperty.totalArea || 0);
      setBedrooms(editingProperty.bedrooms || 0);
      setSuites(editingProperty.suites || 0);
      setBathrooms(editingProperty.bathrooms || 1);
      setParkingSpots(editingProperty.parkingSpots || 0);
      setSolarOrientation((editingProperty.solarOrientation as any) || 'manhã');
      setPrice(editingProperty.price || 0);
      setCondoFee(editingProperty.condoFee || 0);
      setIptuFee(editingProperty.iptuFee || 0);
      setAcceptsFinancing(editingProperty.acceptsFinancing ?? true);
      setAcceptsExchange(editingProperty.acceptsExchange ?? false);
      setSelectedAmenities(editingProperty.amenities || []);
      setMediaList(editingProperty.media && editingProperty.media.length > 0 ? editingProperty.media : []);
      setVideoUrl(editingProperty.videoUrl || '');
      setLatitude(editingProperty.latitude || null);
      setLongitude(editingProperty.longitude || null);
      setGeocodeStatus(editingProperty.latitude && editingProperty.longitude ? `Geolocalizado: ${editingProperty.city}/${editingProperty.state}` : null);
    } else {
      // Default new listing - Zero dados fictícios
      setCurrentStep(1);
      setPurpose('sale');
      setType('apartment');
      setTitle('');
      setDescription('');
      setZipCode('');
      setAddressStreet('');
      setAddressNumber('');
      setNeighborhood('');
      setCity('');
      setState('');
      setCondoName('');
      setLatitude(null);
      setLongitude(null);
      setGeocodeStatus(null);
      setUsefulArea(0);
      setTotalArea(0);
      setBedrooms(0);
      setSuites(0);
      setBathrooms(1);
      setParkingSpots(0);
      setPrice(0);
      setCondoFee(0);
      setIptuFee(0);
      setAcceptsFinancing(true);
      setAcceptsExchange(false);
      setSelectedAmenities([]);
      setMediaList([]); // 100% livre de fotos fictícias
      setVideoUrl('');
    }
  }, [editingProperty, isWizardOpen]);

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

  // CEP Máscara automática (hífen após 5º dígito) e Busca automática via ViaCEP
  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const digits = rawVal.replace(/\D/g, '').slice(0, 8);

    // Formata automaticamente inserindo o hífen após o 5º dígito
    let formatted = digits;
    if (digits.length > 5) {
      formatted = `${digits.slice(0, 5)}-${digits.slice(5)}`;
    }

    setZipCode(formatted);
    setStepError(null);

    // Ao terminar (8 dígitos numéricos completos), realiza busca automática
    if (digits.length === 8) {
      fetchAddressFromCep(digits);
    } else {
      setCepStatusMessage(null);
    }
  };

  const fetchAddressFromCep = async (digits: string) => {
    setIsSearchingCep(true);
    setCepStatusMessage('Consultando CEP...');
    try {
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await response.json();
      if (data.erro) {
        setCepStatusMessage('CEP não localizado. Preencha os campos de endereço manualmente.');
      } else {
        if (data.logradouro) setAddressStreet(data.logradouro);
        if (data.bairro) setNeighborhood(data.bairro);
        if (data.localidade) setCity(data.localidade);
        if (data.uf) setState(data.uf);
        setCepStatusMessage('Endereço preenchido automaticamente.');
        
        // Dispara geocodificação real no mapa imediatamente
        triggerGeocoding(data.logradouro || '', addressNumber, data.bairro || '', data.localidade || '', data.uf || '');
        
        // Foca automaticamente no campo do número
        setTimeout(() => {
          addressNumberRef.current?.focus();
        }, 150);
      }
    } catch (err) {
      setCepStatusMessage('Falha ao consultar CEP. Preencha manualmente.');
    } finally {
      setIsSearchingCep(false);
    }
  };

  const triggerGeocoding = async (street: string, num: string, neigh: string, c: string, uf: string) => {
    if (!c && !street) return;
    setIsGeocoding(true);
    try {
      const geo = await geocodeAddress({
        street,
        number: num,
        neighborhood: neigh,
        city: c,
        state: uf
      });
      if (geo) {
        setLatitude(geo.latitude);
        setLongitude(geo.longitude);
        setGeocodeStatus(`Localização identificada (${c}/${uf} • ${geo.latitude.toFixed(4)}, ${geo.longitude.toFixed(4)})`);
      } else if (c || uf) {
        setGeocodeStatus(`Cidade mapeada: ${c || ''}/${uf || ''}`);
      }
    } catch {
      // Silently catch
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleAmenityToggle = (id: string) => {
    setSelectedAmenities(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  // Validação estrita de campos obrigatórios marcados com *
  const validateStep = (stepNumber: number): boolean => {
    setStepError(null);

    if (stepNumber === 1) {
      if (!purpose) {
        setStepError('Por favor, selecione a finalidade da publicação (Venda, Locação, etc.).');
        return false;
      }
      if (!type) {
        setStepError('Por favor, selecione o tipo do imóvel.');
        return false;
      }
    } else if (stepNumber === 2) {
      const cleanCep = zipCode.replace(/\D/g, '');
      if (cleanCep.length < 8) {
        setStepError('Por favor, informe um CEP válido com 8 dígitos.');
        return false;
      }
      if (!addressStreet.trim()) {
        setStepError('Por favor, informe o Logradouro / Rua.');
        return false;
      }
      if (!addressNumber.trim()) {
        setStepError('Por favor, informe o Número do imóvel.');
        return false;
      }
      if (!neighborhood.trim()) {
        setStepError('Por favor, informe o Bairro.');
        return false;
      }
      if (!city.trim()) {
        setStepError('Por favor, informe a Cidade.');
        return false;
      }
      if (!state.trim()) {
        setStepError('Por favor, informe o Estado.');
        return false;
      }
    } else if (stepNumber === 3) {
      if ((usefulArea || 0) <= 0 && (totalArea || 0) <= 0) {
        setStepError('Por favor, informe a Área Útil ou Área Total do imóvel (m²).');
        return false;
      }
    } else if (stepNumber === 4) {
      if ((price || 0) <= 0) {
        setStepError('Por favor, informe o Preço do imóvel maior que zero.');
        return false;
      }
    } else if (stepNumber === 5) {
      if (mediaList.length === 0) {
        setStepError('Por favor, adicione pelo menos 1 foto real do imóvel para prosseguir.');
        return false;
      }
    } else if (stepNumber === 6) {
      if (!title.trim() || title.trim().length < 5) {
        setStepError('Por favor, informe um Título Chamativo para o anúncio (mínimo de 5 caracteres).');
        return false;
      }
    }

    return true;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setStepError(null);
      setCurrentStep(prev => Math.min(7, prev + 1));
    }
  };

  const handleStepJump = (targetStep: number) => {
    if (targetStep < currentStep) {
      setStepError(null);
      setCurrentStep(targetStep);
      return;
    }

    // Para ir para a frente, valida todos os passos intermediários
    for (let s = currentStep; s < targetStep; s++) {
      if (!validateStep(s)) {
        return;
      }
    }
    setStepError(null);
    setCurrentStep(targetStep);
  };

  const handleSaveListing = async () => {
    // Validação final de revisão
    for (let s = 1; s <= 6; s++) {
      if (!validateStep(s)) {
        setCurrentStep(s);
        return;
      }
    }

    setIsSubmitting(true);
    let finalLat = latitude;
    let finalLng = longitude;

    // Se ainda não tiver latitude/longitude mapeados, realiza geocodificação no envio
    if (!finalLat || !finalLng) {
      try {
        const geo = await geocodeAddress({
          street: addressStreet.trim(),
          number: addressNumber.trim(),
          neighborhood: neighborhood.trim(),
          city: city.trim(),
          state: state.trim()
        });
        if (geo) {
          finalLat = geo.latitude;
          finalLng = geo.longitude;
        }
      } catch {}
    }

    // Se a geocodificação não retornar nada (endereço inexistente ou sem conexão), 
    // usa o centro geográfico aproximado do Brasil (-14.2350, -51.9253) ou mantém nulo
    const [finalResolvedLat, finalResolvedLng] = resolvePropertyCoordinates({
      city: city.trim(),
      state: state.trim().toUpperCase(),
      neighborhood: neighborhood.trim(),
      addressStreet: addressStreet.trim(),
      latitude: finalLat,
      longitude: finalLng
    });

    const propertyData = {
      title: title.trim(),
      slug: (title || `${type}-${neighborhood}`).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: description.trim() || 'Excelente imóvel com ótima localização e total infraestrutura.',
      type,
      purpose,
      status: 'active' as const,
      price,
      condoFee: condoFee || 0,
      iptuFee: iptuFee || 0,
      pricePerMeter: usefulArea ? Math.round(price / usefulArea) : undefined,
      acceptsFinancing,
      acceptsExchange,
      totalArea: totalArea || usefulArea || 0,
      usefulArea: usefulArea || totalArea || 0,
      bedrooms,
      suites,
      bathrooms,
      parkingSpots,
      solarOrientation: solarOrientation as any,
      addressStreet: addressStreet.trim(),
      addressNumber: addressNumber.trim(),
      neighborhood: neighborhood.trim(),
      city: city.trim(),
      state: state.trim().toUpperCase(),
      zipCode: zipCode.trim(),
      condoName: condoName.trim() || undefined,
      latitude: finalResolvedLat,
      longitude: finalResolvedLng,
      featured: true,
      isExclusive: false,
      amenities: selectedAmenities,
      media: mediaList,
      videoUrl: videoUrl.trim() || undefined
    };

    setSaveError(null);
    setStepError(null);

    try {
      if (editingProperty) {
        const success = await updateProperty(editingProperty.id, propertyData);
        if (success) {
          openPropertyDetail(editingProperty.id);
          setIsWizardOpen(false);
          setEditingProperty(null);
        } else {
          setSaveError({
            message: 'Erro ao salvar o anúncio',
            details: 'Não foi possível atualizar o anúncio no banco de dados Supabase. Verifique a conexão e permissões da tabela properties.'
          });
        }
      } else {
        const created = await addProperty(propertyData);
        if (created?.id) {
          openPropertyDetail(created.id);
          setIsWizardOpen(false);
          setEditingProperty(null);
        } else {
          setSaveError({
            message: 'Erro ao salvar o anúncio',
            details: 'A comunicação com o Supabase falhou ou foi rejeitada. O anúncio não foi gravado no banco de dados.'
          });
        }
      }
    } catch (err: any) {
      setSaveError({
        message: 'Erro ao salvar o anúncio',
        details: err?.message || String(err)
      });
    } finally {
      setIsSubmitting(false);
    }
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
                {editingProperty ? `Editando: ${editingProperty.code}` : 'Publicar Imóvel no Web Imóvel'}
              </h2>
            </div>
            <p className="text-xs text-slate-500">Passo {currentStep} de 7 • {steps[currentStep - 1]?.title}</p>
          </div>

          <button
            onClick={() => { setIsWizardOpen(false); setEditingProperty(null); }}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
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
                  type="button"
                  onClick={() => handleStepJump(step.number)}
                  className={`flex items-center gap-2 text-xs font-bold transition-all cursor-pointer ${
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

        {/* Alert Error Box */}
        {stepError && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{stepError}</span>
          </div>
        )}

        {/* Alerta de Erro ao Salvar no Supabase com Título e Detalhe Técnico */}
        {saveError && (
          <div className="mx-6 mt-4 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border-2 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100 animate-in fade-in">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-200/80 dark:bg-rose-900/60 flex items-center justify-center shrink-0 text-rose-700 dark:text-rose-300 mt-0.5">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-extrabold text-rose-900 dark:text-rose-100">
                  {saveError.message}
                </h4>
                {saveError.details && (
                  <div className="mt-1 text-xs text-rose-700 dark:text-rose-300 font-mono bg-white/70 dark:bg-black/30 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 break-words leading-relaxed">
                    <span className="font-sans font-bold text-rose-800 dark:text-rose-200 block text-[11px] mb-0.5">
                      Detalhe técnico:
                    </span>
                    {saveError.details}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSaveError(null)}
                className="p-1 rounded-lg text-rose-500 hover:bg-rose-200/50 dark:hover:bg-rose-900/40 cursor-pointer shrink-0"
                title="Fechar aviso"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Form Body Scrollable Container */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* STEP 1: Finalidade & Tipo */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <span>Qual a finalidade deste anúncio?</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: 'sale', label: 'Venda', desc: 'Vender meu imóvel' },
                    { id: 'rent', label: 'Locação', desc: 'Aluguel mensal' },
                    { id: 'launch', label: 'Lançamento', desc: 'Na planta / Em obras' },
                    { id: 'seasonal', label: 'Temporada', desc: 'Diárias e temporada' }
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => { setPurpose(item.id as any); setStepError(null); }}
                      className={`p-4 rounded-2xl text-left border-2 transition-all cursor-pointer ${
                        purpose === item.id
                          ? 'border-rose-600 bg-rose-50/50 dark:bg-rose-950/30 shadow-md ring-2 ring-rose-500/20'
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
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <span>Tipo de Imóvel</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {PORTAL_PROPERTY_TYPES.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => { setType(item.id); setStepError(null); }}
                      className={`p-4 rounded-2xl text-left border-2 transition-all cursor-pointer ${
                        type === item.id
                          ? 'border-rose-600 bg-rose-50/50 dark:bg-rose-950/30 shadow-md ring-2 ring-rose-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-bold text-sm text-slate-900 dark:text-white">{item.label}</div>
                      <div className="text-[11px] text-slate-500 mt-1 line-clamp-1">{item.desc}</div>
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
                  <label className="text-xs font-bold text-slate-500 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <span>CEP</span>
                      <span className="text-rose-500 font-bold">*</span>
                    </span>
                    {isSearchingCep && (
                      <span className="text-[11px] font-normal text-rose-600 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Buscando...
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={9}
                      value={zipCode}
                      onChange={handleCepChange}
                      placeholder="00000-000"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                      <Search className="w-4 h-4" />
                    </div>
                  </div>
                  {cepStatusMessage && (
                    <p className="text-[11px] mt-1 text-slate-500 dark:text-slate-400">
                      {cepStatusMessage}
                    </p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Condomínio / Edifício (Opcional)</label>
                  <input
                    type="text"
                    value={condoName}
                    onChange={(e) => setCondoName(e.target.value)}
                    placeholder="Ex: Condomínio Alphaville, Edifício Olga Di Prado"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-3">
                  <label className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                    <span>Logradouro / Rua / Avenida</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={addressStreet}
                    onChange={(e) => { setAddressStreet(e.target.value); setStepError(null); }}
                    onBlur={() => triggerGeocoding(addressStreet, addressNumber, neighborhood, city, state)}
                    placeholder="Ex: Rua das Flores ou Av. Principal"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                    <span>Número</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    ref={addressNumberRef}
                    type="text"
                    value={addressNumber}
                    onChange={(e) => { setAddressNumber(e.target.value); setStepError(null); }}
                    onBlur={() => triggerGeocoding(addressStreet, addressNumber, neighborhood, city, state)}
                    placeholder="Ex: 1200 ou S/N"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                    <span>Bairro</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={neighborhood}
                    onChange={(e) => { setNeighborhood(e.target.value); setStepError(null); }}
                    onBlur={() => triggerGeocoding(addressStreet, addressNumber, neighborhood, city, state)}
                    placeholder="Ex: Centro"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                    <span>Cidade</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => { setCity(e.target.value); setStepError(null); }}
                    onBlur={() => triggerGeocoding(addressStreet, addressNumber, neighborhood, city, state)}
                    placeholder="Ex: Sorocaba"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                    <span>Estado (UF)</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    value={state}
                    onChange={(e) => { setState(e.target.value.toUpperCase()); setStepError(null); }}
                    onBlur={() => triggerGeocoding(addressStreet, addressNumber, neighborhood, city, state.toUpperCase())}
                    placeholder="SP"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Status de Geolocalização Real no Mapa */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                    latitude && longitude ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                  }`}>
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">
                      {isGeocoding
                        ? 'Identificando coordenadas reais no mapa via satélite...'
                        : (latitude && longitude)
                        ? (geocodeStatus || `Mapeado com sucesso (${city || 'Brasil'} - ${latitude.toFixed(4)}, ${longitude.toFixed(4)})`)
                        : 'Preencha os campos para localização exata no mapa'}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {(latitude && longitude)
                        ? 'O imóvel será posicionado no mapa exatamente onde se localiza no território nacional.'
                        : 'O portal georreferencia automaticamente o endereço real para os filtros e mapa.'}
                    </span>
                  </div>
                </div>
                {isGeocoding && <Loader2 className="w-4 h-4 animate-spin text-rose-600 shrink-0 ml-2" />}
              </div>
            </div>
          )}

          {/* STEP 3: Dimensões & Cômodos */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                    <span>Área Útil / Privativa (m²)</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={usefulArea || ''}
                    onChange={(e) => { setUsefulArea(Number(e.target.value)); setStepError(null); }}
                    placeholder="Ex: 85"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Área Total / Construída (m²)</label>
                  <input
                    type="number"
                    min={0}
                    value={totalArea || ''}
                    onChange={(e) => { setTotalArea(Number(e.target.value)); setStepError(null); }}
                    placeholder="Ex: 120"
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
                      className={`p-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
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
                  <label className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                    <span>Preço de {purpose === 'rent' ? 'Locação (mês)' : 'Venda'} (R$)</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="number"
                    step={1000}
                    value={price || ''}
                    onChange={(e) => { setPrice(Number(e.target.value)); setStepError(null); }}
                    placeholder="Ex: 450000"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-base font-extrabold text-rose-600"
                  />
                  <span className="text-[11px] text-slate-400">{formatCurrency(price)}</span>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Taxa de Condomínio (R$)</label>
                  <input
                    type="number"
                    value={condoFee || ''}
                    onChange={(e) => setCondoFee(Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">IPTU Mensal (R$)</label>
                  <input
                    type="number"
                    value={iptuFee || ''}
                    onChange={(e) => setIptuFee(Number(e.target.value))}
                    placeholder="0"
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
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1">
                    <span>Fotos do Imóvel</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    Adicione somente fotos reais do imóvel (mínimo de 1 foto para publicar).
                  </p>
                </div>
                <span className="text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-slate-700 dark:text-slate-300">
                  {mediaList.length} foto(s)
                </span>
              </div>

              <PropertyImageManager
                propertyId={editingProperty?.id || 'new-listing'}
                propertyOwnerId={editingProperty?.userId}
                mediaList={mediaList}
                onMediaChange={(newMedia) => {
                  setMediaList(newMedia);
                  if (newMedia.length > 0) setStepError(null);
                }}
                videoUrl={videoUrl}
                onVideoUrlChange={setVideoUrl}
              />
            </div>
          )}

          {/* STEP 6: Descrição & Lazer */}
          {currentStep === 6 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                  <span>Título Chamativo do Anúncio</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); setStepError(null); }}
                  placeholder="Ex: Apartamento de Luxo com 3 Suítes e Varanda Gourmet no Campolim"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 mb-1 block">Descrição Detalhada do Imóvel</label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva os acabamentos, armários embutidos, iluminação, vista, segurança e diferenciais..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white leading-relaxed resize-none placeholder:text-slate-400"
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
                        className={`p-2.5 rounded-xl text-xs font-semibold text-left flex items-center justify-between border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-700 dark:text-rose-300 font-bold'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
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
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono uppercase bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded font-bold">
                        {getPropertyPurposeLabel(purpose)} • {getPropertyTypeLabel(type)}
                      </span>
                      <span className="text-[10px] font-mono font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 px-2 py-0.5 rounded">
                        {editingProperty ? `Cód: ${editingProperty.code}` : `Cód. Inteligente: ${generatePropertyCode({ type, purpose, state, city })}`}
                      </span>
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
                      {title || 'Imóvel sem título'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {addressStreet}{addressNumber ? `, ${addressNumber}` : ''} - {neighborhood}, {city} - {state} (CEP: {zipCode})
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400">Preço</span>
                    <div className="text-xl font-extrabold text-rose-600">{formatCurrency(price)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center text-xs py-2 border-y border-slate-200 dark:border-slate-700">
                  <div><span className="text-slate-400">Área:</span> <strong>{usefulArea || totalArea} m²</strong></div>
                  <div><span className="text-slate-400">Quartos:</span> <strong>{bedrooms} ({suites} suítes)</strong></div>
                  <div><span className="text-slate-400">Banheiros:</span> <strong>{bathrooms}</strong></div>
                  <div><span className="text-slate-400">Vagas:</span> <strong>{parkingSpots}</strong></div>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-300">
                  {mediaList.length} foto(s) anexada(s) • {selectedAmenities.length} comodidade(s) selecionada(s)
                </div>
              </div>

              {saveError && (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border-2 border-rose-400 dark:border-rose-800 text-rose-900 dark:text-rose-100 animate-in fade-in">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-rose-200 dark:bg-rose-900 flex items-center justify-center shrink-0 text-rose-700 dark:text-rose-300 mt-0.5">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-extrabold text-rose-900 dark:text-rose-100">
                        {saveError.message}
                      </h4>
                      {saveError.details && (
                        <div className="mt-1 text-xs text-rose-700 dark:text-rose-300 font-mono bg-white/70 dark:bg-black/30 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 break-words leading-relaxed">
                          <span className="font-sans font-bold text-rose-800 dark:text-rose-200 block text-[11px] mb-0.5">
                            Detalhe técnico:
                          </span>
                          {saveError.details}
                        </div>
                      )}
                      <p className="mt-2 text-xs text-rose-700 dark:text-rose-300">
                        O anúncio permaneceu nesta tela para que você não perca nenhuma informação digitada. Você pode tentar clicar em <strong>"Publicar Anúncio Agora"</strong> novamente.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
          <button
            type="button"
            onClick={() => { setStepError(null); setCurrentStep(prev => Math.max(1, prev - 1)); }}
            disabled={currentStep === 1}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 flex items-center gap-1 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Anterior</span>
          </button>

          <div className="flex gap-2">
            {currentStep < 7 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
              >
                <span>Próximo Passo</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSaveListing}
                disabled={isSubmitting}
                className="px-8 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 disabled:opacity-50 text-white text-sm font-extrabold shadow-lg shadow-rose-600/30 flex items-center gap-2 active:scale-98 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Salvando no banco de dados...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{editingProperty ? 'Salvar Alterações' : 'Publicar Anúncio Agora'}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
