-- Add field to track when automatic overdue email was sent
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS overdue_reminder_sent_at timestamp with time zone;

COMMENT ON COLUMN public.invoices.overdue_reminder_sent_at IS 'Timestamp when automatic overdue reminder email was sent';