-- ==============================================================================
-- Migration 09: Functions, Triggers & Search RPCs
-- ==============================================================================

-- 1. Automatic Provisioning of Profile & Default CRM Pipeline on User Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_role public.user_role;
    v_name TEXT;
    v_profile_id UUID;
BEGIN
    v_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
    v_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'buyer'::public.user_role);

    -- Insert new public profile
    INSERT INTO public.profiles (
        id,
        email,
        name,
        phone,
        role,
        avatar_url
    ) VALUES (
        NEW.id,
        NEW.email,
        v_name,
        NEW.raw_user_meta_data->>'phone',
        v_role,
        NEW.raw_user_meta_data->>'avatar_url'
    ) RETURNING id INTO v_profile_id;

    -- If user is broker, agency or owner, seed standard CRM stages
    IF v_role IN ('broker', 'agency', 'owner') THEN
        INSERT INTO public.crm_pipeline_stages (broker_id, title, stage_key, color, display_order, is_won_stage, is_lost_stage)
        VALUES
            (v_profile_id, 'Novos Leads', 'new', '#3b82f6', 1, false, false),
            (v_profile_id, 'Em Atendimento', 'in_contact', '#6366f1', 2, false, false),
            (v_profile_id, 'Visita Agendada', 'visit_scheduled', '#eab308', 3, false, false),
            (v_profile_id, 'Proposta Enviada', 'proposal_sent', '#f97316', 4, false, false),
            (v_profile_id, 'Fechamento / Ganho', 'won', '#10b981', 5, true, false),
            (v_profile_id, 'Perdido', 'lost', '#ef4444', 6, false, true);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger to Supabase auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Fast Radial Geo-Spatial Search RPC Function for Portal Map
CREATE OR REPLACE FUNCTION public.get_properties_within_radius(
    p_lat NUMERIC,
    p_lng NUMERIC,
    p_radius_km NUMERIC DEFAULT 10.0,
    p_purpose public.property_purpose DEFAULT NULL,
    p_min_price NUMERIC DEFAULT NULL,
    p_max_price NUMERIC DEFAULT NULL,
    p_limit INT DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    code VARCHAR(20),
    title VARCHAR(200),
    slug VARCHAR(250),
    purpose public.property_purpose,
    type public.property_type,
    price NUMERIC(14, 2),
    useful_area NUMERIC(10, 2),
    bedrooms SMALLINT,
    parking_spots SMALLINT,
    city VARCHAR(100),
    neighborhood VARCHAR(100),
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    cover_image_url TEXT,
    distance_km NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.code,
        p.title,
        p.slug,
        p.purpose,
        p.type,
        p.price,
        p.useful_area,
        p.bedrooms,
        p.parking_spots,
        loc.city,
        loc.neighborhood,
        loc.latitude,
        loc.longitude,
        (SELECT img.url FROM public.property_images img WHERE img.property_id = p.id AND img.is_cover = true LIMIT 1) AS cover_image_url,
        ROUND(
            (6371 * acos(
                cos(radians(p_lat)) * cos(radians(loc.latitude)) *
                cos(radians(loc.longitude) - radians(p_lng)) +
                sin(radians(p_lat)) * sin(radians(loc.latitude))
            ))::numeric, 2
        ) AS distance_km
    FROM public.properties p
    JOIN public.property_locations loc ON loc.property_id = p.id
    WHERE p.status = 'active'
      AND (p_purpose IS NULL OR p.purpose = p_purpose)
      AND (p_min_price IS NULL OR p.price >= p_min_price)
      AND (p_max_price IS NULL OR p.price <= p_max_price)
      AND (6371 * acos(
            cos(radians(p_lat)) * cos(radians(loc.latitude)) *
            cos(radians(loc.longitude) - radians(p_lng)) +
            sin(radians(p_lat)) * sin(radians(loc.latitude))
      )) <= p_radius_km
    ORDER BY distance_km ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. Atomic Property View Incrementer
CREATE OR REPLACE FUNCTION public.increment_property_view(
    p_property_id UUID,
    p_ip_hash VARCHAR(64) DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Log view
    INSERT INTO public.property_views_log (property_id, user_id, ip_hash, user_agent)
    VALUES (p_property_id, auth.uid(), p_ip_hash, p_user_agent);

    -- Increment counter
    UPDATE public.properties
    SET views_count = views_count + 1
    WHERE id = p_property_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
