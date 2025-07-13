-- Create function to handle invoice numbering changes
CREATE OR REPLACE FUNCTION public.handle_invoice_numbering_changes()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger to automatically reset current invoice number when settings change
CREATE TRIGGER update_invoice_numbering_on_settings_change
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_invoice_numbering_changes();