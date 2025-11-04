-- Create enum for subscription plans
CREATE TYPE public.subscription_plan AS ENUM ('free', 'premium', 'pro');

-- Create enum for billing cycle
CREATE TYPE public.billing_cycle AS ENUM ('monthly', 'yearly');

-- Create subscription_plans table with plan details
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type public.subscription_plan NOT NULL UNIQUE,
  name_en TEXT NOT NULL,
  name_fr TEXT NOT NULL,
  description_en TEXT,
  description_fr TEXT,
  monthly_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  yearly_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_companies INTEGER,
  max_clients INTEGER,
  max_invoices_per_month INTEGER,
  max_expenses_per_month INTEGER,
  pdf_export BOOLEAN NOT NULL DEFAULT false,
  all_invoice_templates BOOLEAN NOT NULL DEFAULT false,
  custom_email_templates BOOLEAN NOT NULL DEFAULT false,
  all_reports BOOLEAN NOT NULL DEFAULT false,
  category_management BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_subscriptions table
CREATE TABLE public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan_type public.subscription_plan NOT NULL DEFAULT 'free',
  billing_cycle public.billing_cycle,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  invoices_this_month INTEGER NOT NULL DEFAULT 0,
  expenses_this_month INTEGER NOT NULL DEFAULT 0,
  last_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_plans (public read)
CREATE POLICY "Anyone can view subscription plans"
ON public.subscription_plans
FOR SELECT
USING (true);

-- RLS Policies for user_subscriptions
CREATE POLICY "Users can view their own subscription"
ON public.user_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription"
ON public.user_subscriptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
ON public.user_subscriptions
FOR UPDATE
USING (auth.uid() = user_id);

-- Insert default plan configurations
INSERT INTO public.subscription_plans (
  plan_type, name_en, name_fr, description_en, description_fr,
  monthly_price, yearly_price,
  max_companies, max_clients, max_invoices_per_month, max_expenses_per_month,
  pdf_export, all_invoice_templates, custom_email_templates, all_reports, category_management
) VALUES
  (
    'free', 'Free', 'Gratuit',
    'Ideal for freelancers just starting out',
    'Idéale pour les travailleurs autonomes qui débutent',
    0, 0,
    1, 3, 5, 5,
    false, false, false, false, false
  ),
  (
    'premium', 'Premium', 'Premium',
    'For small businesses and independent professionals',
    'Pour petites entreprises et professionnels indépendants',
    14.99, 149.99,
    1, NULL, NULL, 20,
    true, false, false, false, true
  ),
  (
    'pro', 'Pro', 'Pro',
    'For growing businesses or multi-company operations',
    'Pour entreprises en croissance ou multi-compagnies',
    24.99, 249.99,
    NULL, NULL, NULL, NULL,
    true, true, true, true, true
  );

-- Function to check user's plan limits
CREATE OR REPLACE FUNCTION public.get_user_plan_limits(user_uuid UUID)
RETURNS TABLE (
  plan_type public.subscription_plan,
  max_companies INTEGER,
  max_clients INTEGER,
  max_invoices_per_month INTEGER,
  max_expenses_per_month INTEGER,
  invoices_used INTEGER,
  expenses_used INTEGER,
  pdf_export BOOLEAN,
  all_invoice_templates BOOLEAN,
  custom_email_templates BOOLEAN,
  all_reports BOOLEAN,
  category_management BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    sp.category_management
  FROM public.user_subscriptions us
  JOIN public.subscription_plans sp ON us.plan_type = sp.plan_type
  WHERE us.user_id = user_uuid;
END;
$$;

-- Function to reset monthly counters
CREATE OR REPLACE FUNCTION public.reset_monthly_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_subscriptions
  SET 
    invoices_this_month = 0,
    expenses_this_month = 0,
    last_reset_date = CURRENT_DATE
  WHERE last_reset_date < date_trunc('month', CURRENT_DATE);
END;
$$;

-- Function to increment invoice counter
CREATE OR REPLACE FUNCTION public.increment_invoice_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Reset counters if needed
  PERFORM public.reset_monthly_usage();
  
  -- Increment invoice counter
  UPDATE public.user_subscriptions
  SET invoices_this_month = invoices_this_month + 1
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Function to increment expense counter
CREATE OR REPLACE FUNCTION public.increment_expense_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Reset counters if needed
  PERFORM public.reset_monthly_usage();
  
  -- Increment expense counter
  UPDATE public.user_subscriptions
  SET expenses_this_month = expenses_this_month + 1
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Create triggers for usage tracking
CREATE TRIGGER track_invoice_usage
AFTER INSERT ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.increment_invoice_usage();

CREATE TRIGGER track_expense_usage
AFTER INSERT ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.increment_expense_usage();

-- Trigger for updating updated_at
CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at
BEFORE UPDATE ON public.user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to initialize free plan for new users
CREATE OR REPLACE FUNCTION public.initialize_user_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_subscriptions (user_id, plan_type)
  VALUES (NEW.user_id, 'free');
  RETURN NEW;
END;
$$;

-- Create trigger to auto-create subscription on profile creation
CREATE TRIGGER init_user_subscription
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.initialize_user_subscription();