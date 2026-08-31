import React, { useState } from 'react';
import { 
  Database, 
  Copy, 
  Check, 
  ExternalLink, 
  X, 
  ShieldCheck, 
  Layers, 
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabaseClient';

interface SupabaseSqlModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseSqlModal: React.FC<SupabaseSqlModalProps> = ({ isOpen, onClose }) => {
  const { addToast, refreshData, isSyncing } = useApp();
  const [copied, setCopied] = useState(false);
  const [testResult, setTestResult] = useState<{ status: 'idle' | 'testing' | 'success' | 'error'; message: string }>({
    status: 'idle',
    message: ''
  });

  if (!isOpen) return null;

  const sqlScript = `-- 1. EXTENSÕES POSTGRES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABELA DE PERFIS DE USUÁRIOS
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(30),
    whatsapp VARCHAR(30),
    avatar_url TEXT,
    role VARCHAR(30) NOT NULL DEFAULT 'broker',
    creci VARCHAR(30),
    agency_name VARCHAR(150),
    agency_logo TEXT,
    verified BOOLEAN NOT NULL DEFAULT TRUE,
    rating NUMERIC(3, 2) DEFAULT 5.00,
    total_deals INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TABELA PRINCIPAL DE IMÓVEIS (PROPERTIES)
CREATE TABLE IF NOT EXISTS public.properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(30) NOT NULL,
    user_id UUID NOT NULL,
    title VARCHAR(250) NOT NULL,
    slug VARCHAR(300),
    description TEXT NOT NULL,
    purpose VARCHAR(30) NOT NULL DEFAULT 'sale',
    type VARCHAR(30) NOT NULL DEFAULT 'apartment',
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    is_exclusive BOOLEAN NOT NULL DEFAULT FALSE,
    price NUMERIC(14, 2) NOT NULL DEFAULT 0,
    condo_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
    iptu_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_area NUMERIC(10, 2) NOT NULL DEFAULT 0,
    useful_area NUMERIC(10, 2) NOT NULL DEFAULT 0,
    bedrooms SMALLINT NOT NULL DEFAULT 0,
    suites SMALLINT NOT NULL DEFAULT 0,
    bathrooms SMALLINT NOT NULL DEFAULT 1,
    parking_spots SMALLINT NOT NULL DEFAULT 0,
    floor SMALLINT,
    total_floors SMALLINT,
    solar_orientation VARCHAR(30),
    construction_year SMALLINT,
    delivery_date DATE,
    video_url TEXT,
    tour_360_url TEXT,
    views_count INT NOT NULL DEFAULT 1,
    leads_count INT NOT NULL DEFAULT 0,
    favorites_count INT NOT NULL DEFAULT 0,
    shares_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. LOCALIZAÇÃO E ENDEREÇO (PROPERTY LOCATIONS)
CREATE TABLE IF NOT EXISTS public.property_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    zip_code VARCHAR(20) NOT NULL,
    street VARCHAR(200) NOT NULL,
    street_number VARCHAR(30),
    complement VARCHAR(100),
    neighborhood VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(10) NOT NULL,
    latitude NUMERIC(10, 7) NOT NULL DEFAULT -23.5015,
    longitude NUMERIC(10, 7) NOT NULL DEFAULT -47.4526,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. IMAGENS E MÍDIA (PROPERTY IMAGES)
CREATE TABLE IF NOT EXISTS public.property_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    media_type VARCHAR(30) NOT NULL DEFAULT 'image',
    category VARCHAR(30) DEFAULT 'outros',
    caption VARCHAR(255),
    is_cover BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INT NOT NULL DEFAULT 1,
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. CARACTERÍSTICAS / COMODIDADES (PROPERTY FEATURES)
CREATE TABLE IF NOT EXISTS public.property_features (
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    feature_id VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (property_id, feature_id)
);

-- 7. LEADS E CRM FUNIL (LEADS)
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    advertiser_id UUID NOT NULL,
    buyer_name VARCHAR(150) NOT NULL,
    buyer_email VARCHAR(255) NOT NULL,
    buyer_phone VARCHAR(30) NOT NULL,
    message TEXT,
    origin VARCHAR(30) NOT NULL DEFAULT 'portal_form',
    status VARCHAR(30) NOT NULL DEFAULT 'new',
    budget NUMERIC(14, 2),
    scheduled_visit_date TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. CONVERSAS & CHAT (CONVERSATIONS & MESSAGES)
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    buyer_id UUID NOT NULL,
    advertiser_id UUID NOT NULL,
    last_message_text TEXT,
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    buyer_unread_count INT NOT NULL DEFAULT 0,
    advertiser_unread_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL,
    text TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. FAVORITOS & BUSCAS SALVAS
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.saved_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title VARCHAR(200) NOT NULL,
    filters JSONB NOT NULL DEFAULT '{}'::jsonb,
    alert_frequency VARCHAR(20) NOT NULL DEFAULT 'daily',
    match_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

-- 11. POLÍTICAS DE ACESSO COMPLETO
DROP POLICY IF EXISTS "Public access profiles" ON public.profiles;
CREATE POLICY "Public access profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access properties" ON public.properties;
CREATE POLICY "Public access properties" ON public.properties FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access locations" ON public.property_locations;
CREATE POLICY "Public access locations" ON public.property_locations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access images" ON public.property_images;
CREATE POLICY "Public access images" ON public.property_images FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access features" ON public.property_features;
CREATE POLICY "Public access features" ON public.property_features FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access leads" ON public.leads;
CREATE POLICY "Public access leads" ON public.leads FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access conversations" ON public.conversations;
CREATE POLICY "Public access conversations" ON public.conversations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access messages" ON public.messages;
CREATE POLICY "Public access messages" ON public.messages FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access favorites" ON public.favorites;
CREATE POLICY "Public access favorites" ON public.favorites FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access saved_searches" ON public.saved_searches;
CREATE POLICY "Public access saved_searches" ON public.saved_searches FOR ALL USING (true) WITH CHECK (true);
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopied(true);
    addToast({
      type: 'success',
      title: 'SQL Copiado!',
      message: 'Cole e clique em RUN no SQL Editor do Supabase.'
    });
    setTimeout(() => setCopied(false), 3000);
  };

  const handleTestConnection = async () => {
    if (!supabase) {
      setTestResult({
        status: 'error',
        message: 'Chaves VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não configuradas.'
      });
      return;
    }

    setTestResult({ status: 'testing', message: 'Verificando tabelas no Supabase...' });
    try {
      const { data, error } = await supabase.from('properties').select('id').limit(1);
      if (error) {
        if (error.message.includes('relation') || error.message.includes('does not exist')) {
          setTestResult({
            status: 'error',
            message: 'Tabela "properties" não encontrada. Execute o script no SQL Editor do Supabase.'
          });
        } else {
          setTestResult({
            status: 'error',
            message: `Erro: ${error.message}`
          });
        }
      } else {
        setTestResult({
          status: 'success',
          message: 'Tabelas conectadas e operacionais no Supabase!'
        });
        await refreshData();
      }
    } catch (err: any) {
      setTestResult({
        status: 'error',
        message: `Erro de conexão: ${err?.message || 'Verifique as chaves'}`
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-3xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white font-['Outfit']">
                Criar Tabelas no Supabase (Script SQL)
              </h3>
              <p className="text-xs text-slate-500">
                Execute o script de 1 clique no SQL Editor do seu Dashboard Supabase
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {/* Quick Step Guide */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1">
              <span className="w-6 h-6 rounded-full bg-rose-600 text-white font-bold flex items-center justify-center text-xs">
                1
              </span>
              <h4 className="font-bold text-slate-900 dark:text-white pt-1">Copie o Script</h4>
              <p className="text-slate-500 text-[11px]">Clique no botão verde "Copiar SQL Completo" abaixo.</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1">
              <span className="w-6 h-6 rounded-full bg-rose-600 text-white font-bold flex items-center justify-center text-xs">
                2
              </span>
              <h4 className="font-bold text-slate-900 dark:text-white pt-1">Abra o SQL Editor</h4>
              <p className="text-slate-500 text-[11px]">No dashboard do seu Supabase, clique em <b>SQL Editor</b>.</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1">
              <span className="w-6 h-6 rounded-full bg-rose-600 text-white font-bold flex items-center justify-center text-xs">
                3
              </span>
              <h4 className="font-bold text-slate-900 dark:text-white pt-1">Cole e Clique RUN</h4>
              <p className="text-slate-500 text-[11px]">Cole o script no editor e clique em <b>Run</b>.</p>
            </div>
          </div>

          {/* Test Status Banner */}
          {testResult.status !== 'idle' && (
            <div className={`p-4 rounded-2xl flex items-start gap-3 border ${
              testResult.status === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-200'
                : testResult.status === 'testing'
                ? 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/60 dark:border-blue-800 dark:text-blue-200'
                : 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/60 dark:border-amber-800 dark:text-amber-200'
            }`}>
              {testResult.status === 'success' ? (
                <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : testResult.status === 'testing' ? (
                <RefreshCw className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="text-xs font-medium">
                <div className="font-bold">{testResult.status === 'success' ? 'Tudo Pronto!' : testResult.status === 'testing' ? 'Verificando...' : 'Ação Necessária'}</div>
                <div>{testResult.message}</div>
              </div>
            </div>
          )}

          {/* SQL Code Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-500" />
                Script DDL PostgreSQL (Pronto para Execução)
              </span>

              <button
                onClick={handleCopy}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white font-bold flex items-center gap-1.5 hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado!' : 'Copiar SQL Completo'}</span>
              </button>
            </div>

            <div className="relative">
              <pre className="p-4 rounded-2xl bg-slate-950 text-slate-200 font-mono text-[11px] h-60 overflow-y-auto leading-relaxed border border-slate-800 select-all">
                {sqlScript}
              </pre>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 flex items-center gap-1.5"
            >
              <span>Abrir Supabase Dashboard</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>

            <button
              onClick={handleTestConnection}
              disabled={testResult.status === 'testing' || isSyncing}
              className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold hover:opacity-90 flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testResult.status === 'testing' || isSyncing ? 'animate-spin' : ''}`} />
              <span>Verificar Conexão</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
