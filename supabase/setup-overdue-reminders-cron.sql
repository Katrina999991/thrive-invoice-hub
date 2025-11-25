-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule overdue reminders to run daily at 9:00 AM UTC
SELECT cron.schedule(
  'send-overdue-reminders-daily',
  '0 9 * * *', -- Every day at 9:00 AM UTC
  $$
  SELECT
    net.http_post(
        url:='https://dkinzkawntfzkabroeib.supabase.co/functions/v1/send-overdue-reminders',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRraW56a2F3bnRmemthYnJvZWliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwODEzNTksImV4cCI6MjA2NzY1NzM1OX0.KATTnChUgaAnxvscEecoi8arzSvTKWfsqUZdLSg7EpY"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- To view scheduled jobs:
-- SELECT * FROM cron.job;

-- To unschedule (remove) the job:
-- SELECT cron.unschedule('send-overdue-reminders-daily');
