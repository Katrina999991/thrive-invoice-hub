-- Create trigger to automatically create default roles when a company is created
CREATE OR REPLACE FUNCTION public.trigger_create_default_roles()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.create_default_roles_for_company(NEW.id, NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on companies table
DROP TRIGGER IF EXISTS on_company_created ON public.companies;
CREATE TRIGGER on_company_created
  AFTER INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_create_default_roles();

-- Create default roles for all existing companies that don't have roles yet
DO $$
DECLARE
  company_record RECORD;
BEGIN
  FOR company_record IN 
    SELECT c.id, c.user_id 
    FROM companies c 
    WHERE NOT EXISTS (
      SELECT 1 FROM company_roles cr WHERE cr.company_id = c.id
    )
  LOOP
    PERFORM public.create_default_roles_for_company(company_record.id, company_record.user_id);
  END LOOP;
END $$;