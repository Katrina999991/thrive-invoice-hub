-- Fix infinite recursion in company_roles and role_permissions RLS policies
-- Step 1: Drop ALL dependent policies first

-- Drop policies on company_roles
DROP POLICY IF EXISTS "Company members can view their company roles" ON public.company_roles;
DROP POLICY IF EXISTS "Admins and owners can manage roles" ON public.company_roles;
DROP POLICY IF EXISTS "Users can view roles for their companies" ON public.company_roles;
DROP POLICY IF EXISTS "Only admins can create roles" ON public.company_roles;
DROP POLICY IF EXISTS "Only admins can update roles" ON public.company_roles;
DROP POLICY IF EXISTS "Only admins can delete non-system roles" ON public.company_roles;
DROP POLICY IF EXISTS "Members can view company roles" ON public.company_roles;
DROP POLICY IF EXISTS "Admins can insert company roles" ON public.company_roles;
DROP POLICY IF EXISTS "Admins can update non-system company roles" ON public.company_roles;
DROP POLICY IF EXISTS "Admins can delete non-system company roles" ON public.company_roles;

-- Drop policies on role_permissions
DROP POLICY IF EXISTS "Users can view permissions for roles in their companies" ON public.role_permissions;
DROP POLICY IF EXISTS "Admins can manage role permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Only admins can insert role permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Only admins can delete role permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Members can view role permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Admins can insert role permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Admins can delete role permissions" ON public.role_permissions;

-- Drop policies on companies that use is_company_member
DROP POLICY IF EXISTS "Company members can view companies" ON public.companies;

-- Drop policies on company_subscriptions that use is_company_member
DROP POLICY IF EXISTS "Company members can view their company subscription" ON public.company_subscriptions;

-- Step 2: Now we can safely drop and recreate the functions
DROP FUNCTION IF EXISTS public.is_company_member(uuid, uuid) CASCADE;

-- Create the helper function with correct parameter order (company first, user second)
CREATE OR REPLACE FUNCTION public.is_company_member(_company_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_members
    WHERE company_id = _company_id
      AND user_id = _user_id
      AND status = 'active'
  )
$$;

-- Create function to check if user is owner/admin of a company
CREATE OR REPLACE FUNCTION public.is_company_admin_or_owner(_company_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_members cm
    JOIN public.company_roles cr ON cm.role_id = cr.id
    WHERE cm.company_id = _company_id
      AND cm.user_id = _user_id
      AND cm.status = 'active'
      AND cr.name IN ('Owner', 'Admin')
  )
$$;

-- Step 3: Recreate policies for company_roles (non-recursive)
CREATE POLICY "Members can view company roles"
ON public.company_roles
FOR SELECT
TO authenticated
USING (
  public.is_company_member(company_id, auth.uid())
);

CREATE POLICY "Admins can insert company roles"
ON public.company_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_company_admin_or_owner(company_id, auth.uid())
  AND is_system = false
);

CREATE POLICY "Admins can update non-system company roles"
ON public.company_roles
FOR UPDATE
TO authenticated
USING (
  public.is_company_admin_or_owner(company_id, auth.uid())
  AND is_system = false
)
WITH CHECK (
  public.is_company_admin_or_owner(company_id, auth.uid())
  AND is_system = false
);

CREATE POLICY "Admins can delete non-system company roles"
ON public.company_roles
FOR DELETE
TO authenticated
USING (
  public.is_company_admin_or_owner(company_id, auth.uid())
  AND is_system = false
);

-- Step 4: Recreate policies for role_permissions (non-recursive)
CREATE POLICY "Members can view role permissions"
ON public.role_permissions
FOR SELECT
TO authenticated
USING (
  public.is_company_member(public.get_role_company_id(role_id), auth.uid())
);

CREATE POLICY "Admins can insert role permissions"
ON public.role_permissions
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_company_admin_or_owner(public.get_role_company_id(role_id), auth.uid())
);

CREATE POLICY "Admins can delete role permissions"
ON public.role_permissions
FOR DELETE
TO authenticated
USING (
  public.is_company_admin_or_owner(public.get_role_company_id(role_id), auth.uid())
);

-- Step 5: Recreate policies for companies table
CREATE POLICY "Company members can view companies"
ON public.companies
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR public.is_company_member(id, auth.uid())
);

-- Step 6: Recreate policies for company_subscriptions table
CREATE POLICY "Company members can view their company subscription"
ON public.company_subscriptions
FOR SELECT
TO authenticated
USING (
  public.is_company_member(company_id, auth.uid())
);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_company_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_company_admin_or_owner(uuid, uuid) TO authenticated;