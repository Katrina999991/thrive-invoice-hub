CREATE POLICY "Members with invite permission can view company invites"
ON public.company_invites
FOR SELECT
TO authenticated
USING (public.has_permission(auth.uid(), company_id, 'access:invite'));