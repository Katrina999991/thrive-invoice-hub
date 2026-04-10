
-- Fix storage policies for company-logos bucket
DROP POLICY IF EXISTS "Users can delete company logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update company logos" ON storage.objects;

-- Only company members can update their company's logos
CREATE POLICY "Company members can update their logos"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'company-logos'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = (storage.foldername(name))[1]::uuid
        AND cm.user_id = auth.uid()
        AND cm.status = 'active'
    )
  );

-- Only company members can delete their company's logos
CREATE POLICY "Company members can delete their logos"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'company-logos'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = (storage.foldername(name))[1]::uuid
        AND cm.user_id = auth.uid()
        AND cm.status = 'active'
    )
  );
