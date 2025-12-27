-- Remove the conflicting restrictive policies that block all access
DROP POLICY IF EXISTS "Block anonymous access to invoices" ON public.invoices;
DROP POLICY IF EXISTS "Block anonymous access to invoice_reminder_logs" ON public.invoice_reminder_logs;