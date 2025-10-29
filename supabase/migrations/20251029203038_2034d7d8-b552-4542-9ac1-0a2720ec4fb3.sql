-- Add French version of invoice footer message
ALTER TABLE public.companies 
ADD COLUMN invoice_footer_message_fr text DEFAULT 'Merci pour votre confiance !';

COMMENT ON COLUMN public.companies.invoice_footer_message_fr IS 'French version of the message displayed at the bottom of invoices';