-- Add is_archived column to time_entries table
ALTER TABLE public.time_entries 
ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT false;

-- Create index for faster filtering
CREATE INDEX idx_time_entries_is_archived ON public.time_entries(is_archived);