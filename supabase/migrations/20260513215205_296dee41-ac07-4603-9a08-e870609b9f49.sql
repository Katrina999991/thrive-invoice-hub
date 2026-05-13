-- 1) PROFILES: drop overly broad Owner policy that exposed sensitive cols
DROP POLICY IF EXISTS "Owners can view company member profiles" ON public.profiles;

-- New SECURITY DEFINER RPC returning only safe display fields for co-members
CREATE OR REPLACE FUNCTION public.get_member_display_info(_user_ids uuid[])
RETURNS TABLE(user_id uuid, display_name text, username text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  RETURN QUERY
  SELECT p.user_id, p.display_name, p.username
  FROM public.profiles p
  WHERE p.user_id = ANY(_user_ids)
    AND (
      p.user_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.company_members cm_self
        JOIN public.company_members cm_other
          ON cm_other.company_id = cm_self.company_id
        WHERE cm_self.user_id = auth.uid()
          AND cm_self.status = 'active'
          AND cm_other.user_id = p.user_id
          AND cm_other.status = 'active'
      )
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_member_display_info(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_member_display_info(uuid[]) TO authenticated;

-- 2) COMPANY_SUBSCRIPTIONS: lock UPDATE to service_role only
DROP POLICY IF EXISTS "Company admins can update subscription" ON public.company_subscriptions;

-- 3) ROLE_PERMISSIONS: drop the global SELECT policy (qual:true)
DROP POLICY IF EXISTS "Authenticated users can view permissions" ON public.role_permissions;