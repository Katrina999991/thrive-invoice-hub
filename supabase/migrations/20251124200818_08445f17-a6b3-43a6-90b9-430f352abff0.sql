-- Update existing services to use 'hour' as unit instead of 'piece'
UPDATE products 
SET unit = 'hour'
WHERE quantity IS NULL AND unit = 'piece';