import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { loadLogo, calculatePdfLogoDimensions, LOGO_SIZES, type LogoData } from './logoUtils';

// ============= UNIFIED PDF DESIGN SYSTEM =============
// This library generates PDFs for both invoices and quotes
// with identical visual templates. Only document-specific
// text and labels differ between the two document types.

// Color presets (RGB values for jsPDF)
export const COLOR_PRESETS: Record<string, { primary: [number, number, number]; light: [number, number, number] }> = {
  blue: { primary: [37, 99, 235], light: [219, 234, 254] },
  green: { primary: [22, 163, 74], light: [220, 252, 231] },
  purple: { primary: [147, 51, 234], light: [243, 232, 255] },
  orange: { primary: [234, 88, 12], light: [255, 237, 213] },
  yellow: { primary: [202, 138, 4], light: [254, 249, 195] },
  gray: { primary: [75, 85, 99], light: [243, 244, 246] }
};

export type TemplateType = 'classic' | 'modern' | 'professional' | 'creative';
export type DocumentType = 'invoice' | 'quote';

export interface DocumentItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  notes?: string | null;
  product_taxes?: Array<{ name: string; type?: 'percentage' | 'amount'; value?: number; percentage?: number }>;
}

export interface DocumentData {
  document_number: string;
  issue_date: string;
  due_date?: string | null;      // For invoices
  expiry_date?: string | null;   // For quotes
  subtotal: number;
  tax_amount: number;
  total: number;
  terms?: string | null;
  notes?: string | null;
  items: DocumentItem[];
  status?: string;
  late_fee_applied_total?: number;
  late_fee_terms_text?: string | null;
}

export interface ClientData {
  name: string;
  email?: string | null;
  address?: string | null;
  phone?: string | null;
  contact_person?: string | null;
  contact_title?: string | null;
  notes?: string | null;
  language?: string | null;
}

/** Combines contact_title and contact_person into a formatted string */
export function formatContactPerson(contact_person?: string | null, contact_title?: string | null): string | null {
  if (!contact_person) return null;
  if (contact_title) return `${contact_title} ${contact_person}`;
  return contact_person;
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
  // Body and footer messages
  invoice_body_message_en?: string | null;
  invoice_body_message_fr?: string | null;
  invoice_footer_message?: string | null;
  invoice_footer_message_en?: string | null;
  invoice_footer_message_fr?: string | null;
  quote_body_message_en?: string | null;
  quote_body_message_fr?: string | null;
  quote_footer_message_en?: string | null;
  quote_footer_message_fr?: string | null;
}

export interface DocumentPdfOptions {
  documentType: DocumentType;
  document: DocumentData;
  client?: ClientData | null;
  company?: CompanyData | null;
  language: 'fr' | 'en';
  template?: TemplateType;
  colorPreset?: string;
  customColor?: { primary: [number, number, number]; light: [number, number, number] };
  hideBranding?: boolean;
  customFooterText?: string;
  returnBlob?: boolean;
}

// Translations for both document types
const getTranslations = (language: 'fr' | 'en', documentType: DocumentType, isClientFrench?: boolean) => {
  const lang = isClientFrench !== undefined ? (isClientFrench ? 'fr' : 'en') : language;
  
  const common = {
    fr: {
      billTo: 'Facturer à :',
      preparedFor: 'Préparé pour',
      issueDate: "Date d'émission",
      description: 'Description',
      qty: 'Qté',
      unitPrice: 'Prix unitaire',
      total: 'Total',
      subtotal: 'Sous-total',
      tax: 'Taxes',
      notes: 'Notes',
      terms: 'Conditions',
      thankYou: 'Merci pour votre confiance !',
      branding: 'Créé avec GestionFlow',
      phone: 'Téléphone',
      email: 'Courriel',
      website: 'Site web',
      status: 'Statut'
    },
    en: {
      billTo: 'Bill To:',
      preparedFor: 'Prepared for',
      issueDate: 'Issue Date',
      description: 'Description',
      qty: 'Qty',
      unitPrice: 'Unit Price',
      total: 'Total',
      subtotal: 'Subtotal',
      tax: 'Taxes',
      notes: 'Notes',
      terms: 'Terms',
      thankYou: 'Thank you for your business!',
      branding: 'Created with GestionFlow',
      phone: 'Phone',
      email: 'Email',
      website: 'Website',
      status: 'Status'
    }
  };

  const documentSpecific = {
    invoice: {
      fr: {
        title: 'FACTURE',
        documentNumber: 'Facture',
        secondaryDate: "Date d'échéance",
        termsLabel: 'Conditions de paiement'
      },
      en: {
        title: 'INVOICE',
        documentNumber: 'Invoice',
        secondaryDate: 'Due Date',
        termsLabel: 'Payment Terms'
      }
    },
    quote: {
      fr: {
        title: 'DEVIS',
        documentNumber: 'Devis',
        secondaryDate: "Valide jusqu'au",
        noExpiryDate: 'Validité : Sans date d\'expiration',
        termsLabel: 'Conditions'
      },
      en: {
        title: 'QUOTE',
        documentNumber: 'Quote',
        secondaryDate: 'Valid Until',
        noExpiryDate: 'Validity: No expiration date',
        termsLabel: 'Terms & Conditions'
      }
    }
  };

  return {
    ...common[lang],
    ...documentSpecific[documentType][lang]
  };
};

// Logo loading is now handled by logoUtils.ts

// Main PDF generation function
export async function generateDocumentPdf(options: DocumentPdfOptions): Promise<Blob | void> {
  const {
    documentType,
    document,
    client,
    company,
    language,
    template = 'classic',
    colorPreset = 'blue',
    customColor,
    hideBranding = false,
    customFooterText,
    returnBlob = false
  } = options;

  // Determine if client prefers French
  const isClientFrench = client?.language === 'french';
  const t = getTranslations(language, documentType, isClientFrench);
  
  // Get color based on preset or custom
  const selectedColor = customColor || COLOR_PRESETS[colorPreset] || COLOR_PRESETS.blue;
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  doc.setFont('helvetica');

  // ========== HEADER SECTION ==========
  let headerHeight = 20;
  
  // Creative template: Colored header bar at top with company name left, document info right
  if (template === 'creative') {
    // Draw solid colored header bar spanning full width
    const headerBarHeight = 25;
    const headerBarY = 10;
    doc.setFillColor(selectedColor.primary[0], selectedColor.primary[1], selectedColor.primary[2]);
    doc.rect(0, headerBarY, pageWidth, headerBarHeight, 'F');
    
    // Company name (left side, white text)
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(company?.name || '', margin, headerBarY + 16);
    
    // Document type and number (right side, white text)
    const docTitle = `${t.title} ${document.document_number}`;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(docTitle, pageWidth - margin, headerBarY + 16, { align: 'right' });
    
    headerHeight = headerBarY + headerBarHeight + 10;
    
    // Company details below header bar (smaller, gray text)
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
    // Non-creative templates: Original header layout
    // Company Logo (right side) - using centralized logo utility
    if (company?.logo_url) {
      try {
        const logoResult = await loadLogo(company.logo_url);
        if (logoResult) {
          // Use centralized sizing - contain behavior, no upscaling
          const logoDims = calculatePdfLogoDimensions(logoResult, 'invoice');
          
          // Position logo at right side, vertically centered in header area
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
        // Fallback: company name is always displayed, so no additional action needed
      }
    }
    
    // Company Info (left side)
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
    
    // Header separator line (not for modern)
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
  // Creative template has a different starting Y due to the header bar
  const clientInfoY = template === 'creative' ? 60 : 50;
  let nextY = clientInfoY;
  
  if (client) {
    // Background box for modern template only (creative doesn't need it anymore)
    const boxHeight = 20 + (client.contact_person ? 5 : 0) + (client.address ? 5 : 0) + (client.notes ? 5 : 0);
    
    if (template === 'modern') {
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(margin, clientInfoY - 3, contentWidth, boxHeight, 2, 2, 'F');
    }
    
    const textYOffset = template === 'modern' ? 2 : 0;
    const leftMargin = template === 'modern' ? margin + 4 : margin;
    const rightMargin = template === 'modern' ? margin + 4 : margin;
    
    // "Bill To" / "Prepared For" label
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
    
    // Document title and number (right side) - not for creative as it's in header bar
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
      const docTitle = `${t.documentNumber} ${document.document_number}`;
      const titleWidth = doc.getTextWidth(docTitle);
      doc.text(docTitle, pageWidth - rightMargin - titleWidth, clientInfoY + textYOffset);
    }
    
    // Issue date and secondary date (right side)
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    const issueDateText = `${t.issueDate}: ${document.issue_date}`;
    const issueDateWidth = doc.getTextWidth(issueDateText);
    const dateRightMargin = template === 'creative' ? margin : rightMargin;
    doc.text(issueDateText, pageWidth - dateRightMargin - issueDateWidth, clientInfoY + (template === 'creative' ? 0 : 6) + textYOffset);
    
    // Secondary date (due date for invoices, expiry date for quotes)
    const secondaryDate = documentType === 'invoice' ? document.due_date : document.expiry_date;
    if (secondaryDate) {
      const secondaryDateText = `${t.secondaryDate}: ${secondaryDate}`;
      const secondaryDateWidth = doc.getTextWidth(secondaryDateText);
      doc.text(secondaryDateText, pageWidth - dateRightMargin - secondaryDateWidth, clientInfoY + (template === 'creative' ? 6 : 12) + textYOffset);
    } else if (documentType === 'quote') {
      // Show "No expiration date" for quotes without expiry
      const noExpiryText = (t as any).noExpiryDate || 'Validity: No expiration date';
      const noExpiryWidth = doc.getTextWidth(noExpiryText);
      doc.text(noExpiryText, pageWidth - dateRightMargin - noExpiryWidth, clientInfoY + (template === 'creative' ? 6 : 12) + textYOffset);
    }
    
    // Client details
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    
    nextY = clientInfoY + 7 + textYOffset;
    doc.text(client.name, leftMargin, nextY);
    nextY += 5;
    
    const formattedContact = formatContactPerson(client.contact_person, client.contact_title);
    if (formattedContact) {
      doc.text(formattedContact, leftMargin, nextY);
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
  
  // Line above table for classic template
  if (template === 'classic') {
    doc.setDrawColor(selectedColor.light[0], selectedColor.light[1], selectedColor.light[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, startY - 5, pageWidth - margin, startY - 5);
  }
  
  const tableHeaders = [t.description, t.qty, t.unitPrice, t.total];
  const tableData: string[][] = [];
  
  // Add items
  document.items.forEach(item => {
    tableData.push([
      item.description,
      item.quantity.toString(),
      `$${item.unit_price.toFixed(2)}`,
      `$${item.total.toFixed(2)}`
    ]);
    
    // Add item notes if present
    if (item.notes) {
      tableData.push([`      ${t.notes}: ${item.notes}`, '', '', '']);
    }
  });
  
  // Add totals
  tableData.push(['', '', `${t.subtotal}:`, `$${document.subtotal.toFixed(2)}`]);
  
  // Add individual taxes if company has multiple taxes
  if (company?.taxes && Array.isArray(company.taxes) && company.taxes.length > 0) {
    company.taxes.forEach((tax) => {
      const taxAmount = document.subtotal * (tax.percentage / 100);
      tableData.push(['', '', `${tax.name} (${tax.percentage}%):`, `$${taxAmount.toFixed(2)}`]);
    });
  } else if (document.tax_amount > 0) {
    tableData.push(['', '', `${t.tax}:`, `$${document.tax_amount.toFixed(2)}`]);
  }
  
  tableData.push(['', '', `${t.total}:`, `$${document.total.toFixed(2)}`]);

  // Add late fee line if applicable (invoices only)
  const lateFeeTotal = document.late_fee_applied_total || 0;
  if (documentType === 'invoice' && lateFeeTotal > 0) {
    const lateFeeLabel = isClientFrench ? 'Frais de retard :' : 'Late fee:';
    const balanceDueLabel = isClientFrench ? 'Solde dû :' : 'Balance due:';
    tableData.push(['', '', lateFeeLabel, `$${lateFeeTotal.toFixed(2)}`]);
    tableData.push(['', '', balanceDueLabel, `$${(document.total + lateFeeTotal).toFixed(2)}`]);
  }
  
  // Table theme based on template
  const tableTheme = template === 'professional' ? 'grid' : 
                    template === 'modern' ? 'plain' : 
                    template === 'classic' ? 'grid' : 'plain';
  
  autoTable(doc, {
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
      // Remove fills for custom backgrounds
      if ((template === 'modern' || template === 'classic' || template === 'creative') && data.section === 'head') {
        data.cell.styles.fillColor = undefined;
        data.cell.styles.lineWidth = 0;
      }
      
      // Style last row (total)
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
        
        // Creative template: total row with pale-blue background and dark text
        if (template === 'creative' && isLastRow) {
          data.cell.styles.fillColor = undefined;
          data.cell.styles.textColor = selectedColor.primary; // Dark primary color text
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
      // Draw rounded backgrounds for table header
      if ((template === 'modern' || template === 'classic' || template === 'creative') && data.section === 'head' && data.column.index === 0) {
        let totalWidth = 0;
        if (data.table?.columns) {
          data.table.columns.forEach((col: any) => { totalWidth += col.width; });
        }
        const startX = (data.table as any)?.pageStartX || margin;
        const radius = template === 'classic' ? 1.5 : 2;
        
        // Use light (pale-blue) color for header background
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
            // Modern: primary color background with white text
            data.doc.setFillColor(selectedColor.primary[0], selectedColor.primary[1], selectedColor.primary[2]);
            data.doc.roundedRect(startX, data.cell.y, totalWidth, data.row.height, 2, 2, 'F');
          } else if (template === 'creative') {
            // Creative: pale-blue (light) background with dark text
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
  if (document.notes) {
    const notesY = contentEndY + 20;
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text(`${t.notes}:`, margin, notesY);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const splitNotes = doc.splitTextToSize(document.notes, contentWidth);
    doc.text(splitNotes, margin, notesY + 10);
    contentEndY = notesY + 10 + (splitNotes.length * 5);
  }
  
  // Body message (document-type specific)
  const bodyMessage = documentType === 'invoice'
    ? (isClientFrench ? company?.invoice_body_message_fr || company?.invoice_body_message_en : company?.invoice_body_message_en || company?.invoice_body_message_fr)
    : (isClientFrench ? company?.quote_body_message_fr || company?.quote_body_message_en : company?.quote_body_message_en || company?.quote_body_message_fr);
  
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
  if (document.terms) {
    const termsY = contentEndY + 15;
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text(`${t.termsLabel}:`, margin, termsY);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const splitTerms = doc.splitTextToSize(document.terms, contentWidth);
    doc.text(splitTerms, margin, termsY + 10);
    contentEndY = termsY + 10 + (splitTerms.length * 5);
  }
  
  // Footer section - positioned directly after content (matching preview)
  const footerMessage = documentType === 'invoice'
    ? (isClientFrench ? company?.invoice_footer_message_fr || company?.invoice_footer_message : company?.invoice_footer_message_en || company?.invoice_footer_message)
    : (isClientFrench ? company?.quote_footer_message_fr || company?.quote_footer_message_en : company?.quote_footer_message_en || company?.quote_footer_message_fr);
  
  const shouldRenderFooter = !!footerMessage && footerMessage.trim() !== (bodyMessage?.trim() || '');
  
  // Footer positioned immediately after content with minimal margin (matching preview)
  const footerY = contentEndY + 15;
  const centerX = pageWidth / 2;
  
  // Draw separator line for all templates (matching preview border-top)
  if (template === 'modern') {
    // Modern: light colored background bar - compact height to match preview
    doc.setFillColor(selectedColor.light[0], selectedColor.light[1], selectedColor.light[2]);
    doc.rect(margin, footerY, contentWidth, 16, 'F');
  } else if (template === 'professional') {
    doc.setDrawColor(selectedColor.primary[0], selectedColor.primary[1], selectedColor.primary[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, footerY, pageWidth - margin, footerY);
  } else {
    // Classic and creative: simple gray line
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY, pageWidth - margin, footerY);
  }
  
  // Footer text - CENTERED, positioned in document flow
  const footerTextY = template === 'modern' ? footerY + 6 : footerY + 8;
  doc.setFontSize(8);
  if (template === 'creative') {
    doc.setTextColor(selectedColor.primary[0], selectedColor.primary[1], selectedColor.primary[2]);
  } else {
    doc.setTextColor(100, 100, 100);
  }
  
  if (shouldRenderFooter) {
    doc.text(footerMessage!, centerX, footerTextY, { align: 'center' });
  } else if (customFooterText) {
    doc.text(customFooterText, centerX, footerTextY, { align: 'center' });
  } else {
    doc.text(t.thankYou, centerX, footerTextY, { align: 'center' });
  }
  
  // Branding (if not hidden) - CENTERED below the thank you message
  if (!hideBranding) {
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    const brandingY = template === 'modern' ? footerY + 12 : footerTextY + 6;
    doc.text(t.branding, centerX, brandingY, { align: 'center' });
  }

  // Return blob or save file
  const filename = documentType === 'invoice' 
    ? `invoice-${document.document_number}.pdf`
    : `quote-${document.document_number}.pdf`;
  
  if (returnBlob) {
    return doc.output('blob');
  } else {
    doc.save(filename);
  }
}

// Convenience functions for backward compatibility
export async function generateInvoicePdf(options: Omit<DocumentPdfOptions, 'documentType'> & { invoice: DocumentData }): Promise<Blob | void> {
  return generateDocumentPdf({
    ...options,
    documentType: 'invoice',
    document: options.invoice
  });
}

export async function generateQuotePdfUnified(options: Omit<DocumentPdfOptions, 'documentType'> & { quote: DocumentData }): Promise<Blob | void> {
  return generateDocumentPdf({
    ...options,
    documentType: 'quote',
    document: options.quote
  });
}
