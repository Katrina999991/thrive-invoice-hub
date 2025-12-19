-- Add DELETE policy for email_preferences (GDPR compliance)
CREATE POLICY "Users can delete their own email preferences"
ON public.email_preferences
FOR DELETE
USING (auth.uid() = user_id);

-- Add DELETE policy for user_subscriptions (GDPR compliance)
CREATE POLICY "Users can delete their own subscription"
ON public.user_subscriptions
FOR DELETE
USING (auth.uid() = user_id);

-- Add explicit DENY UPDATE policy for audit_logs (immutability)
CREATE POLICY "Audit logs cannot be updated"
ON public.audit_logs
FOR UPDATE
USING (false);

-- Add explicit DENY DELETE policy for audit_logs (immutability)
CREATE POLICY "Audit logs cannot be deleted"
ON public.audit_logs
FOR DELETE
USING (false);

-- Add explicit DENY UPDATE policy for mfa_audit_logs (immutability)
CREATE POLICY "MFA audit logs cannot be updated"
ON public.mfa_audit_logs
FOR UPDATE
USING (false);

-- Add explicit DENY DELETE policy for mfa_audit_logs (immutability)
CREATE POLICY "MFA audit logs cannot be deleted"
ON public.mfa_audit_logs
FOR DELETE
USING (false);