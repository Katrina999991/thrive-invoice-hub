// Quote PDF generation - now uses the unified document PDF system
// This file provides backward compatibility for existing code

import { generateDocumentPdf, DocumentPdfOptions, DocumentItem, DocumentSection, ClientData, CompanyData, TemplateType, COLOR_PRESETS } from './documentPdf';

export interface QuoteItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  notes?: string;
  product_taxes?: Array<{name: string, type?: 'percentage' | 'amount', value?: number, percentage?: number}>;
  line_type?: string;
  estimated_hours?: number;
  hourly_rate?: number;
  min_units?: number;
  max_units?: number;
  rate?: number;
  unit_label?: string | null;
  is_optional?: boolean;
}

export interface QuoteData {
  quote_number: string;
  issue_date: string;
  expiry_date?: string | null;
  subtotal: number;
  tax_amount: number;
  total: number;
  terms?: string | null;
  notes?: string | null;
  quote_items: QuoteItem[];
  deposit_type?: string;
  deposit_value?: number;
  deposit_amount?: number;
}

export interface QuotePdfOptions {
  quote: QuoteData;
  client?: ClientData | null;
  company?: CompanyData | null;
  language: 'fr' | 'en';
  hideBranding?: boolean;
  accentColor?: [number, number, number];
  customFooterText?: string;
  returnBlob?: boolean;
}

// Helper to convert hex color to RGB array
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [37, 99, 235]; // Default blue
}

// Helper to create light variant from primary color
function createLightVariant(primary: [number, number, number]): [number, number, number] {
  return [
    Math.min(255, Math.floor(primary[0] + (255 - primary[0]) * 0.85)),
    Math.min(255, Math.floor(primary[1] + (255 - primary[1]) * 0.85)),
    Math.min(255, Math.floor(primary[2] + (255 - primary[2]) * 0.85))
  ];
}

export async function generateQuotePdf(options: QuotePdfOptions): Promise<Blob | void> {
  const { quote, client, company, language, hideBranding = false, accentColor, customFooterText, returnBlob = false } = options;

  // Get template and color settings from localStorage (same settings as invoices)
  const template = (localStorage.getItem("invoice-template") || "classic") as TemplateType;
  const colorPreset = localStorage.getItem("invoice-color") || "blue";
  const customColorHex = localStorage.getItem("invoice-custom-color") || "#2563eb";

  // Determine custom color if needed
  let customColor: { primary: [number, number, number]; light: [number, number, number] } | undefined;
  
  if (accentColor) {
    // Legacy support: if accentColor is passed directly
    customColor = {
      primary: accentColor,
      light: createLightVariant(accentColor)
    };
  } else if (colorPreset === "custom") {
    const primary = hexToRgb(customColorHex);
    customColor = {
      primary,
      light: createLightVariant(primary)
    };
  }

  // Convert quote items to document items, enriching descriptions for non-fixed types
  const items: DocumentItem[] = quote.quote_items.map(item => {
    const lineType = item.line_type || 'fixed';
    let description = item.description;
    let quantity = item.quantity;
    let unitPrice = item.unit_price;
    let total = item.total;

    if (lineType === 'hourly' && item.estimated_hours && item.hourly_rate) {
      description = `${item.description}\n${item.estimated_hours} h × ${language === 'fr' ? '' : '$'}${item.hourly_rate.toFixed(2)}${language === 'fr' ? ' $' : ''}/h`;
      quantity = item.estimated_hours;
      unitPrice = item.hourly_rate;
      total = item.estimated_hours * item.hourly_rate;
    } else if (lineType === 'estimate' && item.min_units !== undefined && item.max_units !== undefined && item.rate) {
      const unit = item.unit_label || 'h';
      const minTotal = item.min_units * item.rate;
      const maxTotal = item.max_units * item.rate;
      description = `${item.description}\n${item.min_units}–${item.max_units} ${unit} × $${item.rate.toFixed(2)}/${unit}`;
      quantity = item.min_units;
      unitPrice = item.rate;
      total = minTotal;
      // Note: range display in PDF shows min total; the quote-level totals handle the range
    }

    // Mark optional items in description
    if (item.is_optional) {
      description = `${description}\n[${language === 'fr' ? 'Optionnel' : 'Optional'}]`;
    }

    return {
      description,
      quantity,
      unit_price: unitPrice,
      total,
      notes: item.notes,
      product_taxes: item.product_taxes
    };
  });

  // Call unified PDF generator
  return generateDocumentPdf({
    documentType: 'quote',
    document: {
      document_number: quote.quote_number,
      issue_date: quote.issue_date,
      expiry_date: quote.expiry_date,
      subtotal: quote.subtotal,
      tax_amount: quote.tax_amount,
      total: quote.total,
      terms: quote.terms,
      notes: quote.notes,
      items
    },
    client: client ? {
      name: client.name,
      email: client.email,
      address: client.address,
      phone: client.phone,
      contact_person: client.contact_person
    } : null,
    company: company ? {
      name: company.name,
      logo_url: company.logo_url,
      email: company.email,
      phone: company.phone,
      street_address: company.street_address,
      city: company.city,
      province_state: company.province_state,
      postal_code: company.postal_code,
      tax_id: company.tax_id
    } : null,
    language,
    template,
    colorPreset: customColor ? undefined : colorPreset,
    customColor,
    hideBranding,
    customFooterText,
    returnBlob
  });
}

// Re-export types from documentPdf for convenience
export type { ClientData, CompanyData } from './documentPdf';
