-- Add English and French versions of email templates to companies table
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS invoice_email_subject_en TEXT,
  ADD COLUMN IF NOT EXISTS invoice_email_subject_fr TEXT,
  ADD COLUMN IF NOT EXISTS invoice_email_message_en TEXT,
  ADD COLUMN IF NOT EXISTS invoice_email_message_fr TEXT,
  ADD COLUMN IF NOT EXISTS overdue_email_subject_en TEXT,
  ADD COLUMN IF NOT EXISTS overdue_email_subject_fr TEXT,
  ADD COLUMN IF NOT EXISTS overdue_email_message_en TEXT,
  ADD COLUMN IF NOT EXISTS overdue_email_message_fr TEXT,
  ADD COLUMN IF NOT EXISTS payment_confirmation_email_subject_en TEXT,
  ADD COLUMN IF NOT EXISTS payment_confirmation_email_subject_fr TEXT,
  ADD COLUMN IF NOT EXISTS payment_confirmation_email_message_en TEXT,
  ADD COLUMN IF NOT EXISTS payment_confirmation_email_message_fr TEXT,
  ADD COLUMN IF NOT EXISTS invoice_footer_message_en TEXT,
  ADD COLUMN IF NOT EXISTS invoice_footer_message_fr TEXT;