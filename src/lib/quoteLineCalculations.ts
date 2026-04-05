// Centralized quote line calculation logic

export type QuoteLineType = 'fixed' | 'hourly' | 'estimate';
export type DepositType = 'none' | 'percentage' | 'fixed';

export interface QuoteItemLocal {
  lineType: QuoteLineType;
  description: string;
  // Fixed price fields
  quantity: number;
  unit_price: number;
  // Hourly fields
  estimatedHours: number;
  hourlyRate: number;
  // Estimate range fields
  minUnits: number;
  maxUnits: number;
  rate: number;
  unitLabel: string;
  // Optional flag
  isOptional: boolean;
  // Common
  product_id?: string;
  notes?: string;
  product_taxes?: Array<{name: string, type?: 'percentage' | 'amount', value?: number, percentage?: number}>;
}

export interface ComputedLineTotals {
  total: number;
  minTotal: number;
  maxTotal: number;
  isRange: boolean;
}

export function computeLineTotals(item: QuoteItemLocal): ComputedLineTotals {
  switch (item.lineType) {
    case 'hourly': {
      const total = item.estimatedHours * item.hourlyRate;
      return { total, minTotal: total, maxTotal: total, isRange: false };
    }
    case 'estimate': {
      const minTotal = item.minUnits * item.rate;
      const maxTotal = item.maxUnits * item.rate;
      return { total: minTotal, minTotal, maxTotal, isRange: true };
    }
    case 'fixed':
    default: {
      const total = item.quantity * item.unit_price;
      return { total, minTotal: total, maxTotal: total, isRange: false };
    }
  }
}

export interface QuoteTotals {
  // Base totals (non-optional items only)
  hasRanges: boolean;
  subtotal: number;
  minSubtotal: number;
  maxSubtotal: number;
  taxAmount: number;
  minTaxAmount: number;
  maxTaxAmount: number;
  total: number;
  minTotal: number;
  maxTotal: number;
  // Optional items totals
  hasOptionalItems: boolean;
  optionalSubtotal: number;
  optionalMinSubtotal: number;
  optionalMaxSubtotal: number;
  optionalTaxAmount: number;
  optionalMinTaxAmount: number;
  optionalMaxTaxAmount: number;
  optionalTotal: number;
  optionalMinTotal: number;
  optionalMaxTotal: number;
  // Grand totals (base + optional)
  grandTotal: number;
  grandMinTotal: number;
  grandMaxTotal: number;
  // Deposit
  depositAmount: number;
  depositMinAmount: number;
  depositMaxAmount: number;
}

function calcTaxForItems(
  items: QuoteItemLocal[],
  companyTaxes: Array<{ percentage: number }> | null | undefined,
  useMax: boolean
): number {
  let totalTax = 0;
  items.forEach(item => {
    const computed = computeLineTotals(item);
    const baseAmount = useMax ? computed.maxTotal : computed.minTotal;

    if (companyTaxes && companyTaxes.length > 0) {
      companyTaxes.forEach(tax => {
        totalTax += baseAmount * (tax.percentage / 100);
      });
    }

    if (item.product_taxes && item.product_taxes.length > 0) {
      const qty = item.lineType === 'fixed' ? item.quantity 
                : item.lineType === 'hourly' ? item.estimatedHours 
                : (useMax ? item.maxUnits : item.minUnits);
      item.product_taxes.forEach(tax => {
        const taxType = tax.type || 'percentage';
        const taxValue = tax.value !== undefined ? tax.value : tax.percentage || 0;
        if (taxType === 'percentage') {
          totalTax += baseAmount * (taxValue / 100);
        } else {
          totalTax += taxValue * qty;
        }
      });
    }
  });
  return totalTax;
}

export function computeQuoteTotals(
  items: QuoteItemLocal[],
  companyTaxes?: Array<{ percentage: number }> | null,
  depositType: DepositType = 'none',
  depositValue: number = 0
): QuoteTotals {
  const baseItems = items.filter(i => !i.isOptional);
  const optionalItems = items.filter(i => i.isOptional);

  const hasOptionalItems = optionalItems.length > 0;

  // Base
  let hasRanges = false;
  let minSubtotal = 0, maxSubtotal = 0;
  baseItems.forEach(item => {
    const c = computeLineTotals(item);
    if (c.isRange) hasRanges = true;
    minSubtotal += c.minTotal;
    maxSubtotal += c.maxTotal;
  });
  const minTaxAmount = calcTaxForItems(baseItems, companyTaxes, false);
  const maxTaxAmount = calcTaxForItems(baseItems, companyTaxes, true);

  // Optional
  let optHasRanges = false;
  let optMinSubtotal = 0, optMaxSubtotal = 0;
  optionalItems.forEach(item => {
    const c = computeLineTotals(item);
    if (c.isRange) { hasRanges = true; optHasRanges = true; }
    optMinSubtotal += c.minTotal;
    optMaxSubtotal += c.maxTotal;
  });
  const optMinTax = calcTaxForItems(optionalItems, companyTaxes, false);
  const optMaxTax = calcTaxForItems(optionalItems, companyTaxes, true);

  const minTotal = minSubtotal + minTaxAmount;
  const maxTotal = maxSubtotal + maxTaxAmount;
  const optMinTotal = optMinSubtotal + optMinTax;
  const optMaxTotal = optMaxSubtotal + optMaxTax;

  const grandMinTotal = minTotal + optMinTotal;
  const grandMaxTotal = maxTotal + optMaxTotal;

  // Deposit calculation (based on base total only)
  let depositMinAmount = 0, depositMaxAmount = 0;
  if (depositType === 'percentage' && depositValue > 0) {
    depositMinAmount = minTotal * (depositValue / 100);
    depositMaxAmount = maxTotal * (depositValue / 100);
  } else if (depositType === 'fixed' && depositValue > 0) {
    depositMinAmount = depositValue;
    depositMaxAmount = depositValue;
  }

  return {
    hasRanges,
    subtotal: minSubtotal,
    minSubtotal,
    maxSubtotal,
    taxAmount: minTaxAmount,
    minTaxAmount,
    maxTaxAmount,
    total: minTotal,
    minTotal,
    maxTotal,
    hasOptionalItems,
    optionalSubtotal: optMinSubtotal,
    optionalMinSubtotal: optMinSubtotal,
    optionalMaxSubtotal: optMaxSubtotal,
    optionalTaxAmount: optMinTax,
    optionalMinTaxAmount: optMinTax,
    optionalMaxTaxAmount: optMaxTax,
    optionalTotal: optMinTotal,
    optionalMinTotal: optMinTotal,
    optionalMaxTotal: optMaxTotal,
    grandTotal: grandMinTotal,
    grandMinTotal,
    grandMaxTotal,
    depositAmount: depositMinAmount,
    depositMinAmount,
    depositMaxAmount,
  };
}

export function createEmptyItem(): QuoteItemLocal {
  return {
    lineType: 'fixed',
    description: '',
    quantity: 1,
    unit_price: 0,
    estimatedHours: 0,
    hourlyRate: 0,
    minUnits: 0,
    maxUnits: 0,
    rate: 0,
    unitLabel: 'h',
    isOptional: false,
    product_id: undefined,
    notes: undefined,
    product_taxes: undefined,
  };
}

// Convert from DB format to local format
export function dbItemToLocal(dbItem: any): QuoteItemLocal {
  const lineType = (dbItem.line_type || 'fixed') as QuoteLineType;
  return {
    lineType,
    description: dbItem.description || '',
    quantity: dbItem.quantity || 1,
    unit_price: dbItem.unit_price || 0,
    estimatedHours: dbItem.estimated_hours || 0,
    hourlyRate: dbItem.hourly_rate || 0,
    minUnits: dbItem.min_units || 0,
    maxUnits: dbItem.max_units || 0,
    rate: dbItem.rate || 0,
    unitLabel: dbItem.unit_label || 'h',
    isOptional: dbItem.is_optional || false,
    product_id: dbItem.product_id || undefined,
    notes: dbItem.notes || undefined,
    product_taxes: dbItem.product_taxes || undefined,
  };
}

// Convert from local format to DB format
export function localItemToDb(item: QuoteItemLocal, quoteId?: string) {
  const computed = computeLineTotals(item);
  return {
    ...(quoteId ? { quote_id: quoteId } : {}),
    line_type: item.lineType,
    description: item.description,
    quantity: item.lineType === 'fixed' ? item.quantity : (item.lineType === 'hourly' ? item.estimatedHours : item.minUnits),
    unit_price: item.lineType === 'fixed' ? item.unit_price : (item.lineType === 'hourly' ? item.hourlyRate : item.rate),
    total: computed.minTotal,
    estimated_hours: item.estimatedHours,
    hourly_rate: item.hourlyRate,
    min_units: item.minUnits,
    max_units: item.maxUnits,
    rate: item.rate,
    unit_label: item.unitLabel || null,
    is_optional: item.isOptional,
    product_id: item.product_id || null,
    notes: item.notes || null,
    product_taxes: item.product_taxes || [],
  };
}

// Format line display string
export function formatLineDisplay(item: QuoteItemLocal, currencySymbol = '$'): string {
  const computed = computeLineTotals(item);
  switch (item.lineType) {
    case 'hourly':
      return `${item.estimatedHours} h × ${currencySymbol}${item.hourlyRate.toFixed(2)}/h = ${currencySymbol}${computed.total.toFixed(2)}`;
    case 'estimate':
      return `${item.minUnits}–${item.maxUnits} ${item.unitLabel} × ${currencySymbol}${item.rate.toFixed(2)}/${item.unitLabel} = ${currencySymbol}${computed.minTotal.toFixed(2)} – ${currencySymbol}${computed.maxTotal.toFixed(2)}`;
    case 'fixed':
    default:
      return `${item.quantity} × ${currencySymbol}${item.unit_price.toFixed(2)} = ${currencySymbol}${computed.total.toFixed(2)}`;
  }
}

// Format deposit display
export function formatDeposit(
  depositType: DepositType, 
  depositValue: number, 
  depositMinAmount: number, 
  depositMaxAmount: number, 
  hasRanges: boolean,
  currencySymbol = '$'
): string {
  if (depositType === 'none' || depositValue <= 0) return '';
  const label = depositType === 'percentage' ? `${depositValue}%` : `${currencySymbol}${depositValue.toFixed(2)}`;
  if (hasRanges && depositType === 'percentage') {
    return `${label} → ${currencySymbol}${depositMinAmount.toFixed(2)} – ${currencySymbol}${depositMaxAmount.toFixed(2)}`;
  }
  return `${label} → ${currencySymbol}${depositMinAmount.toFixed(2)}`;
}
