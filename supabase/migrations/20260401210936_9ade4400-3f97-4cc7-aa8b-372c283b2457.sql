DROP FUNCTION IF EXISTS public.get_user_plan_limits(uuid);

CREATE OR REPLACE FUNCTION public.get_user_plan_limits(user_uuid uuid)
 RETURNS TABLE(plan_type subscription_plan, max_companies integer, max_clients integer, max_invoices_per_month integer, max_expenses_per_month integer, invoices_used integer, expenses_used integer, pdf_export boolean, all_invoice_templates boolean, custom_email_templates boolean, all_reports boolean, category_management boolean, quotes_enabled boolean, final_reminder_enabled boolean, formal_notice_enabled boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    sp.plan_type,
    sp.max_companies,
    sp.max_clients,
    sp.max_invoices_per_month,
    sp.max_expenses_per_month,
    us.invoices_this_month,
    us.expenses_this_month,
    sp.pdf_export,
    sp.all_invoice_templates,
    sp.custom_email_templates,
    sp.all_reports,
    sp.category_management,
    sp.quotes_enabled,
    sp.final_reminder_enabled,
    sp.formal_notice_enabled
  FROM public.user_subscriptions us
  JOIN public.subscription_plans sp ON us.plan_type = sp.plan_type
  WHERE us.user_id = user_uuid;
END;
$function$;