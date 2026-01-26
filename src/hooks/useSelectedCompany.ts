import { useState, useCallback, useMemo } from "react";
import { useUserCompanies } from "./useUserCompanies";
import { useCompanyPermissions } from "./useCompanyPermissions";

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

  // Get permissions for the selected company
  const { permissions, hasPermission, loading: permissionsLoading } = useCompanyPermissions(effectiveCompanyId || null);

  // Get role info for selected company
  const currentMembership = useMemo(() => {
    return memberships.find(m => m.company_id === effectiveCompanyId);
  }, [memberships, effectiveCompanyId]);

  const isOwner = useMemo(() => {
    return currentMembership?.role.name === "Owner";
  }, [currentMembership]);

  const isAdmin = useMemo(() => {
    return currentMembership?.role.name === "Admin" || isOwner;
  }, [currentMembership, isOwner]);

  const isViewer = useMemo(() => {
    return currentMembership?.role.name === "Viewer";
  }, [currentMembership]);

  // Common permission checks
  const canCreate = useCallback((module: string) => {
    return hasPermission(`${module}:create`);
  }, [hasPermission]);

  const canEdit = useCallback((module: string) => {
    return hasPermission(`${module}:edit`);
  }, [hasPermission]);

  const canDelete = useCallback((module: string) => {
    return hasPermission(`${module}:delete`);
  }, [hasPermission]);

  const canView = useCallback((module: string) => {
    return hasPermission(`${module}:view`);
  }, [hasPermission]);

  return {
    // Company selection
    selectedCompanyId: effectiveCompanyId,
    setSelectedCompanyId,
    memberships,
    companyIds,
    currentMembership,
    
    // Role info
    isOwner,
    isAdmin,
    isViewer,
    
    // Permissions
    permissions,
    hasPermission,
    canCreate,
    canEdit,
    canDelete,
    canView,
    
    // Loading state
    loading: companiesLoading || permissionsLoading,
  };
}
