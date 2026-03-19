-- Drop and recreate get_company_plan_limits with new return columns
DROP FUNCTION IF EXISTS public.get_company_plan_limits(uuid);

CREATE OR REPLACE FUNCTION public.get_company_plan_limits(_company_id uuid)
 RETURNS TABLE(plan_type subscription_plan, max_companies integer, max_clients integer, max_invoices_per_month integer, max_expenses_per_month integer, invoices_used integer, expenses_used integer, pdf_export boolean, all_invoice_templates boolean, custom_email_templates boolean, all_reports boolean, category_management boolean, quotes_enabled boolean, final_reminder_enabled boolean, formal_notice_enabled boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_plan_type public.subscription_plan;
    v_invoices_used INT;
    v_expenses_used INT;
BEGIN
    SELECT COALESCE(cs.plan_type, 'free'), COALESCE(cs.invoices_this_month, 0), COALESCE(cs.expenses_this_month, 0)
    INTO v_plan_type, v_invoices_used, v_expenses_used
    FROM public.company_subscriptions cs
    WHERE cs.company_id = _company_id;

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
        sp.quotes_enabled,
        sp.final_reminder_enabled,
        sp.formal_notice_enabled
    FROM public.subscription_plans sp
    WHERE sp.plan_type = v_plan_type;
END;
$function$;

-- Update authorize_action to handle new feature keys
CREATE OR REPLACE FUNCTION public.authorize_action(_company_id uuid, _user_id uuid, _permission text DEFAULT NULL::text, _feature_key text DEFAULT NULL::text, _check_limit text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_member_status public.member_status;
    v_plan_limits RECORD;
    v_has_permission BOOLEAN;
    v_feature_value BOOLEAN;
    v_current_usage INT;
    v_limit_value INT;
BEGIN
    SELECT cm.status INTO v_member_status
    FROM public.company_members cm
    WHERE cm.company_id = _company_id AND cm.user_id = _user_id;

    IF v_member_status IS NULL THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'not_a_member');
    END IF;

    IF v_member_status != 'active' THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'member_not_active');
    END IF;

    IF _permission IS NOT NULL THEN
        v_has_permission := public.has_permission(_user_id, _company_id, _permission);
        IF NOT v_has_permission THEN
            RETURN jsonb_build_object('allowed', false, 'reason', 'missing_permission');
        END IF;
    END IF;

    SELECT * INTO v_plan_limits FROM public.get_company_plan_limits(_company_id);

    IF _feature_key IS NOT NULL THEN
        CASE _feature_key
            WHEN 'pdf_export' THEN v_feature_value := v_plan_limits.pdf_export;
            WHEN 'all_invoice_templates' THEN v_feature_value := v_plan_limits.all_invoice_templates;
            WHEN 'custom_email_templates' THEN v_feature_value := v_plan_limits.custom_email_templates;
            WHEN 'all_reports' THEN v_feature_value := v_plan_limits.all_reports;
            WHEN 'category_management' THEN v_feature_value := v_plan_limits.category_management;
            WHEN 'quotes_enabled' THEN v_feature_value := v_plan_limits.quotes_enabled;
            WHEN 'final_reminder_enabled' THEN v_feature_value := v_plan_limits.final_reminder_enabled;
            WHEN 'formal_notice_enabled' THEN v_feature_value := v_plan_limits.formal_notice_enabled;
            ELSE v_feature_value := false;
        END CASE;

        IF NOT v_feature_value THEN
            RETURN jsonb_build_object('allowed', false, 'reason', 'feature_not_in_plan');
        END IF;
    END IF;

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
$function$;