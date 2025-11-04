-- Drop the duplicate trigger (old one)
DROP TRIGGER IF EXISTS track_expense_usage ON public.expenses;

-- Also drop the duplicate invoice trigger if it exists
DROP TRIGGER IF EXISTS track_invoice_usage ON public.invoices;

-- Fix the current user's expense count (should be 4, not 5)
UPDATE public.user_subscriptions
SET expenses_this_month = 4
WHERE user_id = 'fc734b6d-9125-48e9-85c3-08fc9781504b' AND expenses_this_month = 5;