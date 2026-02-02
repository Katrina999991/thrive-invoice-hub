
-- Add expenses:delete_all to Owner role for all companies
INSERT INTO role_permissions (role_id, permission)
SELECT cr.id, 'expenses:delete_all'
FROM company_roles cr
WHERE cr.name = 'Owner' AND cr.is_system = true
ON CONFLICT (role_id, permission) DO NOTHING;
