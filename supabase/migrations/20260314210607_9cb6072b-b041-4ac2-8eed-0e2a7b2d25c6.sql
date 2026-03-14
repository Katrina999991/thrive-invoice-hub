ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS final_reminder_email_subject text,
  ADD COLUMN IF NOT EXISTS final_reminder_email_body text,
  ADD COLUMN IF NOT EXISTS final_reminder_recipient text;