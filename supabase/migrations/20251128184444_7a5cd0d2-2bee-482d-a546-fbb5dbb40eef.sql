-- Add is_archived column to invoices table
ALTER TABLE public.invoices 
ADD COLUMN is_archived boolean NOT NULL DEFAULT false;

-- Create index for better performance when filtering archived invoices
CREATE INDEX idx_invoices_is_archived ON public.invoices(is_archived);