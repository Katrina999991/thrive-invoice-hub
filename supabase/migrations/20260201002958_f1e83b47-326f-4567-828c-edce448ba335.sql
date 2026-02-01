
-- Add missing time_tracking and companies permissions to Admin roles that don't have them
DO $$
DECLARE
  admin_role RECORD;
BEGIN
  -- For each Admin role
  FOR admin_role IN 
    SELECT id, company_id FROM company_roles WHERE name = 'Admin'
  LOOP
    -- Add time_tracking permissions if missing
    INSERT INTO role_permissions (role_id, permission)
    VALUES 
      (admin_role.id, 'time_tracking:view_own'),
      (admin_role.id, 'time_tracking:view_all'),
      (admin_role.id, 'time_tracking:create_own'),
      (admin_role.id, 'time_tracking:edit_own'),
      (admin_role.id, 'time_tracking:edit_all'),
      (admin_role.id, 'time_tracking:delete_own'),
      (admin_role.id, 'time_tracking:delete_all'),
      (admin_role.id, 'time_tracking:approve'),
      (admin_role.id, 'time_tracking:export'),
      (admin_role.id, 'time_tracking:mark_as_billed'),
      (admin_role.id, 'time_tracking:link_to_invoice'),
      (admin_role.id, 'companies:view'),
      (admin_role.id, 'companies:edit')
    ON CONFLICT (role_id, permission) DO NOTHING;
  END LOOP;
END $$;
