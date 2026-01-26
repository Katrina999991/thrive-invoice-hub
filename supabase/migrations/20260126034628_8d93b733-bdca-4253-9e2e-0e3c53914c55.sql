-- Add new expense permissions for role-based access control
-- Employees: view_own, edit_own (only their own expenses)
-- Owner/Admin: view_all, edit_all (all expenses from all users)

-- First, let's add the new permissions to all company roles
-- We'll add them based on role type

-- For Owner roles: Add full access permissions
INSERT INTO role_permissions (role_id, permission)
SELECT cr.id, 'expenses:view_all'
FROM company_roles cr
WHERE cr.name = 'Owner'
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = cr.id AND rp.permission = 'expenses:view_all'
);

INSERT INTO role_permissions (role_id, permission)
SELECT cr.id, 'expenses:edit_all'
FROM company_roles cr
WHERE cr.name = 'Owner'
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = cr.id AND rp.permission = 'expenses:edit_all'
);

-- For Admin roles: Add full access permissions (like Owner)
INSERT INTO role_permissions (role_id, permission)
SELECT cr.id, 'expenses:view_all'
FROM company_roles cr
WHERE cr.name = 'Admin'
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = cr.id AND rp.permission = 'expenses:view_all'
);

INSERT INTO role_permissions (role_id, permission)
SELECT cr.id, 'expenses:edit_all'
FROM company_roles cr
WHERE cr.name = 'Admin'
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = cr.id AND rp.permission = 'expenses:edit_all'
);

-- For Accountant roles: Add view_all (can see all for reporting) but only edit_own
INSERT INTO role_permissions (role_id, permission)
SELECT cr.id, 'expenses:view_all'
FROM company_roles cr
WHERE cr.name = 'Accountant'
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = cr.id AND rp.permission = 'expenses:view_all'
);

INSERT INTO role_permissions (role_id, permission)
SELECT cr.id, 'expenses:edit_own'
FROM company_roles cr
WHERE cr.name = 'Accountant'
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = cr.id AND rp.permission = 'expenses:edit_own'
);

-- For Employee roles: Add view_own and edit_own only
INSERT INTO role_permissions (role_id, permission)
SELECT cr.id, 'expenses:view_own'
FROM company_roles cr
WHERE cr.name = 'Employee'
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = cr.id AND rp.permission = 'expenses:view_own'
);

INSERT INTO role_permissions (role_id, permission)
SELECT cr.id, 'expenses:edit_own'
FROM company_roles cr
WHERE cr.name = 'Employee'
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = cr.id AND rp.permission = 'expenses:edit_own'
);

-- For Viewer roles: Add view_all (can see all expenses but not edit)
INSERT INTO role_permissions (role_id, permission)
SELECT cr.id, 'expenses:view_all'
FROM company_roles cr
WHERE cr.name = 'Viewer'
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = cr.id AND rp.permission = 'expenses:view_all'
);

-- Remove the generic expenses:view and expenses:edit from Employee role
-- They should only have _own permissions
DELETE FROM role_permissions
WHERE permission = 'expenses:view'
AND role_id IN (SELECT id FROM company_roles WHERE name = 'Employee');

DELETE FROM role_permissions
WHERE permission = 'expenses:edit'
AND role_id IN (SELECT id FROM company_roles WHERE name = 'Employee');