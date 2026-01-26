-- Add granular time_tracking permissions to existing system roles
-- This ensures existing Owner/Admin/Accountant/Employee roles get the new permissions

-- Owner: Full access to all time_tracking permissions
INSERT INTO public.role_permissions (role_id, permission)
SELECT r.id, perm.permission
FROM public.company_roles r
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
WHERE r.name = 'Owner' AND r.is_system = true
ON CONFLICT (role_id, permission) DO NOTHING;

-- Admin: Full access to all time_tracking permissions  
INSERT INTO public.role_permissions (role_id, permission)
SELECT r.id, perm.permission
FROM public.company_roles r
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
WHERE r.name = 'Admin' AND r.is_system = true
ON CONFLICT (role_id, permission) DO NOTHING;

-- Accountant: View all + export only
INSERT INTO public.role_permissions (role_id, permission)
SELECT r.id, perm.permission
FROM public.company_roles r
CROSS JOIN (
  VALUES 
    ('time_tracking:view_own'),
    ('time_tracking:view_all'),
    ('time_tracking:export')
) AS perm(permission)
WHERE r.name = 'Accountant' AND r.is_system = true
ON CONFLICT (role_id, permission) DO NOTHING;

-- Employee: Own entries only
INSERT INTO public.role_permissions (role_id, permission)
SELECT r.id, perm.permission
FROM public.company_roles r
CROSS JOIN (
  VALUES 
    ('time_tracking:view_own'),
    ('time_tracking:create_own'),
    ('time_tracking:edit_own'),
    ('time_tracking:delete_own')
) AS perm(permission)
WHERE r.name = 'Employee' AND r.is_system = true
ON CONFLICT (role_id, permission) DO NOTHING;