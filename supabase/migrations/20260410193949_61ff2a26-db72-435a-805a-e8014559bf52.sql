
-- Update set_role_permissions to enforce protected role hierarchy
CREATE OR REPLACE FUNCTION public.set_role_permissions(
  _role_id uuid,
  _permissions text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _company_id uuid;
  _role_name text;
  _role_is_system boolean;
  _caller_is_owner boolean;
BEGIN
  -- Get role info
  SELECT company_id, name, is_system INTO _company_id, _role_name, _role_is_system
  FROM public.company_roles
  WHERE id = _role_id;

  IF _company_id IS NULL THEN
    RAISE EXCEPTION 'Role not found';
  END IF;

  -- Check if caller has manage_roles permission
  IF NOT public.has_permission(auth.uid(), _company_id, 'access:manage_roles') THEN
    RAISE EXCEPTION 'Permission denied: access:manage_roles required';
  END IF;

  -- Owner role is NEVER editable
  IF _role_name = 'Owner' THEN
    RAISE EXCEPTION 'The Owner role cannot be modified';
  END IF;

  -- Admin role can only be modified by the company owner
  IF _role_name = 'Admin' THEN
    _caller_is_owner := public.is_company_owner(auth.uid(), _company_id);
    IF NOT _caller_is_owner THEN
      RAISE EXCEPTION 'Only the company owner can modify the Admin role';
    END IF;
  END IF;

  -- Delete existing permissions
  DELETE FROM public.role_permissions WHERE role_id = _role_id;

  -- Insert new permissions
  INSERT INTO public.role_permissions (role_id, permission)
  SELECT _role_id, unnest(_permissions);
END;
$$;

-- Update update_company_role to enforce protected role hierarchy
CREATE OR REPLACE FUNCTION public.update_company_role(
  _role_id uuid,
  _name text,
  _description text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _company_id uuid;
  _role_name text;
  _role_is_system boolean;
  _caller_is_owner boolean;
BEGIN
  -- Get role info
  SELECT company_id, name, is_system INTO _company_id, _role_name, _role_is_system
  FROM public.company_roles
  WHERE id = _role_id;

  IF _company_id IS NULL THEN
    RAISE EXCEPTION 'Role not found';
  END IF;

  -- Check if caller has manage_roles permission
  IF NOT public.has_permission(auth.uid(), _company_id, 'access:manage_roles') THEN
    RAISE EXCEPTION 'Permission denied: access:manage_roles required';
  END IF;

  -- Owner role is NEVER editable
  IF _role_name = 'Owner' THEN
    RAISE EXCEPTION 'The Owner role cannot be modified';
  END IF;

  -- Admin role can only be modified by the company owner
  IF _role_name = 'Admin' THEN
    _caller_is_owner := public.is_company_owner(auth.uid(), _company_id);
    IF NOT _caller_is_owner THEN
      RAISE EXCEPTION 'Only the company owner can modify the Admin role';
    END IF;
  END IF;

  -- System roles cannot have their name changed
  IF _role_is_system THEN
    UPDATE public.company_roles
    SET description = COALESCE(_description, description),
        updated_at = now()
    WHERE id = _role_id;
  ELSE
    UPDATE public.company_roles
    SET name = _name,
        description = _description,
        updated_at = now()
    WHERE id = _role_id;
  END IF;
END;
$$;
