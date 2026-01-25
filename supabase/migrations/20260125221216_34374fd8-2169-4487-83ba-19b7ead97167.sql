
-- Add RLS policies for company members to access data

-- CLIENTS: Allow company members with 'clients:view' permission to view
CREATE POLICY "Company members can view clients"
ON public.clients
FOR SELECT
USING (
  company_id IS NOT NULL 
  AND public.has_permission(auth.uid(), company_id, 'clients:view')
);

-- INVOICES: Allow company members to view invoices (via client's company_id)
CREATE POLICY "Company members can view invoices"
ON public.invoices
FOR SELECT
USING (
  client_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.clients c 
    WHERE c.id = client_id 
    AND c.company_id IS NOT NULL
    AND public.has_permission(auth.uid(), c.company_id, 'invoices:view')
  )
);

-- EXPENSES: Allow company members with 'expenses:view' permission to view
CREATE POLICY "Company members can view expenses"
ON public.expenses
FOR SELECT
USING (
  company_id IS NOT NULL 
  AND public.has_permission(auth.uid(), company_id, 'expenses:view')
);

-- PRODUCTS: Allow company members with 'products:view' permission to view
CREATE POLICY "Company members can view products"
ON public.products
FOR SELECT
USING (
  company_id IS NOT NULL 
  AND public.has_permission(auth.uid(), company_id, 'products:view')
);

-- QUOTES: Allow company members to view quotes (via client's company_id)
CREATE POLICY "Company members can view quotes"
ON public.quotes
FOR SELECT
USING (
  client_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.clients c 
    WHERE c.id = client_id 
    AND c.company_id IS NOT NULL
    AND public.has_permission(auth.uid(), c.company_id, 'quotes:view')
  )
);

-- TIME_ENTRIES: Allow company members to view time entries
CREATE POLICY "Company members can view time entries"
ON public.time_entries
FOR SELECT
USING (
  company_id IS NOT NULL 
  AND public.has_permission(auth.uid(), company_id, 'clients:view')
);
