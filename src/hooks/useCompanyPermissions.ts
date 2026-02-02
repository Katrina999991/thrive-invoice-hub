/**
 * @deprecated Use usePermissions from "@/hooks/usePermissions" instead
 * This hook is kept for backward compatibility and delegates to usePermissions
 */
import { usePermissions } from "@/hooks/usePermissions";

export function useCompanyPermissions(companyId: string | null) {
  const { 
    can, 
    permissions, 
    loading, 
    refetch 
  } = usePermissions(companyId);

  // Backward-compatible hasPermission function
  const hasPermission = (permission: string): boolean => {
    return can(permission);
  };

  return {
    permissions,
    hasPermission,
    loading,
    refetch
  };
}
