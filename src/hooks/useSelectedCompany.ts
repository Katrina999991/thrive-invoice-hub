import { useState, useCallback, useMemo, useEffect } from "react";
import { useUserCompanies } from "./useUserCompanies";
import { usePermissions } from "./usePermissions";

const STORAGE_KEY = "selectedCompanyId";

/**
 * Hook to manage selected company context and permissions
 * Use this in pages that need both company selection and permission checks
 */
export function useSelectedCompany(initialCompanyId?: string) {
  const { memberships, companyIds, loading: companiesLoading } = useUserCompanies();
  const [selectedCompanyId, setSelectedCompanyIdState] = useState<string>(
    initialCompanyId || localStorage.getItem(STORAGE_KEY) || ""
  );

  // Persist to localStorage on change
  const setSelectedCompanyId = useCallback((id: string) => {
    setSelectedCompanyIdState(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    }
  }, []);
  
  // Auto-select first company if current selection is invalid
  const effectiveCompanyId = useMemo(() => {
    // If selected company is in the user's list, use it
    if (selectedCompanyId && companyIds.includes(selectedCompanyId)) return selectedCompanyId;
    // Otherwise fall back to first available
    if (companyIds.length > 0) return companyIds[0];
    return "";
  }, [selectedCompanyId, companyIds]);

  // Sync effective ID back to state and localStorage
  useEffect(() => {
    if (effectiveCompanyId && effectiveCompanyId !== selectedCompanyId) {
      setSelectedCompanyId(effectiveCompanyId);
    }
  }, [effectiveCompanyId, selectedCompanyId, setSelectedCompanyId]);

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

  // If user has no companies yet, they should have full permissions
  // (they're setting up their account for the first time)
  const hasNoCompany = !companiesLoading && companyIds.length === 0;

  // Common permission checks using centralized can()
  const hasPermission = useCallback((permission: string) => {
    if (hasNoCompany) return true;
    return can(permission);
  }, [can, hasNoCompany]);

  const canCreate = useCallback((module: string) => {
    if (hasNoCompany) return true;
    return can(`${module}:create`);
  }, [can, hasNoCompany]);

  const canEdit = useCallback((module: string) => {
    if (hasNoCompany) return true;
    return can(`${module}:edit`);
  }, [can, hasNoCompany]);

  const canDelete = useCallback((module: string) => {
    if (hasNoCompany) return true;
    return can(`${module}:delete`);
  }, [can, hasNoCompany]);

  const canView = useCallback((module: string) => {
    if (hasNoCompany) return true;
    return can(`${module}:view`);
  }, [can, hasNoCompany]);

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
    
    // Loading state - true when any part of the chain is not ready
    // This prevents a gap where companies loaded but permissions queries aren't enabled yet
    loading: companiesLoading || permissionsLoading || (!effectiveCompanyId && companyIds.length === 0 && companiesLoading),
  };
}
