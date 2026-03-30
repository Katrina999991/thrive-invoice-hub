import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useUserCompanies } from "./useUserCompanies";
import { useMemo } from "react";

export type PlanType = 'free' | 'premium' | 'pro';
export type BillingCycle = 'monthly' | 'yearly';

export interface PlanLimits {
  plan_type: PlanType;
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
  quotes_enabled?: boolean;
  final_reminder_enabled?: boolean;
  formal_notice_enabled?: boolean;
}

export interface SubscriptionPlan {
  id: string;
  plan_type: PlanType;
  name_en: string;
  name_fr: string;
  description_en: string;
  description_fr: string;
  monthly_price: number;
  yearly_price: number;
  max_companies: number | null;
  max_clients: number | null;
  max_invoices_per_month: number | null;
  max_expenses_per_month: number | null;
  pdf_export: boolean;
  all_invoice_templates: boolean;
  custom_email_templates: boolean;
  all_reports: boolean;
  category_management: boolean;
  quotes_enabled: boolean;
}

/**
 * useSubscription hook - now uses company-based subscriptions
 * 
 * When a companyId is provided, it uses the company's plan.
 * When no companyId is provided, it tries to use the first company the user has access to.
 * This ensures invited team members benefit from the company's plan.
 */
export const useSubscription = (companyId?: string | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { memberships, loading: companiesLoading } = useUserCompanies();

  // Determine which company to use for plan limits
  const effectiveCompanyId = useMemo(() => {
    if (companyId) return companyId;
    // If no companyId provided, use the first company the user has access to
    if (memberships && memberships.length > 0) {
      return memberships[0].company_id;
    }
    return null;
  }, [companyId, memberships]);

  // Fetch company plan limits (not user plan limits)
  const { data: planLimits, isLoading: isLoadingLimits } = useQuery({
    queryKey: ["companyPlanLimits", effectiveCompanyId, user?.id],
    queryFn: async () => {
      // Try company plan limits first
      if (effectiveCompanyId) {
        const { data, error } = await supabase
          .rpc('get_company_plan_limits', { _company_id: effectiveCompanyId })
          .single();
        
        if (!error && data) return data as PlanLimits;
        console.error("Error fetching company plan limits:", error);
      }
      
      // Fallback to user plan limits (for users without a company or when company plan fails)
      if (user?.id) {
        const { data: userData, error: userError } = await supabase
          .rpc('get_user_plan_limits', { user_uuid: user.id })
          .single();
        if (!userError && userData) return userData as PlanLimits;
      }
      
      return null;
    },
    enabled: !!effectiveCompanyId || !!user?.id,
    staleTime: 30000, // 30 seconds cache
  });

  // Fetch all available plans
  const { data: availablePlans, isLoading: isLoadingPlans } = useQuery({
    queryKey: ["subscriptionPlans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .order('monthly_price');
      
      if (error) throw error;
      return data as SubscriptionPlan[];
    },
  });

  // Fetch current company subscription details
  const { data: currentSubscription } = useQuery({
    queryKey: ["companySubscription", effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      
      const { data, error } = await supabase
        .from("company_subscriptions")
        .select("*")
        .eq("company_id", effectiveCompanyId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveCompanyId,
  });

  // Check if feature is available
  const canUseFeature = (feature: keyof PlanLimits) => {
    if (!planLimits) return false;
    return planLimits[feature] === true;
  };

  // Check if limit is reached
  const isLimitReached = (limitType: 'companies' | 'clients' | 'invoices' | 'expenses') => {
    if (!planLimits) return false;
    
    switch (limitType) {
      case 'invoices':
        return planLimits.max_invoices_per_month !== null && 
               planLimits.invoices_used >= planLimits.max_invoices_per_month;
      case 'expenses':
        return planLimits.max_expenses_per_month !== null && 
               planLimits.expenses_used >= planLimits.max_expenses_per_month;
      default:
        return false;
    }
  };

  // Check current count against limit
  const checkLimit = async (limitType: 'companies' | 'clients') => {
    if (!user?.id || !planLimits) return { canAdd: true, current: 0, limit: null };
    
    if (limitType === 'companies') {
      // For companies, count all companies the user owns
      const { count, error } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      const limit = planLimits.max_companies;
      const canAdd = limit === null || (count ?? 0) < limit;
      
      return { canAdd, current: count ?? 0, limit };
    } else {
      // For clients, count clients in the effective company
      if (!effectiveCompanyId) return { canAdd: true, current: 0, limit: null };
      
      const { count, error } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', effectiveCompanyId);
      
      if (error) throw error;
      
      const limit = planLimits.max_clients;
      const canAdd = limit === null || (count ?? 0) < limit;
      
      return { canAdd, current: count ?? 0, limit };
    }
  };

  return {
    planLimits,
    availablePlans,
    currentSubscription,
    isLoading: isLoadingLimits || isLoadingPlans || companiesLoading,
    canUseFeature,
    isLimitReached,
    checkLimit,
    // Expose the effective company ID for debugging/reference
    effectiveCompanyId,
  };
};
