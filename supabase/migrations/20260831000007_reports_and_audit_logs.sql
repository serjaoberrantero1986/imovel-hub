-- ==============================================================================
-- Migration 07: Analytics Reports & System Audit Logs
-- ==============================================================================

-- 1. Analytics & Executive BI Reports
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

-- 2. Security & Compliance Audit Trail
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

-- 3. Generic Audit Trail Trigger Function
CREATE OR REPLACE FUNCTION public.process_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    current_uid UUID;
    audit_rec_id UUID;
BEGIN
    current_uid := auth.uid();
    
    IF (TG_OP = 'DELETE') THEN
        audit_rec_id := OLD.id;
        INSERT INTO public.audit_logs (user_id, table_name, record_id, action, old_data)
        VALUES (current_uid, TG_TABLE_NAME, audit_rec_id, 'DELETE', to_jsonb(OLD));
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        audit_rec_id := NEW.id;
        INSERT INTO public.audit_logs (user_id, table_name, record_id, action, old_data, new_data)
        VALUES (current_uid, TG_TABLE_NAME, audit_rec_id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        audit_rec_id := NEW.id;
        INSERT INTO public.audit_logs (user_id, table_name, record_id, action, new_data)
        VALUES (current_uid, TG_TABLE_NAME, audit_rec_id, 'INSERT', to_jsonb(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach Audit Trail Triggers to Critical Business Tables
CREATE TRIGGER audit_properties_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.properties
    FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

CREATE TRIGGER audit_leads_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.leads
    FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

CREATE TRIGGER audit_clients_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.clients
    FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

CREATE TRIGGER audit_crm_deals_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.crm_deals
    FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

-- Indexes for Audit and Reports
CREATE INDEX IF NOT EXISTS idx_reports_user ON public.reports(user_id, report_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON public.audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
