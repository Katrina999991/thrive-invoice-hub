-- Update subscription for lainiem@lnlcreatives.com to premium monthly
UPDATE public.user_subscriptions
SET 
  plan_type = 'premium',
  billing_cycle = 'monthly',
  started_at = now()
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'lainiem@lnlcreatives.com'
);