UPDATE public.subscription_plans
SET monthly_price = 9.99,
    yearly_price = 99.90
WHERE plan_type = 'premium';

UPDATE public.subscription_plans
SET monthly_price = 14.99,
    yearly_price = 149.90
WHERE plan_type = 'pro';