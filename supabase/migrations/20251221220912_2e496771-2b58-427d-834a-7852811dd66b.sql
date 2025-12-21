-- Fix the initialize_user_subscription function to handle duplicates
CREATE OR REPLACE FUNCTION public.initialize_user_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_subscriptions (user_id, plan_type)
  VALUES (NEW.user_id, 'free')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;