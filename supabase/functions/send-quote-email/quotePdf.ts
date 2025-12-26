import { jsPDF } from "npm:jspdf@2.5.1";
import "npm:jspdf-autotable@3.8.2";

// ============= UNIFIED PDF DESIGN SYSTEM =============
// This module generates Quote PDFs with IDENTICAL output to
// the frontend documentPdf.ts. Any changes here MUST be mirrored
// in src/lib/documentPdf.ts to maintain consistency between
// downloaded PDFs and email-attached PDFs.

// Color presets (RGB values for jsPDF) - MUST match documentPdf.ts
export const COLOR_PRESETS: Record<string, { primary: [number, number, number]; light: [number, number, number] }> = {
  blue: { primary: [37, 99, 235], light: [219, 234, 254] },
  green: { primary: [22, 163, 74], light: [220, 252, 231] },
  purple: { primary: [147, 51, 234], light: [243, 232, 255] },
  orange: { primary: [234, 88, 12], light: [255, 237, 213] },
  yellow: { primary: [202, 138, 4], light: [254, 249, 195] },
  gray: { primary: [75, 85, 99], light: [243, 244, 246] }
};

export type TemplateType = 'classic' | 'modern' | 'professional' | 'creative';

// Logo size constraints - MUST match logoUtils.ts
const LOGO_MAX_WIDTH = 50;
const LOGO_MAX_HEIGHT = 25;

export interface QuoteItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  notes?: string | null;
  product_taxes?: Array<{ name: string; type?: 'percentage' | 'amount'; value?: number; percentage?: number }>;
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
  items: QuoteItem[];
  status?: string;
}

export interface ClientData {
  name: string;
  email?: string | null;
  address?: string | null;
  phone?: string | null;
  contact_person?: string | null;
  notes?: string | null;
  language?: string | null;
}

export interface CompanyData {
  name: string;
  logo_url?: string | null;
  email?: string | null;
  phone?: string | null;
  street_address?: string | null;
  city?: string | null;
  province_state?: string | null;
  postal_code?: string | null;
  tax_id?: string | null;
  taxes?: Array<{ name: string; percentage: number }> | null;
  quote_body_message_en?: string | null;
  quote_body_message_fr?: string | null;
  quote_footer_message_en?: string | null;
  quote_footer_message_fr?: string | null;
}

export interface QuotePdfOptions {
  quote: QuoteData;
  client?: ClientData | null;
  company?: CompanyData | null;
  language: 'fr' | 'en';
  template?: TemplateType;
  colorPreset?: string;
  customColor?: { primary: [number, number, number]; light: [number, number, number] };
  hideBranding?: boolean;
}

// Translations - MUST match documentPdf.ts
const getTranslations = (language: 'fr' | 'en', isClientFrench?: boolean) => {
  const lang = isClientFrench !== undefined ? (isClientFrench ? 'fr' : 'en') : language;
  
  const translations = {
    fr: {
      title: 'DEVIS',
      documentNumber: 'Devis',
      billTo: 'Facturer à :',
      issueDate: "Date d'émission",
      secondaryDate: "Valide jusqu'au",
      description: 'Description',
      qty: 'Qté',
      unitPrice: 'Prix unitaire',
      total: 'Total',
      subtotal: 'Sous-total',
      tax: 'Taxes',
      notes: 'Notes',
      terms: 'Conditions',
      termsLabel: 'Conditions',
      thankYou: 'Merci pour votre confiance !',
      branding: 'Créé avec GestionFlow',
    },
    en: {
      title: 'QUOTE',
      documentNumber: 'Quote',
      billTo: 'Bill To:',
      issueDate: 'Issue Date',
      secondaryDate: 'Valid Until',
      description: 'Description',
      qty: 'Qty',
      unitPrice: 'Unit Price',
      total: 'Total',
      subtotal: 'Subtotal',
      tax: 'Taxes',
      notes: 'Notes',
      terms: 'Terms',
      termsLabel: 'Terms & Conditions',
      thankYou: 'Thank you for your business!',
      branding: 'Created with GestionFlow',
    }
  };

  return translations[lang];
};

// Logo loading with contain behavior - MUST match logoUtils.ts
async function loadLogo(logoUrl: string): Promise<{ data: string; format: string; width: number; height: number } | null> {
  try {
    const response = await fetch(logoUrl);
    if (!response.ok) return null;
    
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    let binaryString = '';
    for (let i = 0; i < bytes.length; i++) {
      binaryString += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binaryString);
    
    // Detect format
    let format = 'PNG';
    if (logoUrl.toLowerCase().includes('.jpg') || logoUrl.toLowerCase().includes('.jpeg')) {
      format = 'JPEG';
    }
    
    return {
      data: `data:image/${format.toLowerCase()};base64,${base64}`,
      format,
      width: 0,
      height: 0
    };
  } catch (error) {
    console.error('Error loading logo:', error);
    return null;
  }
}

// Calculate logo dimensions with contain behavior (no upscaling)
function calculateLogoDimensions(
  doc: jsPDF, 
  logoData: string
): { width: number; height: number } {
  try {
    const props = (doc as any).getImageProperties(logoData);
    if (props && props.width && props.height) {
      const imgRatio = props.width / props.height;
      
      let width = LOGO_MAX_WIDTH;
      let height = width / imgRatio;
      
      if (height > LOGO_MAX_HEIGHT) {
        height = LOGO_MAX_HEIGHT;
        width = height * imgRatio;
      }
      
      const originalWidthPt = props.width * 0.75;
      const originalHeightPt = props.height * 0.75;
      
      if (originalWidthPt < width && originalHeightPt < height) {
        width = Math.min(originalWidthPt, LOGO_MAX_WIDTH);
        height = width / imgRatio;
        if (height > LOGO_MAX_HEIGHT) {
          height = LOGO_MAX_HEIGHT;
          width = height * imgRatio;
        }
      }
      
      return { width, height };
    }
  } catch (e) {
    console.error('Error getting logo dimensions:', e);
  }
  
  return { width: 40, height: 20 };
}

// Main PDF generation function - MUST produce identical output to documentPdf.ts
export async function generateQuotePdfForEmail(options: QuotePdfOptions): Promise<string> {
  const {
    quote,
    client,
    company,
    language,
    template = 'classic',
    colorPreset = 'blue',
    customColor,
    hideBranding = false
  } = options;

  const isClientFrench = client?.language === 'french';
  const t = getTranslations(language, isClientFrench);
  const selectedColor = customColor || COLOR_PRESETS[colorPreset] || COLOR_PRESETS.blue;
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  doc.setFont('helvetica');

  // ========== HEADER SECTION ==========
  let headerHeight = 20;
  
  if (template === 'creative') {
    // Creative template: Colored header bar
    const headerBarHeight = 25;
    const headerBarY = 10;
    doc.setFillColor(selectedColor.primary[0], selectedColor.primary[1], selectedColor.primary[2]);
    doc.rect(0, headerBarY, pageWidth, headerBarHeight, 'F');
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(company?.name || '', margin, headerBarY + 16);
    
    const docTitle = `${t.title} ${quote.quote_number}`;
    doc.setFontSize(12);
    doc.text(docTitle, pageWidth - margin, headerBarY + 16, { align: 'right' });
    
    headerHeight = headerBarY + headerBarHeight + 10;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    
    let yPos = headerHeight + 5;
    if (company?.street_address) {
      doc.text(company.street_address, margin, yPos);
      yPos += 5;
    }
    if (company?.city || company?.province_state) {
      doc.text(`${company?.city || ''}, ${company?.province_state || ''} ${company?.postal_code || ''}`.trim(), margin, yPos);
      yPos += 5;
    }
    if (company?.tax_id) {
      doc.text(company.tax_id, margin, yPos);
    }
  } else {
    // Non-creative templates: Logo on right, company info on left
    if (company?.logo_url) {
      try {
        const logoResult = await loadLogo(company.logo_url);
        if (logoResult) {
          const logoDims = calculateLogoDimensions(doc, logoResult.data);
          const logoX = pageWidth - margin - logoDims.width;
          const logoY = headerHeight - 5;
          
          doc.addImage(
            logoResult.data, 
            logoResult.format, 
            logoX, 
            logoY, 
            logoDims.width, 
            logoDims.height, 
            undefined, 
            'FAST'
          );
        }
      } catch (e) {
        console.error('Error adding logo to PDF:', e);
      }
    }
    
    if (company) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(selectedColor.primary[0], selectedColor.primary[1], selectedColor.primary[2]);
      doc.text(company.name, margin, headerHeight);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      
      let yPos = headerHeight + 9;
      if (company.street_address) {
        doc.text(company.street_address, margin, yPos);
        yPos += 5;
      }
      if (company.city || company.province_state) {
        doc.text(`${company.city || ''}, ${company.province_state || ''} ${company.postal_code || ''}`.trim(), margin, yPos);
        yPos += 5;
      }
      if (company.tax_id) {
        doc.text(company.tax_id, margin, yPos);
      }
    }
    
    // Header separator line
    if (template !== 'modern') {
      if (template === 'classic') {
        doc.setDrawColor(selectedColor.light[0], selectedColor.light[1], selectedColor.light[2]);
      } else {
        const mediumR = Math.floor((selectedColor.light[0] + selectedColor.primary[0]) / 2);
        const mediumG = Math.floor((selectedColor.light[1] + selectedColor.primary[1]) / 2);
        const mediumB = Math.floor((selectedColor.light[2] + selectedColor.primary[2]) / 2);
        doc.setDrawColor(mediumR, mediumG, mediumB);
      }
      doc.setLineWidth(0.5);
      doc.line(margin, 40, pageWidth - margin, 40);
    }
  }

  // ========== CLIENT & DOCUMENT INFO SECTION ==========
  const clientInfoY = template === 'creative' ? 60 : 50;
  let nextY = clientInfoY;
  
  if (client) {
    const boxHeight = 20 + (client.contact_person ? 5 : 0) + (client.address ? 5 : 0) + (client.notes ? 5 : 0);
    
    if (template === 'modern') {
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(margin, clientInfoY - 3, contentWidth, boxHeight, 2, 2, 'F');
    }
    
    const textYOffset = template === 'modern' ? 2 : 0;
    const leftMargin = template === 'modern' ? margin + 4 : margin;
    const rightMargin = template === 'modern' ? margin + 4 : margin;
    
    // Bill To label
    doc.setFontSize(11);
    if (template === 'professional') {
      const mediumR = Math.floor((selectedColor.light[0] + selectedColor.primary[0]) / 2);
      const mediumG = Math.floor((selectedColor.light[1] + selectedColor.primary[1]) / 2);
      const mediumB = Math.floor((selectedColor.light[2] + selectedColor.primary[2]) / 2);
      doc.setTextColor(mediumR, mediumG, mediumB);
    } else {
      doc.setTextColor(40, 40, 40);
    }
    doc.setFont('helvetica', 'bold');
    doc.text(t.billTo, leftMargin, clientInfoY + textYOffset);
    
    // Quote number and dates (right side) - not for creative
    if (template !== 'creative') {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      if (template === 'professional') {
        const mediumR = Math.floor((selectedColor.light[0] + selectedColor.primary[0]) / 2);
        const mediumG = Math.floor((selectedColor.light[1] + selectedColor.primary[1]) / 2);
        const mediumB = Math.floor((selectedColor.light[2] + selectedColor.primary[2]) / 2);
        doc.setTextColor(mediumR, mediumG, mediumB);
      } else {
        doc.setTextColor(40, 40, 40);
      }
      const docTitle = `${t.documentNumber} ${quote.quote_number}`;
      const titleWidth = doc.getTextWidth(docTitle);
      doc.text(docTitle, pageWidth - rightMargin - titleWidth, clientInfoY + textYOffset);
    }
    
    // Dates
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    const issueDateText = `${t.issueDate}: ${quote.issue_date}`;
    const issueDateWidth = doc.getTextWidth(issueDateText);
    const dateRightMargin = template === 'creative' ? margin : rightMargin;
    doc.text(issueDateText, pageWidth - dateRightMargin - issueDateWidth, clientInfoY + (template === 'creative' ? 0 : 6) + textYOffset);
    
    if (quote.expiry_date) {
      const expiryDateText = `${t.secondaryDate}: ${quote.expiry_date}`;
      const expiryDateWidth = doc.getTextWidth(expiryDateText);
      doc.text(expiryDateText, pageWidth - dateRightMargin - expiryDateWidth, clientInfoY + (template === 'creative' ? 6 : 12) + textYOffset);
    }
    
    // Client details
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    
    nextY = clientInfoY + 7 + textYOffset;
    doc.text(client.name, leftMargin, nextY);
    nextY += 5;
    
    if (client.contact_person) {
      doc.text(client.contact_person, leftMargin, nextY);
      nextY += 5;
    }
    if (client.address) {
      doc.text(client.address, leftMargin, nextY);
      nextY += 5;
    }
    if (client.notes) {
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text(client.notes, leftMargin, nextY);
      nextY += 5;
    }
  }

  // ========== ITEMS TABLE ==========
  const startY = nextY + 15;
  
  if (template === 'classic') {
    doc.setDrawColor(selectedColor.light[0], selectedColor.light[1], selectedColor.light[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, startY - 5, pageWidth - margin, startY - 5);
  }
  
  const tableHeaders = [t.description, t.qty, t.unitPrice, t.total];
  const tableData: string[][] = [];
  
  quote.items.forEach(item => {
    tableData.push([
      item.description,
      item.quantity.toString(),
      `$${item.unit_price.toFixed(2)}`,
      `$${item.total.toFixed(2)}`
    ]);
    
    if (item.notes) {
      tableData.push([`      ${t.notes}: ${item.notes}`, '', '', '']);
    }
  });
  
  // Totals
  tableData.push(['', '', `${t.subtotal}:`, `$${quote.subtotal.toFixed(2)}`]);
  
  if (company?.taxes && Array.isArray(company.taxes) && company.taxes.length > 0) {
    company.taxes.forEach((tax) => {
      const taxAmount = quote.subtotal * (tax.percentage / 100);
      tableData.push(['', '', `${tax.name} (${tax.percentage}%):`, `$${taxAmount.toFixed(2)}`]);
    });
  } else if (quote.tax_amount > 0) {
    tableData.push(['', '', `${t.tax}:`, `$${quote.tax_amount.toFixed(2)}`]);
  }
  
  tableData.push(['', '', `${t.total}:`, `$${quote.total.toFixed(2)}`]);
  
  const tableTheme = template === 'professional' ? 'grid' : 
                    template === 'modern' ? 'plain' : 
                    template === 'classic' ? 'grid' : 'plain';
  
  (doc as any).autoTable({
    head: [tableHeaders],
    body: tableData,
    startY: startY,
    theme: tableTheme,
    tableWidth: template === 'modern' ? 170 : 'auto',
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 10,
      cellPadding: template === 'professional' ? 3 : template === 'modern' ? 2 : template === 'classic' ? 2 : 3,
      lineColor: [240, 240, 240],
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: undefined,
      textColor: [40, 40, 40],
      fontStyle: 'bold',
      fontSize: template === 'professional' ? 11 : 10,
      cellPadding: 4,
      lineWidth: 0.5,
    },
    columnStyles: {
      0: { cellWidth: template === 'modern' ? 70 : 'auto' },
      1: { halign: 'center', cellWidth: template === 'modern' ? 25 : 'auto' },
      2: { halign: 'right', cellWidth: template === 'modern' ? 30 : 'auto' },
      3: { halign: 'right', fontStyle: 'bold', cellWidth: template === 'modern' ? 45 : 'auto' },
    },
    bodyStyles: {
      textColor: [60, 60, 60],
      fillColor: undefined,
    },
    didParseCell: function(data: any) {
      if ((template === 'modern' || template === 'classic' || template === 'creative') && data.section === 'head') {
        data.cell.styles.fillColor = undefined;
        data.cell.styles.lineWidth = 0;
      }
      
      if (data.section === 'body') {
        const isLastRow = data.row.index === data.table.body.length - 1;
        
        if (template === 'modern' && isLastRow) {
          data.cell.styles.fillColor = undefined;
          data.cell.styles.textColor = [255, 255, 255];
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize = 10;
          data.cell.styles.cellPadding = 4;
          data.cell.styles.lineWidth = 0;
        }
        
        if (template === 'classic' && isLastRow) {
          data.cell.styles.textColor = selectedColor.primary;
          data.cell.styles.fontStyle = 'bold';
        }
        
        if (template === 'creative' && isLastRow) {
          data.cell.styles.fillColor = undefined;
          data.cell.styles.textColor = selectedColor.primary;
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize = 10;
          data.cell.styles.cellPadding = 5;
          data.cell.styles.lineWidth = 0;
        } else if (template === 'creative') {
          data.cell.styles.lineColor = [240, 240, 240];
        }
      }
    },
    willDrawCell: function(data: any) {
      // Header backgrounds
      if ((template === 'modern' || template === 'classic' || template === 'creative') && data.section === 'head' && data.column.index === 0) {
        let totalWidth = 0;
        if (data.table?.columns) {
          data.table.columns.forEach((col: any) => { totalWidth += col.width; });
        }
        const startX = (data.table as any)?.pageStartX || margin;
        const radius = template === 'classic' ? 1.5 : 2;
        
        data.doc.setFillColor(selectedColor.light[0], selectedColor.light[1], selectedColor.light[2]);
        data.doc.roundedRect(startX, data.cell.y, totalWidth, data.row.height, radius, radius, 'F');
      }
      
      // Total row backgrounds
      if (data.section === 'body') {
        const isLastRow = data.row.index === data.table.body.length - 1;
        if (isLastRow && data.column.index === 0) {
          let totalWidth = 0;
          if (data.table?.columns) {
            data.table.columns.forEach((col: any) => { totalWidth += col.width; });
          }
          const startX = (data.table as any)?.pageStartX || margin;
          
          if (template === 'modern') {
            data.doc.setFillColor(selectedColor.primary[0], selectedColor.primary[1], selectedColor.primary[2]);
            data.doc.roundedRect(startX, data.cell.y, totalWidth, data.row.height, 2, 2, 'F');
          } else if (template === 'creative') {
            data.doc.setFillColor(selectedColor.light[0], selectedColor.light[1], selectedColor.light[2]);
            data.doc.roundedRect(startX, data.cell.y, totalWidth, data.row.height, 2, 2, 'F');
          }
        }
      }
    },
    didDrawCell: function(data: any) {
      // Line above total for professional template
      if (template === 'professional' && data.section === 'body') {
        const isLastRow = data.row.index === data.table.body.length - 1;
        const isLastColumn = data.column.index === data.table.columns.length - 1;
        
        if (isLastRow && isLastColumn) {
          let tableWidth = 0;
          if (data.table?.columns) {
            tableWidth = data.table.columns.reduce((sum: number, col: any) => sum + (col?.width || 0), 0);
          }
          const startX = (data.table as any)?.pageStartX || margin;
          
          const mediumR = Math.floor((selectedColor.light[0] + selectedColor.primary[0]) / 2);
          const mediumG = Math.floor((selectedColor.light[1] + selectedColor.primary[1]) / 2);
          const mediumB = Math.floor((selectedColor.light[2] + selectedColor.primary[2]) / 2);
          data.doc.setDrawColor(mediumR, mediumG, mediumB);
          data.doc.setLineWidth(0.5);
          data.doc.line(startX, data.cell.y, startX + tableWidth, data.cell.y);
        }
      }
    }
  });

  // ========== NOTES, TERMS & FOOTER ==========
  const tableEndY = (doc as any).lastAutoTable?.finalY || startY + 100;
  let contentEndY = tableEndY;
  
  // Notes section
  if (quote.notes) {
    const notesY = contentEndY + 20;
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text(`${t.notes}:`, margin, notesY);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const splitNotes = doc.splitTextToSize(quote.notes, contentWidth);
    doc.text(splitNotes, margin, notesY + 10);
    contentEndY = notesY + 10 + (splitNotes.length * 5);
  }
  
  // Body message
  const bodyMessage = isClientFrench 
    ? (company?.quote_body_message_fr || company?.quote_body_message_en) 
    : (company?.quote_body_message_en || company?.quote_body_message_fr);
  
  if (bodyMessage) {
    const bodyY = contentEndY + 15;
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'normal');
    const splitBody = doc.splitTextToSize(bodyMessage, contentWidth);
    doc.text(splitBody, margin, bodyY);
    contentEndY = bodyY + (splitBody.length * 5);
  }
  
  // Terms section
  if (quote.terms) {
    const termsY = contentEndY + 15;
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text(`${t.termsLabel}:`, margin, termsY);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const splitTerms = doc.splitTextToSize(quote.terms, contentWidth);
    doc.text(splitTerms, margin, termsY + 10);
    contentEndY = termsY + 10 + (splitTerms.length * 5);
  }
  
  // Footer section - positioned directly after content
  const footerMessage = isClientFrench 
    ? (company?.quote_footer_message_fr || company?.quote_footer_message_en) 
    : (company?.quote_footer_message_en || company?.quote_footer_message_fr);
  
  const shouldRenderFooter = !!footerMessage && footerMessage.trim() !== (bodyMessage?.trim() || '');
  
  const footerY = contentEndY + 15;
  const centerX = pageWidth / 2;
  
  // Footer separator
  if (template === 'modern') {
    doc.setFillColor(selectedColor.light[0], selectedColor.light[1], selectedColor.light[2]);
    doc.rect(margin, footerY, contentWidth, 16, 'F');
  } else if (template === 'professional') {
    doc.setDrawColor(selectedColor.primary[0], selectedColor.primary[1], selectedColor.primary[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, footerY, pageWidth - margin, footerY);
  } else {
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY, pageWidth - margin, footerY);
  }
  
  // Footer text
  const footerTextY = template === 'modern' ? footerY + 6 : footerY + 8;
  doc.setFontSize(8);
  if (template === 'creative') {
    doc.setTextColor(selectedColor.primary[0], selectedColor.primary[1], selectedColor.primary[2]);
  } else {
    doc.setTextColor(100, 100, 100);
  }
  
  if (shouldRenderFooter) {
    doc.text(footerMessage!, centerX, footerTextY, { align: 'center' });
  } else {
    doc.text(t.thankYou, centerX, footerTextY, { align: 'center' });
  }
  
  // Branding (if not hidden)
  if (!hideBranding) {
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    const brandingY = template === 'modern' ? footerY + 12 : footerTextY + 6;
    doc.text(t.branding, centerX, brandingY, { align: 'center' });
  }

  // Return as base64 for email attachment
  return doc.output('datauristring').split(',')[1];
}
