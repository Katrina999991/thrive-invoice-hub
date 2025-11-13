-- Add taxes column to expenses table to store tax information
ALTER TABLE public.expenses
ADD COLUMN taxes jsonb DEFAULT '[]'::jsonb;