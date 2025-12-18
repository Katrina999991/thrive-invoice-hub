import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import type { SalesReportSummary } from "@/hooks/useSalesReport";

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

export type InvoiceStatus = 'paid' | 'sent' | 'overdue' | 'draft';

interface SalesReportPdfOptions {
  salesData: SalesReportSummary;
  companyName?: string;
  startDate?: Date;
  endDate?: Date;
  chartRef?: React.RefObject<HTMLDivElement>;
  logoUrl?: string;
  returnBlob?: boolean;
  planType?: PlanType;
  hideBranding?: boolean;
  includedStatuses?: InvoiceStatus[];
  language?: 'fr' | 'en';
}

const getTranslations = (language: 'fr' | 'en') => {
  return language === 'fr' ? {
    reportTitle: 'Rapport des ventes par produit',
    company: 'Entreprise',
    period: 'Période',
    since: 'À partir du',
    until: "Jusqu'au",
    allPeriods: 'Toutes les périodes',
    includedInvoices: 'Factures incluses',
    generatedOn: 'Généré le',
    summary: 'Résumé',
    productsSold: 'Produits vendus',
    totalQuantitySold: 'Quantité totale vendue',
    totalRevenue: 'Revenus totaux',
    salesDetails: 'Détail des ventes',
    product: 'Produit',
    quantitySold: 'Quantité vendue',
    avgUnitPrice: 'Prix unitaire moyen',
    revenueGenerated: 'Revenus générés',
    total: 'TOTAL',
    top10Revenue: 'Top 10 - Revenus par produit',
    chartNotAvailable: '(Graphique non disponible)',
    page: 'Page',
    of: 'sur',
    generatedBy: 'Généré avec GestionFlow',
    noteText: 'Ce rapport présente les ventes par produit sur la période sélectionnée, basé sur les factures',
    statusLabels: {
      paid: 'Payées',
      sent: 'Envoyées',
      overdue: 'En retard',
      draft: 'Brouillons'
    },
    statusDescriptions: {
      paid: 'payées',
      sent: 'envoyées',
      overdue: 'en retard',
      draft: 'brouillons'
    }
  } : {
    reportTitle: 'Sales Report by Product',
    company: 'Company',
    period: 'Period',
    since: 'From',
    until: 'Until',
    allPeriods: 'All periods',
    includedInvoices: 'Included invoices',
    generatedOn: 'Generated on',
    summary: 'Summary',
    productsSold: 'Products sold',
    totalQuantitySold: 'Total quantity sold',
    totalRevenue: 'Total revenue',
    salesDetails: 'Sales Details',
    product: 'Product',
    quantitySold: 'Quantity sold',
    avgUnitPrice: 'Average unit price',
    revenueGenerated: 'Revenue generated',
    total: 'TOTAL',
    top10Revenue: 'Top 10 - Revenue by product',
    chartNotAvailable: '(Chart not available)',
    page: 'Page',
    of: 'of',
    generatedBy: 'Generated with GestionFlow',
    noteText: 'This report presents sales by product for the selected period, based on',
    statusLabels: {
      paid: 'Paid',
      sent: 'Sent',
      overdue: 'Overdue',
      draft: 'Draft'
    },
    statusDescriptions: {
      paid: 'paid',
      sent: 'sent',
      overdue: 'overdue',
      draft: 'draft'
    }
  };
};

export const generateSalesReportPdf = async (options: SalesReportPdfOptions): Promise<Blob | void> => {
  const { 
    salesData, 
    companyName, 
    startDate, 
    endDate, 
    chartRef, 
    logoUrl, 
    returnBlob = false,
    planType = 'free',
    hideBranding = false,
    includedStatuses = ['paid'],
    language = 'fr'
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
  let pageNumber = 1;
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

  // ===== HEADER SECTION =====
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(t.reportTitle, pageWidth - margin, yPosition + 5, { align: 'right' });
  
  yPosition += 18;
  
  // Company name and period info
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.dark);
  
  if (companyName) {
    doc.text(`${t.company}: ${companyName}`, margin, yPosition);
    yPosition += 6;
  }
  
  // Period
  let periodText = t.allPeriods;
  if (startDate && endDate) {
    periodText = `${t.period}: ${format(startDate, 'd MMMM yyyy', { locale: dateLocale })} – ${format(endDate, 'd MMMM yyyy', { locale: dateLocale })}`;
  } else if (startDate) {
    periodText = `${t.since}: ${format(startDate, 'd MMMM yyyy', { locale: dateLocale })}`;
  } else if (endDate) {
    periodText = `${t.until}: ${format(endDate, 'd MMMM yyyy', { locale: dateLocale })}`;
  }
  doc.text(periodText, margin, yPosition);
  yPosition += 6;
  
  // Included statuses
  const statusNames = includedStatuses.map(s => t.statusLabels[s]).join(', ');
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(11);
  doc.text(`${t.includedInvoices} : ${statusNames}`, margin, yPosition);
  yPosition += 6;
  
  // Generation date
  doc.setTextColor(...COLORS.gray);
  doc.setFontSize(9);
  const dateFormat = language === 'fr' ? 'd MMMM yyyy à HH:mm' : 'd MMMM yyyy, HH:mm';
  doc.text(`${t.generatedOn}: ${format(new Date(), dateFormat, { locale: dateLocale })}`, margin, yPosition);
  
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
  
  // Calculate totals for products only
  const productRevenue = salesData.products.reduce((sum, p) => sum + p.total_revenue, 0);
  const productQuantity = salesData.products.reduce((sum, p) => sum + p.total_quantity_sold, 0);
  
  const summaryCards = [
    { label: t.productsSold, value: salesData.uniqueProductsSold.toString(), color: COLORS.primary },
    { label: t.totalQuantitySold, value: productQuantity.toLocaleString(language === 'fr' ? 'fr-FR' : 'en-US'), color: COLORS.green },
    { label: t.totalRevenue, value: new Intl.NumberFormat(currencyLocale, { style: 'currency', currency: 'CAD' }).format(productRevenue), color: COLORS.dark }
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
  
  // ===== MAIN TABLE SECTION =====
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);
  doc.text(t.salesDetails, margin, yPosition);
  yPosition += 8;
  
  // Prepare table data
  const tableData = salesData.products.map(product => [
    product.product_name,
    product.total_quantity_sold.toString(),
    new Intl.NumberFormat(currencyLocale, { style: 'currency', currency: 'CAD' }).format(product.average_sale_price),
    new Intl.NumberFormat(currencyLocale, { style: 'currency', currency: 'CAD' }).format(product.total_revenue)
  ]);
  
  // Add totals row
  const avgUnitPrice = productQuantity > 0 ? productRevenue / productQuantity : 0;
  tableData.push([
    t.total,
    productQuantity.toString(),
    new Intl.NumberFormat(currencyLocale, { style: 'currency', currency: 'CAD' }).format(avgUnitPrice),
    new Intl.NumberFormat(currencyLocale, { style: 'currency', currency: 'CAD' }).format(productRevenue)
  ]);
  
  autoTable(doc, {
    head: [[t.product, t.quantitySold, t.avgUnitPrice, t.revenueGenerated]],
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
      1: { halign: 'right', cellWidth: 35 },
      2: { halign: 'right', cellWidth: 40 },
      3: { halign: 'right', cellWidth: 40 },
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
  
  // Check if we need a new page for the chart
  if (yPosition > pageHeight - 100) {
    doc.addPage();
    yPosition = margin;
    pageNumber++;
  }
  
  // ===== CHART SECTION =====
  if (chartRef?.current && salesData.products.length > 0) {
    try {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.dark);
      doc.text(t.top10Revenue, margin, yPosition);
      yPosition += 8;
      
      const chartCanvas = await html2canvas(chartRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      
      const chartImgData = chartCanvas.toDataURL('image/png');
      const imgWidth = contentWidth;
      const imgHeight = Math.min((chartCanvas.height * imgWidth) / chartCanvas.width, 90);
      
      // Check if chart fits on current page
      if (yPosition + imgHeight > pageHeight - 30) {
        doc.addPage();
        yPosition = margin;
        pageNumber++;
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.dark);
        doc.text(t.top10Revenue, margin, yPosition);
        yPosition += 8;
      }
      
      doc.addImage(chartImgData, 'PNG', margin, yPosition, imgWidth, imgHeight);
      yPosition += imgHeight + 15;
      
    } catch (error) {
      console.error('Error capturing chart:', error);
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.gray);
      doc.text(t.chartNotAvailable, margin, yPosition);
      yPosition += 10;
    }
  }
  
  // Check if we need a new page for notes
  if (yPosition > pageHeight - 40) {
    doc.addPage();
    yPosition = margin;
    pageNumber++;
  }
  
  // ===== NOTES SECTION =====
  doc.setDrawColor(...COLORS.lightGray);
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...COLORS.gray);
  
  // Build note text based on included statuses
  const statusList = includedStatuses.map(s => t.statusDescriptions[s]).join(', ');
  const noteText = language === 'fr' 
    ? `${t.noteText} ${statusList}.`
    : `${t.noteText} ${statusList} invoices.`;
  const splitNote = doc.splitTextToSize(noteText, contentWidth);
  doc.text(splitNote, margin, yPosition);
  
  // Update total pages and add footers to all pages
  totalPages.value = doc.getNumberOfPages();
  
  for (let i = 1; i <= totalPages.value; i++) {
    doc.setPage(i);
    addFooter(i, totalPages.value);
  }
  
  // Generate filename
  let filename = language === 'fr' ? "rapport-ventes-produits" : "sales-report-products";
  if (startDate && endDate) {
    filename += `-${format(startDate, 'yyyy-MM-dd')}-${format(endDate, 'yyyy-MM-dd')}`;
  }
  filename += ".pdf";
  
  if (returnBlob) {
    return doc.output('blob');
  }
  
  doc.save(filename);
};
