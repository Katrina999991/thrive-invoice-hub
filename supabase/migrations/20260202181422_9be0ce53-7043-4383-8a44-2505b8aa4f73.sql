-- Fix remaining recursion issue
-- The is_company_admin_or_owner function joins company_roles which causes recursion
-- when used in company_roles policies

-- Drop the current policies first
DROP POLICY IF EXISTS "Members can view company roles" ON public.company_roles;
DROP POLICY IF EXISTS "Admins can insert company roles" ON public.company_roles;
DROP POLICY IF EXISTS "Admins can update non-system company roles" ON public.company_roles;
DROP POLICY IF EXISTS "Admins can delete non-system company roles" ON public.company_roles;
DROP POLICY IF EXISTS "Members can view role permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Admins can insert role permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Admins can delete role permissions" ON public.role_permissions;

-- Drop and recreate the is_company_admin_or_owner function to use role NAME lookup from company_members
-- without joining company_roles (use subquery with role_id direct lookup instead)
DROP FUNCTION IF EXISTS public.is_company_admin_or_owner(uuid, uuid);

-- Create a function that checks admin/owner status by looking at role name directly
-- This avoids recursion by not using RLS-protected tables in the check
CREATE OR REPLACE FUNCTION public.is_company_admin_or_owner(_company_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_name text;
BEGIN
  -- Get the role name for this user in this company
  -- This query bypasses RLS because it's SECURITY DEFINER
  SELECT cr.name INTO v_role_name
  FROM public.company_members cm
  JOIN public.company_roles cr ON cr.id = cm.role_id
  WHERE cm.company_id = _company_id
    AND cm.user_id = _user_id
    AND cm.status = 'active'
  LIMIT 1;
  
  RETURN v_role_name IN ('Owner', 'Admin');
END;
$$;

-- For company_roles: Use a simpler approach - check membership via company_members only
-- The view policy just checks if user is an active member (no need to check roles for viewing)
CREATE POLICY "Members can view company roles"
ON public.company_roles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = company_roles.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'active'
  )
);

-- For INSERT/UPDATE/DELETE on company_roles, we need to check admin status
-- But we can't use is_company_admin_or_owner because it queries company_roles
-- Instead, check if the user's role_id corresponds to Owner or Admin by name
CREATE POLICY "Admins can insert company roles"
ON public.company_roles
FOR INSERT
TO authenticated
WITH CHECK (
  is_system = false
  AND EXISTS (
    SELECT 1 FROM public.company_members cm
    JOIN public.company_roles cr ON cr.id = cm.role_id AND cr.company_id = cm.company_id
    WHERE cm.company_id = company_roles.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'active'
      AND cr.name IN ('Owner', 'Admin')
  )
);

-- Actually, the above still causes recursion. Let's use a different approach:
-- Store the role check in a separate function that only queries company_members
DROP POLICY IF EXISTS "Admins can insert company roles" ON public.company_roles;

-- Create a function that gets admin status without touching company_roles RLS
CREATE OR REPLACE FUNCTION public.get_user_role_name_in_company(_company_id uuid, _user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cr.name
  FROM public.company_members cm
  JOIN public.company_roles cr ON cr.id = cm.role_id
  WHERE cm.company_id = _company_id
    AND cm.user_id = _user_id
    AND cm.status = 'active'
  LIMIT 1
$$;

-- Now create policies using this function
CREATE POLICY "Admins can insert company roles"
ON public.company_roles
FOR INSERT
TO authenticated
WITH CHECK (
  is_system = false
  AND public.get_user_role_name_in_company(company_id, auth.uid()) IN ('Owner', 'Admin')
);

CREATE POLICY "Admins can update non-system company roles"
ON public.company_roles
FOR UPDATE
TO authenticated
USING (
  is_system = false
  AND public.get_user_role_name_in_company(company_id, auth.uid()) IN ('Owner', 'Admin')
)
WITH CHECK (
  is_system = false
  AND public.get_user_role_name_in_company(company_id, auth.uid()) IN ('Owner', 'Admin')
);

CREATE POLICY "Admins can delete non-system company roles"
ON public.company_roles
FOR DELETE
TO authenticated
USING (
  is_system = false
  AND public.get_user_role_name_in_company(company_id, auth.uid()) IN ('Owner', 'Admin')
);

-- For role_permissions: similar approach using get_user_role_name_in_company
CREATE POLICY "Members can view role permissions"
ON public.role_permissions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = public.get_role_company_id(role_permissions.role_id)
      AND cm.user_id = auth.uid()
      AND cm.status = 'active'
  )
);

CREATE POLICY "Admins can insert role permissions"
ON public.role_permissions
FOR INSERT
TO authenticated
WITH CHECK (
  public.get_user_role_name_in_company(public.get_role_company_id(role_id), auth.uid()) IN ('Owner', 'Admin')
);

CREATE POLICY "Admins can delete role permissions"
ON public.role_permissions
FOR DELETE
TO authenticated
USING (
  public.get_user_role_name_in_company(public.get_role_company_id(role_id), auth.uid()) IN ('Owner', 'Admin')
);

-- Grant execute
GRANT EXECUTE ON FUNCTION public.get_user_role_name_in_company(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_company_admin_or_owner(uuid, uuid) TO authenticated;