
-- Add taxes field to companies table to store 1-2 taxes with name and percentage
ALTER TABLE public.companies 
ADD COLUMN taxes JSONB DEFAULT '[]'::jsonb;

-- Add a constraint to ensure maximum 2 taxes
ALTER TABLE public.companies 
ADD CONSTRAINT companies_max_two_taxes 
CHECK (jsonb_array_length(taxes) <= 2);

-- Add a constraint to ensure each tax has name and percentage
ALTER TABLE public.companies 
ADD CONSTRAINT companies_taxes_structure 
CHECK (
  taxes = '[]'::jsonb OR 
  (
    jsonb_typeof(taxes) = 'array' AND
    (
      SELECT bool_and(
        jsonb_typeof(tax) = 'object' AND
        tax ? 'name' AND
        tax ? 'percentage' AND
        jsonb_typeof(tax->'name') = 'string' AND
        jsonb_typeof(tax->'percentage') = 'number'
      )
      FROM jsonb_array_elements(taxes) AS tax
    )
  )
);
