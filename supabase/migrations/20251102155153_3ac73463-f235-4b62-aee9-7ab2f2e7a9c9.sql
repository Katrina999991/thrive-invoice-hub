-- Add recovery_email column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN recovery_email text;

-- Add a comment to describe the column
COMMENT ON COLUMN public.profiles.recovery_email IS 'Secondary email address for account recovery';