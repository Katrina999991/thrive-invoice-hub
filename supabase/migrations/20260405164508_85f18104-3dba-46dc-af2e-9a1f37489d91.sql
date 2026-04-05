ALTER TABLE public.quote_items
  ADD COLUMN IF NOT EXISTS is_optional boolean NOT NULL DEFAULT false;

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS deposit_type text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS deposit_value numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_amount numeric NOT NULL DEFAULT 0;