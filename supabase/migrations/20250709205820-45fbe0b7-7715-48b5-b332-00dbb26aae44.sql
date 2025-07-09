-- Change default_due_time to default_due_days (integer)
ALTER TABLE public.companies 
DROP COLUMN default_due_time;

ALTER TABLE public.companies 
ADD COLUMN default_due_days INTEGER DEFAULT 7;

-- Change invoices due_date back to date type since we don't need time
ALTER TABLE public.invoices 
ALTER COLUMN due_date TYPE DATE 
USING due_date::date;