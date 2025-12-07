-- Drop the restrictive policies that don't work properly
DROP POLICY IF EXISTS "Block anonymous access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Block anonymous access to companies" ON public.companies;

-- Add policies to block anonymous access to invoices
CREATE POLICY "Block anonymous access to invoices" 
ON public.invoices 
FOR SELECT 
TO anon
USING (false);

-- Add policies to block anonymous access to invoice_reminder_logs
CREATE POLICY "Block anonymous access to invoice_reminder_logs" 
ON public.invoice_reminder_logs 
FOR SELECT 
TO anon
USING (false);

-- Add UPDATE and DELETE policies for invoice_reminder_logs
CREATE POLICY "Users can update their own reminder logs" 
ON public.invoice_reminder_logs 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reminder logs" 
ON public.invoice_reminder_logs 
FOR DELETE 
USING (auth.uid() = user_id);