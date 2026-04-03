
-- Add late fee settings to companies table
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS late_fee_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS late_fee_type text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS late_fee_rate numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS late_fee_amount numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS late_fee_grace_days integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS late_fee_terms_text text DEFAULT NULL;

-- Add late fee tracking to invoices table
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS late_fee_applied_total numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS late_fee_last_applied_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS late_fee_status text NOT NULL DEFAULT 'none';

-- Create invoice_late_fees table to track individual late fee applications
CREATE TABLE IF NOT EXISTS public.invoice_late_fees (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  fee_type text NOT NULL,
  description text NOT NULL DEFAULT 'Late fee',
  applied_at timestamptz NOT NULL DEFAULT now(),
  applied_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on invoice_late_fees
ALTER TABLE public.invoice_late_fees ENABLE ROW LEVEL SECURITY;

-- RLS policies for invoice_late_fees: users can manage late fees on their own invoices
CREATE POLICY "Users can view late fees on their invoices"
  ON public.invoice_late_fees
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_late_fees.invoice_id
      AND i.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert late fees on their invoices"
  ON public.invoice_late_fees
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_late_fees.invoice_id
      AND i.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete late fees on their invoices"
  ON public.invoice_late_fees
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_late_fees.invoice_id
      AND i.user_id = auth.uid()
    )
  );
