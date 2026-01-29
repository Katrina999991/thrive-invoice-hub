import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useCompanyPermissions(companyId: string | null) {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!user?.id || !companyId) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_user_permissions', {
        _company_id: companyId,
        _user_id: user.id
      });

      if (error) throw error;
      setPermissions(data || []);
    } catch (error) {
      console.error("Error fetching permissions:", error);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, companyId]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasPermission = useCallback((permission: string): boolean => {
    // Direct match
    if (permissions.includes(permission)) return true;
    
    // For base permissions like "expenses:view", also check granular variants
    // e.g., "expenses:view" should return true if user has "expenses:view_own" or "expenses:view_all"
    if (permission.endsWith(':view')) {
      const module = permission.replace(':view', '');
      return permissions.includes(`${module}:view_own`) || permissions.includes(`${module}:view_all`);
    }
    if (permission.endsWith(':edit')) {
      const module = permission.replace(':edit', '');
      return permissions.includes(`${module}:edit_own`) || permissions.includes(`${module}:edit_all`);
    }
    if (permission.endsWith(':delete')) {
      const module = permission.replace(':delete', '');
      return permissions.includes(`${module}:delete_own`) || permissions.includes(`${module}:delete_all`);
    }
    
    return false;
  }, [permissions]);

  return {
    permissions,
    hasPermission,
    loading,
    refetch: fetchPermissions
  };
}
