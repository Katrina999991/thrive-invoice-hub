-- Add columns to determine where categories can be used
ALTER TABLE public.categories
ADD COLUMN for_products BOOLEAN DEFAULT true,
ADD COLUMN for_services BOOLEAN DEFAULT true,
ADD COLUMN for_expenses BOOLEAN DEFAULT true;