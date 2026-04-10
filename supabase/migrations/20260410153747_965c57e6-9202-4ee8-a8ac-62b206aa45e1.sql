
-- =============================================
-- 1. COMPANY_INVITES: Fix public SELECT policy
-- =============================================
DROP POLICY IF EXISTS "Anyone can view invites by token" ON public.company_invites;

-- Authenticated users can see invites for their email
CREATE POLICY "Authenticated users can view own invites"
  ON public.company_invites
  FOR SELECT
  TO authenticated
  USING (email = public.get_current_user_email());

-- Anyone (including anon) can look up an invite by token (for accept-invite page)
CREATE POLICY "Anyone can view invite by token"
  ON public.company_invites
  FOR SELECT
  TO anon, authenticated
  USING (
    token = current_setting('request.headers', true)::json->>'x-invite-token'
    OR email = public.get_current_user_email()
  );

-- =============================================
-- 2. USER_SUBSCRIPTIONS: Remove user mutation policies
-- =============================================
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can delete their own subscription" ON public.user_subscriptions;

-- Only service_role can mutate subscriptions
CREATE POLICY "Service role can manage subscriptions"
  ON public.user_subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================
-- 3. COMPANY_SUBSCRIPTIONS: Fix open INSERT
-- =============================================
DROP POLICY IF EXISTS "System can insert subscriptions" ON public.company_subscriptions;

CREATE POLICY "Service role can insert subscriptions"
  ON public.company_subscriptions
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- =============================================
-- 4. COMPANY_ROLES: Remove overly permissive policies
-- =============================================
DROP POLICY IF EXISTS "Authenticated can insert roles" ON public.company_roles;
DROP POLICY IF EXISTS "Authenticated can delete non-system roles" ON public.company_roles;
DROP POLICY IF EXISTS "Authenticated can update non-system roles" ON public.company_roles;
DROP POLICY IF EXISTS "Authenticated users can view roles" ON public.company_roles;

-- 5. Fix the self-referential UPDATE policy bug
DROP POLICY IF EXISTS "Users can update roles with restrictions" ON public.company_roles;

CREATE POLICY "Users can update roles with restrictions"
  ON public.company_roles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM company_members cm
      JOIN role_permissions rp ON rp.role_id = cm.role_id
      WHERE cm.company_id = company_roles.company_id
        AND cm.user_id = auth.uid()
        AND cm.status = 'active'
        AND rp.permission = 'access:manage_roles'
    )
  )
  WITH CHECK (
    (NOT is_system OR public.is_company_owner(auth.uid(), company_id))
    AND is_system = (SELECT cr.is_system FROM public.company_roles cr WHERE cr.id = company_roles.id)
  );
