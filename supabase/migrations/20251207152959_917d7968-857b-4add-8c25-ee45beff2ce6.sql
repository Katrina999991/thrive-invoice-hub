-- Block anonymous access to profiles table
CREATE POLICY "Block anonymous access to profiles" 
ON public.profiles 
FOR SELECT 
TO anon
USING (false);

-- Block anonymous access to companies table
CREATE POLICY "Block anonymous access to companies" 
ON public.companies 
FOR SELECT 
TO anon
USING (false);