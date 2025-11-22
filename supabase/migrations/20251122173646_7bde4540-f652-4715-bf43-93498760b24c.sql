-- Add Stripe Connect account ID to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS stripe_account_id text,
ADD COLUMN IF NOT EXISTS stripe_onboarding_complete boolean DEFAULT false;

-- Add payment link and payment status to invoices
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS payment_link text,
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
ADD COLUMN IF NOT EXISTS paid_at timestamp with time zone;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_account_id ON public.profiles(stripe_account_id);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_intent ON public.invoices(stripe_payment_intent_id);