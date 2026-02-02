
-- Add debug permission to Owner and Admin roles
INSERT INTO role_permissions (role_id, permission)
SELECT cr.id, 'debug:permissions_read'
FROM company_roles cr
WHERE cr.name IN ('Owner', 'Admin') AND cr.is_system = true
ON CONFLICT (role_id, permission) DO NOTHING;

-- Create RPC function to get permissions for any user (requires debug permission)
CREATE OR REPLACE FUNCTION public.get_user_permissions_for_debug(
  _company_id uuid,
  _target_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_has_debug_permission boolean;
  v_target_membership record;
  v_permissions text[];
BEGIN
  -- Check if caller has debug permission
  v_has_debug_permission := public.has_permission(v_caller_id, _company_id, 'debug:permissions_read');
  
  IF NOT v_has_debug_permission THEN
    RETURN jsonb_build_object('error', 'missing_permission', 'message', 'You do not have permission to debug permissions');
  END IF;
  
  -- Get target user's membership info
  SELECT 
    cm.user_id,
    cm.status,
    cm.role_id,
    cr.name as role_name,
    cr.is_system
  INTO v_target_membership
  FROM public.company_members cm
  JOIN public.company_roles cr ON cr.id = cm.role_id
  WHERE cm.company_id = _company_id
    AND cm.user_id = _target_user_id;
  
  IF v_target_membership IS NULL THEN
    RETURN jsonb_build_object('error', 'not_a_member', 'message', 'Target user is not a member of this company');
  END IF;
  
  -- Get permissions for target user
  SELECT COALESCE(array_agg(rp.permission ORDER BY rp.permission), ARRAY[]::TEXT[])
  INTO v_permissions
  FROM public.role_permissions rp
  WHERE rp.role_id = v_target_membership.role_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', _target_user_id,
    'company_id', _company_id,
    'role_id', v_target_membership.role_id,
    'role_name', v_target_membership.role_name,
    'is_system_role', v_target_membership.is_system,
    'member_status', v_target_membership.status,
    'permissions', v_permissions
  );
END;
$$;

-- Create RPC function to list company members for debug dropdown
CREATE OR REPLACE FUNCTION public.get_company_members_for_debug(_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_has_debug_permission boolean;
  v_members jsonb;
BEGIN
  -- Check if caller has debug permission
  v_has_debug_permission := public.has_permission(v_caller_id, _company_id, 'debug:permissions_read');
  
  IF NOT v_has_debug_permission THEN
    RETURN jsonb_build_object('error', 'missing_permission', 'message', 'You do not have permission to debug permissions');
  END IF;
  
  -- Get all members of this company with their profile info
  SELECT jsonb_agg(
    jsonb_build_object(
      'user_id', cm.user_id,
      'role_name', cr.name,
      'status', cm.status,
      'display_name', COALESCE(p.display_name, u.email),
      'email', u.email
    )
    ORDER BY cr.name, COALESCE(p.display_name, u.email)
  )
  INTO v_members
  FROM public.company_members cm
  JOIN public.company_roles cr ON cr.id = cm.role_id
  LEFT JOIN public.profiles p ON p.user_id = cm.user_id
  LEFT JOIN auth.users u ON u.id = cm.user_id
  WHERE cm.company_id = _company_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'members', COALESCE(v_members, '[]'::jsonb)
  );
END;
$$;
