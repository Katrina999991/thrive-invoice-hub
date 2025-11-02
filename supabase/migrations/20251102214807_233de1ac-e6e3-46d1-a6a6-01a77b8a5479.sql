-- Fix 1: Restrict profiles table access
-- Remove the public read policy that allows anyone to view all profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Add a restricted policy: users can only view their own profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Fix 2: Add search_path to SECURITY DEFINER functions that are missing it
-- Update generate_invoice_number function
CREATE OR REPLACE FUNCTION public.generate_invoice_number(company_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  company_record RECORD;
  next_number INTEGER;
  formatted_number TEXT;
BEGIN
  -- Get company settings and current number
  SELECT invoice_prefix, invoice_digits, current_invoice_number
  INTO company_record
  FROM public.companies
  WHERE id = company_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Company not found';
  END IF;
  
  -- Get the next number
  next_number := company_record.current_invoice_number;
  
  -- Format the number with leading zeros
  formatted_number := LPAD(next_number::TEXT, company_record.invoice_digits, '0');
  
  -- Update the current number for next time
  UPDATE public.companies 
  SET current_invoice_number = current_invoice_number + 1 
  WHERE id = company_id;
  
  -- Return the formatted invoice number
  RETURN company_record.invoice_prefix || '-' || formatted_number;
END;
$function$;

-- Update validate_company_taxes function
CREATE OR REPLACE FUNCTION public.validate_company_taxes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- Update handle_invoice_numbering_changes function
CREATE OR REPLACE FUNCTION public.handle_invoice_numbering_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Check if invoice numbering settings changed
  IF (OLD.invoice_prefix IS DISTINCT FROM NEW.invoice_prefix) OR
     (OLD.invoice_digits IS DISTINCT FROM NEW.invoice_digits) OR
     (OLD.invoice_start_number IS DISTINCT FROM NEW.invoice_start_number) THEN
    
    -- Reset current_invoice_number to the new start number when settings change
    NEW.current_invoice_number := COALESCE(NEW.invoice_start_number, 1);
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;