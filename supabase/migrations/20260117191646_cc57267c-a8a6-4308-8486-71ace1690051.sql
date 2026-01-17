-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'accountant', 'employee', 'viewer');

-- Create enum for member status
CREATE TYPE public.member_status AS ENUM ('active', 'suspended');

-- ===========================================
-- Table: company_roles
-- ===========================================
CREATE TABLE public.company_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, name)
);

-- Enable RLS
ALTER TABLE public.company_roles ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at
CREATE TRIGGER update_company_roles_updated_at
  BEFORE UPDATE ON public.company_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ===========================================
-- Table: role_permissions
-- ===========================================
CREATE TABLE public.role_permissions (
  role_id UUID NOT NULL REFERENCES public.company_roles(id) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, permission)
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- Table: company_members
-- ===========================================
CREATE TABLE public.company_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.company_roles(id) ON DELETE RESTRICT,
  status public.member_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id)
);

-- Enable RLS
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at
CREATE TRIGGER update_company_members_updated_at
  BEFORE UPDATE ON public.company_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ===========================================
-- Table: company_invites
-- ===========================================
CREATE TABLE public.company_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role_id UUID NOT NULL REFERENCES public.company_roles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, email)
);

-- Enable RLS
ALTER TABLE public.company_invites ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- Function: is_company_member (check if user is member of company)
-- ===========================================
CREATE OR REPLACE FUNCTION public.is_company_member(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_members
    WHERE user_id = _user_id
      AND company_id = _company_id
      AND status = 'active'
  )
$$;

-- ===========================================
-- Function: has_permission (check if user has specific permission in company)
-- ===========================================
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _company_id UUID, _permission TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_members cm
    JOIN public.role_permissions rp ON rp.role_id = cm.role_id
    WHERE cm.user_id = _user_id
      AND cm.company_id = _company_id
      AND cm.status = 'active'
      AND rp.permission = _permission
  )
$$;

-- ===========================================
-- Function: get_user_permissions (get all permissions for user in company)
-- ===========================================
CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id UUID, _company_id UUID)
RETURNS TEXT[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(rp.permission), ARRAY[]::TEXT[])
  FROM public.company_members cm
  JOIN public.role_permissions rp ON rp.role_id = cm.role_id
  WHERE cm.user_id = _user_id
    AND cm.company_id = _company_id
    AND cm.status = 'active'
$$;

-- ===========================================
-- Function: get_user_role_in_company
-- ===========================================
CREATE OR REPLACE FUNCTION public.get_user_role_in_company(_user_id UUID, _company_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role_id
  FROM public.company_members
  WHERE user_id = _user_id
    AND company_id = _company_id
    AND status = 'active'
  LIMIT 1
$$;

-- ===========================================
-- Function: count_owners_in_company (prevent removing last owner)
-- ===========================================
CREATE OR REPLACE FUNCTION public.count_owners_in_company(_company_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.company_members cm
  JOIN public.company_roles cr ON cr.id = cm.role_id
  WHERE cm.company_id = _company_id
    AND cm.status = 'active'
    AND cr.name = 'Owner'
    AND cr.is_system = true
$$;

-- ===========================================
-- Function: create_default_roles_for_company
-- ===========================================
CREATE OR REPLACE FUNCTION public.create_default_roles_for_company(_company_id UUID, _owner_user_id UUID)
RETURNS VOID
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
  all_permissions TEXT[] := ARRAY[
    'clients:view', 'clients:create', 'clients:edit', 'clients:delete',
    'invoices:view', 'invoices:create', 'invoices:edit', 'invoices:send', 'invoices:delete',
    'quotes:view', 'quotes:create', 'quotes:edit', 'quotes:send', 'quotes:delete',
    'expenses:view', 'expenses:create', 'expenses:edit', 'expenses:approve', 'expenses:delete',
    'products:view', 'products:edit',
    'inventory:view', 'inventory:adjust',
    'reports:view', 'reports:export',
    'settings:view', 'settings:edit',
    'access:view_members', 'access:invite', 'access:remove', 'access:manage_roles',
    'billing:manage'
  ];
  admin_permissions TEXT[] := ARRAY[
    'clients:view', 'clients:create', 'clients:edit', 'clients:delete',
    'invoices:view', 'invoices:create', 'invoices:edit', 'invoices:send', 'invoices:delete',
    'quotes:view', 'quotes:create', 'quotes:edit', 'quotes:send', 'quotes:delete',
    'expenses:view', 'expenses:create', 'expenses:edit', 'expenses:approve', 'expenses:delete',
    'products:view', 'products:edit',
    'inventory:view', 'inventory:adjust',
    'reports:view', 'reports:export',
    'settings:view', 'settings:edit',
    'access:view_members', 'access:invite', 'access:remove'
  ];
  accountant_permissions TEXT[] := ARRAY[
    'clients:view',
    'invoices:view', 'invoices:create', 'invoices:edit', 'invoices:send',
    'quotes:view', 'quotes:create', 'quotes:edit', 'quotes:send',
    'expenses:view', 'expenses:create', 'expenses:edit', 'expenses:approve',
    'products:view',
    'inventory:view',
    'reports:view', 'reports:export',
    'settings:view'
  ];
  employee_permissions TEXT[] := ARRAY[
    'clients:view', 'clients:create', 'clients:edit',
    'invoices:view', 'invoices:create', 'invoices:edit',
    'quotes:view', 'quotes:create', 'quotes:edit',
    'expenses:view', 'expenses:create', 'expenses:edit',
    'products:view',
    'inventory:view'
  ];
  viewer_permissions TEXT[] := ARRAY[
    'clients:view',
    'invoices:view',
    'quotes:view',
    'expenses:view',
    'products:view',
    'inventory:view',
    'reports:view'
  ];
  perm TEXT;
BEGIN
  -- Create Owner role (system role)
  INSERT INTO public.company_roles (company_id, name, description, is_system)
  VALUES (_company_id, 'Owner', 'Full access to all company features and settings', true)
  RETURNING id INTO owner_role_id;
  
  -- Create Admin role
  INSERT INTO public.company_roles (company_id, name, description, is_system)
  VALUES (_company_id, 'Admin', 'Administrative access without billing management', false)
  RETURNING id INTO admin_role_id;
  
  -- Create Accountant role
  INSERT INTO public.company_roles (company_id, name, description, is_system)
  VALUES (_company_id, 'Accountant', 'Access to financial features and reports', false)
  RETURNING id INTO accountant_role_id;
  
  -- Create Employee role
  INSERT INTO public.company_roles (company_id, name, description, is_system)
  VALUES (_company_id, 'Employee', 'Basic access for day-to-day operations', false)
  RETURNING id INTO employee_role_id;
  
  -- Create Viewer role
  INSERT INTO public.company_roles (company_id, name, description, is_system)
  VALUES (_company_id, 'Viewer', 'Read-only access to company data', false)
  RETURNING id INTO viewer_role_id;
  
  -- Add permissions for Owner
  FOREACH perm IN ARRAY all_permissions LOOP
    INSERT INTO public.role_permissions (role_id, permission) VALUES (owner_role_id, perm);
  END LOOP;
  
  -- Add permissions for Admin
  FOREACH perm IN ARRAY admin_permissions LOOP
    INSERT INTO public.role_permissions (role_id, permission) VALUES (admin_role_id, perm);
  END LOOP;
  
  -- Add permissions for Accountant
  FOREACH perm IN ARRAY accountant_permissions LOOP
    INSERT INTO public.role_permissions (role_id, permission) VALUES (accountant_role_id, perm);
  END LOOP;
  
  -- Add permissions for Employee
  FOREACH perm IN ARRAY employee_permissions LOOP
    INSERT INTO public.role_permissions (role_id, permission) VALUES (employee_role_id, perm);
  END LOOP;
  
  -- Add permissions for Viewer
  FOREACH perm IN ARRAY viewer_permissions LOOP
    INSERT INTO public.role_permissions (role_id, permission) VALUES (viewer_role_id, perm);
  END LOOP;
  
  -- Add owner as first member
  INSERT INTO public.company_members (company_id, user_id, role_id, status)
  VALUES (_company_id, _owner_user_id, owner_role_id, 'active');
END;
$$;

-- ===========================================
-- RLS Policies for company_roles
-- ===========================================
CREATE POLICY "Users can view roles for their companies"
ON public.company_roles
FOR SELECT
USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Users with manage_roles permission can create roles"
ON public.company_roles
FOR INSERT
WITH CHECK (public.has_permission(auth.uid(), company_id, 'access:manage_roles'));

CREATE POLICY "Users with manage_roles permission can update roles"
ON public.company_roles
FOR UPDATE
USING (public.has_permission(auth.uid(), company_id, 'access:manage_roles') AND is_system = false);

CREATE POLICY "Users with manage_roles permission can delete non-system roles"
ON public.company_roles
FOR DELETE
USING (public.has_permission(auth.uid(), company_id, 'access:manage_roles') AND is_system = false);

-- ===========================================
-- RLS Policies for role_permissions
-- ===========================================
CREATE POLICY "Users can view permissions for roles in their companies"
ON public.role_permissions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.company_roles cr
    WHERE cr.id = role_permissions.role_id
    AND public.is_company_member(auth.uid(), cr.company_id)
  )
);

CREATE POLICY "Users with manage_roles permission can insert permissions"
ON public.role_permissions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.company_roles cr
    WHERE cr.id = role_permissions.role_id
    AND public.has_permission(auth.uid(), cr.company_id, 'access:manage_roles')
    AND cr.is_system = false
  )
);

CREATE POLICY "Users with manage_roles permission can delete permissions"
ON public.role_permissions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.company_roles cr
    WHERE cr.id = role_permissions.role_id
    AND public.has_permission(auth.uid(), cr.company_id, 'access:manage_roles')
    AND cr.is_system = false
  )
);

-- ===========================================
-- RLS Policies for company_members
-- ===========================================
CREATE POLICY "Users with view_members permission can view members"
ON public.company_members
FOR SELECT
USING (public.has_permission(auth.uid(), company_id, 'access:view_members') OR user_id = auth.uid());

CREATE POLICY "Users with invite permission can add members"
ON public.company_members
FOR INSERT
WITH CHECK (public.has_permission(auth.uid(), company_id, 'access:invite'));

CREATE POLICY "Users with manage_roles permission can update members"
ON public.company_members
FOR UPDATE
USING (public.has_permission(auth.uid(), company_id, 'access:manage_roles'));

CREATE POLICY "Users with remove permission can delete members"
ON public.company_members
FOR DELETE
USING (public.has_permission(auth.uid(), company_id, 'access:remove'));

-- ===========================================
-- RLS Policies for company_invites
-- ===========================================
CREATE POLICY "Users with view_members permission can view invites"
ON public.company_invites
FOR SELECT
USING (public.has_permission(auth.uid(), company_id, 'access:view_members'));

CREATE POLICY "Users with invite permission can create invites"
ON public.company_invites
FOR INSERT
WITH CHECK (public.has_permission(auth.uid(), company_id, 'access:invite'));

CREATE POLICY "Users with invite permission can update invites"
ON public.company_invites
FOR UPDATE
USING (public.has_permission(auth.uid(), company_id, 'access:invite'));

CREATE POLICY "Users with invite permission can delete invites"
ON public.company_invites
FOR DELETE
USING (public.has_permission(auth.uid(), company_id, 'access:invite'));

-- ===========================================
-- Indexes for performance
-- ===========================================
CREATE INDEX idx_company_roles_company_id ON public.company_roles(company_id);
CREATE INDEX idx_role_permissions_role_id ON public.role_permissions(role_id);
CREATE INDEX idx_company_members_company_id ON public.company_members(company_id);
CREATE INDEX idx_company_members_user_id ON public.company_members(user_id);
CREATE INDEX idx_company_members_role_id ON public.company_members(role_id);
CREATE INDEX idx_company_invites_company_id ON public.company_invites(company_id);
CREATE INDEX idx_company_invites_email ON public.company_invites(email);
CREATE INDEX idx_company_invites_token ON public.company_invites(token);