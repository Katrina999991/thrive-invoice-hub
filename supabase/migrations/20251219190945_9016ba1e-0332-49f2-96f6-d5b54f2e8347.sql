-- Add is_archived column to expenses table
ALTER TABLE public.expenses 
ADD COLUMN is_archived boolean NOT NULL DEFAULT false;

-- Create an index for faster filtering
CREATE INDEX idx_expenses_is_archived ON public.expenses(is_archived);