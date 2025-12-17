-- Table pour stocker les secrets MFA (chiffrés)
CREATE TABLE public.mfa_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  encrypted_secret text NOT NULL,
  is_enabled boolean DEFAULT false,
  enabled_at timestamptz,
  last_verified_at timestamptz,
  failed_attempts integer DEFAULT 0,
  locked_until timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table pour les codes de récupération
CREATE TABLE public.mfa_recovery_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  code_hash text NOT NULL,
  is_used boolean DEFAULT false,
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Index pour performance
CREATE INDEX idx_mfa_secrets_user_id ON public.mfa_secrets(user_id);
CREATE INDEX idx_mfa_recovery_codes_user_id ON public.mfa_recovery_codes(user_id);
CREATE INDEX idx_mfa_recovery_codes_unused ON public.mfa_recovery_codes(user_id) WHERE is_used = false;

-- Enable RLS
ALTER TABLE public.mfa_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mfa_recovery_codes ENABLE ROW LEVEL SECURITY;

-- RLS policies pour mfa_secrets
CREATE POLICY "Users can view their own MFA status"
ON public.mfa_secrets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own MFA secret"
ON public.mfa_secrets FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own MFA settings"
ON public.mfa_secrets FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own MFA settings"
ON public.mfa_secrets FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies pour mfa_recovery_codes
CREATE POLICY "Users can view their own recovery codes"
ON public.mfa_recovery_codes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recovery codes"
ON public.mfa_recovery_codes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recovery codes"
ON public.mfa_recovery_codes FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recovery codes"
ON public.mfa_recovery_codes FOR DELETE
USING (auth.uid() = user_id);

-- Trigger pour updated_at
CREATE TRIGGER update_mfa_secrets_updated_at
BEFORE UPDATE ON public.mfa_secrets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table pour logs MFA (audit)
CREATE TABLE public.mfa_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL,
  ip_address text,
  user_agent text,
  success boolean DEFAULT true,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_mfa_audit_logs_user_id ON public.mfa_audit_logs(user_id);
CREATE INDEX idx_mfa_audit_logs_created_at ON public.mfa_audit_logs(created_at);

ALTER TABLE public.mfa_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own MFA logs"
ON public.mfa_audit_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own MFA logs"
ON public.mfa_audit_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);