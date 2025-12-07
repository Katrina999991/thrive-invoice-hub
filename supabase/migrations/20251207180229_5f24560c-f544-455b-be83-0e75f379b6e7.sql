-- Add client_id column to products table
ALTER TABLE public.products
ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_products_client_id ON public.products(client_id);