-- Add home office usage field to categories
ALTER TABLE public.categories 
ADD COLUMN for_home_office boolean DEFAULT false;