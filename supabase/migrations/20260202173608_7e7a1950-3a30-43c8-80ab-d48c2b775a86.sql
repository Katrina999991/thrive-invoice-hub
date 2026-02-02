
-- Add missing permissions to Owner role for all companies
INSERT INTO role_permissions (role_id, permission)
SELECT cr.id, p.permission
FROM company_roles cr
CROSS JOIN (
  VALUES 
    ('products:create'),
    ('products:delete'),
    ('inventory:edit'),
    ('quotes:approve'),
    ('billing:view'),
    ('time_tracking:view'),
    ('time_tracking:create'),
    ('time_tracking:edit'),
    ('time_tracking:delete')
) AS p(permission)
WHERE cr.name = 'Owner' AND cr.is_system = true
ON CONFLICT (role_id, permission) DO NOTHING;

-- Also add missing permissions to Admin role
INSERT INTO role_permissions (role_id, permission)
SELECT cr.id, p.permission
FROM company_roles cr
CROSS JOIN (
  VALUES 
    ('products:create'),
    ('products:delete'),
    ('inventory:edit'),
    ('quotes:approve'),
    ('billing:view'),
    ('time_tracking:view'),
    ('time_tracking:create'),
    ('time_tracking:edit'),
    ('time_tracking:delete')
) AS p(permission)
WHERE cr.name = 'Admin' AND cr.is_system = true
ON CONFLICT (role_id, permission) DO NOTHING;
