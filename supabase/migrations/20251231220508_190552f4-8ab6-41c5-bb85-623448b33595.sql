-- Create table for storing learned category mappings
CREATE TABLE public.expense_category_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  mapping_type TEXT NOT NULL CHECK (mapping_type IN ('vendor', 'keyword')),
  key TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  usage_count INTEGER NOT NULL DEFAULT 1,
  last_used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (company_id, mapping_type, key)
);

-- Enable RLS
ALTER TABLE public.expense_category_mappings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own category mappings"
ON public.expense_category_mappings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own category mappings"
ON public.expense_category_mappings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own category mappings"
ON public.expense_category_mappings
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own category mappings"
ON public.expense_category_mappings
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_expense_category_mappings_updated_at
BEFORE UPDATE ON public.expense_category_mappings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_expense_category_mappings_company ON public.expense_category_mappings(company_id);
CREATE INDEX idx_expense_category_mappings_key ON public.expense_category_mappings(company_id, mapping_type, key);