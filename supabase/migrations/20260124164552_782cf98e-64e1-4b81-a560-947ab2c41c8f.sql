-- Fix: Allow users to add themselves as members when they have a valid invitation
-- The current policy only allows users with 'access:invite' permission, but new users
-- accepting an invitation don't have any permissions yet

-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Users with invite permission can add members" ON public.company_members;

-- Create a new INSERT policy that allows:
-- 1. Users with invite permission to add members (existing behavior)
-- 2. Users to add themselves if they have a valid pending invitation for that company
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
        AND ci.email = (SELECT email FROM auth.users WHERE id = auth.uid())
        AND ci.accepted_at IS NULL
        AND ci.expires_at > now()
    )
  )
);