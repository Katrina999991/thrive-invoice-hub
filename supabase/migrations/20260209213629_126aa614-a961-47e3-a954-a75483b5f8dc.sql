
-- ============================================================
-- Fix: Create missing system roles + sync all permissions
-- ============================================================

-- Step 1: Clean up old/obsolete permissions from ALL existing roles
DELETE FROM role_permissions 
WHERE permission IN (
  'expenses:create', 'expenses:view', 'expenses:edit', 'expenses:delete',
  'time_tracking:view', 'time_tracking:create', 'time_tracking:edit', 
  'time_tracking:delete', 'time_tracking:export'
);

-- Step 2: Create missing system roles for companies that don't have them (checking ANY role with that name, not just system)
DO $$
DECLARE
  comp RECORD;
  role_id UUID;
  role_names TEXT[] := ARRAY['Admin', 'Accountant', 'Employee', 'Viewer'];
  rname TEXT;
BEGIN
  -- For each company, create missing roles
  FOR comp IN SELECT id as company_id FROM companies
  LOOP
    -- Admin
    IF NOT EXISTS (SELECT 1 FROM company_roles WHERE company_id = comp.company_id AND name = 'Admin') THEN
      INSERT INTO company_roles (company_id, name, description, is_system)
      VALUES (comp.company_id, 'Admin', 'Administrative access', true)
      RETURNING id INTO role_id;

      INSERT INTO role_permissions (role_id, permission) VALUES
        (role_id, 'clients:view'), (role_id, 'clients:create'), (role_id, 'clients:edit'), (role_id, 'clients:delete'),
        (role_id, 'companies:view'), (role_id, 'companies:create'), (role_id, 'companies:edit'),
        (role_id, 'invoices:view'), (role_id, 'invoices:create'), (role_id, 'invoices:edit'), (role_id, 'invoices:send'), (role_id, 'invoices:delete'),
        (role_id, 'quotes:view'), (role_id, 'quotes:create'), (role_id, 'quotes:edit'), (role_id, 'quotes:send'), (role_id, 'quotes:delete'), (role_id, 'quotes:approve'),
        (role_id, 'expenses:view_own'), (role_id, 'expenses:view_all'), (role_id, 'expenses:create_own'), (role_id, 'expenses:edit_own'), (role_id, 'expenses:edit_all'), (role_id, 'expenses:delete_own'), (role_id, 'expenses:approve'),
        (role_id, 'products:view'), (role_id, 'products:create'), (role_id, 'products:edit'), (role_id, 'products:delete'),
        (role_id, 'inventory:view'), (role_id, 'inventory:adjust'), (role_id, 'inventory:edit'),
        (role_id, 'time_tracking:view_own'), (role_id, 'time_tracking:view_all'), (role_id, 'time_tracking:create_own'), (role_id, 'time_tracking:edit_own'), (role_id, 'time_tracking:edit_all'), (role_id, 'time_tracking:delete_own'), (role_id, 'time_tracking:delete_all'), (role_id, 'time_tracking:approve'), (role_id, 'time_tracking:mark_as_billed'), (role_id, 'time_tracking:link_to_invoice'), (role_id, 'time_tracking:view_archived'), (role_id, 'time_tracking:archive'),
        (role_id, 'reports:view'), (role_id, 'reports:export'),
        (role_id, 'settings:view'), (role_id, 'settings:edit'),
        (role_id, 'access:view_members'), (role_id, 'access:invite'), (role_id, 'access:remove'), (role_id, 'access:manage_roles'),
        (role_id, 'billing:view'),
        (role_id, 'debug:permissions_read');
    END IF;

    -- Accountant
    IF NOT EXISTS (SELECT 1 FROM company_roles WHERE company_id = comp.company_id AND name = 'Accountant') THEN
      INSERT INTO company_roles (company_id, name, description, is_system)
      VALUES (comp.company_id, 'Accountant', 'Financial access', true)
      RETURNING id INTO role_id;

      INSERT INTO role_permissions (role_id, permission) VALUES
        (role_id, 'clients:view'), (role_id, 'clients:create'), (role_id, 'clients:edit'),
        (role_id, 'companies:view'),
        (role_id, 'invoices:view'), (role_id, 'invoices:create'), (role_id, 'invoices:edit'), (role_id, 'invoices:send'),
        (role_id, 'quotes:view'), (role_id, 'quotes:create'), (role_id, 'quotes:edit'), (role_id, 'quotes:send'),
        (role_id, 'expenses:view_own'), (role_id, 'expenses:view_all'), (role_id, 'expenses:create_own'), (role_id, 'expenses:edit_own'), (role_id, 'expenses:approve'),
        (role_id, 'products:view'),
        (role_id, 'inventory:view'),
        (role_id, 'time_tracking:view_own'), (role_id, 'time_tracking:view_all'),
        (role_id, 'reports:view'), (role_id, 'reports:export'),
        (role_id, 'settings:view');
    END IF;

    -- Employee
    IF NOT EXISTS (SELECT 1 FROM company_roles WHERE company_id = comp.company_id AND name = 'Employee') THEN
      INSERT INTO company_roles (company_id, name, description, is_system)
      VALUES (comp.company_id, 'Employee', 'Basic employee access', true)
      RETURNING id INTO role_id;

      INSERT INTO role_permissions (role_id, permission) VALUES
        (role_id, 'clients:view'),
        (role_id, 'companies:view'),
        (role_id, 'invoices:view'),
        (role_id, 'quotes:view'),
        (role_id, 'expenses:view_own'), (role_id, 'expenses:create_own'), (role_id, 'expenses:edit_own'), (role_id, 'expenses:delete_own'),
        (role_id, 'products:view'),
        (role_id, 'inventory:view'),
        (role_id, 'time_tracking:view_own'), (role_id, 'time_tracking:create_own'), (role_id, 'time_tracking:edit_own'), (role_id, 'time_tracking:delete_own');
    END IF;

    -- Viewer
    IF NOT EXISTS (SELECT 1 FROM company_roles WHERE company_id = comp.company_id AND name = 'Viewer') THEN
      INSERT INTO company_roles (company_id, name, description, is_system)
      VALUES (comp.company_id, 'Viewer', 'Read-only access', true)
      RETURNING id INTO role_id;

      INSERT INTO role_permissions (role_id, permission) VALUES
        (role_id, 'clients:view'),
        (role_id, 'companies:view'),
        (role_id, 'invoices:view'),
        (role_id, 'quotes:view'),
        (role_id, 'expenses:view_all'),
        (role_id, 'products:view'),
        (role_id, 'inventory:view'),
        (role_id, 'time_tracking:view_all'),
        (role_id, 'reports:view');
    END IF;
  END LOOP;
END $$;

-- Step 3: Fix Owner permissions - add missing granular permissions
INSERT INTO role_permissions (role_id, permission)
SELECT cr.id, p.permission
FROM company_roles cr
CROSS JOIN (VALUES 
  ('expenses:view_own'), ('expenses:create_own'), ('expenses:edit_own'), ('expenses:delete_own'),
  ('time_tracking:view_archived'), ('time_tracking:archive'),
  ('products:create'), ('products:delete'),
  ('inventory:edit'),
  ('quotes:approve'),
  ('billing:view'),
  ('debug:permissions_read'),
  ('access:remove'),
  ('reports:export')
) AS p(permission)
WHERE cr.name = 'Owner' AND cr.is_system = true
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp 
  WHERE rp.role_id = cr.id AND rp.permission = p.permission
);

-- Step 4: Update BOTH trigger function and standalone function
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
  INSERT INTO company_roles (company_id, name, description, is_system) VALUES (NEW.id, 'Owner', 'Full access to all features', true) RETURNING id INTO owner_role_id;
  INSERT INTO company_roles (company_id, name, description, is_system) VALUES (NEW.id, 'Admin', 'Administrative access', true) RETURNING id INTO admin_role_id;
  INSERT INTO company_roles (company_id, name, description, is_system) VALUES (NEW.id, 'Accountant', 'Financial access', true) RETURNING id INTO accountant_role_id;
  INSERT INTO company_roles (company_id, name, description, is_system) VALUES (NEW.id, 'Employee', 'Basic employee access', true) RETURNING id INTO employee_role_id;
  INSERT INTO company_roles (company_id, name, description, is_system) VALUES (NEW.id, 'Viewer', 'Read-only access', true) RETURNING id INTO viewer_role_id;

  -- Owner (full access)
  INSERT INTO role_permissions (role_id, permission) VALUES
    (owner_role_id, 'clients:view'), (owner_role_id, 'clients:create'), (owner_role_id, 'clients:edit'), (owner_role_id, 'clients:delete'),
    (owner_role_id, 'companies:view'), (owner_role_id, 'companies:create'), (owner_role_id, 'companies:edit'), (owner_role_id, 'companies:delete'),
    (owner_role_id, 'invoices:view'), (owner_role_id, 'invoices:create'), (owner_role_id, 'invoices:edit'), (owner_role_id, 'invoices:send'), (owner_role_id, 'invoices:delete'),
    (owner_role_id, 'quotes:view'), (owner_role_id, 'quotes:create'), (owner_role_id, 'quotes:edit'), (owner_role_id, 'quotes:send'), (owner_role_id, 'quotes:delete'), (owner_role_id, 'quotes:approve'),
    (owner_role_id, 'expenses:view_own'), (owner_role_id, 'expenses:view_all'), (owner_role_id, 'expenses:create_own'), (owner_role_id, 'expenses:edit_own'), (owner_role_id, 'expenses:edit_all'), (owner_role_id, 'expenses:delete_own'), (owner_role_id, 'expenses:delete_all'), (owner_role_id, 'expenses:approve'),
    (owner_role_id, 'products:view'), (owner_role_id, 'products:create'), (owner_role_id, 'products:edit'), (owner_role_id, 'products:delete'),
    (owner_role_id, 'inventory:view'), (owner_role_id, 'inventory:adjust'), (owner_role_id, 'inventory:edit'),
    (owner_role_id, 'time_tracking:view_own'), (owner_role_id, 'time_tracking:view_all'), (owner_role_id, 'time_tracking:create_own'), (owner_role_id, 'time_tracking:edit_own'), (owner_role_id, 'time_tracking:edit_all'), (owner_role_id, 'time_tracking:delete_own'), (owner_role_id, 'time_tracking:delete_all'), (owner_role_id, 'time_tracking:approve'), (owner_role_id, 'time_tracking:mark_as_billed'), (owner_role_id, 'time_tracking:link_to_invoice'), (owner_role_id, 'time_tracking:view_archived'), (owner_role_id, 'time_tracking:archive'),
    (owner_role_id, 'reports:view'), (owner_role_id, 'reports:export'),
    (owner_role_id, 'settings:view'), (owner_role_id, 'settings:edit'),
    (owner_role_id, 'access:view_members'), (owner_role_id, 'access:invite'), (owner_role_id, 'access:remove'), (owner_role_id, 'access:manage_roles'),
    (owner_role_id, 'billing:view'), (owner_role_id, 'billing:manage'),
    (owner_role_id, 'debug:permissions_read');

  -- Admin
  INSERT INTO role_permissions (role_id, permission) VALUES
    (admin_role_id, 'clients:view'), (admin_role_id, 'clients:create'), (admin_role_id, 'clients:edit'), (admin_role_id, 'clients:delete'),
    (admin_role_id, 'companies:view'), (admin_role_id, 'companies:create'), (admin_role_id, 'companies:edit'),
    (admin_role_id, 'invoices:view'), (admin_role_id, 'invoices:create'), (admin_role_id, 'invoices:edit'), (admin_role_id, 'invoices:send'), (admin_role_id, 'invoices:delete'),
    (admin_role_id, 'quotes:view'), (admin_role_id, 'quotes:create'), (admin_role_id, 'quotes:edit'), (admin_role_id, 'quotes:send'), (admin_role_id, 'quotes:delete'), (admin_role_id, 'quotes:approve'),
    (admin_role_id, 'expenses:view_own'), (admin_role_id, 'expenses:view_all'), (admin_role_id, 'expenses:create_own'), (admin_role_id, 'expenses:edit_own'), (admin_role_id, 'expenses:edit_all'), (admin_role_id, 'expenses:delete_own'), (admin_role_id, 'expenses:approve'),
    (admin_role_id, 'products:view'), (admin_role_id, 'products:create'), (admin_role_id, 'products:edit'), (admin_role_id, 'products:delete'),
    (admin_role_id, 'inventory:view'), (admin_role_id, 'inventory:adjust'), (admin_role_id, 'inventory:edit'),
    (admin_role_id, 'time_tracking:view_own'), (admin_role_id, 'time_tracking:view_all'), (admin_role_id, 'time_tracking:create_own'), (admin_role_id, 'time_tracking:edit_own'), (admin_role_id, 'time_tracking:edit_all'), (admin_role_id, 'time_tracking:delete_own'), (admin_role_id, 'time_tracking:delete_all'), (admin_role_id, 'time_tracking:approve'), (admin_role_id, 'time_tracking:mark_as_billed'), (admin_role_id, 'time_tracking:link_to_invoice'), (admin_role_id, 'time_tracking:view_archived'), (admin_role_id, 'time_tracking:archive'),
    (admin_role_id, 'reports:view'), (admin_role_id, 'reports:export'),
    (admin_role_id, 'settings:view'), (admin_role_id, 'settings:edit'),
    (admin_role_id, 'access:view_members'), (admin_role_id, 'access:invite'), (admin_role_id, 'access:remove'), (admin_role_id, 'access:manage_roles'),
    (admin_role_id, 'billing:view'),
    (admin_role_id, 'debug:permissions_read');

  -- Accountant
  INSERT INTO role_permissions (role_id, permission) VALUES
    (accountant_role_id, 'clients:view'), (accountant_role_id, 'clients:create'), (accountant_role_id, 'clients:edit'),
    (accountant_role_id, 'companies:view'),
    (accountant_role_id, 'invoices:view'), (accountant_role_id, 'invoices:create'), (accountant_role_id, 'invoices:edit'), (accountant_role_id, 'invoices:send'),
    (accountant_role_id, 'quotes:view'), (accountant_role_id, 'quotes:create'), (accountant_role_id, 'quotes:edit'), (accountant_role_id, 'quotes:send'),
    (accountant_role_id, 'expenses:view_own'), (accountant_role_id, 'expenses:view_all'), (accountant_role_id, 'expenses:create_own'), (accountant_role_id, 'expenses:edit_own'), (accountant_role_id, 'expenses:approve'),
    (accountant_role_id, 'products:view'),
    (accountant_role_id, 'inventory:view'),
    (accountant_role_id, 'time_tracking:view_own'), (accountant_role_id, 'time_tracking:view_all'),
    (accountant_role_id, 'reports:view'), (accountant_role_id, 'reports:export'),
    (accountant_role_id, 'settings:view');

  -- Employee
  INSERT INTO role_permissions (role_id, permission) VALUES
    (employee_role_id, 'clients:view'),
    (employee_role_id, 'companies:view'),
    (employee_role_id, 'invoices:view'),
    (employee_role_id, 'quotes:view'),
    (employee_role_id, 'expenses:view_own'), (employee_role_id, 'expenses:create_own'), (employee_role_id, 'expenses:edit_own'), (employee_role_id, 'expenses:delete_own'),
    (employee_role_id, 'products:view'),
    (employee_role_id, 'inventory:view'),
    (employee_role_id, 'time_tracking:view_own'), (employee_role_id, 'time_tracking:create_own'), (employee_role_id, 'time_tracking:edit_own'), (employee_role_id, 'time_tracking:delete_own');

  -- Viewer
  INSERT INTO role_permissions (role_id, permission) VALUES
    (viewer_role_id, 'clients:view'),
    (viewer_role_id, 'companies:view'),
    (viewer_role_id, 'invoices:view'),
    (viewer_role_id, 'quotes:view'),
    (viewer_role_id, 'expenses:view_all'),
    (viewer_role_id, 'products:view'),
    (viewer_role_id, 'inventory:view'),
    (viewer_role_id, 'time_tracking:view_all'),
    (viewer_role_id, 'reports:view');

  INSERT INTO company_members (company_id, user_id, role_id, status) VALUES (NEW.id, NEW.user_id, owner_role_id, 'active');
  RETURN NEW;
END;
$$;

-- Update the standalone function too
CREATE OR REPLACE FUNCTION public.create_default_roles_for_company(_company_id uuid, _owner_user_id uuid)
RETURNS void
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
  INSERT INTO company_roles (company_id, name, description, is_system) VALUES (_company_id, 'Owner', 'Full access to all features', true) RETURNING id INTO owner_role_id;
  INSERT INTO company_roles (company_id, name, description, is_system) VALUES (_company_id, 'Admin', 'Administrative access', true) RETURNING id INTO admin_role_id;
  INSERT INTO company_roles (company_id, name, description, is_system) VALUES (_company_id, 'Accountant', 'Financial access', true) RETURNING id INTO accountant_role_id;
  INSERT INTO company_roles (company_id, name, description, is_system) VALUES (_company_id, 'Employee', 'Basic employee access', true) RETURNING id INTO employee_role_id;
  INSERT INTO company_roles (company_id, name, description, is_system) VALUES (_company_id, 'Viewer', 'Read-only access', true) RETURNING id INTO viewer_role_id;

  -- Owner (full access)
  INSERT INTO role_permissions (role_id, permission) VALUES
    (owner_role_id, 'clients:view'), (owner_role_id, 'clients:create'), (owner_role_id, 'clients:edit'), (owner_role_id, 'clients:delete'),
    (owner_role_id, 'companies:view'), (owner_role_id, 'companies:create'), (owner_role_id, 'companies:edit'), (owner_role_id, 'companies:delete'),
    (owner_role_id, 'invoices:view'), (owner_role_id, 'invoices:create'), (owner_role_id, 'invoices:edit'), (owner_role_id, 'invoices:send'), (owner_role_id, 'invoices:delete'),
    (owner_role_id, 'quotes:view'), (owner_role_id, 'quotes:create'), (owner_role_id, 'quotes:edit'), (owner_role_id, 'quotes:send'), (owner_role_id, 'quotes:delete'), (owner_role_id, 'quotes:approve'),
    (owner_role_id, 'expenses:view_own'), (owner_role_id, 'expenses:view_all'), (owner_role_id, 'expenses:create_own'), (owner_role_id, 'expenses:edit_own'), (owner_role_id, 'expenses:edit_all'), (owner_role_id, 'expenses:delete_own'), (owner_role_id, 'expenses:delete_all'), (owner_role_id, 'expenses:approve'),
    (owner_role_id, 'products:view'), (owner_role_id, 'products:create'), (owner_role_id, 'products:edit'), (owner_role_id, 'products:delete'),
    (owner_role_id, 'inventory:view'), (owner_role_id, 'inventory:adjust'), (owner_role_id, 'inventory:edit'),
    (owner_role_id, 'time_tracking:view_own'), (owner_role_id, 'time_tracking:view_all'), (owner_role_id, 'time_tracking:create_own'), (owner_role_id, 'time_tracking:edit_own'), (owner_role_id, 'time_tracking:edit_all'), (owner_role_id, 'time_tracking:delete_own'), (owner_role_id, 'time_tracking:delete_all'), (owner_role_id, 'time_tracking:approve'), (owner_role_id, 'time_tracking:mark_as_billed'), (owner_role_id, 'time_tracking:link_to_invoice'), (owner_role_id, 'time_tracking:view_archived'), (owner_role_id, 'time_tracking:archive'),
    (owner_role_id, 'reports:view'), (owner_role_id, 'reports:export'),
    (owner_role_id, 'settings:view'), (owner_role_id, 'settings:edit'),
    (owner_role_id, 'access:view_members'), (owner_role_id, 'access:invite'), (owner_role_id, 'access:remove'), (owner_role_id, 'access:manage_roles'),
    (owner_role_id, 'billing:view'), (owner_role_id, 'billing:manage'),
    (owner_role_id, 'debug:permissions_read');

  -- Admin
  INSERT INTO role_permissions (role_id, permission) VALUES
    (admin_role_id, 'clients:view'), (admin_role_id, 'clients:create'), (admin_role_id, 'clients:edit'), (admin_role_id, 'clients:delete'),
    (admin_role_id, 'companies:view'), (admin_role_id, 'companies:create'), (admin_role_id, 'companies:edit'),
    (admin_role_id, 'invoices:view'), (admin_role_id, 'invoices:create'), (admin_role_id, 'invoices:edit'), (admin_role_id, 'invoices:send'), (admin_role_id, 'invoices:delete'),
    (admin_role_id, 'quotes:view'), (admin_role_id, 'quotes:create'), (admin_role_id, 'quotes:edit'), (admin_role_id, 'quotes:send'), (admin_role_id, 'quotes:delete'), (admin_role_id, 'quotes:approve'),
    (admin_role_id, 'expenses:view_own'), (admin_role_id, 'expenses:view_all'), (admin_role_id, 'expenses:create_own'), (admin_role_id, 'expenses:edit_own'), (admin_role_id, 'expenses:edit_all'), (admin_role_id, 'expenses:delete_own'), (admin_role_id, 'expenses:approve'),
    (admin_role_id, 'products:view'), (admin_role_id, 'products:create'), (admin_role_id, 'products:edit'), (admin_role_id, 'products:delete'),
    (admin_role_id, 'inventory:view'), (admin_role_id, 'inventory:adjust'), (admin_role_id, 'inventory:edit'),
    (admin_role_id, 'time_tracking:view_own'), (admin_role_id, 'time_tracking:view_all'), (admin_role_id, 'time_tracking:create_own'), (admin_role_id, 'time_tracking:edit_own'), (admin_role_id, 'time_tracking:edit_all'), (admin_role_id, 'time_tracking:delete_own'), (admin_role_id, 'time_tracking:delete_all'), (admin_role_id, 'time_tracking:approve'), (admin_role_id, 'time_tracking:mark_as_billed'), (admin_role_id, 'time_tracking:link_to_invoice'), (admin_role_id, 'time_tracking:view_archived'), (admin_role_id, 'time_tracking:archive'),
    (admin_role_id, 'reports:view'), (admin_role_id, 'reports:export'),
    (admin_role_id, 'settings:view'), (admin_role_id, 'settings:edit'),
    (admin_role_id, 'access:view_members'), (admin_role_id, 'access:invite'), (admin_role_id, 'access:remove'), (admin_role_id, 'access:manage_roles'),
    (admin_role_id, 'billing:view'),
    (admin_role_id, 'debug:permissions_read');

  -- Accountant
  INSERT INTO role_permissions (role_id, permission) VALUES
    (accountant_role_id, 'clients:view'), (accountant_role_id, 'clients:create'), (accountant_role_id, 'clients:edit'),
    (accountant_role_id, 'companies:view'),
    (accountant_role_id, 'invoices:view'), (accountant_role_id, 'invoices:create'), (accountant_role_id, 'invoices:edit'), (accountant_role_id, 'invoices:send'),
    (accountant_role_id, 'quotes:view'), (accountant_role_id, 'quotes:create'), (accountant_role_id, 'quotes:edit'), (accountant_role_id, 'quotes:send'),
    (accountant_role_id, 'expenses:view_own'), (accountant_role_id, 'expenses:view_all'), (accountant_role_id, 'expenses:create_own'), (accountant_role_id, 'expenses:edit_own'), (accountant_role_id, 'expenses:approve'),
    (accountant_role_id, 'products:view'),
    (accountant_role_id, 'inventory:view'),
    (accountant_role_id, 'time_tracking:view_own'), (accountant_role_id, 'time_tracking:view_all'),
    (accountant_role_id, 'reports:view'), (accountant_role_id, 'reports:export'),
    (accountant_role_id, 'settings:view');

  -- Employee
  INSERT INTO role_permissions (role_id, permission) VALUES
    (employee_role_id, 'clients:view'),
    (employee_role_id, 'companies:view'),
    (employee_role_id, 'invoices:view'),
    (employee_role_id, 'quotes:view'),
    (employee_role_id, 'expenses:view_own'), (employee_role_id, 'expenses:create_own'), (employee_role_id, 'expenses:edit_own'), (employee_role_id, 'expenses:delete_own'),
    (employee_role_id, 'products:view'),
    (employee_role_id, 'inventory:view'),
    (employee_role_id, 'time_tracking:view_own'), (employee_role_id, 'time_tracking:create_own'), (employee_role_id, 'time_tracking:edit_own'), (employee_role_id, 'time_tracking:delete_own');

  -- Viewer
  INSERT INTO role_permissions (role_id, permission) VALUES
    (viewer_role_id, 'clients:view'),
    (viewer_role_id, 'companies:view'),
    (viewer_role_id, 'invoices:view'),
    (viewer_role_id, 'quotes:view'),
    (viewer_role_id, 'expenses:view_all'),
    (viewer_role_id, 'products:view'),
    (viewer_role_id, 'inventory:view'),
    (viewer_role_id, 'time_tracking:view_all'),
    (viewer_role_id, 'reports:view');

  INSERT INTO company_members (company_id, user_id, role_id, status) VALUES (_company_id, _owner_user_id, owner_role_id, 'active');
END;
$$;
