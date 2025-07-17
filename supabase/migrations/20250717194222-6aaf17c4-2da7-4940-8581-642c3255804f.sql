-- Add language column to clients table
ALTER TABLE public.clients 
ADD COLUMN language text DEFAULT 'english' CHECK (language IN ('english', 'french'));