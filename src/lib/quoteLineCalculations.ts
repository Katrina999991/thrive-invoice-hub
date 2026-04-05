// Centralized quote line calculation logic

export type QuoteLineType = 'fixed' | 'hourly' | 'estimate';

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
  // Common
  product_id?: string;
  notes?: string;
  product_taxes?: Array<{name: string, type?: 'percentage' | 'amount', value?: number, percentage?: number}>;
}

export interface ComputedLineTotals {
  total: number;       // For fixed/hourly, the single total. For estimate, the min total.
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
}

export function computeQuoteTotals(
  items: QuoteItemLocal[],
  companyTaxes?: Array<{ percentage: number }> | null
): QuoteTotals {
  let hasRanges = false;
  let minSubtotal = 0;
  let maxSubtotal = 0;

  items.forEach(item => {
    const computed = computeLineTotals(item);
    if (computed.isRange) hasRanges = true;
    minSubtotal += computed.minTotal;
    maxSubtotal += computed.maxTotal;
  });

  // Calculate taxes on min and max
  const calcTax = (items: QuoteItemLocal[], useMax: boolean) => {
    let totalTax = 0;
    items.forEach(item => {
      const computed = computeLineTotals(item);
      const baseAmount = useMax ? computed.maxTotal : computed.minTotal;

      // Company-level taxes
      if (companyTaxes && companyTaxes.length > 0) {
        companyTaxes.forEach(tax => {
          totalTax += baseAmount * (tax.percentage / 100);
        });
      }

      // Product-level taxes
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
  };

  const minTaxAmount = calcTax(items, false);
  const maxTaxAmount = calcTax(items, true);

  return {
    hasRanges,
    subtotal: minSubtotal,
    minSubtotal,
    maxSubtotal,
    taxAmount: minTaxAmount,
    minTaxAmount,
    maxTaxAmount,
    total: minSubtotal + minTaxAmount,
    minTotal: minSubtotal + minTaxAmount,
    maxTotal: maxSubtotal + maxTaxAmount,
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
