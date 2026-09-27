-- Track invoices that are known to be uncollectible without deleting or
-- changing the original invoice amount.
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS written_off_at timestamptz,
  ADD COLUMN IF NOT EXISTS written_off_reason text;

COMMENT ON COLUMN public.invoices.written_off_at IS
  'When the invoice was marked as uncollectible/write-off.';
COMMENT ON COLUMN public.invoices.written_off_reason IS
  'Optional internal explanation for marking the invoice as uncollectible.';
