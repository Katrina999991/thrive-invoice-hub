-- Allow platform admin to view audit logs of any user (used by Admin → Users → Activity drawer)
CREATE POLICY "Platform admin can view all audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));