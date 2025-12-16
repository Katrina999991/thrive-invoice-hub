-- Add access token and response tracking to quotes
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS access_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS client_response_note TEXT;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_quotes_access_token ON public.quotes(access_token);

-- Create a policy to allow public read access via token (for the public page)
CREATE POLICY "Anyone can view quotes by access token"
ON public.quotes
FOR SELECT
TO anon
USING (access_token IS NOT NULL);