-- Add RLS policy for approving time entries by admins/owners
CREATE POLICY "Admins can approve time entries in their company"
ON public.time_entries
FOR UPDATE
USING (
  company_id IS NOT NULL 
  AND has_permission(auth.uid(), company_id, 'time_tracking:approve')
)
WITH CHECK (
  company_id IS NOT NULL 
  AND has_permission(auth.uid(), company_id, 'time_tracking:approve')
);

-- Add RLS policy for approving expenses by admins/owners
CREATE POLICY "Admins can approve expenses in their company"
ON public.expenses
FOR UPDATE
USING (
  company_id IS NOT NULL 
  AND has_permission(auth.uid(), company_id, 'expenses:approve')
)
WITH CHECK (
  company_id IS NOT NULL 
  AND has_permission(auth.uid(), company_id, 'expenses:approve')
);