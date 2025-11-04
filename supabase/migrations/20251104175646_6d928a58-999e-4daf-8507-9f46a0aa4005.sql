-- Create trigger to decrement expense usage counter when an expense is deleted
CREATE OR REPLACE FUNCTION public.decrement_expense_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Decrement expense counter
  UPDATE public.user_subscriptions
  SET expenses_this_month = GREATEST(expenses_this_month - 1, 0)
  WHERE user_id = OLD.user_id;
  
  RETURN OLD;
END;
$$;

CREATE TRIGGER trigger_decrement_expense_usage
  AFTER DELETE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_expense_usage();

-- Create trigger to decrement invoice usage counter when an invoice is deleted
CREATE OR REPLACE FUNCTION public.decrement_invoice_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Decrement invoice counter
  UPDATE public.user_subscriptions
  SET invoices_this_month = GREATEST(invoices_this_month - 1, 0)
  WHERE user_id = OLD.user_id;
  
  RETURN OLD;
END;
$$;

CREATE TRIGGER trigger_decrement_invoice_usage
  AFTER DELETE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_invoice_usage();

-- Fix current user's expense count (fc734b6d-9125-48e9-85c3-08fc9781504b has 3 expenses but counter shows 6)
UPDATE public.user_subscriptions
SET expenses_this_month = (
  SELECT COUNT(*) 
  FROM public.expenses 
  WHERE expenses.user_id = user_subscriptions.user_id
    AND EXTRACT(YEAR FROM expenses.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
    AND EXTRACT(MONTH FROM expenses.created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
)
WHERE user_id = 'fc734b6d-9125-48e9-85c3-08fc9781504b';