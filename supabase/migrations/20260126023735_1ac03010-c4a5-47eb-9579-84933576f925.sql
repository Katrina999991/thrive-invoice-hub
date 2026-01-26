-- Add companies and time_tracking permissions to existing roles
-- This adds permissions based on the role type (Owner, Admin, Accountant, Employee, Viewer)

-- Add permissions for Owner role (full access)
INSERT INTO public.role_permissions (role_id, permission)
SELECT cr.id, p.permission
FROM public.company_roles cr
CROSS JOIN (
  VALUES 
    ('companies:view'),
    ('companies:create'),
    ('companies:edit'),
    ('companies:delete'),
    ('time_tracking:view'),
    ('time_tracking:create'),
    ('time_tracking:edit'),
    ('time_tracking:delete')
) AS p(permission)
WHERE cr.name = 'Owner' AND cr.is_system = true
ON CONFLICT (role_id, permission) DO NOTHING;

-- Add permissions for Admin role (full access)
INSERT INTO public.role_permissions (role_id, permission)
SELECT cr.id, p.permission
FROM public.company_roles cr
CROSS JOIN (
  VALUES 
    ('companies:view'),
    ('companies:create'),
    ('companies:edit'),
    ('companies:delete'),
    ('time_tracking:view'),
    ('time_tracking:create'),
    ('time_tracking:edit'),
    ('time_tracking:delete')
) AS p(permission)
WHERE cr.name = 'Admin' AND cr.is_system = true
ON CONFLICT (role_id, permission) DO NOTHING;

-- Add permissions for Accountant role (view + edit for time tracking, view only for companies)
INSERT INTO public.role_permissions (role_id, permission)
SELECT cr.id, p.permission
FROM public.company_roles cr
CROSS JOIN (
  VALUES 
    ('companies:view'),
    ('time_tracking:view'),
    ('time_tracking:create'),
    ('time_tracking:edit')
) AS p(permission)
WHERE cr.name = 'Accountant' AND cr.is_system = true
ON CONFLICT (role_id, permission) DO NOTHING;

-- Add permissions for Employee role (view + create/edit own time tracking, view companies)
INSERT INTO public.role_permissions (role_id, permission)
SELECT cr.id, p.permission
FROM public.company_roles cr
CROSS JOIN (
  VALUES 
    ('companies:view'),
    ('time_tracking:view'),
    ('time_tracking:create'),
    ('time_tracking:edit')
) AS p(permission)
WHERE cr.name = 'Employee' AND cr.is_system = true
ON CONFLICT (role_id, permission) DO NOTHING;

-- Add permissions for Viewer role (view only)
INSERT INTO public.role_permissions (role_id, permission)
SELECT cr.id, p.permission
FROM public.company_roles cr
CROSS JOIN (
  VALUES 
    ('companies:view'),
    ('time_tracking:view')
) AS p(permission)
WHERE cr.name = 'Viewer' AND cr.is_system = true
ON CONFLICT (role_id, permission) DO NOTHING;

-- Update the create_default_roles_for_company function to include these new permissions
CREATE OR REPLACE FUNCTION public.create_default_roles_for_company(_company_id uuid, _owner_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_role_id uuid;
  admin_role_id uuid;
  accountant_role_id uuid;
  employee_role_id uuid;
  viewer_role_id uuid;
BEGIN
  -- Create Owner role
  INSERT INTO company_roles (company_id, name, description, is_system)
  VALUES (_company_id, 'Owner', 'Full access to all features and settings', true)
  RETURNING id INTO owner_role_id;

  -- Create Admin role
  INSERT INTO company_roles (company_id, name, description, is_system)
  VALUES (_company_id, 'Admin', 'Administrative access with some restrictions', true)
  RETURNING id INTO admin_role_id;

  -- Create Accountant role
  INSERT INTO company_roles (company_id, name, description, is_system)
  VALUES (_company_id, 'Accountant', 'Access to financial features', true)
  RETURNING id INTO accountant_role_id;

  -- Create Employee role
  INSERT INTO company_roles (company_id, name, description, is_system)
  VALUES (_company_id, 'Employee', 'Basic access for team members', true)
  RETURNING id INTO employee_role_id;

  -- Create Viewer role
  INSERT INTO company_roles (company_id, name, description, is_system)
  VALUES (_company_id, 'Viewer', 'Read-only access', true)
  RETURNING id INTO viewer_role_id;

  -- Owner permissions (full access)
  INSERT INTO role_permissions (role_id, permission) VALUES
    (owner_role_id, 'clients:view'), (owner_role_id, 'clients:create'), (owner_role_id, 'clients:edit'), (owner_role_id, 'clients:delete'),
    (owner_role_id, 'invoices:view'), (owner_role_id, 'invoices:create'), (owner_role_id, 'invoices:edit'), (owner_role_id, 'invoices:delete'), (owner_role_id, 'invoices:send'),
    (owner_role_id, 'quotes:view'), (owner_role_id, 'quotes:create'), (owner_role_id, 'quotes:edit'), (owner_role_id, 'quotes:delete'), (owner_role_id, 'quotes:send'), (owner_role_id, 'quotes:approve'),
    (owner_role_id, 'expenses:view'), (owner_role_id, 'expenses:create'), (owner_role_id, 'expenses:edit'), (owner_role_id, 'expenses:delete'),
    (owner_role_id, 'products:view'), (owner_role_id, 'products:create'), (owner_role_id, 'products:edit'), (owner_role_id, 'products:delete'),
    (owner_role_id, 'inventory:view'), (owner_role_id, 'inventory:edit'),
    (owner_role_id, 'reports:view'),
    (owner_role_id, 'settings:view'), (owner_role_id, 'settings:edit'),
    (owner_role_id, 'access:view_members'), (owner_role_id, 'access:invite'), (owner_role_id, 'access:manage_roles'),
    (owner_role_id, 'billing:view'), (owner_role_id, 'billing:manage'),
    (owner_role_id, 'companies:view'), (owner_role_id, 'companies:create'), (owner_role_id, 'companies:edit'), (owner_role_id, 'companies:delete'),
    (owner_role_id, 'time_tracking:view'), (owner_role_id, 'time_tracking:create'), (owner_role_id, 'time_tracking:edit'), (owner_role_id, 'time_tracking:delete');

  -- Admin permissions (similar to owner but no billing:manage)
  INSERT INTO role_permissions (role_id, permission) VALUES
    (admin_role_id, 'clients:view'), (admin_role_id, 'clients:create'), (admin_role_id, 'clients:edit'), (admin_role_id, 'clients:delete'),
    (admin_role_id, 'invoices:view'), (admin_role_id, 'invoices:create'), (admin_role_id, 'invoices:edit'), (admin_role_id, 'invoices:delete'), (admin_role_id, 'invoices:send'),
    (admin_role_id, 'quotes:view'), (admin_role_id, 'quotes:create'), (admin_role_id, 'quotes:edit'), (admin_role_id, 'quotes:delete'), (admin_role_id, 'quotes:send'), (admin_role_id, 'quotes:approve'),
    (admin_role_id, 'expenses:view'), (admin_role_id, 'expenses:create'), (admin_role_id, 'expenses:edit'), (admin_role_id, 'expenses:delete'),
    (admin_role_id, 'products:view'), (admin_role_id, 'products:create'), (admin_role_id, 'products:edit'), (admin_role_id, 'products:delete'),
    (admin_role_id, 'inventory:view'), (admin_role_id, 'inventory:edit'),
    (admin_role_id, 'reports:view'),
    (admin_role_id, 'settings:view'), (admin_role_id, 'settings:edit'),
    (admin_role_id, 'access:view_members'), (admin_role_id, 'access:invite'), (admin_role_id, 'access:manage_roles'),
    (admin_role_id, 'billing:view'),
    (admin_role_id, 'companies:view'), (admin_role_id, 'companies:create'), (admin_role_id, 'companies:edit'), (admin_role_id, 'companies:delete'),
    (admin_role_id, 'time_tracking:view'), (admin_role_id, 'time_tracking:create'), (admin_role_id, 'time_tracking:edit'), (admin_role_id, 'time_tracking:delete');

  -- Accountant permissions
  INSERT INTO role_permissions (role_id, permission) VALUES
    (accountant_role_id, 'clients:view'), (accountant_role_id, 'clients:create'), (accountant_role_id, 'clients:edit'),
    (accountant_role_id, 'invoices:view'), (accountant_role_id, 'invoices:create'), (accountant_role_id, 'invoices:edit'), (accountant_role_id, 'invoices:send'),
    (accountant_role_id, 'quotes:view'), (accountant_role_id, 'quotes:create'), (accountant_role_id, 'quotes:edit'), (accountant_role_id, 'quotes:send'),
    (accountant_role_id, 'expenses:view'), (accountant_role_id, 'expenses:create'), (accountant_role_id, 'expenses:edit'),
    (accountant_role_id, 'products:view'),
    (accountant_role_id, 'inventory:view'),
    (accountant_role_id, 'reports:view'),
    (accountant_role_id, 'companies:view'),
    (accountant_role_id, 'time_tracking:view'), (accountant_role_id, 'time_tracking:create'), (accountant_role_id, 'time_tracking:edit');

  -- Employee permissions
  INSERT INTO role_permissions (role_id, permission) VALUES
    (employee_role_id, 'clients:view'),
    (employee_role_id, 'invoices:view'),
    (employee_role_id, 'quotes:view'),
    (employee_role_id, 'expenses:view'), (employee_role_id, 'expenses:create'),
    (employee_role_id, 'products:view'),
    (employee_role_id, 'inventory:view'),
    (employee_role_id, 'companies:view'),
    (employee_role_id, 'time_tracking:view'), (employee_role_id, 'time_tracking:create'), (employee_role_id, 'time_tracking:edit');

  -- Viewer permissions (read-only)
  INSERT INTO role_permissions (role_id, permission) VALUES
    (viewer_role_id, 'clients:view'),
    (viewer_role_id, 'invoices:view'),
    (viewer_role_id, 'quotes:view'),
    (viewer_role_id, 'expenses:view'),
    (viewer_role_id, 'products:view'),
    (viewer_role_id, 'inventory:view'),
    (viewer_role_id, 'reports:view'),
    (viewer_role_id, 'companies:view'),
    (viewer_role_id, 'time_tracking:view');

  -- Add the owner as a member with Owner role
  INSERT INTO company_members (company_id, user_id, role_id, status)
  VALUES (_company_id, _owner_user_id, owner_role_id, 'active');
END;
$$;