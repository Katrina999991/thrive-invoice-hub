-- Add separate address fields to companies table
ALTER TABLE public.companies 
ADD COLUMN street_address TEXT,
ADD COLUMN city TEXT,
ADD COLUMN province_state TEXT,
ADD COLUMN postal_code TEXT,
ADD COLUMN country TEXT DEFAULT 'Canada';

-- Update existing data by parsing the address field if it exists
UPDATE public.companies 
SET street_address = address, 
    country = 'Canada'
WHERE address IS NOT NULL AND address != '';

-- Add comment for clarity
COMMENT ON COLUMN public.companies.street_address IS 'Street address (street number and name)';
COMMENT ON COLUMN public.companies.city IS 'City name';
COMMENT ON COLUMN public.companies.province_state IS 'Province (Canada) or State (US)';
COMMENT ON COLUMN public.companies.postal_code IS 'Postal code or ZIP code';
COMMENT ON COLUMN public.companies.country IS 'Country name';