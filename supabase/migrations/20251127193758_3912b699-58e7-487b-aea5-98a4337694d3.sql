-- Add company_id to products table
ALTER TABLE public.products
ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_products_company_id ON public.products(company_id);