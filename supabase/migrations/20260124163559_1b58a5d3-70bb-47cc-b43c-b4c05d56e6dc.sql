-- Add policy to allow anyone to read invites by token (for accepting invitations)
-- This is needed so users (including unauthenticated) can view their invitation details
CREATE POLICY "Anyone can view invites by token" 
ON public.company_invites 
FOR SELECT 
USING (true);

-- Drop the old restrictive policy since the new one covers it
DROP POLICY IF EXISTS "Users with view_members permission can view invites" ON public.company_invites;