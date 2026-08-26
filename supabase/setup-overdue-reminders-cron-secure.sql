-- Configure CRON_SECRET in Supabase Edge Function secrets before running this.
-- Do not commit the actual secret to the repository.
--
-- Example:
--   supabase secrets set CRON_SECRET="<random-secret>" --project-ref <project-ref>
--
-- The scheduled job must send the same value in the X-Cron-Secret header.
-- Update the existing job from the Supabase SQL editor after configuring the secret.

SELECT cron.unschedule('send-overdue-reminders-daily');

SELECT cron.schedule(
  'send-overdue-reminders-daily',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://dkinzkawntfzkabroeib.supabase.co/functions/v1/send-overdue-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Cron-Secret', '<REPLACE_WITH_CRON_SECRET>'
    ),
    body := jsonb_build_object('time', now())
  ) AS request_id;
  $$
);
