-- Company Subscriptions Table (plan attached to company, not user)
CREATE TABLE IF NOT EXISTS public.company_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    plan_type public.subscription_plan NOT NULL DEFAULT 'free',
    billing_cycle public.billing_cycle,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    invoices_this_month INT NOT NULL DEFAULT 0,
    expenses_this_month INT NOT NULL DEFAULT 0,
    last_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(company_id)
);

-- Enable RLS
ALTER TABLE public.company_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for company_subscriptions (with correct parameter order)
CREATE POLICY "Company members can view their company subscription"
ON public.company_subscriptions FOR SELECT
TO authenticated
USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Company admins can update subscription"
ON public.company_subscriptions FOR UPDATE
TO authenticated
USING (public.has_permission(auth.uid(), company_id, 'billing:manage'));

CREATE POLICY "System can insert subscriptions"
ON public.company_subscriptions FOR INSERT
TO authenticated
WITH CHECK (true);

-- Function to get company plan limits (similar to get_user_plan_limits but for company)
CREATE OR REPLACE FUNCTION public.get_company_plan_limits(_company_id UUID)
RETURNS TABLE (
    plan_type public.subscription_plan,
    max_companies INT,
    max_clients INT,
    max_invoices_per_month INT,
    max_expenses_per_month INT,
    invoices_used INT,
    expenses_used INT,
    pdf_export BOOLEAN,
    all_invoice_templates BOOLEAN,
    custom_email_templates BOOLEAN,
    all_reports BOOLEAN,
    category_management BOOLEAN,
    quotes_enabled BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_plan_type public.subscription_plan;
    v_invoices_used INT;
    v_expenses_used INT;
BEGIN
    -- Get company's subscription plan
    SELECT COALESCE(cs.plan_type, 'free'), COALESCE(cs.invoices_this_month, 0), COALESCE(cs.expenses_this_month, 0)
    INTO v_plan_type, v_invoices_used, v_expenses_used
    FROM public.company_subscriptions cs
    WHERE cs.company_id = _company_id;

    -- If no subscription record, default to free
    IF v_plan_type IS NULL THEN
        v_plan_type := 'free';
        v_invoices_used := 0;
        v_expenses_used := 0;
    END IF;

    RETURN QUERY
    SELECT 
        v_plan_type,
        sp.max_companies,
        sp.max_clients,
        sp.max_invoices_per_month,
        sp.max_expenses_per_month,
        v_invoices_used,
        v_expenses_used,
        sp.pdf_export,
        sp.all_invoice_templates,
        sp.custom_email_templates,
        sp.all_reports,
        sp.category_management,
        sp.quotes_enabled
    FROM public.subscription_plans sp
    WHERE sp.plan_type = v_plan_type;
END;
$$;

-- Authorization function that checks both plan AND permissions
CREATE OR REPLACE FUNCTION public.authorize_action(
    _company_id UUID,
    _user_id UUID,
    _permission TEXT DEFAULT NULL,
    _feature_key TEXT DEFAULT NULL,
    _check_limit TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_member_status public.member_status;
    v_plan_limits RECORD;
    v_has_permission BOOLEAN;
    v_feature_value BOOLEAN;
    v_current_usage INT;
    v_limit_value INT;
BEGIN
    -- Check if user is an active company member
    SELECT cm.status INTO v_member_status
    FROM public.company_members cm
    WHERE cm.company_id = _company_id AND cm.user_id = _user_id;

    IF v_member_status IS NULL THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'not_a_member');
    END IF;

    IF v_member_status != 'active' THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'member_not_active');
    END IF;

    -- Check permission if required (with correct parameter order)
    IF _permission IS NOT NULL THEN
        v_has_permission := public.has_permission(_user_id, _company_id, _permission);
        IF NOT v_has_permission THEN
            RETURN jsonb_build_object('allowed', false, 'reason', 'missing_permission');
        END IF;
    END IF;

    -- Get company plan limits
    SELECT * INTO v_plan_limits FROM public.get_company_plan_limits(_company_id);

    -- Check feature if required
    IF _feature_key IS NOT NULL THEN
        CASE _feature_key
            WHEN 'pdf_export' THEN v_feature_value := v_plan_limits.pdf_export;
            WHEN 'all_invoice_templates' THEN v_feature_value := v_plan_limits.all_invoice_templates;
            WHEN 'custom_email_templates' THEN v_feature_value := v_plan_limits.custom_email_templates;
            WHEN 'all_reports' THEN v_feature_value := v_plan_limits.all_reports;
            WHEN 'category_management' THEN v_feature_value := v_plan_limits.category_management;
            WHEN 'quotes_enabled' THEN v_feature_value := v_plan_limits.quotes_enabled;
            ELSE v_feature_value := false;
        END CASE;

        IF NOT v_feature_value THEN
            RETURN jsonb_build_object('allowed', false, 'reason', 'feature_not_in_plan');
        END IF;
    END IF;

    -- Check limit if required
    IF _check_limit IS NOT NULL THEN
        CASE _check_limit
            WHEN 'invoices' THEN
                v_current_usage := v_plan_limits.invoices_used;
                v_limit_value := v_plan_limits.max_invoices_per_month;
            WHEN 'expenses' THEN
                v_current_usage := v_plan_limits.expenses_used;
                v_limit_value := v_plan_limits.max_expenses_per_month;
            WHEN 'clients' THEN
                SELECT COUNT(*) INTO v_current_usage FROM public.clients WHERE company_id = _company_id;
                v_limit_value := v_plan_limits.max_clients;
            ELSE
                v_current_usage := 0;
                v_limit_value := NULL;
        END CASE;

        IF v_limit_value IS NOT NULL AND v_current_usage >= v_limit_value THEN
            RETURN jsonb_build_object('allowed', false, 'reason', 'limit_reached', 'current', v_current_usage, 'limit', v_limit_value);
        END IF;
    END IF;

    RETURN jsonb_build_object('allowed', true, 'reason', NULL);
END;
$$;

-- Create default subscription for existing companies that don't have one
-- First, get the owner's subscription and apply it to the company
INSERT INTO public.company_subscriptions (company_id, plan_type, billing_cycle, started_at, expires_at)
SELECT 
    c.id,
    COALESCE(us.plan_type, 'free'),
    us.billing_cycle,
    COALESCE(us.started_at, now()),
    us.expires_at
FROM public.companies c
LEFT JOIN public.user_subscriptions us ON us.user_id = c.user_id
WHERE NOT EXISTS (
    SELECT 1 FROM public.company_subscriptions cs WHERE cs.company_id = c.id
);