-- Allow Owners/Admins (with time_tracking:edit_all) to update legacy entries (company_id NULL)
-- created by other members of their company, and assign a company_id during the update.

DROP POLICY IF EXISTS "Admins can update time entries in their company" ON public.time_entries;

CREATE POLICY "Admins can update time entries in their company"
ON public.time_entries
FOR UPDATE
USING (
  -- Entry already attached to a company where caller has edit_all
  (company_id IS NOT NULL AND public.has_permission(auth.uid(), company_id, 'time_tracking:edit_all'))
  OR
  -- Legacy entry (company_id NULL) belonging to a teammate in a company
  -- where caller has edit_all permission
  (company_id IS NULL AND EXISTS (
    SELECT 1
    FROM public.company_members cm_caller
    JOIN public.company_members cm_owner ON cm_owner.company_id = cm_caller.company_id
    JOIN public.role_permissions rp ON rp.role_id = cm_caller.role_id
    WHERE cm_caller.user_id = auth.uid()
      AND cm_caller.status = 'active'
      AND cm_owner.user_id = time_entries.user_id
      AND cm_owner.status = 'active'
      AND rp.permission = 'time_tracking:edit_all'
  ))
)
WITH CHECK (
  -- After update, company_id must be set and caller must have edit_all on that company
  company_id IS NOT NULL
  AND public.has_permission(auth.uid(), company_id, 'time_tracking:edit_all')
);