
CREATE POLICY "Users with view_all can see all company time entries"
ON public.time_entries
FOR SELECT
USING (
  company_id IS NOT NULL
  AND has_permission(auth.uid(), company_id, 'time_tracking:view_all')
);
