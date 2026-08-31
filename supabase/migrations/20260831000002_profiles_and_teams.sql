-- ==============================================================================
-- Migration 02: Users, Profiles and Agency Teams
-- ==============================================================================

-- Helper Trigger for auto-updating updated_at timestamp across all tables
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Agency Teams (for brokerage office / team CRM isolation)
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

CREATE TRIGGER set_teams_updated_at
    BEFORE UPDATE ON public.teams
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2. User Profiles (Extends Supabase auth.users)
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
    
    -- Agency / Team Affiliation (Null for standalone brokers/buyers/owners)
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    agency_name VARCHAR(150),
    agency_logo TEXT,
    
    -- Verification & Reputation
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    rating NUMERIC(3, 2) DEFAULT 5.00 CHECK (rating BETWEEN 0.00 AND 5.00),
    total_deals INT NOT NULL DEFAULT 0 CHECK (total_deals >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- User Notification & Interface Preferences
    settings JSONB NOT NULL DEFAULT '{
        "theme": "system",
        "notifications": {
            "email": true,
            "whatsapp": true,
            "push": true,
            "lead_alerts": true,
            "price_alerts": true
        },
        "crm": {
            "default_view": "kanban",
            "auto_responder": false
        }
    }'::jsonb,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_profiles_name_length CHECK (char_length(name) >= 2)
);

CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_team_id ON public.profiles(team_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_verified ON public.profiles(verified);
CREATE INDEX IF NOT EXISTS idx_profiles_creci ON public.profiles(creci) WHERE creci IS NOT NULL;
