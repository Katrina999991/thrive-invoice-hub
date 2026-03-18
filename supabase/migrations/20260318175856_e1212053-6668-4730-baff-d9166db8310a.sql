
-- Create user_signatures table
CREATE TABLE public.user_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  signature_type TEXT NOT NULL CHECK (signature_type IN ('typed', 'drawn', 'uploaded')),
  signature_value TEXT NOT NULL,
  signer_name TEXT,
  signer_title TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_signatures ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own signature"
  ON public.user_signatures FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own signature"
  ON public.user_signatures FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own signature"
  ON public.user_signatures FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own signature"
  ON public.user_signatures FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Updated_at trigger
CREATE TRIGGER update_user_signatures_updated_at
  BEFORE UPDATE ON public.user_signatures
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for signature images
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-signatures', 'user-signatures', false);

-- Storage RLS policies
CREATE POLICY "Users can upload their own signature"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'user-signatures' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view their own signature"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'user-signatures' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their own signature"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'user-signatures' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own signature"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'user-signatures' AND (storage.foldername(name))[1] = auth.uid()::text);
