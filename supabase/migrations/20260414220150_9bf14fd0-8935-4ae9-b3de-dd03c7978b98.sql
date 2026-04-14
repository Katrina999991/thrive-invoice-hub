-- Allow users with time_tracking:edit_all permission to update any entry in their company
CREATE POLICY "Admins can update time entries in their company"
ON public.time_entries
FOR UPDATE TO authenticated
USING (
  company_id IS NOT NULL 
  AND has_permission(auth.uid(), company_id, 'time_tracking:edit_all')
)
WITH CHECK (
  company_id IS NOT NULL 
  AND has_permission(auth.uid(), company_id, 'time_tracking:edit_all')
);