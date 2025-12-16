-- Create quotes table
CREATE TABLE public.quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  quote_number TEXT NOT NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  terms TEXT,
  converted_to_invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  converted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quote_items table
CREATE TABLE public.quote_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  product_taxes JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on quotes
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- RLS policies for quotes
CREATE POLICY "Users can view their own quotes" 
ON public.quotes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own quotes" 
ON public.quotes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quotes" 
ON public.quotes 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quotes" 
ON public.quotes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Enable RLS on quote_items
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for quote_items (based on quote ownership)
CREATE POLICY "Users can view quote items for their quotes" 
ON public.quote_items 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.quotes 
  WHERE quotes.id = quote_items.quote_id 
  AND quotes.user_id = auth.uid()
));

CREATE POLICY "Users can create quote items for their quotes" 
ON public.quote_items 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.quotes 
  WHERE quotes.id = quote_items.quote_id 
  AND quotes.user_id = auth.uid()
));

CREATE POLICY "Users can update quote items for their quotes" 
ON public.quote_items 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.quotes 
  WHERE quotes.id = quote_items.quote_id 
  AND quotes.user_id = auth.uid()
));

CREATE POLICY "Users can delete quote items for their quotes" 
ON public.quote_items 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.quotes 
  WHERE quotes.id = quote_items.quote_id 
  AND quotes.user_id = auth.uid()
));

-- Add triggers for updated_at
CREATE TRIGGER update_quotes_updated_at
BEFORE UPDATE ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quote_items_updated_at
BEFORE UPDATE ON public.quote_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add quotes feature to subscription_plans
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS quotes_enabled BOOLEAN NOT NULL DEFAULT false;

-- Update plans: quotes enabled for premium and pro only
UPDATE public.subscription_plans SET quotes_enabled = false WHERE plan_type = 'free';
UPDATE public.subscription_plans SET quotes_enabled = true WHERE plan_type = 'premium';
UPDATE public.subscription_plans SET quotes_enabled = true WHERE plan_type = 'pro';

-- Function to generate quote number
CREATE OR REPLACE FUNCTION public.generate_quote_number(company_id uuid)
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
  -- Get company settings
  SELECT invoice_prefix, invoice_digits
  INTO company_record
  FROM public.companies
  WHERE id = company_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Company not found';
  END IF;
  
  -- Count existing quotes for this user's company to get next number
  SELECT COALESCE(MAX(
    CASE 
      WHEN quote_number ~ '^DEV-[0-9]+$' THEN 
        CAST(SUBSTRING(quote_number FROM 5) AS INTEGER)
      ELSE 0 
    END
  ), 0) + 1 INTO next_number
  FROM public.quotes q
  JOIN public.clients c ON q.client_id = c.id
  WHERE c.company_id = company_id;
  
  -- Format the number with leading zeros
  formatted_number := LPAD(next_number::TEXT, COALESCE(company_record.invoice_digits, 3), '0');
  
  -- Return the formatted quote number with DEV prefix
  RETURN 'DEV-' || formatted_number;
END;
$function$;