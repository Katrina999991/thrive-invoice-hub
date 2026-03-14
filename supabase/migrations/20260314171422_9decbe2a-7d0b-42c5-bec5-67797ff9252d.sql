
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS final_reminder_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS final_reminder_sent_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS final_reminder_response_due_at date;
