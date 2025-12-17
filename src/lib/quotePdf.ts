import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Colors
const COLORS = {
  primary: [37, 99, 235] as [number, number, number],      // GestionFlow blue
  dark: [31, 41, 55] as [number, number, number],          // Dark gray for text
  gray: [107, 114, 128] as [number, number, number],       // Medium gray
  lightGray: [156, 163, 175] as [number, number, number],  // Light gray
  tableHeader: [249, 250, 251] as [number, number, number], // Very light gray
  tableAlt: [249, 250, 251] as [number, number, number],   // Alternating row bg
  border: [229, 231, 235] as [number, number, number],     // Border color
  white: [255, 255, 255] as [number, number, number],
  totalBg: [239, 246, 255] as [number, number, number],    // Light blue for total highlight
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
  returnBlob?: boolean;
}

const translations = {
  fr: {
    quote: 'DEVIS',
    preparedFor: 'Préparé pour',
    quoteNumber: 'N° Devis',
    issueDate: 'Date',
    expiryDate: 'Expire le',
    item: 'Article / Description',
    quantity: 'Quantité',
    unitPrice: 'Prix unitaire',
    total: 'Total',
    subtotal: 'Sous-total',
    tax: 'Taxes',
    totalAmount: 'Total',
    terms: 'Conditions',
    notes: 'Notes',
    thankYou: 'Merci pour votre confiance !',
    branding: 'Créé avec GestionFlow',
  },
  en: {
    quote: 'QUOTE',
    preparedFor: 'Prepared for',
    quoteNumber: 'Quote #',
    issueDate: 'Date',
    expiryDate: 'Expires',
    item: 'Item / Description',
    quantity: 'Quantity',
    unitPrice: 'Unit Price',
    total: 'Total',
    subtotal: 'Subtotal',
    tax: 'Taxes',
    totalAmount: 'Total',
    terms: 'Terms',
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
  const { quote, client, company, language, hideBranding = false, accentColor, returnBlob = false } = options;
  const t = translations[language];
  const primaryColor = accentColor || COLORS.primary;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = 20;

  // ========== HEADER SECTION ==========
  
  // Company logo (top-left)
  let logoHeight = 0;
  if (company?.logo_url) {
    console.log('Attempting to load company logo:', company.logo_url);
    const logoResult = await loadLogo(company.logo_url);
    if (logoResult) {
      try {
        console.log('Adding logo to PDF with format:', logoResult.format);
        doc.addImage(logoResult.data, logoResult.format, margin, yPos, 35, 35);
        logoHeight = 35;
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

  // Company info (next to logo or at top-left)
  const companyInfoX = logoHeight > 0 ? margin + 40 : margin;
  let companyY = yPos;
  
  if (company) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(company.name, companyInfoX, companyY + 5);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.gray);
    companyY += 12;
    
    if (company.street_address) {
      doc.text(company.street_address, companyInfoX, companyY);
      companyY += 4;
    }
    if (company.city || company.province_state || company.postal_code) {
      const cityLine = [company.city, company.province_state, company.postal_code].filter(Boolean).join(', ');
      doc.text(cityLine, companyInfoX, companyY);
      companyY += 4;
    }
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

  // Document title "QUOTE" (right side)
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text(t.quote, pageWidth - margin, yPos + 8, { align: 'right' });

  // Quote details (right side, below title)
  let detailsY = yPos + 18;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.dark);
  
  // Quote number
  doc.setFont('helvetica', 'bold');
  doc.text(`${t.quoteNumber}:`, pageWidth - margin - 45, detailsY);
  doc.setFont('helvetica', 'normal');
  doc.text(quote.quote_number, pageWidth - margin, detailsY, { align: 'right' });
  detailsY += 6;
  
  // Issue date
  doc.setFont('helvetica', 'bold');
  doc.text(`${t.issueDate}:`, pageWidth - margin - 45, detailsY);
  doc.setFont('helvetica', 'normal');
  doc.text(quote.issue_date, pageWidth - margin, detailsY, { align: 'right' });
  detailsY += 6;
  
  // Expiry date (highlighted)
  if (quote.expiry_date) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(`${t.expiryDate}:`, pageWidth - margin - 45, detailsY);
    doc.setFont('helvetica', 'normal');
    doc.text(quote.expiry_date, pageWidth - margin, detailsY, { align: 'right' });
    doc.setTextColor(...COLORS.dark);
  }

  yPos = Math.max(companyY, detailsY) + 15;

  // ========== CLIENT SECTION ==========
  
  // Draw a subtle box for client info
  const clientBoxHeight = client?.address ? 40 : 32;
  doc.setFillColor(...COLORS.tableHeader);
  doc.setDrawColor(...COLORS.border);
  doc.roundedRect(margin, yPos, (pageWidth - margin * 2) / 2 - 5, clientBoxHeight, 3, 3, 'FD');
  
  yPos += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.gray);
  doc.text(t.preparedFor.toUpperCase(), margin + 8, yPos);
  
  yPos += 7;
  if (client) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text(client.name, margin + 8, yPos);
    yPos += 6;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.gray);
    
    if (client.contact_person && client.contact_person !== client.name) {
      doc.text(client.contact_person, margin + 8, yPos);
      yPos += 4;
    }
    if (client.email) {
      doc.text(client.email, margin + 8, yPos);
      yPos += 4;
    }
    if (client.address) {
      doc.text(client.address, margin + 8, yPos, { maxWidth: 80 });
    }
  }

  yPos = yPos + 20;

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
    styles: {
      fontSize: 10,
      cellPadding: { top: 6, right: 8, bottom: 6, left: 8 },
      lineColor: COLORS.border,
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: COLORS.tableHeader,
      textColor: COLORS.dark,
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      textColor: COLORS.dark,
    },
    alternateRowStyles: {
      fillColor: COLORS.white,
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 25 },
      2: { halign: 'right', cellWidth: 35 },
      3: { halign: 'right', cellWidth: 35, fontStyle: 'bold' }
    },
    didParseCell: (data) => {
      // Add subtle alternating background
      if (data.section === 'body' && data.row.index % 2 === 1) {
        data.cell.styles.fillColor = COLORS.tableAlt;
      }
    }
  });

  // ========== TOTALS SECTION ==========
  
  const finalY = (doc as any).lastAutoTable?.finalY || yPos + 50;
  let totalsY = finalY + 10;
  const totalsX = pageWidth - margin - 70;
  const totalsWidth = 70;

  // Subtotal
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.gray);
  doc.text(`${t.subtotal}:`, totalsX, totalsY);
  doc.setTextColor(...COLORS.dark);
  doc.text(`$${quote.subtotal.toFixed(2)}`, pageWidth - margin, totalsY, { align: 'right' });
  totalsY += 7;

  // Taxes
  if (quote.tax_amount > 0) {
    doc.setTextColor(...COLORS.gray);
    doc.text(`${t.tax}:`, totalsX, totalsY);
    doc.setTextColor(...COLORS.dark);
    doc.text(`$${quote.tax_amount.toFixed(2)}`, pageWidth - margin, totalsY, { align: 'right' });
    totalsY += 7;
  }

  // Divider line
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.5);
  doc.line(totalsX - 5, totalsY, pageWidth - margin, totalsY);
  totalsY += 8;

  // Total with highlight background
  doc.setFillColor(...COLORS.totalBg);
  doc.roundedRect(totalsX - 10, totalsY - 5, totalsWidth + 10, 12, 2, 2, 'F');
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text(`${t.totalAmount}:`, totalsX, totalsY + 3);
  doc.text(`$${quote.total.toFixed(2)}`, pageWidth - margin, totalsY + 3, { align: 'right' });

  totalsY += 20;

  // ========== TERMS & NOTES ==========
  
  let contentY = totalsY;
  
  if (quote.terms) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text(t.terms, margin, contentY);
    contentY += 6;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.gray);
    const termsLines = doc.splitTextToSize(quote.terms, pageWidth - margin * 2);
    doc.text(termsLines, margin, contentY);
    contentY += termsLines.length * 4 + 10;
  }

  if (quote.notes) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text(t.notes, margin, contentY);
    contentY += 6;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.gray);
    const notesLines = doc.splitTextToSize(quote.notes, pageWidth - margin * 2);
    doc.text(notesLines, margin, contentY);
  }

  // ========== FOOTER ==========
  
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Thank you message
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...COLORS.gray);
  doc.text(t.thankYou, pageWidth / 2, pageHeight - 25, { align: 'center' });

  // Branding
  if (!hideBranding) {
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.lightGray);
    doc.text(t.branding, pageWidth / 2, pageHeight - 15, { align: 'center' });
  }

  // Return blob or save
  if (returnBlob) {
    const pdfBlob = doc.output('blob');
    return pdfBlob;
  } else {
    doc.save(`${quote.quote_number}.pdf`);
  }
}
