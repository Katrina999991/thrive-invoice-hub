-- Add new fields for invoice body message (appears after the table, before footer)
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS invoice_body_message TEXT,
ADD COLUMN IF NOT EXISTS invoice_body_message_en TEXT,
ADD COLUMN IF NOT EXISTS invoice_body_message_fr TEXT;