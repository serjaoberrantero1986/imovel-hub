-- ==============================================================================
-- IMOVIP PRO - COMPLETE POSTGRESQL SCHEMA FOR SUPABASE
-- Production-Ready Real Estate Marketplace & High-Conversion CRM
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- 2. DOMAIN ENUMS
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('buyer', 'owner', 'broker', 'agency', 'admin');
    CREATE TYPE public.property_purpose AS ENUM ('sale', 'rent', 'seasonal', 'launch');
    CREATE TYPE public.property_type AS ENUM ('apartment', 'house', 'condo_house', 'penthouse', 'commercial', 'land', 'rural', 'studio', 'loft', 'warehouse');
    CREATE TYPE public.property_status AS ENUM ('draft', 'pending_moderation', 'active', 'paused', 'sold', 'rented', 'archived');
    CREATE TYPE public.solar_orientation AS ENUM ('morning', 'afternoon', 'north', 'south', 'east', 'west');
    CREATE TYPE public.media_type AS ENUM ('image', 'floorplan', 'video', 'tour_360', 'document');
    CREATE TYPE public.media_category AS ENUM ('fachada', 'sala', 'quarto', 'cozinha', 'banheiro', 'lazer', 'planta', 'vista', 'garagem', 'outros');
    CREATE TYPE public.lead_origin AS ENUM ('portal_form', 'whatsapp_click', 'phone_call', 'schedule_visit', 'manual_entry', 'import');
    CREATE TYPE public.lead_status AS ENUM ('new', 'contacted', 'visit_scheduled', 'proposal_sent', 'proposal_made', 'closed_won', 'lost', 'archived');
    CREATE TYPE public.client_type AS ENUM ('buyer', 'seller', 'tenant', 'landlord', 'investor', 'partner');
    CREATE TYPE public.client_status AS ENUM ('prospect', 'active', 'inactive', 'blocked');
    CREATE TYPE public.interaction_type AS ENUM ('call', 'whatsapp', 'email', 'meeting', 'visit', 'proposal', 'note', 'status_change');
    CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
    CREATE TYPE public.task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
    CREATE TYPE public.notification_type AS ENUM ('lead_received', 'visit_scheduled', 'proposal_received', 'property_approved', 'price_change', 'chat_message', 'system_alert');
    CREATE TYPE public.report_type AS ENUM ('broker_performance', 'property_metrics', 'lead_conversion', 'sales_financial', 'market_neighborhood');
    CREATE TYPE public.audit_action AS ENUM ('INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'EXPORT', 'STATUS_CHANGE');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 3. HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. AGENCY TEAMS
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) UNIQUE NOT NULL,
    creci_juridico VARCHAR(30),
    cnpj VARCHAR(20),
    logo_url TEXT,
    phone VARCHAR(30),
    email VARCHAR(255),
    address JSONB DEFAULT '{}'::jsonb,
    settings JSONB DEFAULT '{"lead_distribution": "round_robin"}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. USER PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(30),
    whatsapp VARCHAR(30),
    avatar_url TEXT,
    role public.user_role NOT NULL DEFAULT 'buyer',
    creci VARCHAR(30),
    cpf_cnpj VARCHAR(20),
    bio TEXT,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    agency_name VARCHAR(150),
    agency_logo TEXT,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    rating NUMERIC(3, 2) DEFAULT 5.00 CHECK (rating BETWEEN 0.00 AND 5.00),
    total_deals INT NOT NULL DEFAULT 0 CHECK (total_deals >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    settings JSONB NOT NULL DEFAULT '{"theme": "system", "notifications": {"email": true, "whatsapp": true, "push": true}}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_profiles_name_length CHECK (char_length(name) >= 2)
);

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 6. PROPERTIES MASTER
CREATE SEQUENCE IF NOT EXISTS public.property_code_seq START WITH 100001;

CREATE TABLE IF NOT EXISTS public.properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL DEFAULT ('IMV-' || nextval('public.property_code_seq')::text),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(250) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    purpose public.property_purpose NOT NULL DEFAULT 'sale',
    type public.property_type NOT NULL DEFAULT 'apartment',
    status public.property_status NOT NULL DEFAULT 'draft',
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    is_exclusive BOOLEAN NOT NULL DEFAULT FALSE,
    price NUMERIC(14, 2) NOT NULL CHECK (price >= 0),
    condo_fee NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (condo_fee >= 0),
    iptu_fee NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (iptu_fee >= 0),
    total_area NUMERIC(10, 2) NOT NULL CHECK (total_area >= 0),
    useful_area NUMERIC(10, 2) NOT NULL CHECK (useful_area >= 0),
    bedrooms SMALLINT NOT NULL DEFAULT 0 CHECK (bedrooms >= 0),
    suites SMALLINT NOT NULL DEFAULT 0 CHECK (suites >= 0 AND suites <= bedrooms),
    bathrooms SMALLINT NOT NULL DEFAULT 1 CHECK (bathrooms >= 0),
    parking_spots SMALLINT NOT NULL DEFAULT 0 CHECK (parking_spots >= 0),
    floor SMALLINT,
    total_floors SMALLINT,
    solar_orientation public.solar_orientation,
    construction_year SMALLINT CHECK (construction_year IS NULL OR (construction_year BETWEEN 1800 AND 2100)),
    delivery_date DATE,
    video_url TEXT,
    tour_360_url TEXT,
    views_count INT NOT NULL DEFAULT 0 CHECK (views_count >= 0),
    leads_count INT NOT NULL DEFAULT 0 CHECK (leads_count >= 0),
    favorites_count INT NOT NULL DEFAULT 0 CHECK (favorites_count >= 0),
    shares_count INT NOT NULL DEFAULT 0 CHECK (shares_count >= 0),
    rejection_reason TEXT,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 7. PROPERTY LOCATIONS
CREATE TABLE IF NOT EXISTS public.property_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID UNIQUE NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    zip_code VARCHAR(10) NOT NULL,
    street VARCHAR(200) NOT NULL,
    street_number VARCHAR(30),
    complement VARCHAR(100),
    neighborhood VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(2) NOT NULL,
    country VARCHAR(2) NOT NULL DEFAULT 'BR',
    condo_name VARCHAR(150),
    zone VARCHAR(50),
    latitude NUMERIC(10, 7) NOT NULL CHECK (latitude BETWEEN -90.0 AND 90.0),
    longitude NUMERIC(10, 7) NOT NULL CHECK (longitude BETWEEN -180.0 AND 180.0),
    hide_exact_address BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_property_locations_updated_at BEFORE UPDATE ON public.property_locations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 8. PROPERTY IMAGES
CREATE TABLE IF NOT EXISTS public.property_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    media_type public.media_type NOT NULL DEFAULT 'image',
    category public.media_category DEFAULT 'outros',
    caption VARCHAR(255),
    is_cover BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INT NOT NULL DEFAULT 0,
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. FEATURES & MANY-TO-MANY
CREATE TABLE IF NOT EXISTS public.features (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(30) NOT NULL,
    icon VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.property_features (
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    feature_id VARCHAR(50) NOT NULL REFERENCES public.features(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (property_id, feature_id)
);

-- 10. FAVORITES & SAVED SEARCHES
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_property_favorite UNIQUE (user_id, property_id)
);

CREATE TABLE IF NOT EXISTS public.saved_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    filters JSONB NOT NULL DEFAULT '{}'::jsonb,
    alert_frequency VARCHAR(20) NOT NULL DEFAULT 'daily' CHECK (alert_frequency IN ('instant', 'daily', 'weekly', 'none')),
    last_alert_sent_at TIMESTAMPTZ,
    match_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_saved_searches_updated_at BEFORE UPDATE ON public.saved_searches FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.property_views_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ip_hash VARCHAR(64),
    user_agent TEXT,
    referrer TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. LEADS & INBOUND REQUESTS
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    advertiser_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    buyer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    buyer_name VARCHAR(150) NOT NULL,
    buyer_email VARCHAR(255) NOT NULL,
    buyer_phone VARCHAR(30) NOT NULL,
    message TEXT,
    origin public.lead_origin NOT NULL DEFAULT 'portal_form',
    status public.lead_status NOT NULL DEFAULT 'new',
    budget NUMERIC(14, 2),
    scheduled_visit_date TIMESTAMPTZ,
    notes TEXT,
    meta JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 12. CRM CLIENTS & INTERESTS
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(30) NOT NULL,
    secondary_phone VARCHAR(30),
    cpf_cnpj VARCHAR(20),
    client_type public.client_type NOT NULL DEFAULT 'buyer',
    client_status public.client_status NOT NULL DEFAULT 'active',
    tags TEXT[] DEFAULT '{}',
    lead_source VARCHAR(80),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.client_interests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    target_purpose public.property_purpose DEFAULT 'sale',
    property_types public.property_type[] DEFAULT '{}',
    preferred_cities TEXT[] DEFAULT '{}',
    preferred_neighborhoods TEXT[] DEFAULT '{}',
    min_price NUMERIC(14, 2),
    max_price NUMERIC(14, 2),
    min_bedrooms SMALLINT,
    min_parking_spots SMALLINT,
    min_useful_area NUMERIC(10, 2),
    must_have_features VARCHAR(50)[] DEFAULT '{}',
    financing_approved BOOLEAN DEFAULT FALSE,
    urgency VARCHAR(20) DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high', 'immediate')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_client_interests_updated_at BEFORE UPDATE ON public.client_interests FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 13. CRM PIPELINE, DEALS, INTERACTIONS & TASKS
CREATE TABLE IF NOT EXISTS public.crm_pipeline_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    stage_key VARCHAR(50) NOT NULL,
    color VARCHAR(20) NOT NULL DEFAULT '#4f46e5',
    display_order SMALLINT NOT NULL DEFAULT 0,
    is_won_stage BOOLEAN NOT NULL DEFAULT FALSE,
    is_lost_stage BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.crm_deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    stage_id UUID NOT NULL REFERENCES public.crm_pipeline_stages(id) ON DELETE RESTRICT,
    title VARCHAR(200) NOT NULL,
    deal_value NUMERIC(14, 2) NOT NULL DEFAULT 0,
    estimated_commission NUMERIC(14, 2) DEFAULT 0,
    expected_closing_date DATE,
    probability_pct SMALLINT DEFAULT 50 CHECK (probability_pct BETWEEN 0 AND 100),
    loss_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_crm_deals_updated_at BEFORE UPDATE ON public.crm_deals FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.crm_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    deal_id UUID REFERENCES public.crm_deals(id) ON DELETE CASCADE,
    property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    interaction_type public.interaction_type NOT NULL DEFAULT 'note',
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.crm_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    deal_id UUID REFERENCES public.crm_deals(id) ON DELETE SET NULL,
    property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ NOT NULL,
    priority public.task_priority NOT NULL DEFAULT 'medium',
    status public.task_status NOT NULL DEFAULT 'pending',
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_crm_tasks_updated_at BEFORE UPDATE ON public.crm_tasks FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 14. CONVERSATIONS & CHAT
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    advertiser_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    last_message_text TEXT,
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    buyer_unread_count INT NOT NULL DEFAULT 0 CHECK (buyer_unread_count >= 0),
    advertiser_unread_count INT NOT NULL DEFAULT 0 CHECK (advertiser_unread_count >= 0),
    is_archived_buyer BOOLEAN NOT NULL DEFAULT FALSE,
    is_archived_advertiser BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_property_conversation UNIQUE (property_id, buyer_id, advertiser_id)
);

CREATE TRIGGER set_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_message_content CHECK (char_length(text) > 0 OR jsonb_array_length(attachments) > 0)
);

-- 15. NOTIFICATIONS, REPORTS & AUDIT TRAIL
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type public.notification_type NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    data JSONB DEFAULT '{}'::jsonb,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    report_type public.report_type NOT NULL,
    title VARCHAR(200) NOT NULL,
    parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
    metrics_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    table_name VARCHAR(60) NOT NULL,
    record_id UUID,
    action public.audit_action NOT NULL,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
