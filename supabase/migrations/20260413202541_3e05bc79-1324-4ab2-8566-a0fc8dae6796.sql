
-- Allow users with view_all permission to see legacy time entries (no company_id) 
-- from team members who share at least one company
CREATE POLICY "Admins can see legacy entries from team members"
ON public.time_entries
FOR SELECT
USING (
  company_id IS NULL
  AND user_id != auth.uid()
  AND EXISTS (
    SELECT 1 
    FROM company_members cm1
    JOIN company_members cm2 ON cm1.company_id = cm2.company_id
    JOIN role_permissions rp ON rp.role_id = cm1.role_id
    WHERE cm1.user_id = auth.uid()
      AND cm1.status = 'active'
      AND cm2.user_id = time_entries.user_id
      AND cm2.status = 'active'
      AND rp.permission = 'time_tracking:view_all'
  )
);
