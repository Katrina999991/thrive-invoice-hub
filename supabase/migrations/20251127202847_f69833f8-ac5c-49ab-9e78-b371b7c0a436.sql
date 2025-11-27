-- Create time_entry_ranges table to store individual time ranges
CREATE TABLE IF NOT EXISTS public.time_entry_ranges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id UUID NOT NULL REFERENCES public.time_entries(id) ON DELETE CASCADE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.time_entry_ranges ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for time_entry_ranges
CREATE POLICY "Users can view their own time entry ranges"
ON public.time_entry_ranges
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.time_entries
    WHERE time_entries.id = time_entry_ranges.time_entry_id
    AND time_entries.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create time entry ranges for their entries"
ON public.time_entry_ranges
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.time_entries
    WHERE time_entries.id = time_entry_ranges.time_entry_id
    AND time_entries.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own time entry ranges"
ON public.time_entry_ranges
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.time_entries
    WHERE time_entries.id = time_entry_ranges.time_entry_id
    AND time_entries.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own time entry ranges"
ON public.time_entry_ranges
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.time_entries
    WHERE time_entries.id = time_entry_ranges.time_entry_id
    AND time_entries.user_id = auth.uid()
  )
);

-- Create index for performance
CREATE INDEX idx_time_entry_ranges_time_entry_id ON public.time_entry_ranges(time_entry_id);

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_time_entry_ranges_updated_at
  BEFORE UPDATE ON public.time_entry_ranges
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();