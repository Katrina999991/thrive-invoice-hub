-- Create table to track receipt scan usage
CREATE TABLE public.receipt_scan_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  scanned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  vendor TEXT,
  total_amount NUMERIC,
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT
);

-- Enable RLS
ALTER TABLE public.receipt_scan_logs ENABLE ROW LEVEL SECURITY;

-- Admin can view all logs
CREATE POLICY "Admin can view all receipt scan logs"
ON public.receipt_scan_logs
FOR SELECT
USING (auth.uid() = 'e6c5ca56-8437-4782-bc6a-3b0f77993ebc'::uuid);

-- Users can view their own logs
CREATE POLICY "Users can view their own receipt scan logs"
ON public.receipt_scan_logs
FOR SELECT
USING (auth.uid() = user_id);

-- Service role can insert (edge function)
CREATE POLICY "Service role can insert receipt scan logs"
ON public.receipt_scan_logs
FOR INSERT
WITH CHECK (true);

-- Create index for efficient queries
CREATE INDEX idx_receipt_scan_logs_scanned_at ON public.receipt_scan_logs(scanned_at DESC);
CREATE INDEX idx_receipt_scan_logs_user_id ON public.receipt_scan_logs(user_id);