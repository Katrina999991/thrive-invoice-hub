-- Update the validation function to accept both old and new tax formats
CREATE OR REPLACE FUNCTION public.validate_product_taxes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if taxes is valid
  IF NEW.taxes != '[]'::jsonb THEN
    -- Check if it's an array
    IF jsonb_typeof(NEW.taxes) != 'array' THEN
      RAISE EXCEPTION 'taxes must be an array';
    END IF;
    
    -- Check structure of each tax - accept both old and new formats
    IF NOT (
      SELECT bool_and(
        jsonb_typeof(tax) = 'object' AND
        tax ? 'name' AND
        jsonb_typeof(tax->'name') = 'string' AND
        (
          -- Old format: {name, percentage}
          (
            tax ? 'percentage' AND
            jsonb_typeof(tax->'percentage') = 'number'
          )
          OR
          -- New format: {name, type, value}
          (
            tax ? 'type' AND
            tax ? 'value' AND
            jsonb_typeof(tax->'type') = 'string' AND
            jsonb_typeof(tax->'value') = 'number' AND
            (tax->>'type' = 'percentage' OR tax->>'type' = 'amount')
          )
        )
      )
      FROM jsonb_array_elements(NEW.taxes) AS tax
    ) THEN
      RAISE EXCEPTION 'Each tax must have name (string) and either percentage (number) or type (percentage/amount) with value (number)';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;