-- Create trigger to increment invoice usage counter when a new invoice is created
CREATE TRIGGER trigger_increment_invoice_usage
  AFTER INSERT ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_invoice_usage();

-- Create trigger to increment expense usage counter when a new expense is created
CREATE TRIGGER trigger_increment_expense_usage
  AFTER INSERT ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_expense_usage();