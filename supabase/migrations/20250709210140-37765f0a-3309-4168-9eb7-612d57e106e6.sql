-- Add contact_person field to companies table
ALTER TABLE public.companies 
ADD COLUMN contact_person TEXT;