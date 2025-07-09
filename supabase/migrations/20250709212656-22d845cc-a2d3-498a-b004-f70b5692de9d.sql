-- Add notes field to invoice_items table
ALTER TABLE public.invoice_items 
ADD COLUMN notes TEXT;