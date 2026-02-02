-- Ultimate fix: Disable RLS temporarily on company_roles for the SECURITY DEFINER function
-- Or better: use a completely different approach - check role by ID pattern

-- First, let's see what policies exist and drop ALL of them
DROP POLICY IF EXISTS "Members can view company roles" ON public.company_roles;
DROP POLICY IF EXISTS "Admins can insert company roles" ON public.company_roles;
DROP POLICY IF EXISTS "Admins can update non-system company roles" ON public.company_roles;
DROP POLICY IF EXISTS "Admins can delete non-system company roles" ON public.company_roles;
DROP POLICY IF EXISTS "Members can view role permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Admins can insert role permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Admins can delete role permissions" ON public.role_permissions;

-- The core issue: SECURITY DEFINER functions still respect RLS unless we use specific techniques
-- Solution: Create functions that explicitly bypass RLS by setting role to postgres

-- Drop existing helper functions
DROP FUNCTION IF EXISTS public.get_user_role_name_in_company(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_company_admin_or_owner(uuid, uuid);

-- Create a function that truly bypasses RLS by using a direct table access pattern
-- We'll check company_members only (which has simpler RLS) and use role_id to get role name
-- from an unprotected query

CREATE OR REPLACE FUNCTION public.check_user_is_admin_or_owner(_company_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
-- This is the key: set role to bypass RLS
SET row_security = off
AS $$
DECLARE
  v_role_name text;
BEGIN
  SELECT cr.name INTO v_role_name
  FROM public.company_members cm
  JOIN public.company_roles cr ON cr.id = cm.role_id
  WHERE cm.company_id = _company_id
    AND cm.user_id = _user_id
    AND cm.status = 'active'
  LIMIT 1;
  
  RETURN COALESCE(v_role_name IN ('Owner', 'Admin'), false);
END;
$$;

-- Create a function to check membership that bypasses RLS
CREATE OR REPLACE FUNCTION public.check_user_is_member(_company_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.company_members
    WHERE company_id = _company_id
      AND user_id = _user_id
      AND status = 'active'
  );
END;
$$;

-- Create a function to get company_id from role_id that bypasses RLS
CREATE OR REPLACE FUNCTION public.get_role_company_id_safe(_role_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  SELECT company_id INTO v_company_id
  FROM public.company_roles
  WHERE id = _role_id;
  
  RETURN v_company_id;
END;
$$;

-- Now create simple policies using these RLS-bypassing functions

-- company_roles policies
CREATE POLICY "Members can view company roles"
ON public.company_roles
FOR SELECT
TO authenticated
USING (
  public.check_user_is_member(company_id, auth.uid())
);

CREATE POLICY "Admins can insert company roles"
ON public.company_roles
FOR INSERT
TO authenticated
WITH CHECK (
  is_system = false
  AND public.check_user_is_admin_or_owner(company_id, auth.uid())
);

CREATE POLICY "Admins can update non-system company roles"
ON public.company_roles
FOR UPDATE
TO authenticated
USING (
  is_system = false
  AND public.check_user_is_admin_or_owner(company_id, auth.uid())
)
WITH CHECK (
  is_system = false
  AND public.check_user_is_admin_or_owner(company_id, auth.uid())
);

CREATE POLICY "Admins can delete non-system company roles"
ON public.company_roles
FOR DELETE
TO authenticated
USING (
  is_system = false
  AND public.check_user_is_admin_or_owner(company_id, auth.uid())
);

-- role_permissions policies
CREATE POLICY "Members can view role permissions"
ON public.role_permissions
FOR SELECT
TO authenticated
USING (
  public.check_user_is_member(public.get_role_company_id_safe(role_id), auth.uid())
);

CREATE POLICY "Admins can insert role permissions"
ON public.role_permissions
FOR INSERT
TO authenticated
WITH CHECK (
  public.check_user_is_admin_or_owner(public.get_role_company_id_safe(role_id), auth.uid())
);

CREATE POLICY "Admins can delete role permissions"
ON public.role_permissions
FOR DELETE
TO authenticated
USING (
  public.check_user_is_admin_or_owner(public.get_role_company_id_safe(role_id), auth.uid())
);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_user_is_admin_or_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_is_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_role_company_id_safe(uuid) TO authenticated;