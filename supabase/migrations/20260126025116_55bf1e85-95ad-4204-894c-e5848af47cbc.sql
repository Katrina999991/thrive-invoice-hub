-- First, delete the existing basic time_tracking permissions and add granular ones
DELETE FROM role_permissions 
WHERE permission LIKE 'time_tracking:%';

-- Add granular time tracking permissions for each role in each company

-- For OWNER role: Full access to all time tracking features
INSERT INTO role_permissions (role_id, permission)
SELECT cr.id, perm.permission
FROM company_roles cr
CROSS JOIN (
  VALUES 
    ('time_tracking:view_own'),
    ('time_tracking:view_all'),
    ('time_tracking:create_own'),
    ('time_tracking:edit_own'),
    ('time_tracking:edit_all'),
    ('time_tracking:delete_own'),
    ('time_tracking:delete_all'),
    ('time_tracking:approve'),
    ('time_tracking:export'),
    ('time_tracking:mark_as_billed'),
    ('time_tracking:link_to_invoice')
) AS perm(permission)
WHERE cr.name = 'Owner' AND cr.is_system = true
ON CONFLICT (role_id, permission) DO NOTHING;

-- For ADMIN role: Full access to all time tracking features
INSERT INTO role_permissions (role_id, permission)
SELECT cr.id, perm.permission
FROM company_roles cr
CROSS JOIN (
  VALUES 
    ('time_tracking:view_own'),
    ('time_tracking:view_all'),
    ('time_tracking:create_own'),
    ('time_tracking:edit_own'),
    ('time_tracking:edit_all'),
    ('time_tracking:delete_own'),
    ('time_tracking:delete_all'),
    ('time_tracking:approve'),
    ('time_tracking:export'),
    ('time_tracking:mark_as_billed'),
    ('time_tracking:link_to_invoice')
) AS perm(permission)
WHERE cr.name = 'Admin' AND cr.is_system = true
ON CONFLICT (role_id, permission) DO NOTHING;

-- For ACCOUNTANT role: View all + export only
INSERT INTO role_permissions (role_id, permission)
SELECT cr.id, perm.permission
FROM company_roles cr
CROSS JOIN (
  VALUES 
    ('time_tracking:view_own'),
    ('time_tracking:view_all'),
    ('time_tracking:export')
) AS perm(permission)
WHERE cr.name = 'Accountant' AND cr.is_system = true
ON CONFLICT (role_id, permission) DO NOTHING;

-- For EMPLOYEE role: Manage only their own entries
INSERT INTO role_permissions (role_id, permission)
SELECT cr.id, perm.permission
FROM company_roles cr
CROSS JOIN (
  VALUES 
    ('time_tracking:view_own'),
    ('time_tracking:create_own'),
    ('time_tracking:edit_own'),
    ('time_tracking:delete_own')
) AS perm(permission)
WHERE cr.name = 'Employee' AND cr.is_system = true
ON CONFLICT (role_id, permission) DO NOTHING;

-- For VIEWER role: No time tracking permissions (they shouldn't see this module)
-- No insert needed

-- Update the default roles function to include new permissions
CREATE OR REPLACE FUNCTION public.create_default_roles_for_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_role_id UUID;
  admin_role_id UUID;
  accountant_role_id UUID;
  employee_role_id UUID;
  viewer_role_id UUID;
BEGIN
  -- Create Owner role
  INSERT INTO company_roles (company_id, name, description, is_system)
  VALUES (NEW.id, 'Owner', 'Full access to all features', true)
  RETURNING id INTO owner_role_id;

  -- Create Admin role
  INSERT INTO company_roles (company_id, name, description, is_system)
  VALUES (NEW.id, 'Admin', 'Administrative access', true)
  RETURNING id INTO admin_role_id;

  -- Create Accountant role
  INSERT INTO company_roles (company_id, name, description, is_system)
  VALUES (NEW.id, 'Accountant', 'Financial access', true)
  RETURNING id INTO accountant_role_id;

  -- Create Employee role
  INSERT INTO company_roles (company_id, name, description, is_system)
  VALUES (NEW.id, 'Employee', 'Basic employee access', true)
  RETURNING id INTO employee_role_id;

  -- Create Viewer role
  INSERT INTO company_roles (company_id, name, description, is_system)
  VALUES (NEW.id, 'Viewer', 'Read-only access', true)
  RETURNING id INTO viewer_role_id;

  -- Owner permissions (full access)
  INSERT INTO role_permissions (role_id, permission)
  VALUES
    -- Clients
    (owner_role_id, 'clients:view'),
    (owner_role_id, 'clients:create'),
    (owner_role_id, 'clients:edit'),
    (owner_role_id, 'clients:delete'),
    -- Companies
    (owner_role_id, 'companies:view'),
    (owner_role_id, 'companies:create'),
    (owner_role_id, 'companies:edit'),
    (owner_role_id, 'companies:delete'),
    -- Invoices
    (owner_role_id, 'invoices:view'),
    (owner_role_id, 'invoices:create'),
    (owner_role_id, 'invoices:edit'),
    (owner_role_id, 'invoices:send'),
    (owner_role_id, 'invoices:delete'),
    -- Quotes
    (owner_role_id, 'quotes:view'),
    (owner_role_id, 'quotes:create'),
    (owner_role_id, 'quotes:edit'),
    (owner_role_id, 'quotes:send'),
    (owner_role_id, 'quotes:delete'),
    -- Expenses
    (owner_role_id, 'expenses:view'),
    (owner_role_id, 'expenses:create'),
    (owner_role_id, 'expenses:edit'),
    (owner_role_id, 'expenses:approve'),
    (owner_role_id, 'expenses:delete'),
    -- Products
    (owner_role_id, 'products:view'),
    (owner_role_id, 'products:edit'),
    -- Inventory
    (owner_role_id, 'inventory:view'),
    (owner_role_id, 'inventory:adjust'),
    -- Time Tracking (full access)
    (owner_role_id, 'time_tracking:view_own'),
    (owner_role_id, 'time_tracking:view_all'),
    (owner_role_id, 'time_tracking:create_own'),
    (owner_role_id, 'time_tracking:edit_own'),
    (owner_role_id, 'time_tracking:edit_all'),
    (owner_role_id, 'time_tracking:delete_own'),
    (owner_role_id, 'time_tracking:delete_all'),
    (owner_role_id, 'time_tracking:approve'),
    (owner_role_id, 'time_tracking:export'),
    (owner_role_id, 'time_tracking:mark_as_billed'),
    (owner_role_id, 'time_tracking:link_to_invoice'),
    -- Reports
    (owner_role_id, 'reports:view'),
    (owner_role_id, 'reports:export'),
    -- Settings
    (owner_role_id, 'settings:view'),
    (owner_role_id, 'settings:edit'),
    -- Access
    (owner_role_id, 'access:view_members'),
    (owner_role_id, 'access:invite'),
    (owner_role_id, 'access:remove'),
    (owner_role_id, 'access:manage_roles'),
    -- Billing
    (owner_role_id, 'billing:manage');

  -- Admin permissions (almost full access)
  INSERT INTO role_permissions (role_id, permission)
  VALUES
    -- Clients
    (admin_role_id, 'clients:view'),
    (admin_role_id, 'clients:create'),
    (admin_role_id, 'clients:edit'),
    (admin_role_id, 'clients:delete'),
    -- Companies
    (admin_role_id, 'companies:view'),
    (admin_role_id, 'companies:create'),
    (admin_role_id, 'companies:edit'),
    -- Invoices
    (admin_role_id, 'invoices:view'),
    (admin_role_id, 'invoices:create'),
    (admin_role_id, 'invoices:edit'),
    (admin_role_id, 'invoices:send'),
    (admin_role_id, 'invoices:delete'),
    -- Quotes
    (admin_role_id, 'quotes:view'),
    (admin_role_id, 'quotes:create'),
    (admin_role_id, 'quotes:edit'),
    (admin_role_id, 'quotes:send'),
    (admin_role_id, 'quotes:delete'),
    -- Expenses
    (admin_role_id, 'expenses:view'),
    (admin_role_id, 'expenses:create'),
    (admin_role_id, 'expenses:edit'),
    (admin_role_id, 'expenses:approve'),
    (admin_role_id, 'expenses:delete'),
    -- Products
    (admin_role_id, 'products:view'),
    (admin_role_id, 'products:edit'),
    -- Inventory
    (admin_role_id, 'inventory:view'),
    (admin_role_id, 'inventory:adjust'),
    -- Time Tracking (full access)
    (admin_role_id, 'time_tracking:view_own'),
    (admin_role_id, 'time_tracking:view_all'),
    (admin_role_id, 'time_tracking:create_own'),
    (admin_role_id, 'time_tracking:edit_own'),
    (admin_role_id, 'time_tracking:edit_all'),
    (admin_role_id, 'time_tracking:delete_own'),
    (admin_role_id, 'time_tracking:delete_all'),
    (admin_role_id, 'time_tracking:approve'),
    (admin_role_id, 'time_tracking:export'),
    (admin_role_id, 'time_tracking:mark_as_billed'),
    (admin_role_id, 'time_tracking:link_to_invoice'),
    -- Reports
    (admin_role_id, 'reports:view'),
    (admin_role_id, 'reports:export'),
    -- Settings
    (admin_role_id, 'settings:view'),
    (admin_role_id, 'settings:edit'),
    -- Access
    (admin_role_id, 'access:view_members'),
    (admin_role_id, 'access:invite'),
    (admin_role_id, 'access:remove');

  -- Accountant permissions (financial focus)
  INSERT INTO role_permissions (role_id, permission)
  VALUES
    -- Clients
    (accountant_role_id, 'clients:view'),
    (accountant_role_id, 'clients:create'),
    (accountant_role_id, 'clients:edit'),
    -- Companies
    (accountant_role_id, 'companies:view'),
    -- Invoices
    (accountant_role_id, 'invoices:view'),
    (accountant_role_id, 'invoices:create'),
    (accountant_role_id, 'invoices:edit'),
    (accountant_role_id, 'invoices:send'),
    -- Quotes
    (accountant_role_id, 'quotes:view'),
    (accountant_role_id, 'quotes:create'),
    (accountant_role_id, 'quotes:edit'),
    (accountant_role_id, 'quotes:send'),
    -- Expenses
    (accountant_role_id, 'expenses:view'),
    (accountant_role_id, 'expenses:create'),
    (accountant_role_id, 'expenses:edit'),
    (accountant_role_id, 'expenses:approve'),
    -- Products
    (accountant_role_id, 'products:view'),
    -- Inventory
    (accountant_role_id, 'inventory:view'),
    -- Time Tracking (view all + export only)
    (accountant_role_id, 'time_tracking:view_own'),
    (accountant_role_id, 'time_tracking:view_all'),
    (accountant_role_id, 'time_tracking:export'),
    -- Reports
    (accountant_role_id, 'reports:view'),
    (accountant_role_id, 'reports:export'),
    -- Settings
    (accountant_role_id, 'settings:view');

  -- Employee permissions (basic access)
  INSERT INTO role_permissions (role_id, permission)
  VALUES
    -- Clients
    (employee_role_id, 'clients:view'),
    -- Companies
    (employee_role_id, 'companies:view'),
    -- Invoices (view only)
    (employee_role_id, 'invoices:view'),
    -- Quotes (view only)
    (employee_role_id, 'quotes:view'),
    -- Expenses (manage own)
    (employee_role_id, 'expenses:view'),
    (employee_role_id, 'expenses:create'),
    (employee_role_id, 'expenses:edit'),
    -- Products
    (employee_role_id, 'products:view'),
    -- Inventory
    (employee_role_id, 'inventory:view'),
    -- Time Tracking (manage own only)
    (employee_role_id, 'time_tracking:view_own'),
    (employee_role_id, 'time_tracking:create_own'),
    (employee_role_id, 'time_tracking:edit_own'),
    (employee_role_id, 'time_tracking:delete_own');

  -- Viewer permissions (read-only)
  INSERT INTO role_permissions (role_id, permission)
  VALUES
    (viewer_role_id, 'clients:view'),
    (viewer_role_id, 'invoices:view'),
    (viewer_role_id, 'quotes:view'),
    (viewer_role_id, 'expenses:view'),
    (viewer_role_id, 'products:view'),
    (viewer_role_id, 'inventory:view'),
    (viewer_role_id, 'reports:view');

  -- Add company creator as Owner
  INSERT INTO company_members (company_id, user_id, role_id, status)
  VALUES (NEW.id, NEW.user_id, owner_role_id, 'active');

  RETURN NEW;
END;
$$;