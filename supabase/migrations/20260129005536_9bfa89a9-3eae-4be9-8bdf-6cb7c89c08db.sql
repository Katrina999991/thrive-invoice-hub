-- Add delete_own permission for expenses to Employee role for all companies
INSERT INTO role_permissions (role_id, permission)
SELECT cr.id, 'expenses:delete_own'
FROM company_roles cr
WHERE cr.name = 'Employee'
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = cr.id 
    AND rp.permission = 'expenses:delete_own'
);