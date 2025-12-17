-- Create enum for audit event categories
CREATE TYPE public.audit_event_category AS ENUM (
  'authentication',
  'billing',
  'sales',
  'products',
  'exports',
  'settings'
);

-- Create the audit_logs table (append-only)
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID NOT NULL,
  user_name TEXT,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  category audit_event_category NOT NULL,
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  related_entity_type TEXT,
  related_entity_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  platform TEXT DEFAULT 'web'
);

-- Create index for efficient querying
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_company_id ON public.audit_logs(company_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_category ON public.audit_logs(category);
CREATE INDEX idx_audit_logs_event_type ON public.audit_logs(event_type);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can only view their own audit logs (read-only for users)
CREATE POLICY "Users can view their own audit logs"
ON public.audit_logs
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own audit logs
CREATE POLICY "Users can insert their own audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- NO UPDATE or DELETE policies - audit logs are append-only

-- Create function to insert audit log (can be called from edge functions or client)
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_user_id UUID,
  p_user_name TEXT,
  p_company_id UUID,
  p_category audit_event_category,
  p_event_type TEXT,
  p_description TEXT,
  p_related_entity_type TEXT DEFAULT NULL,
  p_related_entity_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_platform TEXT DEFAULT 'web'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
    user_id, user_name, company_id, category, event_type, 
    description, related_entity_type, related_entity_id, 
    metadata, ip_address, user_agent, platform
  ) VALUES (
    p_user_id, p_user_name, p_company_id, p_category, p_event_type,
    p_description, p_related_entity_type, p_related_entity_id,
    p_metadata, p_ip_address, p_user_agent, p_platform
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Never block the main action if audit logging fails
    RETURN NULL;
END;
$$;