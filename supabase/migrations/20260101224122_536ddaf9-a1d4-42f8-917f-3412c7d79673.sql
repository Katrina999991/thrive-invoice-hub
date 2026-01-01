-- Create table to log product update emails
CREATE TABLE public.product_update_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL DEFAULT gen_random_uuid(),
  subject_fr TEXT,
  subject_en TEXT,
  title_fr TEXT,
  title_en TEXT,
  content_fr TEXT,
  content_en TEXT,
  recipient_email TEXT NOT NULL,
  recipient_user_id UUID NOT NULL,
  recipient_language TEXT NOT NULL DEFAULT 'en',
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_update_logs ENABLE ROW LEVEL SECURITY;

-- Only admin can view logs (we'll use service role in edge function to insert)
-- For now, allow the specific admin user to view
CREATE POLICY "Admin can view product update logs"
ON public.product_update_logs
FOR SELECT
USING (auth.uid() = 'e6c5ca56-8437-4782-bc6a-3b0f77993ebc'::uuid);

-- Create index for faster queries
CREATE INDEX idx_product_update_logs_batch_id ON public.product_update_logs(batch_id);
CREATE INDEX idx_product_update_logs_sent_at ON public.product_update_logs(sent_at DESC);