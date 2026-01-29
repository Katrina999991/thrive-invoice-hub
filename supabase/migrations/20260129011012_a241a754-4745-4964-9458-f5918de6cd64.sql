-- Drop the existing restrictive delete policy
DROP POLICY IF EXISTS "Users can delete their own expenses" ON public.expenses;

-- Create a new delete policy that respects role-based permissions
-- Users can delete if:
-- 1. They own the expense (user_id = auth.uid()) AND have delete_own permission
-- 2. OR they have delete_all permission for expenses in their company
CREATE POLICY "Users can delete expenses based on permissions"
ON public.expenses
FOR DELETE
USING (
  -- Own expense check
  (auth.uid() = user_id)
  OR
  -- Company member with delete permission for company expenses
  (
    company_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM company_members cm
      JOIN role_permissions rp ON cm.role_id = rp.role_id
      WHERE cm.user_id = auth.uid()
        AND cm.company_id = expenses.company_id
        AND cm.status = 'active'
        AND rp.permission IN ('expenses:delete', 'expenses:delete_all')
    )
  )
);