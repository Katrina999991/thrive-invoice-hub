import { useState, useCallback, useMemo } from "react";
import { useUserCompanies } from "./useUserCompanies";
import { usePermissions } from "./usePermissions";

/**
 * Hook to manage selected company context and permissions
 * Use this in pages that need both company selection and permission checks
 */
export function useSelectedCompany(initialCompanyId?: string) {
  const { memberships, companyIds, loading: companiesLoading } = useUserCompanies();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(initialCompanyId || "");
  
  // Auto-select first company if none selected
  const effectiveCompanyId = useMemo(() => {
    if (selectedCompanyId) return selectedCompanyId;
    if (companyIds.length > 0) return companyIds[0];
    return "";
  }, [selectedCompanyId, companyIds]);

  // Get permissions for the selected company using centralized hook
  const { 
    can, 
    canAll,
    canAny,
    permissions, 
    abilities,
    loading: permissionsLoading,
    refetch: refetchPermissions,
    invalidatePermissions
  } = usePermissions(effectiveCompanyId || null);

  // Get membership info for selected company
  const currentMembership = useMemo(() => {
    return memberships.find(m => m.company_id === effectiveCompanyId);
  }, [memberships, effectiveCompanyId]);

  // Common permission checks using centralized can()
  const hasPermission = useCallback((permission: string) => {
    return can(permission);
  }, [can]);

  const canCreate = useCallback((module: string) => {
    return can(`${module}:create`);
  }, [can]);

  const canEdit = useCallback((module: string) => {
    return can(`${module}:edit`);
  }, [can]);

  const canDelete = useCallback((module: string) => {
    return can(`${module}:delete`);
  }, [can]);

  const canView = useCallback((module: string) => {
    return can(`${module}:view`);
  }, [can]);

  return {
    // Company selection
    selectedCompanyId: effectiveCompanyId,
    setSelectedCompanyId,
    memberships,
    companyIds,
    currentMembership,
    
    // Role info (from centralized abilities)
    isOwner: abilities.isOwner,
    isAdmin: abilities.isAdmin,
    isViewer: abilities.isViewer,
    roleName: abilities.roleName,
    
    // Permissions - centralized
    permissions,
    hasPermission,
    can,
    canAll,
    canAny,
    canCreate,
    canEdit,
    canDelete,
    canView,
    
    // Cache management
    refetchPermissions,
    invalidatePermissions,
    
    // Loading state
    loading: companiesLoading || permissionsLoading,
  };
}
