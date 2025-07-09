-- First, check current constraint and drop it
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_status_check;

-- Add new constraint for the simplified status values
ALTER TABLE public.expenses ADD CONSTRAINT expenses_status_check CHECK (status IN ('paid', 'unpaid'));

-- Now update existing expenses status from approval workflow to payment status
UPDATE public.expenses 
SET status = CASE 
  WHEN status = 'approved' THEN 'paid'
  WHEN status = 'pending' THEN 'unpaid'
  WHEN status = 'rejected' THEN 'unpaid'
  ELSE 'unpaid'
END;