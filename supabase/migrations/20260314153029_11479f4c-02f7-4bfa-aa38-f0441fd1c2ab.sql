
-- Create report_recipients table for saving report email recipients per company
CREATE TABLE public.report_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.report_recipients ENABLE ROW LEVEL SECURITY;

-- RLS policies: company owner can manage, company members can view
CREATE POLICY "Users can view their own report recipients"
  ON public.report_recipients FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own report recipients"
  ON public.report_recipients FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own report recipients"
  ON public.report_recipients FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own report recipients"
  ON public.report_recipients FOR DELETE
  USING (auth.uid() = user_id);

-- Company members can also view recipients for their company
CREATE POLICY "Company members can view report recipients"
  ON public.report_recipients FOR SELECT
  USING (
    company_id IS NOT NULL 
    AND is_company_member(company_id, auth.uid())
  );
