-- Add sent_at to invoices: first time an invoice was sent (immutable after first set)
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE;

-- Backfill for already-sent invoices using updated_at (best-effort)
UPDATE public.invoices
SET sent_at = updated_at
WHERE sent_at IS NULL
  AND status IN ('sent', 'overdue', 'paid');

CREATE INDEX IF NOT EXISTS idx_invoices_sent_at ON public.invoices(sent_at);

-- Trigger: prevent sent_at from being overwritten once it has a value
CREATE OR REPLACE FUNCTION public.protect_invoice_sent_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.sent_at IS NOT NULL AND NEW.sent_at IS DISTINCT FROM OLD.sent_at THEN
    NEW.sent_at := OLD.sent_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_invoice_sent_at ON public.invoices;
CREATE TRIGGER trg_protect_invoice_sent_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.protect_invoice_sent_at();