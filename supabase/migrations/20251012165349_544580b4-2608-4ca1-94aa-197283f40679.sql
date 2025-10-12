-- Fix security issue: Set search_path for validate_product_taxes function
CREATE OR REPLACE FUNCTION public.validate_product_taxes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if taxes is valid
  IF NEW.taxes != '[]'::jsonb THEN
    -- Check if it's an array
    IF jsonb_typeof(NEW.taxes) != 'array' THEN
      RAISE EXCEPTION 'taxes must be an array';
    END IF;
    
    -- Check structure of each tax
    IF NOT (
      SELECT bool_and(
        jsonb_typeof(tax) = 'object' AND
        tax ? 'name' AND
        tax ? 'percentage' AND
        jsonb_typeof(tax->'name') = 'string' AND
        jsonb_typeof(tax->'percentage') = 'number'
      )
      FROM jsonb_array_elements(NEW.taxes) AS tax
    ) THEN
      RAISE EXCEPTION 'Each tax must have name (string) and percentage (number)';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;