-- ==============================================================================
-- Migration 03: Properties, Locations, Images and Features
-- ==============================================================================

-- 1. Sequence for Unique Human-Readable Property Code (e.g., IMV-100234)
CREATE SEQUENCE IF NOT EXISTS public.property_code_seq START WITH 100001;

-- 2. Properties Master Table
CREATE TABLE IF NOT EXISTS public.properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL DEFAULT ('IMV-' || nextval('public.property_code_seq')::text),
    
    -- Ownership & Team
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    
    -- Content & Taxonomy
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(250) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    purpose public.property_purpose NOT NULL DEFAULT 'sale',
    type public.property_type NOT NULL DEFAULT 'apartment',
    status public.property_status NOT NULL DEFAULT 'draft',
    
    -- Commercial & Highlights
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    is_exclusive BOOLEAN NOT NULL DEFAULT FALSE,
    price NUMERIC(14, 2) NOT NULL,
    condo_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
    iptu_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
    
    -- Architectural Metrics
    total_area NUMERIC(10, 2) NOT NULL,
    useful_area NUMERIC(10, 2) NOT NULL,
    bedrooms SMALLINT NOT NULL DEFAULT 0,
    suites SMALLINT NOT NULL DEFAULT 0,
    bathrooms SMALLINT NOT NULL DEFAULT 1,
    parking_spots SMALLINT NOT NULL DEFAULT 0,
    floor SMALLINT,
    total_floors SMALLINT,
    solar_orientation public.solar_orientation,
    construction_year SMALLINT,
    delivery_date DATE,
    
    -- Virtual Tour & Video Links
    video_url TEXT,
    tour_360_url TEXT,
    
    -- Metrics (Denormalized counters for instant read performance)
    views_count INT NOT NULL DEFAULT 0 CHECK (views_count >= 0),
    leads_count INT NOT NULL DEFAULT 0 CHECK (leads_count >= 0),
    favorites_count INT NOT NULL DEFAULT 0 CHECK (favorites_count >= 0),
    shares_count INT NOT NULL DEFAULT 0 CHECK (shares_count >= 0),
    
    -- Moderation & Timestamps
    rejection_reason TEXT,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Business Constraints
    CONSTRAINT chk_properties_price CHECK (price >= 0),
    CONSTRAINT chk_properties_condo_fee CHECK (condo_fee >= 0),
    CONSTRAINT chk_properties_iptu_fee CHECK (iptu_fee >= 0),
    CONSTRAINT chk_properties_total_area CHECK (total_area >= 0),
    CONSTRAINT chk_properties_useful_area CHECK (useful_area >= 0),
    CONSTRAINT chk_properties_bedrooms CHECK (bedrooms >= 0),
    CONSTRAINT chk_properties_suites CHECK (suites >= 0 AND suites <= bedrooms),
    CONSTRAINT chk_properties_bathrooms CHECK (bathrooms >= 0),
    CONSTRAINT chk_properties_parking_spots CHECK (parking_spots >= 0),
    CONSTRAINT chk_properties_construction_year CHECK (construction_year IS NULL OR (construction_year BETWEEN 1800 AND 2100))
);

CREATE TRIGGER set_properties_updated_at
    BEFORE UPDATE ON public.properties
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. Property Locations (1-to-1 with GIS Coordinates & Geo Hierarchy)
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
    zone VARCHAR(50), -- e.g., Zona Sul, Zona Oeste, Centro
    
    -- Geographic point coordinates
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    
    -- Privacy / Display Mode
    hide_exact_address BOOLEAN NOT NULL DEFAULT FALSE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_latitude CHECK (latitude BETWEEN -90.0 AND 90.0),
    CONSTRAINT chk_longitude CHECK (longitude BETWEEN -180.0 AND 180.0)
);

CREATE TRIGGER set_property_locations_updated_at
    BEFORE UPDATE ON public.property_locations
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4. Property Images & Media Gallery
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

-- 5. Features / Amenities Catalog
CREATE TABLE IF NOT EXISTS public.features (
    id VARCHAR(50) PRIMARY KEY, -- e.g. 'pool', 'gym', 'balcony', 'security_24h'
    name VARCHAR(100) NOT NULL,
    category VARCHAR(30) NOT NULL, -- 'lazer', 'seguranca', 'conforto', 'estrutura'
    icon VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Property Features Association (Many-to-Many)
CREATE TABLE IF NOT EXISTS public.property_features (
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    feature_id VARCHAR(50) NOT NULL REFERENCES public.features(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (property_id, feature_id)
);

-- Populate Standard Brazilian Real Estate Amenities Catalog
INSERT INTO public.features (id, name, category, icon) VALUES
    ('pool', 'Piscina', 'lazer', 'Waves'),
    ('gym', 'Academia', 'lazer', 'Dumbbell'),
    ('balcony', 'Varanda Gourmet', 'conforto', 'Wine'),
    ('bbq_grill', 'Churrasqueira', 'lazer', 'Flame'),
    ('elevator', 'Elevador', 'estrutura', 'ArrowUpDown'),
    ('security_24h', 'Portaria 24h', 'seguranca', 'ShieldCheck'),
    ('playground', 'Playground', 'lazer', 'Smile'),
    ('sports_court', 'Quadra Poliesportiva', 'lazer', 'Trophy'),
    ('party_room', 'Salão de Festas', 'lazer', 'Sparkles'),
    ('pet_friendly', 'Aceita Pets', 'conforto', 'Dog'),
    ('furnished', 'Mobiliado', 'conforto', 'Armchair'),
    ('air_conditioning', 'Ar Condicionado', 'conforto', 'Wind'),
    ('solar_energy', 'Energia Solar', 'estrutura', 'Sun'),
    ('garden', 'Jardim / Quintal', 'conforto', 'Trees'),
    ('gated_community', 'Condomínio Fechado', 'seguranca', 'Lock'),
    ('coworking', 'Espaço Coworking', 'estrutura', 'Laptop')
ON CONFLICT (id) DO NOTHING;

-- Strategic Indexes for High-Traffic Marketplace Filtering & Full-Text Search
CREATE INDEX IF NOT EXISTS idx_properties_user_id ON public.properties(user_id);
CREATE INDEX IF NOT EXISTS idx_properties_team_id ON public.properties(team_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_purpose ON public.properties(purpose);
CREATE INDEX IF NOT EXISTS idx_properties_type ON public.properties(type);
CREATE INDEX IF NOT EXISTS idx_properties_price ON public.properties(price);
CREATE INDEX IF NOT EXISTS idx_properties_useful_area ON public.properties(useful_area);
CREATE INDEX IF NOT EXISTS idx_properties_bedrooms ON public.properties(bedrooms);
CREATE INDEX IF NOT EXISTS idx_properties_parking_spots ON public.properties(parking_spots);
CREATE INDEX IF NOT EXISTS idx_properties_featured ON public.properties(featured);
CREATE INDEX IF NOT EXISTS idx_properties_published_at ON public.properties(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON public.properties(created_at DESC);

-- Composite Marketplace Query Index
CREATE INDEX IF NOT EXISTS idx_properties_search_composite 
    ON public.properties(status, purpose, type, price, useful_area);

-- Location Indexes
CREATE INDEX IF NOT EXISTS idx_property_locations_property_id ON public.property_locations(property_id);
CREATE INDEX IF NOT EXISTS idx_property_locations_city ON public.property_locations(city);
CREATE INDEX IF NOT EXISTS idx_property_locations_neighborhood ON public.property_locations(neighborhood);
CREATE INDEX IF NOT EXISTS idx_property_locations_state ON public.property_locations(state);
CREATE INDEX IF NOT EXISTS idx_property_locations_lat_long ON public.property_locations(latitude, longitude);

-- Images Indexes
CREATE INDEX IF NOT EXISTS idx_property_images_property_id ON public.property_images(property_id);
CREATE INDEX IF NOT EXISTS idx_property_images_order ON public.property_images(property_id, display_order);
CREATE INDEX IF NOT EXISTS idx_property_images_cover ON public.property_images(property_id) WHERE is_cover = TRUE;

-- Features Index
CREATE INDEX IF NOT EXISTS idx_prop_features_prop_id ON public.property_features(property_id);
CREATE INDEX IF NOT EXISTS idx_prop_features_feature_id ON public.property_features(feature_id);
