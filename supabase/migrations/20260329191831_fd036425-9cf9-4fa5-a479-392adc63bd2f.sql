
-- Create a function to enforce company creation limits based on subscription plan
CREATE OR REPLACE FUNCTION public.enforce_company_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_plan_type public.subscription_plan;
  v_max_companies integer;
  v_current_count integer;
  v_user_email text;
BEGIN
  -- Get the user's plan type from user_subscriptions
  SELECT us.plan_type INTO v_plan_type
  FROM public.user_subscriptions us
  WHERE us.user_id = NEW.user_id;

  -- Default to free if no subscription found
  IF v_plan_type IS NULL THEN
    v_plan_type := 'free';
  END IF;

  -- Get the max_companies for this plan
  SELECT sp.max_companies INTO v_max_companies
  FROM public.subscription_plans sp
  WHERE sp.plan_type = v_plan_type;

  -- If no limit (NULL = unlimited), allow
  IF v_max_companies IS NULL THEN
    RETURN NEW;
  END IF;

  -- Count existing companies owned by this user (with advisory lock to prevent race conditions)
  PERFORM pg_advisory_xact_lock(hashtext('company_limit_' || NEW.user_id::text));
  
  SELECT COUNT(*) INTO v_current_count
  FROM public.companies
  WHERE user_id = NEW.user_id;

  -- Get user email for logging
  SELECT email INTO v_user_email FROM auth.users WHERE id = NEW.user_id;

  IF v_current_count >= v_max_companies THEN
    RAISE EXCEPTION 'COMPANY_LIMIT_REACHED: User % (%) on plan % already has % companies (max: %)',
      NEW.user_id, COALESCE(v_user_email, 'unknown'), v_plan_type, v_current_count, v_max_companies;
  END IF;

  RETURN NEW;
END;
$$;

-- Create the BEFORE INSERT trigger
CREATE TRIGGER enforce_company_limit_trigger
  BEFORE INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_company_limit();
