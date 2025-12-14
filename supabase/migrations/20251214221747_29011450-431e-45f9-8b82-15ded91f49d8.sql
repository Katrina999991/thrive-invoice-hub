-- Create a function to check username availability that bypasses RLS
CREATE OR REPLACE FUNCTION public.check_username_available(check_username text, current_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_user_id uuid;
BEGIN
  -- Return true if username is null or empty
  IF check_username IS NULL OR trim(check_username) = '' THEN
    RETURN true;
  END IF;
  
  -- Check if username exists for a different user
  SELECT user_id INTO existing_user_id
  FROM public.profiles
  WHERE username = trim(check_username);
  
  -- Available if no user found OR if the found user is the current user
  RETURN existing_user_id IS NULL OR existing_user_id = current_user_id;
END;
$$;