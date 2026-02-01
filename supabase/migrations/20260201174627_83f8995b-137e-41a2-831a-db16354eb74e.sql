-- Add time rounding fields to clients table
ALTER TABLE public.clients 
  ADD COLUMN IF NOT EXISTS time_rounding_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS time_rounding_increment_minutes integer DEFAULT 15,
  ADD COLUMN IF NOT EXISTS time_rounding_method text DEFAULT 'nearest';

-- Add constraint for valid increment values
ALTER TABLE public.clients 
  ADD CONSTRAINT clients_time_rounding_increment_check 
  CHECK (time_rounding_increment_minutes IN (3, 6, 15, 30, 60));

-- Add constraint for valid method values
ALTER TABLE public.clients 
  ADD CONSTRAINT clients_time_rounding_method_check 
  CHECK (time_rounding_method IN ('nearest', 'up', 'down'));

-- Add duration tracking fields and source to time_entries table
ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS duration_raw_minutes integer,
  ADD COLUMN IF NOT EXISTS duration_billed_minutes integer,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';

-- Add constraint for valid source values
ALTER TABLE public.time_entries
  ADD CONSTRAINT time_entries_source_check
  CHECK (source IN ('manual', 'timer'));

-- Comment on new columns
COMMENT ON COLUMN public.clients.time_rounding_enabled IS 'Whether time rounding is enabled for timer-based entries for this client';
COMMENT ON COLUMN public.clients.time_rounding_increment_minutes IS 'Rounding increment in minutes (3, 6, 15, 30, or 60)';
COMMENT ON COLUMN public.clients.time_rounding_method IS 'Rounding method: nearest, up, or down';
COMMENT ON COLUMN public.time_entries.duration_raw_minutes IS 'Raw tracked duration in minutes before rounding';
COMMENT ON COLUMN public.time_entries.duration_billed_minutes IS 'Billable duration in minutes after rounding';
COMMENT ON COLUMN public.time_entries.source IS 'Source of entry: manual or timer';