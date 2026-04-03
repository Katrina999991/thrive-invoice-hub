import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface LateFeeSettings {
  late_fee_enabled: boolean;
  late_fee_type: 'none' | 'monthly_percentage' | 'fixed_once';
  late_fee_rate: number | null;
  late_fee_amount: number | null;
  late_fee_grace_days: number;
  late_fee_terms_text: string | null;
}

export interface LateFeeRecord {
  id: string;
  invoice_id: string;
  amount: number;
  fee_type: string;
  description: string;
  applied_at: string;
  applied_by: string | null;
  created_at: string;
}

export interface LateFeeEligibility {
  eligible: boolean;
  reason?: string;
  calculatedAmount?: number;
  daysOverdue?: number;
}

export const useLateFees = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [applying, setApplying] = useState(false);

  const checkEligibility = (
    invoice: any,
    settings: LateFeeSettings
  ): LateFeeEligibility => {
    if (!settings.late_fee_enabled || settings.late_fee_type === 'none') {
      return { eligible: false, reason: 'Late fees not enabled' };
    }

    if (invoice.status === 'paid' || invoice.status === 'draft') {
      return { eligible: false, reason: 'Invoice is paid or draft' };
    }

    if (!invoice.due_date) {
      return { eligible: false, reason: 'No due date set' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(invoice.due_date);
    dueDate.setHours(0, 0, 0, 0);

    const graceDays = settings.late_fee_grace_days || 0;
    const eligibleDate = new Date(dueDate);
    eligibleDate.setDate(eligibleDate.getDate() + graceDays);

    if (today <= eligibleDate) {
      return { eligible: false, reason: 'Still within grace period' };
    }

    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    const remainingBalance = invoice.total - (invoice.late_fee_applied_total || 0);

    if (remainingBalance <= 0) {
      return { eligible: false, reason: 'No remaining balance' };
    }

    // Check for fixed_once: already applied?
    if (settings.late_fee_type === 'fixed_once' && (invoice.late_fee_status === 'applied')) {
      return { eligible: false, reason: 'Fixed fee already applied' };
    }

    let calculatedAmount = 0;
    if (settings.late_fee_type === 'fixed_once') {
      calculatedAmount = settings.late_fee_amount || 0;
    } else if (settings.late_fee_type === 'monthly_percentage') {
      calculatedAmount = remainingBalance * ((settings.late_fee_rate || 0) / 100);
    }

    calculatedAmount = Math.round(calculatedAmount * 100) / 100;

    return {
      eligible: true,
      calculatedAmount,
      daysOverdue,
    };
  };

  const applyLateFee = async (
    invoiceId: string,
    amount: number,
    feeType: string,
    description: string
  ): Promise<boolean> => {
    if (!user) return false;
    setApplying(true);

    try {
      // Insert late fee record
      const { error: feeError } = await supabase
        .from("invoice_late_fees" as any)
        .insert({
          invoice_id: invoiceId,
          amount,
          fee_type: feeType,
          description,
          applied_by: user.id,
        });

      if (feeError) throw feeError;

      // Get current late fee total
      const { data: invoice, error: fetchError } = await supabase
        .from("invoices")
        .select("late_fee_applied_total")
        .eq("id", invoiceId)
        .single();

      if (fetchError) throw fetchError;

      const newTotal = ((invoice as any)?.late_fee_applied_total || 0) + amount;

      // Update invoice
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

  const fetchLateFees = async (invoiceId: string): Promise<LateFeeRecord[]> => {
    const { data, error } = await supabase
      .from("invoice_late_fees" as any)
      .select("*")
      .eq("invoice_id", invoiceId)
      .order("applied_at", { ascending: false });

    if (error) {
      console.error("Error fetching late fees:", error);
      return [];
    }

    return (data || []) as unknown as LateFeeRecord[];
  };

  const deleteLateFee = async (
    lateFeeId: string,
    invoiceId: string,
    amount: number
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      // Delete the late fee record
      const { error: deleteError } = await supabase
        .from("invoice_late_fees" as any)
        .delete()
        .eq("id", lateFeeId);

      if (deleteError) throw deleteError;

      // Update invoice total
      const { data: invoice, error: fetchError } = await supabase
        .from("invoices")
        .select("late_fee_applied_total")
        .eq("id", invoiceId)
        .single();

      if (fetchError) throw fetchError;

      const newTotal = Math.max(0, ((invoice as any)?.late_fee_applied_total || 0) - amount);

      // Check if any late fees remain
      const { data: remaining } = await supabase
        .from("invoice_late_fees" as any)
        .select("id")
        .eq("invoice_id", invoiceId);

      const newStatus = (remaining && remaining.length > 0) ? 'applied' : 'none';

      const { error: updateError } = await supabase
        .from("invoices")
        .update({
          late_fee_applied_total: newTotal,
          late_fee_status: newStatus,
          ...(newStatus === 'none' ? { late_fee_last_applied_at: null } : {}),
        } as any)
        .eq("id", invoiceId);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Late fee removed successfully",
      });

      return true;
    } catch (error: any) {
      console.error("Error deleting late fee:", error);
      toast({
        title: "Error",
        description: "Failed to remove late fee",
        variant: "destructive",
      });
      return false;
    }
  };

  const getLateFeeTermsText = (settings: LateFeeSettings, language: string): string | null => {
    if (!settings.late_fee_enabled || settings.late_fee_type === 'none') return null;

    if (settings.late_fee_terms_text) return settings.late_fee_terms_text;

    if (settings.late_fee_type === 'monthly_percentage') {
      return language === 'fr'
        ? `Des frais de retard de ${settings.late_fee_rate || 0}% par mois peuvent s'appliquer sur les soldes en souffrance.`
        : `Late fees of ${settings.late_fee_rate || 0}% per month may apply on overdue balances.`;
    }

    if (settings.late_fee_type === 'fixed_once') {
      return language === 'fr'
        ? `Des frais de retard de ${settings.late_fee_amount || 0}$ peuvent s'appliquer sur les factures en souffrance.`
        : `A late fee of $${settings.late_fee_amount || 0} may apply on overdue invoices.`;
    }

    return null;
  };

  return {
    checkEligibility,
    applyLateFee,
    fetchLateFees,
    deleteLateFee,
    getLateFeeTermsText,
    applying,
  };
};
