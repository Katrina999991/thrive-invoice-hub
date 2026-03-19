import { useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { usePermissions } from "@/hooks/usePermissions";
import { checkPermission } from "@/lib/permissions";

export type AuthorizationReason = 
  | "missing_permission" 
  | "feature_not_in_plan" 
  | "limit_reached" 
  | "member_not_active" 
  | "not_a_member"
  | null;

export interface AuthorizationResult {
  allowed: boolean;
  reason: AuthorizationReason;
  current?: number;
  limit?: number;
}

export interface CompanyPlanLimits {
  plan_type: "free" | "premium" | "pro";
  max_companies: number | null;
  max_clients: number | null;
  max_invoices_per_month: number | null;
  max_expenses_per_month: number | null;
  invoices_used: number;
  expenses_used: number;
  pdf_export: boolean;
  all_invoice_templates: boolean;
  custom_email_templates: boolean;
  all_reports: boolean;
  category_management: boolean;
  quotes_enabled: boolean;
  final_reminder_enabled: boolean;
  formal_notice_enabled: boolean;
}

export type FeatureKey = 
  | "pdf_export" 
  | "all_invoice_templates" 
  | "custom_email_templates" 
  | "all_reports" 
  | "category_management" 
  | "quotes_enabled"
  | "final_reminder_enabled"
  | "formal_notice_enabled";

export type LimitType = "invoices" | "expenses" | "clients";

/**
 * Unified authorization hook that checks both:
 * 1. Company plan features/limits
 * 2. User role permissions (via centralized usePermissions)
 * 
 * This ensures invited team members benefit from the company's plan
 * while still respecting their role-based permissions.
 */
export function useAuthorization(companyId: string | null) {
  const { user } = useAuth();
  
  // Use centralized permissions hook
  const { 
    can, 
    permissions, 
    abilities,
    loading: permissionsLoading,
    refetch: refetchPermissions,
    invalidatePermissions
  } = usePermissions(companyId);

  // Fetch company plan limits
  const { data: planLimits, isLoading: planLoading } = useQuery({
    queryKey: ["companyPlanLimits", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      
      const { data, error } = await supabase
        .rpc('get_company_plan_limits', { _company_id: companyId })
        .single();
      
      if (error) {
        console.error("Error fetching company plan limits:", error);
        return null;
      }
      
      return data as CompanyPlanLimits;
    },
    enabled: !!companyId,
    staleTime: 30000, // 30 seconds
  });

  const loading = planLoading || permissionsLoading;

  /**
   * Check if user has a specific permission
   * Delegates to centralized can() function
   */
  const hasPermission = useCallback((permission: string): boolean => {
    return can(permission);
  }, [can]);

  /**
   * Check if the company plan includes a feature
   */
  const hasFeature = useCallback((featureKey: FeatureKey): boolean => {
    if (!planLimits) return false;
    return planLimits[featureKey] === true;
  }, [planLimits]);

  /**
   * Check if a limit is reached
   */
  const isLimitReached = useCallback((limitType: LimitType): { reached: boolean; current: number; limit: number | null } => {
    if (!planLimits) return { reached: false, current: 0, limit: null };
    
    switch (limitType) {
      case "invoices":
        return {
          reached: planLimits.max_invoices_per_month !== null && 
                   planLimits.invoices_used >= planLimits.max_invoices_per_month,
          current: planLimits.invoices_used,
          limit: planLimits.max_invoices_per_month
        };
      case "expenses":
        return {
          reached: planLimits.max_expenses_per_month !== null && 
                   planLimits.expenses_used >= planLimits.max_expenses_per_month,
          current: planLimits.expenses_used,
          limit: planLimits.max_expenses_per_month
        };
      case "clients":
        return {
          reached: false, // Would need to count clients
          current: 0,
          limit: planLimits.max_clients
        };
      default:
        return { reached: false, current: 0, limit: null };
    }
  }, [planLimits]);

  /**
   * Main authorization function - checks both plan AND permissions
   * 
   * @param permission - Required permission string (e.g., "invoices:create")
   * @param featureKey - Optional feature that must be included in plan
   * @param checkLimit - Optional limit type to check
   * @returns AuthorizationResult with allowed status and reason
   */
  const authorize = useCallback(async (
    permission?: string,
    featureKey?: FeatureKey,
    checkLimit?: LimitType
  ): Promise<AuthorizationResult> => {
    if (!companyId || !user?.id) {
      return { allowed: false, reason: "not_a_member" };
    }

    // Use the database function for server-side validation
    const { data, error } = await supabase
      .rpc('authorize_action', {
        _company_id: companyId,
        _user_id: user.id,
        _permission: permission || null,
        _feature_key: featureKey || null,
        _check_limit: checkLimit || null
      });

    if (error) {
      console.error("Authorization error:", error);
      return { allowed: false, reason: "not_a_member" };
    }

    // Parse the JSONB response
    const result = data as unknown as AuthorizationResult;
    return {
      allowed: result.allowed ?? false,
      reason: result.reason ?? null,
      current: result.current,
      limit: result.limit
    };
  }, [companyId, user?.id]);

  /**
   * Synchronous authorization check using cached data
   * Use this for UI rendering, not for actual access control
   */
  const authorizeSync = useCallback((
    permission?: string,
    featureKey?: FeatureKey,
    checkLimit?: LimitType
  ): AuthorizationResult => {
    // Check permission first
    if (permission && !hasPermission(permission)) {
      return { allowed: false, reason: "missing_permission" };
    }

    // Check feature availability
    if (featureKey && !hasFeature(featureKey)) {
      return { allowed: false, reason: "feature_not_in_plan" };
    }

    // Check limits
    if (checkLimit) {
      const limitCheck = isLimitReached(checkLimit);
      if (limitCheck.reached) {
        return { 
          allowed: false, 
          reason: "limit_reached",
          current: limitCheck.current,
          limit: limitCheck.limit || undefined
        };
      }
    }

    return { allowed: true, reason: null };
  }, [hasPermission, hasFeature, isLimitReached]);

  /**
   * Check if user can manage billing (is owner or has billing:manage permission)
   */
  const canManageBilling = useMemo(() => {
    return hasPermission("billing:manage");
  }, [hasPermission]);

  return {
    // Data
    planLimits,
    permissions,
    loading,
    
    // Permission checks (centralized)
    hasPermission,
    can,
    abilities,
    
    // Plan feature checks
    hasFeature,
    isLimitReached,
    
    // Combined authorization
    authorize,
    authorizeSync,
    
    // Convenience helpers
    canManageBilling,
    isOwner: abilities.isOwner,
    isAdmin: abilities.isAdmin,
    planType: planLimits?.plan_type || "free",
    
    // Cache management
    refetchPermissions,
    invalidatePermissions,
  };
}
