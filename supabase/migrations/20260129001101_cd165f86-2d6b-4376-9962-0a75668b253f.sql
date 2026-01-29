-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Block anonymous profile access" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles of company members" ON public.profiles;

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Allow Owners to view profiles of members in their companies
CREATE POLICY "Owners can view company member profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM public.company_members cm_owner
    JOIN public.company_roles cr ON cr.id = cm_owner.role_id
    JOIN public.company_members cm_target ON cm_target.company_id = cm_owner.company_id
    WHERE cm_owner.user_id = auth.uid()
      AND cm_owner.status = 'active'
      AND cr.name = 'Owner'
      AND cr.is_system = true
      AND cm_target.user_id = profiles.user_id
      AND cm_target.status = 'active'
  )
);