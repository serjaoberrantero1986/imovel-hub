-- ==============================================================================
-- Migration 04: Favorites, Saved Searches, and Property Views Analytics
-- ==============================================================================

-- 1. Property Favorites
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_user_property_favorite UNIQUE (user_id, property_id)
);

-- 2. Saved Searches & Real Estate Alerts
CREATE TABLE IF NOT EXISTS public.saved_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    filters JSONB NOT NULL DEFAULT '{}'::jsonb,
    alert_frequency VARCHAR(20) NOT NULL DEFAULT 'daily',
    last_alert_sent_at TIMESTAMPTZ,
    match_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT chk_alert_frequency CHECK (alert_frequency IN ('instant', 'daily', 'weekly', 'none'))
);

CREATE TRIGGER set_saved_searches_updated_at
    BEFORE UPDATE ON public.saved_searches
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. Anonymous/Registered Property View Log (For Auditing & Anti-Fraud Counter Sync)
CREATE TABLE IF NOT EXISTS public.property_views_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ip_hash VARCHAR(64),
    user_agent TEXT,
    referrer TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Automatic Favorite Count Synchronization Trigger
CREATE OR REPLACE FUNCTION public.sync_property_favorites_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.properties 
        SET favorites_count = favorites_count + 1 
        WHERE id = NEW.property_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.properties 
        SET favorites_count = GREATEST(0, favorites_count - 1) 
        WHERE id = OLD.property_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_property_favorites
    AFTER INSERT OR DELETE ON public.favorites
    FOR EACH ROW EXECUTE FUNCTION public.sync_property_favorites_count();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_property_id ON public.favorites(property_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON public.saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_alert_freq ON public.saved_searches(alert_frequency) WHERE alert_frequency != 'none';
CREATE INDEX IF NOT EXISTS idx_property_views_prop_id ON public.property_views_log(property_id, created_at DESC);
