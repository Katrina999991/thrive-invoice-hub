-- Add default due time to companies table
ALTER TABLE public.companies 
ADD COLUMN default_due_time TIME DEFAULT '17:00:00';

-- Change invoices due_date to timestamp to include time
ALTER TABLE public.invoices 
ALTER COLUMN due_date TYPE TIMESTAMP WITH TIME ZONE 
USING due_date::timestamp with time zone;

-- Update existing invoices to use company's default due time
UPDATE public.invoices 
SET due_date = due_date + COALESCE(
  (SELECT default_due_time FROM companies WHERE companies.id = invoices.client_id), 
  '17:00:00'::time
)
WHERE due_date IS NOT NULL;