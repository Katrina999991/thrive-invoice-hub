-- 1) Rename password_plain to password_encrypted (clarify it's AES-GCM encrypted at rest)
ALTER TABLE public.test_account_passwords
  RENAME COLUMN password_plain TO password_encrypted;

-- 2) Audit log integrity: remove user-controlled INSERT policy.
-- All inserts must go through the SECURITY DEFINER function public.log_audit_event.
DROP POLICY IF EXISTS "Users can insert their own audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can create their own audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users insert own audit logs" ON public.audit_logs;