-- Add product_taxes column to invoice_items table to store product-specific taxes at the time of invoice creation
ALTER TABLE public.invoice_items 
ADD COLUMN product_taxes jsonb DEFAULT '[]'::jsonb;

-- Add comment to explain the product_taxes column
COMMENT ON COLUMN public.invoice_items.product_taxes IS 'Array of tax objects from the product at the time of invoice creation, e.g., [{"name": "Eco Tax", "percentage": 2}]. This preserves the tax rates even if the product taxes are modified later.';