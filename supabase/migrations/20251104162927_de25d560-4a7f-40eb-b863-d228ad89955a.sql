-- Initialize user_subscriptions for all existing users who don't have one yet
INSERT INTO public.user_subscriptions (user_id, plan_type)
SELECT p.user_id, 'free'::subscription_plan
FROM public.profiles p
LEFT JOIN public.user_subscriptions us ON us.user_id = p.user_id
WHERE us.id IS NULL;