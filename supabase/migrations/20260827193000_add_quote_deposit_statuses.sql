-- Add explicit states for the quote acceptance and deposit workflow.
ALTER TABLE public.quotes
  DROP CONSTRAINT IF EXISTS quotes_status_check;

ALTER TABLE public.quotes
  ADD CONSTRAINT quotes_status_check
  CHECK (status IN (
    'draft',
    'sent',
    'accepted',
    'deposit_requested',
    'deposit_paid',
    'rejected',
    'refused'
  ));
