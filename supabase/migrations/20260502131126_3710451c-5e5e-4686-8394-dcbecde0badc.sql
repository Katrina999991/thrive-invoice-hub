DROP POLICY IF EXISTS "Admin can view all product update logs" ON public.product_update_logs;
DROP POLICY IF EXISTS "Only admin can view product update logs" ON public.product_update_logs;
DROP POLICY IF EXISTS "Admin can view product update logs" ON public.product_update_logs;

CREATE POLICY "Admins can view product update logs"
ON public.product_update_logs
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));