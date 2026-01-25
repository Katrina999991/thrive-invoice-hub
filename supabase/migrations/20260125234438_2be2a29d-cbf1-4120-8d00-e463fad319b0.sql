
-- Allow company members to view their companies
CREATE POLICY "Company members can view companies"
ON public.companies
FOR SELECT
USING (
  public.is_company_member(auth.uid(), id)
);
