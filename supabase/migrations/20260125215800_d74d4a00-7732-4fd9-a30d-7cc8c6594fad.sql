-- Allow invited users to mark their own invitation as accepted
CREATE POLICY "Invited users can accept their own invitations"
ON public.company_invites
FOR UPDATE
USING (
  email = get_current_user_email() 
  AND accepted_at IS NULL
  AND expires_at > now()
)
WITH CHECK (
  email = get_current_user_email()
  AND accepted_at IS NOT NULL
);