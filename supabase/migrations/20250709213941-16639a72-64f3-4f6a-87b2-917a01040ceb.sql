-- Add invoice numbering settings to companies table
ALTER TABLE public.companies 
ADD COLUMN invoice_prefix TEXT DEFAULT 'INV',
ADD COLUMN invoice_digits INTEGER DEFAULT 3,
ADD COLUMN invoice_start_number INTEGER DEFAULT 1,
ADD COLUMN current_invoice_number INTEGER DEFAULT 1;

-- Create function to generate next invoice number for a company
CREATE OR REPLACE FUNCTION public.generate_invoice_number(company_id UUID)
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql;