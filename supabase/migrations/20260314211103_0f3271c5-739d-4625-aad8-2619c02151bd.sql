
CREATE TABLE public.invoice_formal_notices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient TEXT,
  recipient_address TEXT,
  subject TEXT,
  body TEXT,
  due_at DATE,
  status TEXT NOT NULL DEFAULT 'draft',
  sent_at TIMESTAMP WITH TIME ZONE,
  sent_to TEXT,
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.invoice_formal_notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own formal notices"
  ON public.invoice_formal_notices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own formal notices"
  ON public.invoice_formal_notices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own formal notices"
  ON public.invoice_formal_notices FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own formal notices"
  ON public.invoice_formal_notices FOR DELETE
  USING (auth.uid() = user_id);
