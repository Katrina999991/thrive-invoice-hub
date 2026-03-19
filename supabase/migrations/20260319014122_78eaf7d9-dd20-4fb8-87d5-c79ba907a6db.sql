
-- Add missing columns to subscription_plans
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS final_reminder_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS formal_notice_enabled boolean NOT NULL DEFAULT false;

-- Set values: Premium & Pro get final_reminder, only Pro gets formal_notice
UPDATE public.subscription_plans SET final_reminder_enabled = true WHERE plan_type IN ('premium', 'pro');
UPDATE public.subscription_plans SET formal_notice_enabled = true WHERE plan_type = 'pro';
