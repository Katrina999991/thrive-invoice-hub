-- Create formal_notice_attachments table
CREATE TABLE public.formal_notice_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formal_notice_id uuid NOT NULL REFERENCES public.invoice_formal_notices(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'proof_of_sending',
  file_name text NOT NULL,
  file_url text NOT NULL,
  mime_type text,
  file_size bigint,
  uploaded_by uuid NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.formal_notice_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notice attachments"
  ON public.formal_notice_attachments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.invoice_formal_notices n
    WHERE n.id = formal_notice_attachments.formal_notice_id AND n.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own notice attachments"
  ON public.formal_notice_attachments FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.invoice_formal_notices n
      WHERE n.id = formal_notice_attachments.formal_notice_id AND n.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own notice attachments"
  ON public.formal_notice_attachments FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.invoice_formal_notices n
    WHERE n.id = formal_notice_attachments.formal_notice_id AND n.user_id = auth.uid()
  ));

-- Create storage bucket for formal notice proof files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'formal-notice-proofs',
  'formal-notice-proofs',
  false,
  10485760,
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
);

-- Storage RLS policies
CREATE POLICY "Users can upload proof files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'formal-notice-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view their own proof files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'formal-notice-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own proof files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'formal-notice-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);