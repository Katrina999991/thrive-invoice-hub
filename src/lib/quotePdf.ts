import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Colors - GestionFlow design system
const COLORS = {
  primary: [37, 99, 235] as [number, number, number],      // GestionFlow blue
  primaryLight: [59, 130, 246] as [number, number, number], // Lighter blue
  dark: [17, 24, 39] as [number, number, number],          // Very dark for headings
  text: [55, 65, 81] as [number, number, number],          // Main text color
  gray: [107, 114, 128] as [number, number, number],       // Medium gray
  lightGray: [156, 163, 175] as [number, number, number],  // Light gray
  tableHeader: [243, 244, 246] as [number, number, number], // Table header bg
  tableAlt: [249, 250, 251] as [number, number, number],   // Alternating row bg
  border: [229, 231, 235] as [number, number, number],     // Border color
  white: [255, 255, 255] as [number, number, number],
  totalBg: [239, 246, 255] as [number, number, number],    // Light blue for total highlight
  clientBg: [248, 250, 252] as [number, number, number],   // Very light gray for client box
};

export interface QuoteItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  notes?: string;
  product_taxes?: Array<{name: string, type?: 'percentage' | 'amount', value?: number, percentage?: number}>;
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
}

export interface ClientData {
  name: string;
  email?: string | null;
  address?: string | null;
  phone?: string | null;
  contact_person?: string | null;
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

const translations = {
  fr: {
    quote: 'DEVIS',
    preparedFor: 'Préparé pour',
    quoteNumber: 'N° Devis',
    issueDate: 'Date d\'émission',
    expiryDate: 'Valide jusqu\'au',
    item: 'Article / Description',
    quantity: 'Qté',
    unitPrice: 'Prix unitaire',
    total: 'Total',
    subtotal: 'Sous-total',
    tax: 'Taxes',
    totalAmount: 'TOTAL',
    terms: 'Conditions',
    notes: 'Notes',
    thankYou: 'Merci pour votre confiance !',
    branding: 'Créé avec GestionFlow',
  },
  en: {
    quote: 'QUOTE',
    preparedFor: 'Prepared for',
    quoteNumber: 'Quote #',
    issueDate: 'Issue Date',
    expiryDate: 'Valid Until',
    item: 'Item / Description',
    quantity: 'Qty',
    unitPrice: 'Unit Price',
    total: 'Total',
    subtotal: 'Subtotal',
    tax: 'Taxes',
    totalAmount: 'TOTAL',
    terms: 'Terms & Conditions',
    notes: 'Notes',
    thankYou: 'Thank you for your business!',
    branding: 'Created with GestionFlow',
  }
};

async function loadLogo(logoUrl: string): Promise<{ data: string; format: string } | null> {
  try {
    console.log('Loading logo from URL:', logoUrl);
    const response = await fetch(logoUrl);
    
    if (!response.ok) {
      console.error('Failed to fetch logo:', response.status, response.statusText);
      return null;
    }
    
    const blob = await response.blob();
    console.log('Logo blob type:', blob.type, 'size:', blob.size);
    
    // Detect format from MIME type
    let format = 'PNG';
    if (blob.type.includes('jpeg') || blob.type.includes('jpg')) {
      format = 'JPEG';
    } else if (blob.type.includes('png')) {
      format = 'PNG';
    } else if (blob.type.includes('gif')) {
      format = 'GIF';
    } else if (blob.type.includes('webp')) {
      format = 'WEBP';
    }
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        console.log('Logo loaded successfully, format:', format, 'data length:', result?.length);
        resolve({ data: result, format });
      };
      reader.onerror = (e) => {
        console.error('FileReader error:', e);
        resolve(null);
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error loading logo:', error);
    return null;
  }
}

export async function generateQuotePdf(options: QuotePdfOptions): Promise<Blob | void> {
  const { quote, client, company, language, hideBranding = false, accentColor, customFooterText, returnBlob = false } = options;
  const t = translations[language];
  const primaryColor = accentColor || COLORS.primary;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let yPos = 15;

  // ========== HEADER SECTION (Two-column layout) ==========
  
  const headerLeftWidth = contentWidth * 0.55;
  const headerRightWidth = contentWidth * 0.45;
  const headerRightX = margin + headerLeftWidth;
  
  // LEFT SIDE: Logo + Company Info
  let companyY = yPos;
  let logoEndX = margin;
  
  // Company logo
  if (company?.logo_url) {
    console.log('Attempting to load company logo:', company.logo_url);
    const logoResult = await loadLogo(company.logo_url);
    if (logoResult) {
      try {
        console.log('Adding logo to PDF with format:', logoResult.format);
        const logoSize = 28;
        doc.addImage(logoResult.data, logoResult.format, margin, yPos, logoSize, logoSize);
        logoEndX = margin + logoSize + 8;
        console.log('Logo added successfully');
      } catch (e) {
        console.error('Error adding logo to PDF:', e);
      }
    } else {
      console.warn('Logo could not be loaded');
    }
  } else {
    console.log('No logo_url provided for company');
  }

  // Company info
  if (company) {
    const companyInfoX = logoEndX;
    
    // Company name
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text(company.name, companyInfoX, companyY + 6);
    companyY += 13;
    
    // Company details
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.gray);
    
    // Address line
    const addressParts = [];
    if (company.street_address) addressParts.push(company.street_address);
    if (addressParts.length > 0) {
      doc.text(addressParts.join(', '), companyInfoX, companyY);
      companyY += 4;
    }
    
    // City line
    const cityParts = [company.city, company.province_state, company.postal_code].filter(Boolean);
    if (cityParts.length > 0) {
      doc.text(cityParts.join(', '), companyInfoX, companyY);
      companyY += 4;
    }
    
    // Contact info
    if (company.email) {
      doc.text(company.email, companyInfoX, companyY);
      companyY += 4;
    }
    if (company.phone) {
      doc.text(company.phone, companyInfoX, companyY);
      companyY += 4;
    }
    if (company.tax_id) {
      doc.text(company.tax_id, companyInfoX, companyY);
    }
  }

  // RIGHT SIDE: Document title and details
  let rightY = yPos;
  
  // Large document title "QUOTE"
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text(t.quote, pageWidth - margin, rightY + 8, { align: 'right' });
  rightY += 20;

  // Quote details in a compact format
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.text);
  
  // Quote number
  doc.setFont('helvetica', 'normal');
  doc.text(t.quoteNumber, headerRightX + 15, rightY);
  doc.setFont('helvetica', 'bold');
  doc.text(quote.quote_number, pageWidth - margin, rightY, { align: 'right' });
  rightY += 6;
  
  // Issue date
  doc.setFont('helvetica', 'normal');
  doc.text(t.issueDate, headerRightX + 15, rightY);
  doc.setFont('helvetica', 'bold');
  doc.text(quote.issue_date, pageWidth - margin, rightY, { align: 'right' });
  rightY += 6;
  
  // Expiry date
  if (quote.expiry_date) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...primaryColor);
    doc.text(t.expiryDate, headerRightX + 15, rightY);
    doc.setFont('helvetica', 'bold');
    doc.text(quote.expiry_date, pageWidth - margin, rightY, { align: 'right' });
    doc.setTextColor(...COLORS.text);
  }

  // Calculate header end position
  yPos = Math.max(companyY, rightY) + 10;

  // Header divider line
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 12;

  // ========== CLIENT SECTION ==========
  
  // Client box with subtle background
  const clientBoxWidth = contentWidth * 0.5;
  const clientContentPadding = 10;
  let clientContentHeight = 35;
  
  // Calculate actual height needed for client info
  if (client) {
    let lines = 1; // name
    if (client.contact_person && client.contact_person !== client.name) lines++;
    if (client.email) lines++;
    if (client.phone) lines++;
    if (client.address) lines += Math.ceil(client.address.length / 40);
    clientContentHeight = Math.max(35, 20 + lines * 5);
  }
  
  // Draw client box
  doc.setFillColor(...COLORS.clientBg);
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, yPos, clientBoxWidth, clientContentHeight, 4, 4, 'FD');
  
  // "Prepared for" label
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text(t.preparedFor.toUpperCase(), margin + clientContentPadding, yPos + 10);
  
  // Client details
  let clientY = yPos + 18;
  if (client) {
    // Client name (larger, bold)
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text(client.name, margin + clientContentPadding, clientY);
    clientY += 6;
    
    // Contact details
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.text);
    
    if (client.contact_person && client.contact_person !== client.name) {
      doc.text(client.contact_person, margin + clientContentPadding, clientY);
      clientY += 5;
    }
    if (client.email) {
      doc.text(client.email, margin + clientContentPadding, clientY);
      clientY += 5;
    }
    if (client.phone) {
      doc.text(client.phone, margin + clientContentPadding, clientY);
      clientY += 5;
    }
    if (client.address) {
      const addressLines = doc.splitTextToSize(client.address, clientBoxWidth - clientContentPadding * 2);
      doc.text(addressLines, margin + clientContentPadding, clientY);
    }
  }

  yPos += clientContentHeight + 15;

  // ========== ITEMS TABLE ==========
  
  const tableHeaders = [t.item, t.quantity, t.unitPrice, t.total];
  const tableData = quote.quote_items.map((item) => [
    item.description,
    item.quantity.toString(),
    `$${item.unit_price.toFixed(2)}`,
    `$${item.total.toFixed(2)}`
  ]);

  autoTable(doc, {
    head: [tableHeaders],
    body: tableData,
    startY: yPos,
    theme: 'plain',
    tableWidth: contentWidth,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 9,
      cellPadding: { top: 8, right: 10, bottom: 8, left: 10 },
      lineColor: COLORS.border,
      lineWidth: 0,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: COLORS.tableHeader,
      textColor: COLORS.dark,
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: { top: 10, right: 10, bottom: 10, left: 10 },
    },
    bodyStyles: {
      textColor: COLORS.text,
    },
    columnStyles: {
      0: { cellWidth: 'auto', halign: 'left' },
      1: { halign: 'center', cellWidth: 22 },
      2: { halign: 'right', cellWidth: 32 },
      3: { halign: 'right', cellWidth: 32, fontStyle: 'bold', textColor: COLORS.dark }
    },
    didParseCell: (data) => {
      // Alternating row backgrounds
      if (data.section === 'body' && data.row.index % 2 === 1) {
        data.cell.styles.fillColor = COLORS.tableAlt;
      }
    },
    didDrawCell: (data) => {
      // Draw subtle bottom border for each row
      if (data.section === 'body') {
        const { cell, doc: pdfDoc } = data;
        pdfDoc.setDrawColor(...COLORS.border);
        pdfDoc.setLineWidth(0.2);
        pdfDoc.line(
          cell.x,
          cell.y + cell.height,
          cell.x + cell.width,
          cell.y + cell.height
        );
      }
    }
  });

  // ========== TOTALS SECTION ==========
  
  const finalY = (doc as any).lastAutoTable?.finalY || yPos + 50;
  let totalsY = finalY + 8;
  const totalsWidth = 85;
  const totalsX = pageWidth - margin - totalsWidth;
  const labelX = totalsX;
  const valueX = pageWidth - margin;

  // Subtotal
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.gray);
  doc.text(t.subtotal, labelX, totalsY);
  doc.setTextColor(...COLORS.text);
  doc.text(`$${quote.subtotal.toFixed(2)}`, valueX, totalsY, { align: 'right' });
  totalsY += 6;

  // Taxes
  if (quote.tax_amount > 0) {
    doc.setTextColor(...COLORS.gray);
    doc.text(t.tax, labelX, totalsY);
    doc.setTextColor(...COLORS.text);
    doc.text(`$${quote.tax_amount.toFixed(2)}`, valueX, totalsY, { align: 'right' });
    totalsY += 6;
  }

  // Divider line above total
  totalsY += 2;
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.8);
  doc.line(totalsX - 5, totalsY, valueX, totalsY);
  totalsY += 8;

  // Total with highlight background
  const totalBoxHeight = 14;
  doc.setFillColor(...COLORS.totalBg);
  doc.roundedRect(totalsX - 8, totalsY - 6, totalsWidth + 8, totalBoxHeight, 3, 3, 'F');
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text(t.totalAmount, labelX, totalsY + 2);
  doc.setFontSize(12);
  doc.text(`$${quote.total.toFixed(2)}`, valueX, totalsY + 2, { align: 'right' });

  totalsY += totalBoxHeight + 15;

  // ========== TERMS & NOTES ==========
  
  let contentY = totalsY;
  
  if (quote.terms) {
    // Terms section header
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(t.terms, margin, contentY);
    contentY += 6;
    
    // Terms content
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.text);
    const termsLines = doc.splitTextToSize(quote.terms, contentWidth);
    doc.text(termsLines, margin, contentY);
    contentY += termsLines.length * 4 + 10;
  }

  if (quote.notes) {
    // Notes section header
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(t.notes, margin, contentY);
    contentY += 6;
    
    // Notes content
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.text);
    const notesLines = doc.splitTextToSize(quote.notes, contentWidth);
    doc.text(notesLines, margin, contentY);
  }

  // ========== FOOTER ==========
  
  const footerY = pageHeight - 20;
  
  // Footer divider line
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(margin + 20, footerY - 8, pageWidth - margin - 20, footerY - 8);
  
  // Thank you message
  const footerText = customFooterText || t.thankYou;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...COLORS.gray);
  doc.text(footerText, pageWidth / 2, footerY, { align: 'center' });

  // Branding (can be hidden for Pro users)
  if (!hideBranding) {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.lightGray);
    doc.text(t.branding, pageWidth / 2, footerY + 6, { align: 'center' });
  }

  // Return blob or save
  if (returnBlob) {
    const pdfBlob = doc.output('blob');
    return pdfBlob;
  } else {
    doc.save(`${quote.quote_number}.pdf`);
  }
}
