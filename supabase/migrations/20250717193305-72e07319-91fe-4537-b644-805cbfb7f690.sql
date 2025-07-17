-- Create storage bucket for company logos
INSERT INTO storage.buckets (id, name, public) VALUES ('company-logos', 'company-logos', true);

-- Create storage policies for company logos
CREATE POLICY "Company logos are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'company-logos');

CREATE POLICY "Users can upload company logos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'company-logos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update company logos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'company-logos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete company logos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'company-logos' AND auth.uid() IS NOT NULL);

-- Add logo_url column to companies table
ALTER TABLE public.companies 
ADD COLUMN logo_url TEXT;