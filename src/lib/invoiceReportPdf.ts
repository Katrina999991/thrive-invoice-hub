import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";

const COLORS = {
  primary: [59, 130, 246] as [number, number, number],
  dark: [31, 41, 55] as [number, number, number],
  gray: [107, 114, 128] as [number, number, number],
  lightGray: [243, 244, 246] as [number, number, number],
  green: [34, 197, 94] as [number, number, number],
  red: [239, 68, 68] as [number, number, number],
  orange: [249, 115, 22] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

export interface InvoiceReportData {
  invoice_number: string;
  client_name: string;
  issue_date: string;
  due_date: string | null;
  total: number;
  status: string;
}

export interface InvoiceReportPdfOptions {
  invoices: InvoiceReportData[];
  grandTotal: number;
  companyName?: string;
  clientName?: string;
  statusFilter?: string;
  language?: 'fr' | 'en';
  returnBlob?: boolean;
  hideBranding?: boolean;
}

const getTranslations = (language: 'fr' | 'en') => {
  return language === 'fr' ? {
    reportTitle: 'Rapport des Factures',
    generatedOn: 'Généré le',
    company: 'Entreprise',
    client: 'Client',
    status: 'Statut',
    allCompanies: 'Toutes les entreprises',
    allClients: 'Tous les clients',
    allStatuses: 'Tous les statuts',
    summary: 'Résumé',
    grandTotal: 'Total Général',
    numberOfInvoices: 'Nombre de factures',
    invoiceNumber: 'N° Facture',
    issueDate: 'Date d\'émission',
    dueDate: 'Date d\'échéance',
    amount: 'Montant',
    page: 'Page',
    of: 'sur',
    generatedBy: 'Généré avec GestionFlow',
    paid: 'Payé',
    sent: 'Envoyé',
    overdue: 'En retard',
    draft: 'Brouillon',
    na: 'N/A',
    filters: 'Filtres actifs',
  } : {
    reportTitle: 'Invoice Report',
    generatedOn: 'Generated on',
    company: 'Company',
    client: 'Client',
    status: 'Status',
    allCompanies: 'All Companies',
    allClients: 'All Clients',
    allStatuses: 'All Statuses',
    summary: 'Summary',
    grandTotal: 'Grand Total',
    numberOfInvoices: 'Number of Invoices',
    invoiceNumber: 'Invoice #',
    issueDate: 'Issue Date',
    dueDate: 'Due Date',
    amount: 'Amount',
    page: 'Page',
    of: 'of',
    generatedBy: 'Generated with GestionFlow',
    paid: 'Paid',
    sent: 'Sent',
    overdue: 'Overdue',
    draft: 'Draft',
    na: 'N/A',
    filters: 'Active Filters',
  };
};

export const generateInvoiceReportPdf = async (options: InvoiceReportPdfOptions): Promise<Blob | void> => {
  const {
    invoices,
    grandTotal,
    companyName,
    clientName,
    statusFilter,
    language = 'fr',
    returnBlob = false,
    hideBranding = false,
  } = options;

  const t = getTranslations(language);
  const dateLocale = language === 'fr' ? fr : enUS;
  const currencyLocale = language === 'fr' ? 'fr-CA' : 'en-US';

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 15;

  let yPosition = margin;
  const totalPages = { value: 1 };

  const showBranding = !hideBranding;

  // Helper function to add footer
  const addFooter = (currentPage: number, total: number) => {
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.gray);

    if (showBranding) {
      doc.text(t.generatedBy, margin, pageHeight - 10);
    }

    doc.text(`${t.page} ${currentPage} ${t.of} ${total}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

    doc.setTextColor(...COLORS.dark);
  };

  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(currencyLocale, { style: 'currency', currency: 'CAD' }).format(amount);
  };

  // Helper function to get status label
  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      'paid': t.paid,
      'sent': t.sent,
      'overdue': t.overdue,
      'draft': t.draft,
    };
    return statusMap[status] || status;
  };

  // Helper function to get status color
  const getStatusColor = (status: string): [number, number, number] => {
    switch (status) {
      case 'paid': return COLORS.green;
      case 'overdue': return COLORS.red;
      case 'sent': return COLORS.primary;
      default: return COLORS.gray;
    }
  };

  // ===== HEADER SECTION =====
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(t.reportTitle, margin, yPosition + 5);

  yPosition += 15;

  // Company name or "All Companies"
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.dark);
  doc.text(`${t.company}: ${companyName || t.allCompanies}`, margin, yPosition);
  yPosition += 6;

  // Generation date
  doc.setTextColor(...COLORS.gray);
  doc.setFontSize(9);
  doc.text(`${t.generatedOn}: ${format(new Date(), 'd MMMM yyyy', { locale: dateLocale })}`, margin, yPosition);
  yPosition += 8;

  // Active filters section
  const hasFilters = clientName || statusFilter;
  if (hasFilters) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text(`${t.filters}:`, margin, yPosition);
    yPosition += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.gray);

    if (clientName) {
      doc.text(`• ${t.client}: ${clientName}`, margin + 5, yPosition);
      yPosition += 4;
    }

    if (statusFilter) {
      doc.text(`• ${t.status}: ${getStatusLabel(statusFilter)}`, margin + 5, yPosition);
      yPosition += 4;
    }
    yPosition += 2;
  }

  // Separator line
  doc.setDrawColor(...COLORS.lightGray);
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);

  yPosition += 10;

  // ===== SUMMARY SECTION =====
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);
  doc.text(t.summary, margin, yPosition);
  yPosition += 8;

  // Summary cards - 2 boxes
  const contentWidth = pageWidth - (margin * 2);
  const cardWidth = (contentWidth - 10) / 2;
  const cardHeight = 28;
  const cardPadding = 5;

  const summaryCards = [
    { label: t.grandTotal, value: formatCurrency(grandTotal), color: COLORS.primary },
    { label: t.numberOfInvoices, value: invoices.length.toString(), color: COLORS.green }
  ];

  summaryCards.forEach((card, index) => {
    const cardX = margin + (index * (cardWidth + 10));

    doc.setFillColor(...COLORS.lightGray);
    doc.roundedRect(cardX, yPosition, cardWidth, cardHeight, 3, 3, 'F');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.gray);
    doc.text(card.label, cardX + cardPadding, yPosition + 10);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...card.color);
    doc.text(card.value, cardX + cardPadding, yPosition + 22);
  });

  yPosition += cardHeight + 12;

  // ===== INVOICE TABLE =====
  const tableData = invoices.map(invoice => [
    invoice.invoice_number,
    invoice.client_name,
    format(new Date(invoice.issue_date), 'd MMM yyyy', { locale: dateLocale }),
    invoice.due_date ? format(new Date(invoice.due_date), 'd MMM yyyy', { locale: dateLocale }) : t.na,
    formatCurrency(invoice.total),
    getStatusLabel(invoice.status)
  ]);

  autoTable(doc, {
    head: [[t.invoiceNumber, t.client, t.issueDate, t.dueDate, t.amount, t.status]],
    body: tableData,
    startY: yPosition,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 9,
      cellPadding: 4,
      lineColor: COLORS.lightGray,
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      textColor: COLORS.dark,
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 30 },
      1: { halign: 'left', cellWidth: 'auto' },
      2: { halign: 'center', cellWidth: 28 },
      3: { halign: 'center', cellWidth: 28 },
      4: { halign: 'right', cellWidth: 30 },
      5: { halign: 'center', cellWidth: 25 },
    },
    didParseCell: (data) => {
      // Color the status column
      if (data.section === 'body' && data.column.index === 5) {
        const status = invoices[data.row.index]?.status;
        if (status) {
          data.cell.styles.textColor = getStatusColor(status);
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    didDrawPage: () => {
      totalPages.value = doc.getNumberOfPages();
    }
  });

  // Update total pages and add footers to all pages
  totalPages.value = doc.getNumberOfPages();

  for (let i = 1; i <= totalPages.value; i++) {
    doc.setPage(i);
    addFooter(i, totalPages.value);
  }

  // Generate filename
  let filename = language === 'fr' ? "rapport-factures" : "invoice-report";
  filename += `-${format(new Date(), 'yyyy-MM-dd')}`;
  filename += ".pdf";

  if (returnBlob) {
    return doc.output('blob');
  }

  doc.save(filename);
};
