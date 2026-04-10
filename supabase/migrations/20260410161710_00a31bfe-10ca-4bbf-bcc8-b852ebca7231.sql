
CREATE OR REPLACE FUNCTION public.create_company_invite(
  _company_id uuid,
  _email text,
  _role_id uuid,
  _invited_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invite_id uuid;
  v_token text;
  v_expires_at timestamptz;
  v_caller_id uuid := auth.uid();
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.has_permission(v_caller_id, _company_id, 'access:invite') THEN
    RAISE EXCEPTION 'Access denied: missing access:invite permission';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.company_roles
    WHERE id = _role_id AND company_id = _company_id
  ) THEN
    RAISE EXCEPTION 'Invalid role for this company';
  END IF;

  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM public.company_members cm
    JOIN auth.users u ON u.id = cm.user_id
    WHERE cm.company_id = _company_id
      AND u.email = _email
      AND cm.status = 'active'
  ) THEN
    RAISE EXCEPTION 'This user is already a member of this company';
  END IF;

  -- Delete old expired or accepted invites to avoid unique constraint violation
  DELETE FROM public.company_invites
  WHERE company_id = _company_id
    AND email = _email
    AND (accepted_at IS NOT NULL OR expires_at <= now());

  -- Check for existing active pending invite
  IF EXISTS (
    SELECT 1 FROM public.company_invites
    WHERE company_id = _company_id
      AND email = _email
      AND accepted_at IS NULL
      AND expires_at > now()
  ) THEN
    RAISE EXCEPTION 'An active invitation already exists for this email';
  END IF;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_expires_at := now() + interval '7 days';

  INSERT INTO public.company_invites (company_id, email, role_id, token, invited_by, expires_at)
  VALUES (_company_id, _email, _role_id, v_token, _invited_by, v_expires_at)
  RETURNING id INTO v_invite_id;

  RETURN jsonb_build_object(
    'id', v_invite_id,
    'token', v_token,
    'email', _email,
    'expires_at', v_expires_at
  );
END;
$$;
