DROP FUNCTION IF EXISTS public.get_member_display_info(uuid[]);

CREATE OR REPLACE FUNCTION public.get_member_display_info(_user_ids uuid[])
 RETURNS TABLE(user_id uuid, display_name text, username text, email text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
BEGIN
  RETURN QUERY
  SELECT p.user_id, p.display_name, p.username, u.email::text
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.user_id
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
$function$;