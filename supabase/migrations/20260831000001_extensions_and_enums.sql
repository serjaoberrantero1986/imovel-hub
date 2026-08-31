-- ==============================================================================
-- Migration 01: Extensions and Custom Domain Enums
-- ==============================================================================

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- 1. User and Account Roles
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM (
        'buyer',
        'owner',
        'broker',
        'agency',
        'admin'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. Property Purpose (Transaction Type)
DO $$ BEGIN
    CREATE TYPE public.property_purpose AS ENUM (
        'sale',
        'rent',
        'seasonal',
        'launch'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 3. Property Architectural Type
DO $$ BEGIN
    CREATE TYPE public.property_type AS ENUM (
        'apartment',
        'house',
        'condo_house',
        'penthouse',
        'commercial',
        'land',
        'rural',
        'studio',
        'loft',
        'warehouse'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 4. Property Listing Lifecycle Status
DO $$ BEGIN
    CREATE TYPE public.property_status AS ENUM (
        'draft',
        'pending_moderation',
        'active',
        'paused',
        'sold',
        'rented',
        'archived'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 5. Solar Orientation
DO $$ BEGIN
    CREATE TYPE public.solar_orientation AS ENUM (
        'morning',
        'afternoon',
        'north',
        'south',
        'east',
        'west'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 6. Media Asset Classification
DO $$ BEGIN
    CREATE TYPE public.media_type AS ENUM (
        'image',
        'floorplan',
        'video',
        'tour_360',
        'document'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 7. Media Environment Category
DO $$ BEGIN
    CREATE TYPE public.media_category AS ENUM (
        'fachada',
        'sala',
        'quarto',
        'cozinha',
        'banheiro',
        'lazer',
        'planta',
        'vista',
        'garagem',
        'outros'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 8. Lead Acquisition Channel
DO $$ BEGIN
    CREATE TYPE public.lead_origin AS ENUM (
        'portal_form',
        'whatsapp_click',
        'phone_call',
        'schedule_visit',
        'manual_entry',
        'import'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 9. Lead Qualification Stage
DO $$ BEGIN
    CREATE TYPE public.lead_status AS ENUM (
        'new',
        'contacted',
        'visit_scheduled',
        'proposal_sent',
        'proposal_made',
        'closed_won',
        'lost',
        'archived'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 10. Client Classification
DO $$ BEGIN
    CREATE TYPE public.client_type AS ENUM (
        'buyer',
        'seller',
        'tenant',
        'landlord',
        'investor',
        'partner'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 11. Client Relationship Status
DO $$ BEGIN
    CREATE TYPE public.client_status AS ENUM (
        'prospect',
        'active',
        'inactive',
        'blocked'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 12. CRM Interaction Type
DO $$ BEGIN
    CREATE TYPE public.interaction_type AS ENUM (
        'call',
        'whatsapp',
        'email',
        'meeting',
        'visit',
        'proposal',
        'note',
        'status_change'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 13. CRM Task Urgency & Status
DO $$ BEGIN
    CREATE TYPE public.task_priority AS ENUM (
        'low',
        'medium',
        'high',
        'urgent'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.task_status AS ENUM (
        'pending',
        'in_progress',
        'completed',
        'cancelled'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 14. Real-time Notification Category
DO $$ BEGIN
    CREATE TYPE public.notification_type AS ENUM (
        'lead_received',
        'visit_scheduled',
        'proposal_received',
        'property_approved',
        'price_change',
        'chat_message',
        'system_alert'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 15. Analytics Report Category
DO $$ BEGIN
    CREATE TYPE public.report_type AS ENUM (
        'broker_performance',
        'property_metrics',
        'lead_conversion',
        'sales_financial',
        'market_neighborhood'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 16. Audit Log Action
DO $$ BEGIN
    CREATE TYPE public.audit_action AS ENUM (
        'INSERT',
        'UPDATE',
        'DELETE',
        'LOGIN',
        'EXPORT',
        'STATUS_CHANGE'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;
