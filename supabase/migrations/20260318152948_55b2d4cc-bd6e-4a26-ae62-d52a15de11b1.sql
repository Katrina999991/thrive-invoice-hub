ALTER TABLE public.invoice_formal_notices
  ADD COLUMN IF NOT EXISTS sending_method text DEFAULT 'registered_mail',
  ADD COLUMN IF NOT EXISTS proof_status text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS delivered_date date,
  ADD COLUMN IF NOT EXISTS client_language text DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS risk_level text DEFAULT 'medium';