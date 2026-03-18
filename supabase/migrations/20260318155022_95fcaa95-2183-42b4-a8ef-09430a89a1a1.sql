
ALTER TABLE public.invoice_formal_notices
  ADD COLUMN IF NOT EXISTS delivery_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS proof_of_sending boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS proof_of_receipt boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tracking_notes text;

-- Migrate existing data: derive new booleans from old proof_status
UPDATE public.invoice_formal_notices
SET
  proof_of_sending = CASE WHEN proof_status IN ('sent', 'received') THEN true ELSE false END,
  proof_of_receipt = CASE WHEN proof_status = 'received' THEN true ELSE false END,
  delivery_status = CASE
    WHEN proof_status = 'received' OR delivered_date IS NOT NULL THEN 'delivered'
    WHEN proof_status = 'sent' OR tracking_number IS NOT NULL THEN 'sent_with_proof'
    WHEN sent_at IS NOT NULL THEN 'sent'
    ELSE 'draft'
  END;
