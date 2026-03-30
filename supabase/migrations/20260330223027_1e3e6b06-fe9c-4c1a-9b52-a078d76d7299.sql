
-- Fix get_company_plan_limits to fallback to the company owner's user_subscriptions
-- when no company_subscriptions record exists
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
    v_owner_user_id uuid;
BEGIN
    -- First try company_subscriptions
    SELECT COALESCE(cs.plan_type, NULL), COALESCE(cs.invoices_this_month, 0), COALESCE(cs.expenses_this_month, 0)
    INTO v_plan_type, v_invoices_used, v_expenses_used
    FROM public.company_subscriptions cs
    WHERE cs.company_id = _company_id;

    -- If no company subscription, fallback to the company owner's user_subscriptions
    IF v_plan_type IS NULL THEN
        -- Get the company owner's user_id
        SELECT c.user_id INTO v_owner_user_id
        FROM public.companies c
        WHERE c.id = _company_id;

        IF v_owner_user_id IS NOT NULL THEN
            SELECT us.plan_type, COALESCE(us.invoices_this_month, 0), COALESCE(us.expenses_this_month, 0)
            INTO v_plan_type, v_invoices_used, v_expenses_used
            FROM public.user_subscriptions us
            WHERE us.user_id = v_owner_user_id;
        END IF;
    END IF;

    -- Final fallback to free
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
