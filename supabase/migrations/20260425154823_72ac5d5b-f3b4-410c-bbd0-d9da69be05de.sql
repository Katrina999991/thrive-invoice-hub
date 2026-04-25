
-- Restrict company-logos uploads to active members of the target company.
-- Folder convention: <company_id>/<filename>
DROP POLICY IF EXISTS "Users can upload company logos" ON storage.objects;
CREATE POLICY "Company members can upload logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-logos'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = ((storage.foldername(name))[1])::uuid
      AND cm.user_id = auth.uid()
      AND cm.status = 'active'
  )
);

-- Restrict listing on company-logos to members of that company.
-- Public URLs continue to work via the public CDN; this only restricts the listing API.
DROP POLICY IF EXISTS "Company logos are publicly accessible" ON storage.objects;
CREATE POLICY "Company members can list their logos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'company-logos'
  AND EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = ((storage.foldername(name))[1])::uuid
      AND cm.user_id = auth.uid()
      AND cm.status = 'active'
  )
);
