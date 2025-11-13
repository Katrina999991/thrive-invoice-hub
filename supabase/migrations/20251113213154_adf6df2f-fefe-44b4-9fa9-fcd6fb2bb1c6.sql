-- Add company_id column to expenses table
ALTER TABLE public.expenses
ADD COLUMN company_id uuid REFERENCES public.companies(id);

-- Add index for better query performance
CREATE INDEX idx_expenses_company_id ON public.expenses(company_id);