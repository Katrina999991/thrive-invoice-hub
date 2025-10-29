-- Add footer message column to companies table
ALTER TABLE public.companies 
ADD COLUMN invoice_footer_message text DEFAULT 'Thank you for your business!';

COMMENT ON COLUMN public.companies.invoice_footer_message IS 'Message displayed at the bottom of invoices';