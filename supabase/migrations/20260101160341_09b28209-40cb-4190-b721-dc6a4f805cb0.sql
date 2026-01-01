-- Add expense_tax_handling setting to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS expense_tax_handling TEXT DEFAULT 'auto' 
CHECK (expense_tax_handling IN ('auto', 'always', 'never'));

-- Add new fields to expenses table for tax audit/tracking
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS original_receipt_total NUMERIC,
ADD COLUMN IF NOT EXISTS tax_auto_source TEXT,
ADD COLUMN IF NOT EXISTS tax_user_overridden BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.companies.expense_tax_handling IS 'Controls automatic tax splitting from receipt scans: auto (default), always, never';
COMMENT ON COLUMN public.expenses.original_receipt_total IS 'Original total amount from receipt for audit purposes';
COMMENT ON COLUMN public.expenses.tax_auto_source IS 'Source of auto-populated taxes: receipt, calculated, or null';
COMMENT ON COLUMN public.expenses.tax_user_overridden IS 'Whether user manually modified auto-populated taxes';