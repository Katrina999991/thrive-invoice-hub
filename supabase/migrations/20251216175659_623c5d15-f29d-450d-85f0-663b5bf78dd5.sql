-- Add quote email template fields to companies table
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS quote_email_subject_en text,
ADD COLUMN IF NOT EXISTS quote_email_subject_fr text,
ADD COLUMN IF NOT EXISTS quote_email_message_en text,
ADD COLUMN IF NOT EXISTS quote_email_message_fr text;