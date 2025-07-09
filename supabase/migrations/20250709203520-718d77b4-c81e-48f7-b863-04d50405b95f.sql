
-- Add taxes field to companies table to store 1-2 taxes with name and percentage
ALTER TABLE public.companies 
ADD COLUMN taxes JSONB DEFAULT '[]'::jsonb;

-- Add a constraint to ensure maximum 2 taxes
ALTER TABLE public.companies 
ADD CONSTRAINT companies_max_two_taxes 
CHECK (jsonb_array_length(taxes) <= 2);

-- Add a constraint to ensure each tax has name and percentage using triggers instead of subquery in CHECK
CREATE OR REPLACE FUNCTION validate_company_taxes()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger for validation
CREATE TRIGGER companies_taxes_validation
  BEFORE INSERT OR UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION validate_company_taxes();
