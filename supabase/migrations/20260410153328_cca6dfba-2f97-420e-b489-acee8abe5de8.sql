
-- 1. Remove overly permissive policies on role_permissions
DROP POLICY IF EXISTS "Authenticated can insert permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Authenticated can delete permissions" ON public.role_permissions;

-- 2. Fix receipt_scan_logs: drop open insert policy, add restricted one
DROP POLICY IF EXISTS "Service role can insert receipt scan logs" ON public.receipt_scan_logs;

CREATE POLICY "Authenticated users can insert own receipt scan logs"
  ON public.receipt_scan_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
