-- Add total session time counter
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS total_session_minutes INTEGER NOT NULL DEFAULT 0;

-- Update touch_last_seen to also accumulate session time.
-- If the previous ping was within 7 minutes, the user was likely still active,
-- so we add the elapsed minutes to total_session_minutes.
-- Otherwise we treat it as a new session start (no accumulation).
CREATE OR REPLACE FUNCTION public.touch_last_seen()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_previous timestamptz;
  v_now timestamptz := now();
  v_elapsed_seconds numeric;
  v_minutes_to_add integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  SELECT last_seen_at INTO v_previous
  FROM public.profiles
  WHERE user_id = auth.uid();

  IF v_previous IS NOT NULL THEN
    v_elapsed_seconds := EXTRACT(EPOCH FROM (v_now - v_previous));
    -- Only accumulate if gap is short enough to consider it the same session
    IF v_elapsed_seconds > 0 AND v_elapsed_seconds <= 7 * 60 THEN
      v_minutes_to_add := GREATEST(1, ROUND(v_elapsed_seconds / 60.0)::int);
    ELSE
      v_minutes_to_add := 0;
    END IF;
  ELSE
    v_minutes_to_add := 0;
  END IF;

  UPDATE public.profiles
  SET
    last_seen_at = v_now,
    total_session_minutes = COALESCE(total_session_minutes, 0) + v_minutes_to_add
  WHERE user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.touch_last_seen() TO authenticated;