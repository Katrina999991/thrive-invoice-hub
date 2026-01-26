import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CompanySubscription {
  id: string;
  company_id: string;
  plan_type: "free" | "premium" | "pro";
  billing_cycle: "monthly" | "yearly" | null;
  started_at: string;
  expires_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  invoices_this_month: number;
  expenses_this_month: number;
  last_reset_date: string;
  created_at: string;
  updated_at: string;
}

/**
 * Hook to manage company-level subscriptions
 * The subscription is attached to the company, not individual users
 * All team members benefit from the company's plan
 */
export function useCompanySubscription(companyId: string | null) {
  const queryClient = useQueryClient();

  const { data: subscription, isLoading, error } = useQuery({
    queryKey: ["companySubscription", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      
      const { data, error } = await supabase
        .from("company_subscriptions")
        .select("*")
        .eq("company_id", companyId)
        .maybeSingle();
      
      if (error) throw error;
      return data as CompanySubscription | null;
    },
    enabled: !!companyId,
  });

  const updateSubscription = useMutation({
    mutationFn: async (updates: Partial<CompanySubscription>) => {
      if (!companyId) throw new Error("No company ID");
      
      const { error } = await supabase
        .from("company_subscriptions")
        .update(updates)
        .eq("company_id", companyId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companySubscription", companyId] });
      queryClient.invalidateQueries({ queryKey: ["companyPlanLimits", companyId] });
    },
  });

  return {
    subscription,
    isLoading,
    error,
    updateSubscription,
    planType: subscription?.plan_type || "free",
    isPremium: subscription?.plan_type === "premium" || subscription?.plan_type === "pro",
    isPro: subscription?.plan_type === "pro",
  };
}
