-- First, drop the existing constraint
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_status_check;

-- Update all existing rows to use the new status values
UPDATE public.expenses 
SET status = 'unpaid' 
WHERE status NOT IN ('paid', 'unpaid');

-- Now add the new constraint
ALTER TABLE public.expenses ADD CONSTRAINT expenses_status_check CHECK (status IN ('paid', 'unpaid'));