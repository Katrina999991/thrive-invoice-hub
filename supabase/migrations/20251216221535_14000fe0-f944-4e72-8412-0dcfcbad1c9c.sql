-- Fix security issue #1: Block anonymous access to profiles
-- Add explicit policy to block anonymous/unauthenticated access
CREATE POLICY "Block anonymous profile access" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Drop the old policy that might allow broader access
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Fix security issue #2: Remove overly permissive quote access policy
-- The edge function uses service role key, so this policy is not needed
-- and exposes ALL quotes with tokens instead of just the requested one
DROP POLICY IF EXISTS "Anyone can view quotes by access token" ON public.quotes;