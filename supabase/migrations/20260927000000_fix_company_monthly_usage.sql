-- Keep company subscription usage aligned with the invoices and expenses
-- that actually belong to the company. Invoice usage is based on issue_date,
-- which is a DATE and therefore avoids browser/server timezone differences.

CREATE OR REPLACE FUNCTION public.refresh_company_monthly_usage(_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.company_subscriptions cs
  SET
    invoices_this_month = (
      SELECT COUNT(*)::integer
      FROM public.invoices i
      JOIN public.clients c ON c.id = i.client_id
      WHERE c.company_id = _company_id
        AND i.issue_date >= date_trunc('month', CURRENT_DATE)::date
        AND i.issue_date < (date_trunc('month', CURRENT_DATE) + interval '1 month')::date
    ),
    expenses_this_month = (
      SELECT COUNT(*)::integer
      FROM public.expenses e
      WHERE e.company_id = _company_id
        AND e.created_at >= date_trunc('month', CURRENT_DATE)
        AND e.created_at < date_trunc('month', CURRENT_DATE) + interval '1 month'
    ),
    last_reset_date = CURRENT_DATE,
    updated_at = now()
  WHERE cs.company_id = _company_id;
END;
$$;

-- Recalculate existing company counters immediately when this migration runs.
DO $$
DECLARE
  company_record record;
BEGIN
  FOR company_record IN SELECT company_id FROM public.company_subscriptions LOOP
    PERFORM public.refresh_company_monthly_usage(company_record.company_id);
  END LOOP;
END;
$$;

-- Recalculate company usage whenever an invoice changes. The company is
-- resolved through the invoice's client because invoices do not store a
-- company_id directly.
CREATE OR REPLACE FUNCTION public.refresh_company_usage_from_invoice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_company_id uuid;
  new_company_id uuid;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    SELECT company_id INTO old_company_id FROM public.clients WHERE id = OLD.client_id;
    IF old_company_id IS NOT NULL THEN
      PERFORM public.refresh_company_monthly_usage(old_company_id);
    END IF;
  END IF;

  IF TG_OP <> 'DELETE' THEN
    SELECT company_id INTO new_company_id FROM public.clients WHERE id = NEW.client_id;
    IF new_company_id IS NOT NULL AND new_company_id IS DISTINCT FROM old_company_id THEN
      PERFORM public.refresh_company_monthly_usage(new_company_id);
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS refresh_company_usage_from_invoice ON public.invoices;
CREATE TRIGGER refresh_company_usage_from_invoice
AFTER INSERT OR UPDATE OR DELETE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.refresh_company_usage_from_invoice();

CREATE OR REPLACE FUNCTION public.refresh_company_usage_from_expense()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.company_id IS NOT NULL THEN
    PERFORM public.refresh_company_monthly_usage(OLD.company_id);
  ELSIF TG_OP = 'INSERT' AND NEW.company_id IS NOT NULL THEN
    PERFORM public.refresh_company_monthly_usage(NEW.company_id);
  ELSE
    IF OLD.company_id IS NOT NULL THEN
      PERFORM public.refresh_company_monthly_usage(OLD.company_id);
    END IF;
    IF NEW.company_id IS NOT NULL AND NEW.company_id IS DISTINCT FROM OLD.company_id THEN
      PERFORM public.refresh_company_monthly_usage(NEW.company_id);
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS refresh_company_usage_from_expense ON public.expenses;
CREATE TRIGGER refresh_company_usage_from_expense
AFTER INSERT OR UPDATE OR DELETE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.refresh_company_usage_from_expense();

-- Always expose calculated current-month usage to the dashboard and limit
-- checks, even if a legacy counter was previously stale.
CREATE OR REPLACE FUNCTION public.get_company_plan_limits(_company_id uuid)
RETURNS TABLE(
  plan_type public.subscription_plan,
  max_companies integer,
  max_clients integer,
  max_invoices_per_month integer,
  max_expenses_per_month integer,
  invoices_used integer,
  expenses_used integer,
  pdf_export boolean,
  all_invoice_templates boolean,
  custom_email_templates boolean,
  all_reports boolean,
  category_management boolean,
  quotes_enabled boolean,
  final_reminder_enabled boolean,
  formal_notice_enabled boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_type public.subscription_plan;
  v_invoices_used integer := 0;
  v_expenses_used integer := 0;
  v_owner_user_id uuid;
BEGIN
  SELECT cs.plan_type INTO v_plan_type
  FROM public.company_subscriptions cs
  WHERE cs.company_id = _company_id;

  IF v_plan_type IS NULL THEN
    SELECT c.user_id INTO v_owner_user_id
    FROM public.companies c
    WHERE c.id = _company_id;

    SELECT us.plan_type INTO v_plan_type
    FROM public.user_subscriptions us
    WHERE us.user_id = v_owner_user_id;
  END IF;

  v_plan_type := COALESCE(v_plan_type, 'free');

  SELECT COUNT(*)::integer INTO v_invoices_used
  FROM public.invoices i
  JOIN public.clients c ON c.id = i.client_id
  WHERE c.company_id = _company_id
    AND i.issue_date >= date_trunc('month', CURRENT_DATE)::date
    AND i.issue_date < (date_trunc('month', CURRENT_DATE) + interval '1 month')::date;

  SELECT COUNT(*)::integer INTO v_expenses_used
  FROM public.expenses e
  WHERE e.company_id = _company_id
    AND e.created_at >= date_trunc('month', CURRENT_DATE)
    AND e.created_at < date_trunc('month', CURRENT_DATE) + interval '1 month';

  RETURN QUERY
  SELECT sp.plan_type, sp.max_companies, sp.max_clients,
    sp.max_invoices_per_month, sp.max_expenses_per_month,
    v_invoices_used, v_expenses_used, sp.pdf_export,
    sp.all_invoice_templates, sp.custom_email_templates, sp.all_reports,
    sp.category_management, sp.quotes_enabled, sp.final_reminder_enabled,
    sp.formal_notice_enabled
  FROM public.subscription_plans sp
  WHERE sp.plan_type = v_plan_type;
END;
$$;
