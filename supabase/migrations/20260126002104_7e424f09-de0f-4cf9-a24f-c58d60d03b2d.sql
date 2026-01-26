-- Update products that have a client_id but no company_id
-- by inheriting the company_id from their associated client
UPDATE public.products p
SET company_id = c.company_id
FROM public.clients c
WHERE p.client_id = c.id
  AND p.company_id IS NULL
  AND c.company_id IS NOT NULL;