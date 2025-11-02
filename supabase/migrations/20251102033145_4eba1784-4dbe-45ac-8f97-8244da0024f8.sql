-- Remove French version columns for email templates as we'll use automatic translation
ALTER TABLE public.companies
DROP COLUMN IF EXISTS invoice_email_subject_fr,
DROP COLUMN IF EXISTS invoice_email_message_fr,
DROP COLUMN IF EXISTS overdue_email_subject_fr,
DROP COLUMN IF EXISTS overdue_email_message_fr,
DROP COLUMN IF EXISTS payment_confirmation_email_subject_fr,
DROP COLUMN IF EXISTS payment_confirmation_email_message_fr,
DROP COLUMN IF EXISTS invoice_footer_message_fr;