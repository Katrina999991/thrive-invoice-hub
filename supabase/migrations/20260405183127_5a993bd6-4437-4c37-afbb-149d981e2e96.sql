
ALTER TABLE public.quotes 
  ADD COLUMN IF NOT EXISTS payment_link text,
  ADD COLUMN IF NOT EXISTS deposit_paid_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS deposit_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS online_payment_enabled boolean NOT NULL DEFAULT false;
