// Utility functions for automatic tax splitting from receipts

export interface ReceiptTaxLine {
  name: string;
  amount: number;
  rate?: number;
}

export interface CompanyTax {
  name: string;
  percentage: number;
}

export interface TaxSplitResult {
  amountBeforeTax: number;
  taxes: Array<{ name: string; percentage: number; amount: number }>;
  helperText: string | null;
  helperTextType: 'success' | 'warning' | null;
  originalTotal: number;
  source: 'receipt' | 'calculated' | null;
}

// Tax label normalization mapping - values MUST match Select options in Expenses.tsx
const TAX_LABEL_MAPPINGS: Record<string, string> = {
  // GST variants -> TPS
  'gst': 'TPS',
  'tps': 'TPS',
  'goods and services tax': 'TPS',
  'taxe sur les produits et services': 'TPS',
  'g.s.t.': 'TPS',
  'g.s.t': 'TPS',
  't.p.s.': 'TPS',
  't.p.s': 'TPS',
  // PST variants -> TVP
  'pst': 'TVP',
  'tvp': 'TVP',
  'provincial sales tax': 'TVP',
  'taxe de vente provinciale': 'TVP',
  'p.s.t.': 'TVP',
  'p.s.t': 'TVP',
  't.v.p.': 'TVP',
  't.v.p': 'TVP',
  // QST variants -> TVQ
  'qst': 'TVQ',
  'tvq': 'TVQ',
  'quebec sales tax': 'TVQ',
  'taxe de vente du quebec': 'TVQ',
  'taxe de vente du québec': 'TVQ',
  'q.s.t.': 'TVQ',
  'q.s.t': 'TVQ',
  't.v.q.': 'TVQ',
  't.v.q': 'TVQ',
  // HST variants -> TVH
  'hst': 'TVH',
  'tvh': 'TVH',
  'harmonized sales tax': 'TVH',
  'taxe de vente harmonisée': 'TVH',
  'h.s.t.': 'TVH',
  'h.s.t': 'TVH',
  't.v.h.': 'TVH',
  't.v.h': 'TVH',
  // VAT variants -> other (not in standard Select options)
  'vat': 'other',
  'tva': 'other',
  'value added tax': 'other',
  'taxe sur la valeur ajoutée': 'other',
};

// Valid tax name values that match Select options in Expenses.tsx
const VALID_TAX_NAMES = ['TPS', 'TVQ', 'TVH', 'TVP', 'other'];

/**
 * Normalize a tax label to a standard format
 */
export function normalizeTaxLabel(label: string): string {
  const normalized = label.toLowerCase().trim();
  const mapped = TAX_LABEL_MAPPINGS[normalized];
  if (mapped) return mapped;
  
  // If not in mapping, check if the label itself is a valid tax name
  const upperLabel = label.toUpperCase().trim();
  if (VALID_TAX_NAMES.includes(upperLabel)) {
    return upperLabel;
  }
  
  // Default to 'other' for unknown tax types so Select can display it
  return 'other';
}

/**
 * Map a receipt tax label to a company tax definition
 * Also accepts percentage for fallback matching
 */
export function mapTaxLabelToCompanyTax(
  label: string, 
  companyTaxes: CompanyTax[],
  percentage?: number
): CompanyTax | null {
  if (!label && percentage === undefined) return null;
  
  const normalizedLabel = label ? normalizeTaxLabel(label) : 'other';
  
  // Try exact match first (case insensitive)
  const exactMatch = companyTaxes.find(
    t => t.name.toUpperCase().trim() === normalizedLabel.toUpperCase()
  );
  if (exactMatch) return exactMatch;
  
  // Try matching normalized versions of company tax names
  for (const companyTax of companyTaxes) {
    const normalizedCompanyTax = normalizeTaxLabel(companyTax.name);
    if (normalizedCompanyTax === normalizedLabel && normalizedLabel !== 'other') {
      return companyTax;
    }
  }
  
  // Fallback: try to match by percentage (with small tolerance for rounding)
  if (percentage !== undefined && percentage > 0) {
    const matchByPercentage = companyTaxes.find(
      t => Math.abs(t.percentage - percentage) < 0.1
    );
    if (matchByPercentage) return matchByPercentage;
  }
  
  return null;
}

/**
 * Check if subtotal + taxes reconciles to total within tolerance
 */
export function reconcileAmounts(
  subtotal: number | null | undefined,
  taxes: ReceiptTaxLine[],
  total: number,
  tolerance: number = 0.02
): boolean {
  if (subtotal == null || isNaN(subtotal)) return false;
  
  const taxSum = taxes.reduce((sum, t) => sum + (t.amount || 0), 0);
  const calculated = subtotal + taxSum;
  
  return Math.abs(calculated - total) <= tolerance;
}

/**
 * Calculate base amount from total using combined tax rates
 */
export function calculateBaseFromTotal(
  total: number,
  taxRates: number[] // percentages as decimals (e.g., 5% = 0.05)
): { base: number; taxes: number[]; valid: boolean } {
  const combinedRate = taxRates.reduce((sum, r) => sum + r, 0);
  const base = total / (1 + combinedRate);
  const roundedBase = Math.round(base * 100) / 100;
  
  // Calculate individual taxes proportionally
  const taxes = taxRates.map(rate => {
    const taxAmount = roundedBase * rate;
    return Math.round(taxAmount * 100) / 100;
  });
  
  // Verify recomposition
  const recomposed = roundedBase + taxes.reduce((s, t) => s + t, 0);
  const valid = Math.abs(recomposed - total) <= 0.02;
  
  return { base: roundedBase, taxes, valid };
}

/**
 * Process receipt data and determine tax split based on company settings
 */
export function processTaxSplit(
  receiptData: {
    total_amount?: number | null;
    subtotal_amount?: number | null;
    tax_lines?: ReceiptTaxLine[];
    tax_included_hint?: boolean;
  },
  companySettings: {
    expense_tax_handling: 'auto' | 'always' | 'never';
    taxes: CompanyTax[];
  } | null,
  language: 'fr' | 'en' = 'fr'
): TaxSplitResult {
  const defaultResult: TaxSplitResult = {
    amountBeforeTax: receiptData.total_amount || 0,
    taxes: [],
    helperText: null,
    helperTextType: null,
    originalTotal: receiptData.total_amount || 0,
    source: null
  };
  
  // If no company selected or no total, return default
  if (!companySettings || !receiptData.total_amount) {
    return defaultResult;
  }
  
  const { expense_tax_handling, taxes: companyTaxes } = companySettings;
  const { total_amount, subtotal_amount, tax_lines, tax_included_hint } = receiptData;
  const taxLines = tax_lines || [];
  
  // Handle 'never' mode
  if (expense_tax_handling === 'never') {
    return defaultResult;
  }
  
  // Check if we have explicit taxes from receipt
  const hasExplicitTaxes = taxLines.length > 0 && taxLines.some(t => t.amount > 0);
  const hasSubtotal = subtotal_amount != null && !isNaN(subtotal_amount) && subtotal_amount > 0;
  
  // Try to reconcile explicit receipt data
  if (hasSubtotal && hasExplicitTaxes) {
    if (reconcileAmounts(subtotal_amount, taxLines, total_amount)) {
      // Perfect reconciliation - use receipt values
      const mappedTaxes = taxLines
        .filter(t => t.amount > 0)
        .map(taxLine => {
          // Calculate percentage first so we can use it for matching
          let calculatedPercentage = taxLine.rate || 0;
          if (!calculatedPercentage && subtotal_amount && subtotal_amount > 0 && taxLine.amount) {
            calculatedPercentage = Math.round((taxLine.amount / subtotal_amount) * 10000) / 100;
          }
          
          // Try to match by name first, then by percentage as fallback
          const matchedTax = mapTaxLabelToCompanyTax(taxLine.name, companyTaxes, calculatedPercentage);
          
          // Use matched company tax percentage, or the calculated one
          const percentage = matchedTax?.percentage || calculatedPercentage;
          
          // Use matched company tax name (already valid), otherwise normalize receipt tax name
          const taxName = matchedTax?.name 
            ? normalizeTaxLabel(matchedTax.name) 
            : normalizeTaxLabel(taxLine.name);
          
          return {
            name: taxName,
            percentage: percentage,
            amount: Math.round(taxLine.amount * 100) / 100
          };
        });
      
      return {
        amountBeforeTax: Math.round(subtotal_amount * 100) / 100,
        taxes: mappedTaxes,
        helperText: language === 'fr' 
          ? 'Taxes ajoutées automatiquement depuis le reçu' 
          : 'Taxes added automatically from receipt',
        helperTextType: 'success',
        originalTotal: total_amount,
        source: 'receipt'
      };
    }
  }
  
  // In 'auto' mode, if tax_included hint is true and no explicit amounts, don't split
  if (expense_tax_handling === 'auto' && tax_included_hint && !hasExplicitTaxes) {
    return defaultResult;
  }
  
  // In 'always' mode, try to calculate taxes from company rates
  if (expense_tax_handling === 'always' && companyTaxes.length > 0) {
    const rates = companyTaxes.map(t => t.percentage / 100);
    const { base, taxes: calculatedTaxAmounts, valid } = calculateBaseFromTotal(total_amount, rates);
    
    if (valid) {
      const mappedTaxes = companyTaxes.map((tax, index) => ({
        name: normalizeTaxLabel(tax.name),
        percentage: tax.percentage,
        amount: calculatedTaxAmounts[index]
      }));
      
      return {
        amountBeforeTax: base,
        taxes: mappedTaxes,
        helperText: language === 'fr' 
          ? 'Taxes calculées depuis les paramètres. Veuillez confirmer.' 
          : 'Taxes calculated from settings. Please confirm.',
        helperTextType: 'warning',
        originalTotal: total_amount,
        source: 'calculated'
      };
    }
  }
  
  // Fallback: could not split taxes confidently
  const showWarning = expense_tax_handling === 'auto' && hasExplicitTaxes;
  return {
    ...defaultResult,
    helperText: showWarning 
      ? (language === 'fr' 
          ? 'Les taxes n\'ont pas pu être séparées avec confiance' 
          : 'Taxes couldn\'t be separated confidently')
      : null,
    helperTextType: showWarning ? 'warning' : null
  };
}
