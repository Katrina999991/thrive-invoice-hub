-- Add taxes column to products table
ALTER TABLE public.products 
ADD COLUMN taxes jsonb DEFAULT '[]'::jsonb;

-- Add comment to explain the taxes column
COMMENT ON COLUMN public.products.taxes IS 'Array of tax objects with name and percentage fields, e.g., [{"name": "GST", "percentage": 5}, {"name": "PST", "percentage": 7}]';

-- Add validation function for product taxes (similar to company taxes)
CREATE OR REPLACE FUNCTION public.validate_product_taxes()
RETURNS trigger
LANGUAGE plpgsql
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

-- Create trigger for product taxes validation
CREATE TRIGGER validate_product_taxes_trigger
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.validate_product_taxes();