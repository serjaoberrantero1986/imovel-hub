-- ==============================================================================
-- Migration 05: Real Estate CRM (Leads, Clients, Interests, Pipeline & Tasks)
-- ==============================================================================

-- 1. Portal Leads (Inbound Requests from Marketplace)
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

CREATE TRIGGER set_leads_updated_at
    BEFORE UPDATE ON public.leads
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto sync leads_count on property
CREATE OR REPLACE FUNCTION public.sync_property_leads_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' AND NEW.property_id IS NOT NULL) THEN
        UPDATE public.properties 
        SET leads_count = leads_count + 1 
        WHERE id = NEW.property_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE' AND OLD.property_id IS NOT NULL) THEN
        UPDATE public.properties 
        SET leads_count = GREATEST(0, leads_count - 1) 
        WHERE id = OLD.property_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_property_leads
    AFTER INSERT OR DELETE ON public.leads
    FOR EACH ROW EXECUTE FUNCTION public.sync_property_leads_count();

-- 2. CRM Clients (Dedicated Contact Management for Realtors and Agencies)
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

CREATE TRIGGER set_clients_updated_at
    BEFORE UPDATE ON public.clients
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. Client Acquisition Interests / Buying Profile
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
    urgency VARCHAR(20) DEFAULT 'medium',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_interest_urgency CHECK (urgency IN ('low', 'medium', 'high', 'immediate'))
);

CREATE TRIGGER set_client_interests_updated_at
    BEFORE UPDATE ON public.client_interests
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4. CRM Pipeline Stages (Configurable Funnel Stages per Broker/Team)
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

-- 5. CRM Opportunities / Deals in Pipeline
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
    probability_pct SMALLINT DEFAULT 50,
    loss_reason TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_deal_prob CHECK (probability_pct BETWEEN 0 AND 100)
);

CREATE TRIGGER set_crm_deals_updated_at
    BEFORE UPDATE ON public.crm_deals
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 6. CRM Interactions / Timeline Activity Feed
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

-- 7. CRM Tasks & Scheduling
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

CREATE TRIGGER set_crm_tasks_updated_at
    BEFORE UPDATE ON public.crm_tasks
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Indexes for CRM Performance
CREATE INDEX IF NOT EXISTS idx_leads_advertiser ON public.leads(advertiser_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_team ON public.leads(team_id);
CREATE INDEX IF NOT EXISTS idx_leads_property ON public.leads(property_id);
CREATE INDEX IF NOT EXISTS idx_leads_created ON public.leads(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_clients_broker ON public.clients(broker_id, client_status);
CREATE INDEX IF NOT EXISTS idx_clients_team ON public.clients(team_id);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON public.clients(phone);

CREATE INDEX IF NOT EXISTS idx_crm_deals_broker ON public.crm_deals(broker_id, stage_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_client ON public.crm_deals(client_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_stage ON public.crm_deals(stage_id);

CREATE INDEX IF NOT EXISTS idx_crm_interactions_client ON public.crm_interactions(client_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_broker ON public.crm_interactions(broker_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_crm_tasks_broker_status ON public.crm_tasks(broker_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_client ON public.crm_tasks(client_id);
