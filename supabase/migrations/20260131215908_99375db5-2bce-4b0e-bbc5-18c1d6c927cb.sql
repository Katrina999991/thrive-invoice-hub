-- Add approval fields to time_entries table
ALTER TABLE public.time_entries
ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN approved_by UUID DEFAULT NULL REFERENCES auth.users(id);

-- Add approval fields to expenses table
ALTER TABLE public.expenses
ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN approved_by UUID DEFAULT NULL REFERENCES auth.users(id);

-- Create indexes for faster queries on approval status
CREATE INDEX idx_time_entries_approved_at ON public.time_entries(approved_at);
CREATE INDEX idx_expenses_approved_at ON public.expenses(approved_at);

-- RLS policy: Only users with time_tracking:approve permission can approve time entries
-- This is enforced via the existing RLS update policy combined with application logic

-- RLS policy: Only users with expenses:approve permission can approve expenses
-- This is enforced via the existing RLS update policy combined with application logic