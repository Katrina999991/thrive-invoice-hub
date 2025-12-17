-- Add quote body and footer message columns to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS quote_body_message_en TEXT,
ADD COLUMN IF NOT EXISTS quote_body_message_fr TEXT,
ADD COLUMN IF NOT EXISTS quote_footer_message_en TEXT,
ADD COLUMN IF NOT EXISTS quote_footer_message_fr TEXT;