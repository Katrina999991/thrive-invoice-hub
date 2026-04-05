ALTER TABLE public.quote_items 
  ADD COLUMN IF NOT EXISTS line_type text NOT NULL DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS estimated_hours numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hourly_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_units numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_units numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit_label text DEFAULT NULL;

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS has_ranges boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS min_subtotal numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_subtotal numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_tax_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_tax_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_total numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_total numeric DEFAULT 0;