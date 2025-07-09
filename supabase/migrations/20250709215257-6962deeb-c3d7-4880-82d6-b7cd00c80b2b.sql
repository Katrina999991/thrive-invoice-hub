-- Update existing expenses status from approval workflow to payment status
UPDATE public.expenses 
SET status = CASE 
  WHEN status = 'approved' THEN 'paid'
  WHEN status = 'pending' THEN 'unpaid'
  WHEN status = 'rejected' THEN 'unpaid'
  ELSE 'unpaid'
END;