-- Update Pro plan prices
UPDATE subscription_plans 
SET 
  monthly_price = 29.99,
  yearly_price = 299.00,
  updated_at = now()
WHERE plan_type = 'pro';