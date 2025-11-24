-- Add auto overdue email option to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS send_overdue_email_auto boolean DEFAULT false;

COMMENT ON COLUMN public.clients.send_overdue_email_auto IS 'Automatically send overdue payment reminder email 1 day after due date';