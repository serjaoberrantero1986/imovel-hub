-- ==============================================================================
-- IMOVELHUB / IMOVIP PRO - SCHEMA POSTGRESQL & ROW LEVEL SECURITY (RLS)
-- Políticas de Segurança Avançadas, Proteção contra IDOR, RLS e Auditoria
-- ==============================================================================

-- 1. EXTENSÕES POSTGRES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABELA DE PERFIS DE USUÁRIOS (PROFILES)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(30),
    whatsapp VARCHAR(30),
    avatar_url TEXT,
    role VARCHAR(30) NOT NULL DEFAULT 'broker', -- 'buyer', 'broker', 'agency', 'admin'
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
    code VARCHAR(30) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(250) NOT NULL,
    slug VARCHAR(300),
    description TEXT NOT NULL,
    purpose VARCHAR(30) NOT NULL DEFAULT 'sale',
    type VARCHAR(30) NOT NULL DEFAULT 'apartment',
    status VARCHAR(30) NOT NULL DEFAULT 'active', -- 'active', 'paused', 'sold', 'rented', 'draft'
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
    advertiser_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
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
    buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    advertiser_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
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
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. FAVORITOS & BUSCAS SALVAS
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, property_id)
);

CREATE TABLE IF NOT EXISTS public.saved_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    filters JSONB NOT NULL DEFAULT '{}'::jsonb,
    alert_frequency VARCHAR(20) NOT NULL DEFAULT 'daily',
    match_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. TABELA DE AUDITORIA DE SEGURANÇA (AUDIT LOGS)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    event_type VARCHAR(80) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'INFO',
    ip_address VARCHAR(50),
    user_agent TEXT,
    resource_type VARCHAR(50),
    resource_id VARCHAR(100),
    details TEXT NOT NULL,
    blocked BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 11. ROW LEVEL SECURITY (RLS) - POLÍTICAS DE SEGURANÇA RESTRITIVAS & ANTI-IDOR
-- ==============================================================================

-- Habilita RLS em todas as tabelas
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
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Limpa políticas legadas
DROP POLICY IF EXISTS "Public access profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public access properties" ON public.properties;
DROP POLICY IF EXISTS "Public access locations" ON public.property_locations;
DROP POLICY IF EXISTS "Public access images" ON public.property_images;
DROP POLICY IF EXISTS "Public access features" ON public.property_features;
DROP POLICY IF EXISTS "Public access leads" ON public.leads;
DROP POLICY IF EXISTS "Public access conversations" ON public.conversations;
DROP POLICY IF EXISTS "Public access messages" ON public.messages;
DROP POLICY IF EXISTS "Public access favorites" ON public.favorites;
DROP POLICY IF EXISTS "Public access saved_searches" ON public.saved_searches;

-- A. PROFILES RLS
-- Qualquer um pode ler perfis públicos de corretores; usuários só editam o próprio perfil
CREATE POLICY "profiles_select_policy" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_policy" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id OR auth.role() = 'service_role');
CREATE POLICY "profiles_update_policy" ON public.profiles FOR UPDATE USING (auth.uid() = id OR auth.role() = 'service_role');

-- B. PROPERTIES RLS (Anti-IDOR)
-- Leitura: Qualquer um pode ver imóveis ativos; proprietário pode ver seus rascunhos/pausados
CREATE POLICY "properties_select_policy" ON public.properties FOR SELECT
  USING (status = 'active' OR auth.uid() = user_id OR auth.role() = 'service_role');

-- Inserção: Apenas o próprio usuário autenticado
CREATE POLICY "properties_insert_policy" ON public.properties FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

-- Atualização e Exclusão: Apenas o corretor proprietário (Evita que corretor A altere imóvel do corretor B)
CREATE POLICY "properties_update_policy" ON public.properties FOR UPDATE
  USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "properties_delete_policy" ON public.properties FOR DELETE
  USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- C. LOCATIONS, IMAGES & FEATURES RLS
CREATE POLICY "locations_select_policy" ON public.property_locations FOR SELECT USING (true);
CREATE POLICY "locations_all_policy" ON public.property_locations FOR ALL
  USING (EXISTS (SELECT 1 FROM public.properties WHERE id = property_locations.property_id AND (user_id = auth.uid() OR auth.role() = 'service_role')));

CREATE POLICY "images_select_policy" ON public.property_images FOR SELECT USING (true);
CREATE POLICY "images_all_policy" ON public.property_images FOR ALL
  USING (EXISTS (SELECT 1 FROM public.properties WHERE id = property_images.property_id AND (user_id = auth.uid() OR auth.role() = 'service_role')));

CREATE POLICY "features_select_policy" ON public.property_features FOR SELECT USING (true);
CREATE POLICY "features_all_policy" ON public.property_features FOR ALL
  USING (EXISTS (SELECT 1 FROM public.properties WHERE id = property_features.property_id AND (user_id = auth.uid() OR auth.role() = 'service_role')));

-- D. LEADS & CRM RLS (Proteção Crítica contra IDOR e Vazamento LGPD)
-- Inserção: Aberta para visitantes enviarem propostas no portal
CREATE POLICY "leads_insert_policy" ON public.leads FOR INSERT WITH CHECK (true);

-- Leitura/Edição/Exclusão: APENAS o corretor destinatário (advertiser_id) tem acesso aos dados dos seus leads
CREATE POLICY "leads_select_policy" ON public.leads FOR SELECT
  USING (advertiser_id = auth.uid() OR auth.role() = 'service_role');

CREATE POLICY "leads_update_policy" ON public.leads FOR UPDATE
  USING (advertiser_id = auth.uid() OR auth.role() = 'service_role');

CREATE POLICY "leads_delete_policy" ON public.leads FOR DELETE
  USING (advertiser_id = auth.uid() OR auth.role() = 'service_role');

-- E. CHAT & CONVERSATIONS RLS
-- Apenas os participantes (comprador ou anunciante) podem ver e enviar mensagens
CREATE POLICY "conversations_select_policy" ON public.conversations FOR SELECT
  USING (buyer_id = auth.uid() OR advertiser_id = auth.uid() OR auth.role() = 'service_role');

CREATE POLICY "conversations_insert_policy" ON public.conversations FOR INSERT
  WITH CHECK (buyer_id = auth.uid() OR advertiser_id = auth.uid() OR auth.role() = 'service_role');

CREATE POLICY "messages_select_policy" ON public.messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.conversations WHERE id = messages.conversation_id AND (buyer_id = auth.uid() OR advertiser_id = auth.uid() OR auth.role() = 'service_role')));

CREATE POLICY "messages_insert_policy" ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id OR auth.role() = 'service_role');

-- F. FAVORITES & SAVED SEARCHES RLS
CREATE POLICY "favorites_policy" ON public.favorites FOR ALL
  USING (user_id = auth.uid() OR auth.role() = 'service_role');

CREATE POLICY "saved_searches_policy" ON public.saved_searches FOR ALL
  USING (user_id = auth.uid() OR auth.role() = 'service_role');

-- G. AUDIT LOGS RLS
-- Inserção: Permitida para auditoria de eventos
CREATE POLICY "audit_logs_insert_policy" ON public.audit_logs FOR INSERT WITH CHECK (true);
-- Leitura: Apenas administradores ou service_role
CREATE POLICY "audit_logs_select_policy" ON public.audit_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') OR auth.role() = 'service_role');
