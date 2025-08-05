-- Add hourly_rate column to clients table
ALTER TABLE public.clients 
ADD COLUMN hourly_rate numeric DEFAULT 0;