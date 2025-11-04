-- Add password change required field to profiles
ALTER TABLE public.profiles 
ADD COLUMN password_change_required boolean NOT NULL DEFAULT false;

-- Set password change required for all existing users
UPDATE public.profiles 
SET password_change_required = true
WHERE created_at < NOW();

-- Create function to mark new users as not requiring password change
CREATE OR REPLACE FUNCTION public.handle_new_user_password_policy()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- New users don't need to change password
  NEW.password_change_required := false;
  RETURN NEW;
END;
$$;

-- Create trigger for new user profile inserts
CREATE TRIGGER on_profile_created_password_policy
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_password_policy();