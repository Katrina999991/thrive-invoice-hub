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

// Tax label normalization mapping
const TAX_LABEL_MAPPINGS: Record<string, string> = {
  // GST variants
  'gst': 'TPS',
  'tps': 'TPS',
  'goods and services tax': 'TPS',
  'taxe sur les produits et services': 'TPS',
  // PST variants
  'pst': 'TVP',
  'tvp': 'TVP',
  'provincial sales tax': 'TVP',
  'taxe de vente provinciale': 'TVP',
  // QST variants  
  'qst': 'TVQ',
  'tvq': 'TVQ',
  'quebec sales tax': 'TVQ',
  'taxe de vente du quebec': 'TVQ',
  'taxe de vente du québec': 'TVQ',
  // HST variants
  'hst': 'TVH',
  'tvh': 'TVH',
  'harmonized sales tax': 'TVH',
  'taxe de vente harmonisée': 'TVH',
  // VAT variants
  'vat': 'TVA',
  'tva': 'TVA',
  'value added tax': 'TVA',
  'taxe sur la valeur ajoutée': 'TVA',
};

/**
 * Normalize a tax label to a standard format
 */
export function normalizeTaxLabel(label: string): string {
  const normalized = label.toLowerCase().trim();
  return TAX_LABEL_MAPPINGS[normalized] || label.toUpperCase();
}

/**
 * Map a receipt tax label to a company tax definition
 */
export function mapTaxLabelToCompanyTax(
  label: string, 
  companyTaxes: CompanyTax[]
): CompanyTax | null {
  const normalizedLabel = normalizeTaxLabel(label);
  
  // Try exact match first
  const exactMatch = companyTaxes.find(
    t => t.name.toUpperCase() === normalizedLabel
  );
  if (exactMatch) return exactMatch;
  
  // Try matching normalized versions
  for (const companyTax of companyTaxes) {
    const normalizedCompanyTax = normalizeTaxLabel(companyTax.name);
    if (normalizedCompanyTax === normalizedLabel) {
      return companyTax;
    }
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
          const matchedTax = mapTaxLabelToCompanyTax(taxLine.name, companyTaxes);
          return {
            name: matchedTax?.name || normalizeTaxLabel(taxLine.name),
            percentage: matchedTax?.percentage || taxLine.rate || 0,
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
        name: tax.name,
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
