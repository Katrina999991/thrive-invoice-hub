import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  resolveLateFeeSettings,
  checkLateFeeEligibility,
  getDefaultTermsText,
  shouldAutoApply,
  type ResolvedLateFeeSettings,
  type CompanyLateFeeSettings,
  type ClientLateFeeOverrides,
  type LateFeeEligibility,
  type EnhancedLateFeeRecord,
} from "@/lib/lateFeeService";

// Re-export for backward compat
export type { ResolvedLateFeeSettings as LateFeeSettings, LateFeeEligibility, EnhancedLateFeeRecord as LateFeeRecord };
export { resolveLateFeeSettings, getDefaultTermsText };

export const useLateFees = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [applying, setApplying] = useState(false);

  const getResolvedSettings = (
    company: CompanyLateFeeSettings,
    client?: ClientLateFeeOverrides | null
  ): ResolvedLateFeeSettings => {
    return resolveLateFeeSettings(company, client);
  };

  const checkEligibility = (
    invoice: any,
    settings: ResolvedLateFeeSettings,
    activeLateFeeCount?: number
  ): LateFeeEligibility => {
    return checkLateFeeEligibility(
      {
        status: invoice.status,
        due_date: invoice.due_date,
        total: invoice.total,
        late_fee_applied_total: invoice.late_fee_applied_total || 0,
        late_fee_status: invoice.late_fee_status || 'none',
        late_fee_last_applied_at: invoice.late_fee_last_applied_at || null,
      },
      settings,
      activeLateFeeCount ?? (invoice.late_fee_status === 'applied' ? 1 : 0)
    );
  };

  const applyLateFee = async (
    invoiceId: string,
    amount: number,
    feeType: string,
    description: string,
    source: string = 'manual',
    metadata?: {
      companyId?: string;
      clientId?: string;
      rateUsed?: number;
      remainingBalance?: number;
      graceDaysUsed?: number;
      capInEffect?: number;
    }
  ): Promise<boolean> => {
    if (!user) return false;
    setApplying(true);

    try {
      const { error: feeError } = await supabase
        .from("invoice_late_fees" as any)
        .insert({
          invoice_id: invoiceId,
          amount,
          fee_type: feeType,
          description,
          applied_by: source === 'manual' ? user.id : null,
          source,
          status: 'active',
          company_id: metadata?.companyId || null,
          client_id: metadata?.clientId || null,
          rate_used: metadata?.rateUsed || null,
          remaining_balance_at_calc: metadata?.remainingBalance || null,
          grace_days_used: metadata?.graceDaysUsed || null,
          cap_in_effect: metadata?.capInEffect || null,
        });

      if (feeError) throw feeError;

      // Get current active total
      const { data: activeFees, error: fetchError } = await supabase
        .from("invoice_late_fees" as any)
        .select("amount")
        .eq("invoice_id", invoiceId)
        .eq("status", "active");

      if (fetchError) throw fetchError;

      const newTotal = (activeFees || []).reduce((sum: number, f: any) => sum + (f.amount || 0), 0);

      const { error: updateError } = await supabase
        .from("invoices")
        .update({
          late_fee_applied_total: newTotal,
          late_fee_last_applied_at: new Date().toISOString(),
          late_fee_status: 'applied',
        } as any)
        .eq("id", invoiceId);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: `Late fee of $${amount.toFixed(2)} applied successfully`,
      });

      return true;
    } catch (error: any) {
      console.error("Error applying late fee:", error);
      toast({
        title: "Error",
        description: "Failed to apply late fee",
        variant: "destructive",
      });
      return false;
    } finally {
      setApplying(false);
    }
  };

  const fetchLateFees = async (invoiceId: string): Promise<EnhancedLateFeeRecord[]> => {
    const { data, error } = await supabase
      .from("invoice_late_fees" as any)
      .select("*")
      .eq("invoice_id", invoiceId)
      .order("applied_at", { ascending: false });

    if (error) {
      console.error("Error fetching late fees:", error);
      return [];
    }

    return (data || []) as unknown as EnhancedLateFeeRecord[];
  };

  const fetchActiveLateFeeCount = async (invoiceId: string): Promise<number> => {
    const { data, error } = await supabase
      .from("invoice_late_fees" as any)
      .select("id")
      .eq("invoice_id", invoiceId)
      .eq("status", "active");

    if (error) return 0;
    return (data || []).length;
  };

  const removeLateFee = async (
    lateFeeId: string,
    invoiceId: string,
    reason?: string
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      // Soft-delete: update status to removed
      const { error: updateFeeError } = await supabase
        .from("invoice_late_fees" as any)
        .update({
          status: 'removed',
          removed_at: new Date().toISOString(),
          removed_by: user.id,
          removal_reason: reason || 'Removed by user',
        })
        .eq("id", lateFeeId);

      if (updateFeeError) throw updateFeeError;

      // Recalculate active total
      const { data: activeFees, error: fetchError } = await supabase
        .from("invoice_late_fees" as any)
        .select("amount")
        .eq("invoice_id", invoiceId)
        .eq("status", "active");

      if (fetchError) throw fetchError;

      const newTotal = (activeFees || []).reduce((sum: number, f: any) => sum + (f.amount || 0), 0);
      const hasActive = (activeFees || []).length > 0;

      const { error: updateError } = await supabase
        .from("invoices")
        .update({
          late_fee_applied_total: newTotal,
          late_fee_status: hasActive ? 'applied' : 'none',
          ...(hasActive ? {} : { late_fee_last_applied_at: null }),
        } as any)
        .eq("id", invoiceId);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Late fee removed successfully",
      });

      return true;
    } catch (error: any) {
      console.error("Error removing late fee:", error);
      toast({
        title: "Error",
        description: "Failed to remove late fee",
        variant: "destructive",
      });
      return false;
    }
  };

  // Keep backward compat
  const deleteLateFee = removeLateFee;

  const getLateFeeTermsText = (settings: ResolvedLateFeeSettings, language: string): string | null => {
    return getDefaultTermsText(settings, language);
  };

  /**
   * Evaluate and optionally auto-apply a late fee for a single invoice.
   * Idempotent: safe to call multiple times.
   */
  const evaluateAndAutoApply = async (
    invoice: any,
    companySettings: CompanyLateFeeSettings,
    clientOverrides?: ClientLateFeeOverrides | null
  ): Promise<{ applied: boolean; eligibility: LateFeeEligibility }> => {
    const resolved = resolveLateFeeSettings(companySettings, clientOverrides);
    const activeCount = await fetchActiveLateFeeCount(invoice.id);
    const eligibility = checkLateFeeEligibility(
      {
        status: invoice.status,
        due_date: invoice.due_date,
        total: invoice.total,
        late_fee_applied_total: invoice.late_fee_applied_total || 0,
        late_fee_status: invoice.late_fee_status || 'none',
        late_fee_last_applied_at: invoice.late_fee_last_applied_at || null,
      },
      resolved,
      activeCount
    );

    if (!shouldAutoApply(resolved, eligibility, activeCount)) {
      return { applied: false, eligibility };
    }

    const description = resolved.late_fee_type === 'fixed_once'
      ? 'Late fee (fixed - auto)'
      : 'Late fee (monthly - auto)';

    const client = clientOverrides as any;
    const success = await applyLateFee(
      invoice.id,
      eligibility.calculatedAmount!,
      resolved.late_fee_type,
      description,
      'automatic',
      {
        companyId: client?.company_id,
        clientId: invoice.client_id,
        rateUsed: resolved.late_fee_rate ?? undefined,
        remainingBalance: invoice.total - (invoice.late_fee_applied_total || 0),
        graceDaysUsed: resolved.late_fee_grace_days,
        capInEffect: resolved.late_fee_cap_amount ?? undefined,
      }
    );

    return { applied: success, eligibility };
  };

  return {
    getResolvedSettings,
    checkEligibility,
    applyLateFee,
    fetchLateFees,
    fetchActiveLateFeeCount,
    removeLateFee,
    deleteLateFee,
    getLateFeeTermsText,
    evaluateAndAutoApply,
    applying,
  };
};
