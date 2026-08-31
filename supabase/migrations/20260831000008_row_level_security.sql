-- ==============================================================================
-- Migration 08: Row Level Security (RLS) Policies & Access Control
-- ==============================================================================

-- 1. Helper Security Functions (SECURITY DEFINER to avoid recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_auth_team_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT team_id FROM public.profiles 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Enable Row Level Security across ALL application tables
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_views_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- Table: profiles
-- ==============================================================================
-- Anyone can view public broker/advertiser profile information
CREATE POLICY "Public profile basic info is viewable by all"
    ON public.profiles FOR SELECT
    USING (true);

-- Users can only update their own profile; Admins can update any profile
CREATE POLICY "Users can update own profile or admin"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id OR public.is_admin())
    WITH CHECK (auth.uid() = id OR public.is_admin());

-- Users can insert their own profile on signup
CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id OR public.is_admin());

-- ==============================================================================
-- Table: properties
-- ==============================================================================
-- Public can browse active properties. Owners, teammates & admins can browse all status.
CREATE POLICY "Active properties are viewable by everyone"
    ON public.properties FOR SELECT
    USING (
        status = 'active' 
        OR auth.uid() = user_id 
        OR (team_id IS NOT NULL AND team_id = public.get_auth_team_id())
        OR public.is_admin()
    );

-- Only verified owners, brokers, agencies, or admins can create properties
CREATE POLICY "Brokers and owners can insert properties"
    ON public.properties FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        OR public.is_admin()
    );

-- Only listing owner, team members or admin can edit properties
CREATE POLICY "Listing owners can update their own properties"
    ON public.properties FOR UPDATE
    USING (
        auth.uid() = user_id 
        OR (team_id IS NOT NULL AND team_id = public.get_auth_team_id())
        OR public.is_admin()
    )
    WITH CHECK (
        auth.uid() = user_id 
        OR (team_id IS NOT NULL AND team_id = public.get_auth_team_id())
        OR public.is_admin()
    );

-- Only listing owner or admin can delete their property
CREATE POLICY "Listing owners can delete their own properties"
    ON public.properties FOR DELETE
    USING (
        auth.uid() = user_id 
        OR public.is_admin()
    );

-- ==============================================================================
-- Table: property_locations
-- ==============================================================================
CREATE POLICY "Locations of viewable properties are viewable"
    ON public.property_locations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.properties p 
            WHERE p.id = property_locations.property_id 
            AND (
                p.status = 'active' 
                OR p.user_id = auth.uid() 
                OR (p.team_id IS NOT NULL AND p.team_id = public.get_auth_team_id())
                OR public.is_admin()
            )
        )
    );

CREATE POLICY "Property owners can manage property locations"
    ON public.property_locations FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.properties p 
            WHERE p.id = property_locations.property_id 
            AND (p.user_id = auth.uid() OR public.is_admin())
        )
    );

-- ==============================================================================
-- Table: property_images & property_features
-- ==============================================================================
CREATE POLICY "Media of viewable properties is public"
    ON public.property_images FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.properties p 
            WHERE p.id = property_images.property_id 
            AND (
                p.status = 'active' 
                OR p.user_id = auth.uid() 
                OR (p.team_id IS NOT NULL AND p.team_id = public.get_auth_team_id())
                OR public.is_admin()
            )
        )
    );

CREATE POLICY "Property owners can manage images"
    ON public.property_images FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.properties p 
            WHERE p.id = property_images.property_id 
            AND (p.user_id = auth.uid() OR public.is_admin())
        )
    );

CREATE POLICY "Features catalog is publicly viewable"
    ON public.features FOR SELECT
    USING (true);

CREATE POLICY "Property feature associations viewable by all"
    ON public.property_features FOR SELECT
    USING (true);

CREATE POLICY "Property owners can link features"
    ON public.property_features FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.properties p 
            WHERE p.id = property_features.property_id 
            AND (p.user_id = auth.uid() OR public.is_admin())
        )
    );

-- ==============================================================================
-- Table: favorites
-- ==============================================================================
CREATE POLICY "Users can view and manage their own favorites"
    ON public.favorites FOR ALL
    USING (auth.uid() = user_id OR public.is_admin())
    WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- ==============================================================================
-- Table: saved_searches
-- ==============================================================================
CREATE POLICY "Users can manage their own saved searches"
    ON public.saved_searches FOR ALL
    USING (auth.uid() = user_id OR public.is_admin())
    WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- ==============================================================================
-- Table: leads (Strict Privacy: Never Exposed Publicly)
-- ==============================================================================
-- Anyone (anon/auth) can submit an inbound lead form
CREATE POLICY "Anyone can submit a lead form"
    ON public.leads FOR INSERT
    WITH CHECK (true);

-- Only the property advertiser, team members, the lead author, or admin can read the lead
CREATE POLICY "Advertisers, team members and buyers can view their own leads"
    ON public.leads FOR SELECT
    USING (
        auth.uid() = advertiser_id
        OR auth.uid() = buyer_id
        OR (team_id IS NOT NULL AND team_id = public.get_auth_team_id())
        OR public.is_admin()
    );

-- Only advertiser, team members or admin can update lead status / notes
CREATE POLICY "Advertisers and team can update their leads"
    ON public.leads FOR UPDATE
    USING (
        auth.uid() = advertiser_id
        OR (team_id IS NOT NULL AND team_id = public.get_auth_team_id())
        OR public.is_admin()
    )
    WITH CHECK (
        auth.uid() = advertiser_id
        OR (team_id IS NOT NULL AND team_id = public.get_auth_team_id())
        OR public.is_admin()
    );

-- Only advertiser or admin can delete leads
CREATE POLICY "Advertisers or admin can delete leads"
    ON public.leads FOR DELETE
    USING (auth.uid() = advertiser_id OR public.is_admin());

-- ==============================================================================
-- Table: clients (Strict CRM Isolation per Broker / Team)
-- ==============================================================================
CREATE POLICY "Brokers and team can manage their clients"
    ON public.clients FOR ALL
    USING (
        auth.uid() = broker_id
        OR (team_id IS NOT NULL AND team_id = public.get_auth_team_id())
        OR public.is_admin()
    )
    WITH CHECK (
        auth.uid() = broker_id
        OR (team_id IS NOT NULL AND team_id = public.get_auth_team_id())
        OR public.is_admin()
    );

-- ==============================================================================
-- Table: client_interests
-- ==============================================================================
CREATE POLICY "Brokers can manage client interests"
    ON public.client_interests FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.clients c 
            WHERE c.id = client_interests.client_id 
            AND (
                c.broker_id = auth.uid() 
                OR (c.team_id IS NOT NULL AND c.team_id = public.get_auth_team_id())
                OR public.is_admin()
            )
        )
    );

-- ==============================================================================
-- Tables: crm_pipeline_stages, crm_deals, crm_interactions, crm_tasks
-- ==============================================================================
CREATE POLICY "Brokers and team can manage pipeline stages"
    ON public.crm_pipeline_stages FOR ALL
    USING (
        auth.uid() = broker_id
        OR (team_id IS NOT NULL AND team_id = public.get_auth_team_id())
        OR public.is_admin()
    );

CREATE POLICY "Brokers and team can manage deals"
    ON public.crm_deals FOR ALL
    USING (
        auth.uid() = broker_id
        OR (team_id IS NOT NULL AND team_id = public.get_auth_team_id())
        OR public.is_admin()
    )
    WITH CHECK (
        auth.uid() = broker_id
        OR (team_id IS NOT NULL AND team_id = public.get_auth_team_id())
        OR public.is_admin()
    );

CREATE POLICY "Brokers can manage their CRM interactions"
    ON public.crm_interactions FOR ALL
    USING (
        auth.uid() = broker_id
        OR public.is_admin()
    );

CREATE POLICY "Brokers can manage their CRM tasks"
    ON public.crm_tasks FOR ALL
    USING (
        auth.uid() = broker_id
        OR public.is_admin()
    );

-- ==============================================================================
-- Tables: conversations and messages
-- ==============================================================================
CREATE POLICY "Conversation participants can view and manage their chat"
    ON public.conversations FOR ALL
    USING (
        auth.uid() = buyer_id 
        OR auth.uid() = advertiser_id 
        OR public.is_admin()
    )
    WITH CHECK (
        auth.uid() = buyer_id 
        OR auth.uid() = advertiser_id 
        OR public.is_admin()
    );

CREATE POLICY "Conversation participants can read messages"
    ON public.messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations c 
            WHERE c.id = messages.conversation_id 
            AND (c.buyer_id = auth.uid() OR c.advertiser_id = auth.uid() OR public.is_admin())
        )
    );

CREATE POLICY "Participants can insert messages in their conversation"
    ON public.messages FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id
        AND EXISTS (
            SELECT 1 FROM public.conversations c 
            WHERE c.id = conversation_id 
            AND (c.buyer_id = auth.uid() OR c.advertiser_id = auth.uid() OR public.is_admin())
        )
    );

-- ==============================================================================
-- Tables: notifications, reports, audit_logs
-- ==============================================================================
CREATE POLICY "Users can only view and manage their own notifications"
    ON public.notifications FOR ALL
    USING (auth.uid() = user_id OR public.is_admin())
    WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can view and create their reports"
    ON public.reports FOR ALL
    USING (
        auth.uid() = user_id 
        OR (team_id IS NOT NULL AND team_id = public.get_auth_team_id())
        OR public.is_admin()
    );

CREATE POLICY "Audit logs can only be read by admins or affected user"
    ON public.audit_logs FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());
