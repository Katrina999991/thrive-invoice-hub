import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

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
}

export const useSubscription = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user's plan limits
  const { data: planLimits, isLoading: isLoadingLimits } = useQuery({
    queryKey: ["planLimits", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .rpc('get_user_plan_limits', { user_uuid: user.id })
        .single();
      
      if (error) throw error;
      return data as PlanLimits;
    },
    enabled: !!user?.id,
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

  // Fetch current subscription details
  const { data: currentSubscription } = useQuery({
    queryKey: ["currentSubscription", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("user_subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
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
    
    const table = limitType === 'companies' ? 'companies' : 'clients';
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    
    if (error) throw error;
    
    const limit = limitType === 'companies' 
      ? planLimits.max_companies 
      : planLimits.max_clients;
    
    const canAdd = limit === null || (count ?? 0) < limit;
    
    return { canAdd, current: count ?? 0, limit };
  };

  return {
    planLimits,
    availablePlans,
    currentSubscription,
    isLoading: isLoadingLimits || isLoadingPlans,
    canUseFeature,
    isLimitReached,
    checkLimit,
  };
};