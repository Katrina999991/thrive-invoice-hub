
-- Quote sections for structuring quotes with text blocks
CREATE TABLE public.quote_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0,
  placement text NOT NULL DEFAULT 'before_items',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quote_sections ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own quote sections"
  ON public.quote_sections FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.quotes q WHERE q.id = quote_sections.quote_id AND q.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert sections on their own quotes"
  ON public.quote_sections FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.quotes q WHERE q.id = quote_sections.quote_id AND q.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own quote sections"
  ON public.quote_sections FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.quotes q WHERE q.id = quote_sections.quote_id AND q.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own quote sections"
  ON public.quote_sections FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.quotes q WHERE q.id = quote_sections.quote_id AND q.user_id = auth.uid()
  ));
