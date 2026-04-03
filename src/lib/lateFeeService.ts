/**
 * Centralized Late Fee Business Logic Service
 * 
 * All late fee calculations, eligibility checks, and application logic
 * lives here. UI components and hooks delegate to these pure functions.
 */

export interface ResolvedLateFeeSettings {
  late_fee_enabled: boolean;
  late_fee_type: 'none' | 'monthly_percentage' | 'fixed_once';
  late_fee_rate: number | null;
  late_fee_amount: number | null;
  late_fee_grace_days: number;
  late_fee_terms_text: string | null;
  late_fee_auto_apply_enabled: boolean;
  late_fee_auto_apply_mode: 'manual_only' | 'auto_once_when_eligible' | 'auto_recurring_monthly';
  late_fee_cap_amount: number | null;
}

export interface CompanyLateFeeSettings {
  late_fee_enabled: boolean;
  late_fee_type: string;
  late_fee_rate: number | null;
  late_fee_amount: number | null;
  late_fee_grace_days: number;
  late_fee_terms_text: string | null;
  late_fee_auto_apply_enabled: boolean;
  late_fee_auto_apply_mode: string;
  late_fee_cap_amount: number | null;
}

export interface ClientLateFeeOverrides {
  late_fee_override_enabled: boolean;
  late_fee_enabled_override: boolean | null;
  late_fee_type_override: string | null;
  late_fee_rate_override: number | null;
  late_fee_amount_override: number | null;
  late_fee_grace_days_override: number | null;
  late_fee_auto_apply_mode_override: string | null;
  late_fee_cap_amount_override: number | null;
}

export interface LateFeeEligibility {
  eligible: boolean;
  reason?: string;
  calculatedAmount?: number;
  daysOverdue?: number;
  capReached?: boolean;
  capRemaining?: number;
}

export interface EnhancedLateFeeRecord {
  id: string;
  invoice_id: string;
  amount: number;
  fee_type: string;
  description: string;
  applied_at: string;
  applied_by: string | null;
  created_at: string;
  company_id: string | null;
  client_id: string | null;
  rate_used: number | null;
  remaining_balance_at_calc: number | null;
  grace_days_used: number | null;
  cap_in_effect: number | null;
  source: string;
  status: string;
  removed_at: string | null;
  removed_by: string | null;
  removal_reason: string | null;
}

/**
 * Resolve effective late fee settings by merging company defaults with client overrides.
 */
export function resolveLateFeeSettings(
  company: CompanyLateFeeSettings,
  client?: ClientLateFeeOverrides | null
): ResolvedLateFeeSettings {
  if (!client?.late_fee_override_enabled) {
    return {
      late_fee_enabled: company.late_fee_enabled,
      late_fee_type: company.late_fee_type as ResolvedLateFeeSettings['late_fee_type'],
      late_fee_rate: company.late_fee_rate,
      late_fee_amount: company.late_fee_amount,
      late_fee_grace_days: company.late_fee_grace_days,
      late_fee_terms_text: company.late_fee_terms_text,
      late_fee_auto_apply_enabled: company.late_fee_auto_apply_enabled,
      late_fee_auto_apply_mode: company.late_fee_auto_apply_mode as ResolvedLateFeeSettings['late_fee_auto_apply_mode'],
      late_fee_cap_amount: company.late_fee_cap_amount,
    };
  }

  return {
    late_fee_enabled: client.late_fee_enabled_override ?? company.late_fee_enabled,
    late_fee_type: (client.late_fee_type_override ?? company.late_fee_type) as ResolvedLateFeeSettings['late_fee_type'],
    late_fee_rate: client.late_fee_rate_override ?? company.late_fee_rate,
    late_fee_amount: client.late_fee_amount_override ?? company.late_fee_amount,
    late_fee_grace_days: client.late_fee_grace_days_override ?? company.late_fee_grace_days,
    late_fee_terms_text: company.late_fee_terms_text,
    late_fee_auto_apply_enabled: company.late_fee_auto_apply_enabled,
    late_fee_auto_apply_mode: (client.late_fee_auto_apply_mode_override ?? company.late_fee_auto_apply_mode) as ResolvedLateFeeSettings['late_fee_auto_apply_mode'],
    late_fee_cap_amount: client.late_fee_cap_amount_override ?? company.late_fee_cap_amount,
  };
}

/**
 * Check if an invoice is eligible for a late fee application.
 * Enforces cap, fixed_once, and cycle constraints.
 */
export function checkLateFeeEligibility(
  invoice: {
    status: string;
    due_date: string | null;
    total: number;
    late_fee_applied_total: number;
    late_fee_status: string;
    late_fee_last_applied_at: string | null;
  },
  settings: ResolvedLateFeeSettings,
  activeLateFeeCount: number
): LateFeeEligibility {
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

  // Fixed once: already applied?
  if (settings.late_fee_type === 'fixed_once' && activeLateFeeCount > 0) {
    return { eligible: false, reason: 'Fixed fee already applied' };
  }

  // Monthly cycle check: no more than once per 30-day interval
  if (settings.late_fee_type === 'monthly_percentage' && invoice.late_fee_last_applied_at) {
    const lastApplied = new Date(invoice.late_fee_last_applied_at);
    lastApplied.setHours(0, 0, 0, 0);
    const daysSinceLastApply = Math.floor((today.getTime() - lastApplied.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceLastApply < 30) {
      return { eligible: false, reason: 'Monthly cycle not yet elapsed (30 days)' };
    }
  }

  // Calculate fee
  let calculatedAmount = 0;
  if (settings.late_fee_type === 'fixed_once') {
    calculatedAmount = settings.late_fee_amount || 0;
  } else if (settings.late_fee_type === 'monthly_percentage') {
    // Always calculate from unpaid principal (original total minus payments), not from late fees
    calculatedAmount = remainingBalance * ((settings.late_fee_rate || 0) / 100);
  }

  calculatedAmount = Math.round(calculatedAmount * 100) / 100;

  // Cap enforcement
  const capAmount = settings.late_fee_cap_amount;
  let capReached = false;
  let capRemaining: number | undefined;

  if (capAmount != null && capAmount > 0) {
    const currentTotal = invoice.late_fee_applied_total || 0;
    capRemaining = Math.max(0, capAmount - currentTotal);

    if (capRemaining <= 0) {
      return { eligible: false, reason: 'Late fee cap reached', capReached: true, daysOverdue };
    }

    if (calculatedAmount > capRemaining) {
      calculatedAmount = Math.round(capRemaining * 100) / 100;
      capReached = true;
    }
  }

  if (calculatedAmount <= 0) {
    return { eligible: false, reason: 'Calculated amount is zero' };
  }

  return {
    eligible: true,
    calculatedAmount,
    daysOverdue,
    capReached,
    capRemaining,
  };
}

/**
 * Generate default late fee terms text based on settings.
 */
export function getDefaultTermsText(settings: ResolvedLateFeeSettings, language: string): string | null {
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
}

/**
 * Determine if auto-apply should trigger for a given invoice.
 */
export function shouldAutoApply(
  settings: ResolvedLateFeeSettings,
  eligibility: LateFeeEligibility,
  activeLateFeeCount: number
): boolean {
  if (!settings.late_fee_auto_apply_enabled) return false;
  if (!eligibility.eligible) return false;

  if (settings.late_fee_auto_apply_mode === 'auto_once_when_eligible') {
    return activeLateFeeCount === 0;
  }

  if (settings.late_fee_auto_apply_mode === 'auto_recurring_monthly') {
    // Eligibility check already handles cycle, so if eligible, it's safe to apply
    return settings.late_fee_type === 'monthly_percentage';
  }

  return false;
}
