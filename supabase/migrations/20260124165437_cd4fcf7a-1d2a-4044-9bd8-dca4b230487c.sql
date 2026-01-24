-- Create a security definer function to get current user's email
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid()
$$;

-- Drop and recreate the policy using the function
DROP POLICY IF EXISTS "Users can join via invitation or be added by admins" ON public.company_members;

CREATE POLICY "Users can join via invitation or be added by admins" 
ON public.company_members 
FOR INSERT 
WITH CHECK (
  -- Allow if user has invite permission (admin adding members)
  has_permission(auth.uid(), company_id, 'access:invite'::text)
  OR
  -- Allow if user is adding themselves AND has a valid pending invitation
  (
    user_id = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM public.company_invites ci
      WHERE ci.company_id = company_members.company_id
        AND ci.email = public.get_current_user_email()
        AND ci.accepted_at IS NULL
        AND ci.expires_at > now()
    )
  )
);