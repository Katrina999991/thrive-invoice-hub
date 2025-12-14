-- Update Premium plan to have unlimited clients and invoices
UPDATE subscription_plans 
SET 
  max_clients = NULL, 
  max_invoices_per_month = NULL, 
  updated_at = now()
WHERE plan_type = 'premium';