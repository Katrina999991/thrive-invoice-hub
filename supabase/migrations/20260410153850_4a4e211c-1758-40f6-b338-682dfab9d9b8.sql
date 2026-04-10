
-- Drop the non-functional token header policy
DROP POLICY IF EXISTS "Anyone can view invite by token" ON public.company_invites;

-- Create a secure function to look up invite by token
CREATE OR REPLACE FUNCTION public.get_invite_by_token(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', ci.id,
    'email', ci.email,
    'expires_at', ci.expires_at,
    'accepted_at', ci.accepted_at,
    'company_name', c.name,
    'role_name', cr.name
  ) INTO v_result
  FROM public.company_invites ci
  JOIN public.companies c ON c.id = ci.company_id
  JOIN public.company_roles cr ON cr.id = ci.role_id
  WHERE ci.token = _token;
  
  RETURN v_result;
END;
$$;
