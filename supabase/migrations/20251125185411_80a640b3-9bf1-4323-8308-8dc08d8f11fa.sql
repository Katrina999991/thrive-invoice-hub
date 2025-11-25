-- Create table to log invoice reminder emails
CREATE TABLE public.invoice_reminder_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  client_id UUID,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('manual', 'automatic')),
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoice_reminder_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own reminder logs"
ON public.invoice_reminder_logs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reminder logs"
ON public.invoice_reminder_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for better query performance
CREATE INDEX idx_invoice_reminder_logs_user_id ON public.invoice_reminder_logs(user_id);
CREATE INDEX idx_invoice_reminder_logs_invoice_id ON public.invoice_reminder_logs(invoice_id);
CREATE INDEX idx_invoice_reminder_logs_sent_at ON public.invoice_reminder_logs(sent_at);
CREATE INDEX idx_invoice_reminder_logs_client_id ON public.invoice_reminder_logs(client_id);