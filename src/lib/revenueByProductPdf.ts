import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import type { ProductRevenueSummary, ProductRevenueData } from "@/hooks/useRevenueByProduct";

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

interface InvoiceLineDetail {
  invoice_number: string;
  client_name: string;
  issue_date: string;
  product_name: string;
  quantity: number;
  line_total: number;
}

interface RevenueByProductPdfOptions {
  productRevenueData: ProductRevenueSummary;
  companyName?: string;
  startDate?: Date;
  endDate?: Date;
  companyFilterName?: string;
  invoiceLineDetails?: InvoiceLineDetail[];
  language?: 'fr' | 'en';
  returnBlob?: boolean;
  planType?: PlanType;
  hideBranding?: boolean;
}

const getTranslations = (language: 'fr' | 'en') => {
  return language === 'fr' ? {
    reportTitle: 'Revenus par Produit / Service',
    generatedOn: 'Généré le',
    period: 'Période',
    company: 'Entreprise',
    companyFilter: 'Filtre entreprise',
    summary: 'Résumé',
    totalRevenue: 'Revenus totaux',
    numberOfProducts: 'Nombre de produits/services',
    totalQuantitySold: 'Quantité totale vendue',
    avgRevenuePerSale: 'Revenu moyen par vente',
    revenueByProduct: 'Revenus par Produit / Service',
    productName: 'Produit / Service',
    quantitySold: 'Qté vendue',
    revenue: 'Revenus',
    avgPerSale: 'Moy/Vente',
    percentOfTotal: '% du Total',
    total: 'TOTAL',
    invoiceLineDetails: 'Détails des Lignes de Facture',
    invoiceNumber: 'N° Facture',
    client: 'Client',
    date: 'Date',
    product: 'Produit',
    quantity: 'Quantité',
    lineTotal: 'Total Ligne',
    page: 'Page',
    of: 'sur',
    generatedBy: 'Généré avec GestionFlow',
    allPeriods: 'Toutes les périodes',
    since: 'Depuis',
    until: 'Jusqu\'à'
  } : {
    reportTitle: 'Revenue by Product / Service',
    generatedOn: 'Generated on',
    period: 'Period',
    company: 'Company',
    companyFilter: 'Company filter',
    summary: 'Summary',
    totalRevenue: 'Total Revenue',
    numberOfProducts: 'Number of Products/Services',
    totalQuantitySold: 'Total Quantity Sold',
    avgRevenuePerSale: 'Average Revenue per Sale',
    revenueByProduct: 'Revenue by Product / Service',
    productName: 'Product / Service',
    quantitySold: 'Qty Sold',
    revenue: 'Revenue',
    avgPerSale: 'Avg/Sale',
    percentOfTotal: '% of Total',
    total: 'TOTAL',
    invoiceLineDetails: 'Invoice Line Details',
    invoiceNumber: 'Invoice #',
    client: 'Client',
    date: 'Date',
    product: 'Product',
    quantity: 'Quantity',
    lineTotal: 'Line Total',
    page: 'Page',
    of: 'of',
    generatedBy: 'Generated with GestionFlow',
    allPeriods: 'All periods',
    since: 'Since',
    until: 'Until'
  };
};

export const generateRevenueByProductPdf = async (options: RevenueByProductPdfOptions): Promise<Blob | void> => {
  const {
    productRevenueData,
    companyName,
    startDate,
    endDate,
    companyFilterName,
    invoiceLineDetails = [],
    language = 'fr',
    returnBlob = false,
    planType = 'free',
    hideBranding = false,
  } = options;

  const t = getTranslations(language);
  const dateLocale = language === 'fr' ? fr : enUS;
  const currencyLocale = language === 'fr' ? 'fr-CA' : 'en-CA';

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

  // Check for new page
  const checkNewPage = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - 25) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
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

  // Company filter
  if (companyFilterName) {
    doc.text(`${t.companyFilter}: ${companyFilterName}`, margin, yPosition);
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

  // Calculate average revenue per sale
  const avgRevenuePerSale = productRevenueData.totalQuantity > 0 
    ? productRevenueData.totalRevenue / productRevenueData.totalQuantity 
    : 0;

  // Summary cards - 4 boxes horizontally
  const cardWidth = (contentWidth - 15) / 4;
  const cardHeight = 28;
  const cardPadding = 4;

  const summaryCards = [
    { label: t.totalRevenue, value: formatCurrency(productRevenueData.totalRevenue), color: COLORS.green },
    { label: t.numberOfProducts, value: productRevenueData.uniqueProducts.toString(), color: COLORS.dark },
    { label: t.totalQuantitySold, value: productRevenueData.totalQuantity.toLocaleString(), color: COLORS.dark },
    { label: t.avgRevenuePerSale, value: formatCurrency(avgRevenuePerSale), color: COLORS.primary }
  ];

  summaryCards.forEach((card, index) => {
    const cardX = margin + (index * (cardWidth + 5));

    doc.setFillColor(...COLORS.lightGray);
    doc.roundedRect(cardX, yPosition, cardWidth, cardHeight, 3, 3, 'F');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.gray);
    doc.text(card.label, cardX + cardPadding, yPosition + 10);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...card.color);
    doc.text(card.value, cardX + cardPadding, yPosition + 22);
  });

  yPosition += cardHeight + 12;

  // ===== REVENUE BY PRODUCT TABLE =====
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);
  doc.text(t.revenueByProduct, margin, yPosition);
  yPosition += 8;

  // Prepare table data (already sorted by totalRevenue descending from hook)
  const productTableData = productRevenueData.productData.map(product => [
    product.productName,
    product.quantitySold.toString(),
    formatCurrency(product.totalRevenue),
    formatCurrency(product.averageRevenuePerSale),
    `${product.percentageOfTotal.toFixed(1)}%`
  ]);

  // Add totals row
  productTableData.push([
    t.total,
    productRevenueData.totalQuantity.toString(),
    formatCurrency(productRevenueData.totalRevenue),
    formatCurrency(avgRevenuePerSale),
    '100%'
  ]);

  autoTable(doc, {
    head: [[t.productName, t.quantitySold, t.revenue, t.avgPerSale, t.percentOfTotal]],
    body: productTableData,
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
      1: { halign: 'center', cellWidth: 25 },
      2: { halign: 'right', cellWidth: 35 },
      3: { halign: 'right', cellWidth: 30 },
      4: { halign: 'right', cellWidth: 25 },
    },
    didParseCell: (data) => {
      if (data.row.index === productTableData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = COLORS.lightGray;
      }
    },
    didDrawPage: () => {
      totalPages.value = doc.getNumberOfPages();
    }
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // ===== INVOICE LINE DETAILS =====
  if (invoiceLineDetails.length > 0) {
    checkNewPage(40);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text(t.invoiceLineDetails, margin, yPosition);
    yPosition += 8;

    const lineDetailsData = invoiceLineDetails.map(line => [
      line.invoice_number,
      line.client_name.length > 20 ? line.client_name.slice(0, 20) + '...' : line.client_name,
      format(new Date(line.issue_date), 'd MMM yyyy', { locale: dateLocale }),
      line.product_name.length > 25 ? line.product_name.slice(0, 25) + '...' : line.product_name,
      line.quantity.toString(),
      formatCurrency(line.line_total)
    ]);

    autoTable(doc, {
      head: [[t.invoiceNumber, t.client, t.date, t.product, t.quantity, t.lineTotal]],
      body: lineDetailsData,
      startY: yPosition,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 8,
        cellPadding: 3,
        lineColor: COLORS.lightGray,
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: COLORS.gray,
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
        0: { halign: 'left', cellWidth: 25 },
        1: { halign: 'left', cellWidth: 35 },
        2: { halign: 'center', cellWidth: 25 },
        3: { halign: 'left', cellWidth: 'auto' },
        4: { halign: 'center', cellWidth: 20 },
        5: { halign: 'right', cellWidth: 30 },
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
  let filename = language === 'fr' ? "rapport-revenus-par-produit" : "revenue-by-product-report";
  if (startDate && endDate) {
    filename += `-${format(startDate, 'yyyy-MM-dd')}-${format(endDate, 'yyyy-MM-dd')}`;
  }
  filename += ".pdf";

  if (returnBlob) {
    return doc.output('blob');
  }

  doc.save(filename);
};
