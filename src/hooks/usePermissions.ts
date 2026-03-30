import { useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  checkPermission, 
  normalizePermissions, 
  expandPermissions,
  PermissionKey,
  SYSTEM_ROLES 
} from "@/lib/permissions";

export interface UserAbilities {
  permissions: string[];
  expandedPermissions: string[];
  roleName: string | null;
  roleId: string | null;
  isOwner: boolean;
  isAdmin: boolean;
  isAccountant: boolean;
  isEmployee: boolean;
  isViewer: boolean;
  isMember: boolean;
  memberStatus: string | null;
}

interface MembershipData {
  role_id: string;
  status: string;
  role: {
    id: string;
    name: string;
  };
}

/**
 * Centralized permissions hook - SINGLE SOURCE OF TRUTH
 * 
 * Usage:
 * const { can, abilities, loading } = usePermissions(companyId);
 * 
 * if (can("expenses:create")) { ... }
 * if (abilities.isOwner) { ... }
 */
export function usePermissions(companyId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Query key factory for consistent cache management
  const queryKeys = useMemo(() => ({
    membership: ["companyMembership", companyId, user?.id] as const,
    permissions: ["userPermissions", companyId, user?.id] as const,
  }), [companyId, user?.id]);

  // Fetch user's membership in this company (includes role info)
  const { 
    data: membership, 
    isLoading: membershipLoading,
    refetch: refetchMembership 
  } = useQuery({
    queryKey: queryKeys.membership,
    queryFn: async (): Promise<MembershipData | null> => {
      if (!companyId || !user?.id) return null;

      const { data, error } = await supabase
        .from("company_members")
        .select(`
          role_id,
          status,
          role:company_roles!inner (
            id,
            name
          )
        `)
        .eq("company_id", companyId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching membership:", error);
        return null;
      }

      if (!data) return null;

      return {
        role_id: data.role_id,
        status: data.status,
        role: data.role as unknown as { id: string; name: string },
      };
    },
    enabled: !!companyId && !!user?.id,
    staleTime: 30000, // 30 seconds
  });

  // Fetch user's permissions from the database
  const { 
    data: rawPermissions = [], 
    isLoading: permissionsLoading,
    refetch: refetchPermissions 
  } = useQuery({
    queryKey: queryKeys.permissions,
    queryFn: async (): Promise<string[]> => {
      if (!companyId || !user?.id) return [];

      const { data, error } = await supabase.rpc("get_user_permissions", {
        _company_id: companyId,
        _user_id: user.id,
      });

      if (error) {
        console.error("Error fetching permissions:", error);
        return [];
      }

      return (data || []) as string[];
    },
    enabled: !!companyId && !!user?.id,
    staleTime: 30000,
  });

  // Compute user abilities from membership and permissions
  const abilities = useMemo((): UserAbilities => {
    const roleName = membership?.role?.name || null;
    const normalizedPermissions = normalizePermissions(rawPermissions);
    const expandedPermissions = expandPermissions(normalizedPermissions);

    return {
      permissions: normalizedPermissions,
      expandedPermissions,
      roleName,
      roleId: membership?.role_id || null,
      isOwner: roleName === SYSTEM_ROLES.OWNER,
      isAdmin: roleName === SYSTEM_ROLES.ADMIN || roleName === SYSTEM_ROLES.OWNER,
      isAccountant: roleName === SYSTEM_ROLES.ACCOUNTANT,
      isEmployee: roleName === SYSTEM_ROLES.EMPLOYEE,
      isViewer: roleName === SYSTEM_ROLES.VIEWER,
      isMember: membership?.status === "active",
      memberStatus: membership?.status || null,
    };
  }, [membership, rawPermissions]);

  /**
   * Check if user has a specific permission
   * Handles hierarchical permission resolution
   */
  const can = useCallback((permission: PermissionKey | string): boolean => {
    // Owners have all permissions
    if (abilities.isOwner) return true;
    if (!abilities.isMember) return false;
    return checkPermission(abilities.permissions, permission);
  }, [abilities]);

  /**
   * Check multiple permissions - returns true if user has ALL
   */
  const canAll = useCallback((permissions: (PermissionKey | string)[]): boolean => {
    return permissions.every(p => can(p));
  }, [can]);

  /**
   * Check multiple permissions - returns true if user has ANY
   */
  const canAny = useCallback((permissions: (PermissionKey | string)[]): boolean => {
    return permissions.some(p => can(p));
  }, [can]);

  /**
   * Invalidate and refetch permissions
   * Call this when role or permissions change
   */
  const invalidatePermissions = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["userPermissions", companyId] });
    await queryClient.invalidateQueries({ queryKey: ["companyMembership", companyId] });
  }, [queryClient, companyId]);

  /**
   * Force refetch all permission data
   */
  const refetch = useCallback(async () => {
    await Promise.all([refetchMembership(), refetchPermissions()]);
  }, [refetchMembership, refetchPermissions]);

  return {
    // Main API
    can,
    canAll,
    canAny,
    abilities,
    
    // Raw data
    permissions: abilities.permissions,
    expandedPermissions: abilities.expandedPermissions,
    
    // Role shortcuts
    isOwner: abilities.isOwner,
    isAdmin: abilities.isAdmin,
    isMember: abilities.isMember,
    roleName: abilities.roleName,
    
    // Loading state - also true when queries are disabled but we expect data
    // In TanStack Query v5, isLoading is false when enabled is false,
    // so we must also check if we're waiting for companyId/userId
    loading: membershipLoading || permissionsLoading,
    
    // Cache management
    invalidatePermissions,
    refetch,
  };
}

/**
 * Hook to check if permission changes should trigger a refetch
 * Use this in components that modify roles/permissions
 */
export function usePermissionInvalidation(companyId: string | null) {
  const queryClient = useQueryClient();

  const invalidateCompanyPermissions = useCallback(async () => {
    await queryClient.invalidateQueries({ 
      queryKey: ["userPermissions", companyId] 
    });
    await queryClient.invalidateQueries({ 
      queryKey: ["companyMembership", companyId] 
    });
  }, [queryClient, companyId]);

  const invalidateAllPermissions = useCallback(async () => {
    await queryClient.invalidateQueries({ 
      predicate: (query) => 
        query.queryKey[0] === "userPermissions" || 
        query.queryKey[0] === "companyMembership"
    });
  }, [queryClient]);

  return {
    invalidateCompanyPermissions,
    invalidateAllPermissions,
  };
}
