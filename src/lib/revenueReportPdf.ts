import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import type { RevenueByPeriod } from "@/hooks/useReports";

// GestionFlow brand colors
const COLORS = {
  primary: [59, 130, 246] as [number, number, number], // Blue
  dark: [31, 41, 55] as [number, number, number], // Gray-800
  gray: [107, 114, 128] as [number, number, number], // Gray-500
  lightGray: [243, 244, 246] as [number, number, number], // Gray-100
  green: [34, 197, 94] as [number, number, number], // Green
  white: [255, 255, 255] as [number, number, number],
};

export type PlanType = 'free' | 'premium' | 'pro';

interface InvoiceData {
  invoice_number: string;
  client_name: string;
  issue_date: string;
  total: number;
  status: string;
}

interface RevenueReportPdfOptions {
  revenueData: {
    totalRevenue: number;
    periodData: RevenueByPeriod[];
  };
  companyName?: string;
  startDate?: Date;
  endDate?: Date;
  filterType?: 'all' | 'company' | 'client';
  filterName?: string;
  viewMode: 'monthly' | 'yearly';
  invoices?: InvoiceData[];
  language?: 'fr' | 'en';
  returnBlob?: boolean;
  planType?: PlanType;
  hideBranding?: boolean;
}

const getTranslations = (language: 'fr' | 'en') => {
  return language === 'fr' ? {
    reportTitle: 'Rapport des Revenus par Période',
    generatedOn: 'Généré le',
    period: 'Période',
    company: 'Entreprise',
    filter: 'Filtre',
    allData: 'Toutes les données',
    summary: 'Résumé',
    totalRevenue: 'Revenu total',
    totalPaidRevenue: 'Revenu payé total',
    numberOfInvoices: 'Nombre de factures',
    averagePerInvoice: 'Revenu moyen par facture',
    revenueBreakdown: 'Répartition des Revenus',
    revenue: 'Revenu',
    invoiceCount: 'Nb. Factures',
    avgRevenue: 'Revenu Moyen',
    invoiceDetails: 'Détails des Factures',
    invoiceNumber: 'N° Facture',
    client: 'Client',
    issueDate: 'Date d\'émission',
    amount: 'Montant',
    status: 'Statut',
    total: 'TOTAL',
    page: 'Page',
    of: 'sur',
    generatedBy: 'Généré avec GestionFlow',
    paid: 'Payé',
    sent: 'Envoyé',
    overdue: 'En retard',
    draft: 'Brouillon',
    monthly: 'mensuel',
    yearly: 'annuel',
    allPeriods: 'Toutes les périodes',
    since: 'Depuis',
    until: 'Jusqu\'à',
  } : {
    reportTitle: 'Revenue by Period Report',
    generatedOn: 'Generated on',
    period: 'Period',
    company: 'Company',
    filter: 'Filter',
    allData: 'All data',
    summary: 'Summary',
    totalRevenue: 'Total Revenue',
    totalPaidRevenue: 'Total Paid Revenue',
    numberOfInvoices: 'Number of Invoices',
    averagePerInvoice: 'Average Revenue per Invoice',
    revenueBreakdown: 'Revenue Breakdown',
    revenue: 'Revenue',
    invoiceCount: 'Invoices',
    avgRevenue: 'Avg Revenue',
    invoiceDetails: 'Invoice Details',
    invoiceNumber: 'Invoice #',
    client: 'Client',
    issueDate: 'Issue Date',
    amount: 'Amount',
    status: 'Status',
    total: 'TOTAL',
    page: 'Page',
    of: 'of',
    generatedBy: 'Generated with GestionFlow',
    paid: 'Paid',
    sent: 'Sent',
    overdue: 'Overdue',
    draft: 'Draft',
    monthly: 'monthly',
    yearly: 'yearly',
    allPeriods: 'All periods',
    since: 'Since',
    until: 'Until',
  };
};

export const generateRevenueReportPdf = async (options: RevenueReportPdfOptions): Promise<Blob | void> => {
  const {
    revenueData,
    companyName,
    startDate,
    endDate,
    filterType = 'all',
    filterName,
    viewMode,
    invoices = [],
    language = 'fr',
    returnBlob = false,
    planType = 'free',
    hideBranding = false,
  } = options;

  const t = getTranslations(language);
  const dateLocale = language === 'fr' ? fr : enUS;
  const currencyLocale = language === 'fr' ? 'fr-CA' : 'en-US';

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);

  let yPosition = margin;
  const totalPages = { value: 1 };

  // Determine branding based on hideBranding option
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

  // ===== HEADER SECTION =====
  // Report title
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(t.reportTitle, pageWidth - margin, yPosition + 5, { align: 'right' });

  yPosition += 18;

  // Company name
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.dark);

  if (companyName) {
    doc.text(`${t.company}: ${companyName}`, margin, yPosition);
    yPosition += 6;
  }

  // Date range
  let periodText = t.allPeriods;
  if (startDate && endDate) {
    periodText = `${t.period}: ${format(startDate, 'd MMMM yyyy', { locale: dateLocale })} – ${format(endDate, 'd MMMM yyyy', { locale: dateLocale })}`;
  } else if (startDate) {
    periodText = `${t.since} ${format(startDate, 'd MMMM yyyy', { locale: dateLocale })}`;
  } else if (endDate) {
    periodText = `${t.until} ${format(endDate, 'd MMMM yyyy', { locale: dateLocale })}`;
  }
  doc.text(periodText, margin, yPosition);
  yPosition += 6;

  // Filter info
  if (filterType !== 'all' && filterName) {
    const filterLabel = filterType === 'company' ? t.company : t.client;
    doc.text(`${t.filter}: ${filterLabel} - ${filterName}`, margin, yPosition);
    yPosition += 6;
  }

  // Generation date
  doc.setTextColor(...COLORS.gray);
  doc.setFontSize(9);
  doc.text(`${t.generatedOn}: ${format(new Date(), 'd MMMM yyyy', { locale: dateLocale })}`, margin, yPosition);

  yPosition += 12;

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

  // Summary cards - 3 boxes horizontally
  const cardWidth = (contentWidth - 10) / 3;
  const cardHeight = 28;
  const cardPadding = 5;

  const totalInvoices = revenueData.periodData.reduce((sum, p) => sum + p.invoiceCount, 0);
  const avgRevenue = totalInvoices > 0 ? revenueData.totalRevenue / totalInvoices : 0;

  const summaryCards = [
    { label: t.totalRevenue, value: formatCurrency(revenueData.totalRevenue), color: COLORS.primary },
    { label: t.numberOfInvoices, value: totalInvoices.toString(), color: COLORS.green },
    { label: t.averagePerInvoice, value: formatCurrency(avgRevenue), color: COLORS.dark }
  ];

  summaryCards.forEach((card, index) => {
    const cardX = margin + (index * (cardWidth + 5));

    doc.setFillColor(...COLORS.lightGray);
    doc.roundedRect(cardX, yPosition, cardWidth, cardHeight, 3, 3, 'F');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.gray);
    doc.text(card.label, cardX + cardPadding, yPosition + 10);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...card.color);
    doc.text(card.value, cardX + cardPadding, yPosition + 22);
  });

  yPosition += cardHeight + 12;

  // ===== REVENUE BREAKDOWN TABLE =====
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);
  doc.text(t.revenueBreakdown, margin, yPosition);
  yPosition += 8;

  // Prepare table data
  const tableData = revenueData.periodData.map(item => {
    const avgPerInvoice = item.invoiceCount > 0 ? item.revenue / item.invoiceCount : 0;
    return [
      item.period,
      formatCurrency(item.revenue),
      item.invoiceCount.toString(),
      formatCurrency(avgPerInvoice)
    ];
  });

  // Add totals row
  tableData.push([
    t.total,
    formatCurrency(revenueData.totalRevenue),
    totalInvoices.toString(),
    formatCurrency(avgRevenue)
  ]);

  autoTable(doc, {
    head: [[t.period, t.revenue, t.invoiceCount, t.avgRevenue]],
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
      0: { halign: 'left', cellWidth: 'auto' },
      1: { halign: 'right', cellWidth: 45 },
      2: { halign: 'center', cellWidth: 30 },
      3: { halign: 'right', cellWidth: 45 },
    },
    didParseCell: (data) => {
      if (data.row.index === tableData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = COLORS.lightGray;
      }
    },
    didDrawPage: () => {
      totalPages.value = doc.getNumberOfPages();
    }
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // ===== INVOICE DETAILS TABLE =====
  if (invoices.length > 0) {
    // Check if we need a new page
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text(t.invoiceDetails, margin, yPosition);
    yPosition += 8;

    const invoiceTableData = invoices.map(invoice => [
      invoice.invoice_number,
      invoice.client_name,
      format(new Date(invoice.issue_date), 'd MMM yyyy', { locale: dateLocale }),
      formatCurrency(invoice.total),
      getStatusLabel(invoice.status)
    ]);

    // Get status color
    const getStatusColor = (status: string): [number, number, number] => {
      switch (status) {
        case 'paid': return COLORS.green;
        case 'overdue': return [239, 68, 68]; // Red
        case 'sent': return COLORS.primary;
        default: return COLORS.gray;
      }
    };

    autoTable(doc, {
      head: [[t.invoiceNumber, t.client, t.issueDate, t.amount, t.status]],
      body: invoiceTableData,
      startY: yPosition,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 8,
        cellPadding: 3,
        lineColor: COLORS.lightGray,
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: COLORS.green,
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
        0: { halign: 'left', cellWidth: 35 },
        1: { halign: 'left', cellWidth: 'auto' },
        2: { halign: 'center', cellWidth: 30 },
        3: { halign: 'right', cellWidth: 35 },
        4: { halign: 'center', cellWidth: 25 },
      },
      didParseCell: (data) => {
        // Color the status column
        if (data.section === 'body' && data.column.index === 4) {
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
  }

  // Update total pages and add footers to all pages
  totalPages.value = doc.getNumberOfPages();

  for (let i = 1; i <= totalPages.value; i++) {
    doc.setPage(i);
    addFooter(i, totalPages.value);
  }

  // Generate filename
  let filename = language === 'fr' ? "rapport-revenus-periode" : "revenue-by-period-report";
  if (startDate && endDate) {
    filename += `-${format(startDate, 'yyyy-MM-dd')}-${format(endDate, 'yyyy-MM-dd')}`;
  }
  filename += ".pdf";

  if (returnBlob) {
    return doc.output('blob');
  }

  doc.save(filename);
};
