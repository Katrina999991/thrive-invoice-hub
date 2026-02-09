
-- Fix: Mark existing Admin/Accountant/Employee/Viewer roles as system roles
UPDATE company_roles 
SET is_system = true 
WHERE name IN ('Admin', 'Accountant', 'Employee', 'Viewer') 
AND is_system = false;

-- Fix: Sync permissions for ALL Admin roles (delete old + insert correct)
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Fix Admin roles
  FOR r IN SELECT id FROM company_roles WHERE name = 'Admin' AND is_system = true
  LOOP
    DELETE FROM role_permissions WHERE role_id = r.id;
    INSERT INTO role_permissions (role_id, permission) VALUES
      (r.id, 'clients:view'), (r.id, 'clients:create'), (r.id, 'clients:edit'), (r.id, 'clients:delete'),
      (r.id, 'companies:view'), (r.id, 'companies:create'), (r.id, 'companies:edit'),
      (r.id, 'invoices:view'), (r.id, 'invoices:create'), (r.id, 'invoices:edit'), (r.id, 'invoices:send'), (r.id, 'invoices:delete'),
      (r.id, 'quotes:view'), (r.id, 'quotes:create'), (r.id, 'quotes:edit'), (r.id, 'quotes:send'), (r.id, 'quotes:delete'), (r.id, 'quotes:approve'),
      (r.id, 'expenses:view_own'), (r.id, 'expenses:view_all'), (r.id, 'expenses:create_own'), (r.id, 'expenses:edit_own'), (r.id, 'expenses:edit_all'), (r.id, 'expenses:delete_own'), (r.id, 'expenses:approve'),
      (r.id, 'products:view'), (r.id, 'products:create'), (r.id, 'products:edit'), (r.id, 'products:delete'),
      (r.id, 'inventory:view'), (r.id, 'inventory:adjust'), (r.id, 'inventory:edit'),
      (r.id, 'time_tracking:view_own'), (r.id, 'time_tracking:view_all'), (r.id, 'time_tracking:create_own'), (r.id, 'time_tracking:edit_own'), (r.id, 'time_tracking:edit_all'), (r.id, 'time_tracking:delete_own'), (r.id, 'time_tracking:delete_all'), (r.id, 'time_tracking:approve'), (r.id, 'time_tracking:mark_as_billed'), (r.id, 'time_tracking:link_to_invoice'), (r.id, 'time_tracking:view_archived'), (r.id, 'time_tracking:archive'),
      (r.id, 'reports:view'), (r.id, 'reports:export'),
      (r.id, 'settings:view'), (r.id, 'settings:edit'),
      (r.id, 'access:view_members'), (r.id, 'access:invite'), (r.id, 'access:remove'), (r.id, 'access:manage_roles'),
      (r.id, 'billing:view'),
      (r.id, 'debug:permissions_read');
  END LOOP;

  -- Fix Accountant roles
  FOR r IN SELECT id FROM company_roles WHERE name = 'Accountant' AND is_system = true
  LOOP
    DELETE FROM role_permissions WHERE role_id = r.id;
    INSERT INTO role_permissions (role_id, permission) VALUES
      (r.id, 'clients:view'), (r.id, 'clients:create'), (r.id, 'clients:edit'),
      (r.id, 'companies:view'),
      (r.id, 'invoices:view'), (r.id, 'invoices:create'), (r.id, 'invoices:edit'), (r.id, 'invoices:send'),
      (r.id, 'quotes:view'), (r.id, 'quotes:create'), (r.id, 'quotes:edit'), (r.id, 'quotes:send'),
      (r.id, 'expenses:view_own'), (r.id, 'expenses:view_all'), (r.id, 'expenses:create_own'), (r.id, 'expenses:edit_own'), (r.id, 'expenses:approve'),
      (r.id, 'products:view'),
      (r.id, 'inventory:view'),
      (r.id, 'time_tracking:view_own'), (r.id, 'time_tracking:view_all'),
      (r.id, 'reports:view'), (r.id, 'reports:export'),
      (r.id, 'settings:view');
  END LOOP;

  -- Fix Employee roles
  FOR r IN SELECT id FROM company_roles WHERE name = 'Employee' AND is_system = true
  LOOP
    DELETE FROM role_permissions WHERE role_id = r.id;
    INSERT INTO role_permissions (role_id, permission) VALUES
      (r.id, 'clients:view'),
      (r.id, 'companies:view'),
      (r.id, 'invoices:view'),
      (r.id, 'quotes:view'),
      (r.id, 'expenses:view_own'), (r.id, 'expenses:create_own'), (r.id, 'expenses:edit_own'), (r.id, 'expenses:delete_own'),
      (r.id, 'products:view'),
      (r.id, 'inventory:view'),
      (r.id, 'time_tracking:view_own'), (r.id, 'time_tracking:create_own'), (r.id, 'time_tracking:edit_own'), (r.id, 'time_tracking:delete_own');
  END LOOP;

  -- Fix Viewer roles
  FOR r IN SELECT id FROM company_roles WHERE name = 'Viewer' AND is_system = true
  LOOP
    DELETE FROM role_permissions WHERE role_id = r.id;
    INSERT INTO role_permissions (role_id, permission) VALUES
      (r.id, 'clients:view'),
      (r.id, 'companies:view'),
      (r.id, 'invoices:view'),
      (r.id, 'quotes:view'),
      (r.id, 'expenses:view_all'),
      (r.id, 'products:view'),
      (r.id, 'inventory:view'),
      (r.id, 'time_tracking:view_all'),
      (r.id, 'reports:view');
  END LOOP;
END $$;
