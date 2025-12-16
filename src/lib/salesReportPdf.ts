import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
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
  returnBlob?: boolean; // Si true, retourne un Blob au lieu de sauvegarder
  planType?: PlanType; // Plan d'abonnement pour le branding
  hideBranding?: boolean; // Option Pro pour masquer complètement le branding
  includedStatuses?: InvoiceStatus[]; // Statuts de factures inclus dans le rapport
}

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
    includedStatuses = ['paid']
  } = options;
  
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  
  let yPosition = margin;
  let pageNumber = 1;
  const totalPages = { value: 1 }; // Will be updated after generating all content
  
  // Déterminer si on affiche le branding selon le plan
  const showFullBranding = planType === 'free';
  const showDiscreteBranding = planType === 'premium';
  const canHideBranding = planType === 'pro' && hideBranding;
  
  // Helper function to add footer
  const addFooter = (currentPage: number, total: number) => {
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.gray);
    
    // Left: Software name (selon le plan)
    if (!canHideBranding) {
      if (showFullBranding) {
        doc.text("Rapport généré avec GestionFlow", margin, pageHeight - 10);
      } else if (showDiscreteBranding) {
        doc.text("GestionFlow", margin, pageHeight - 10);
      } else {
        // Pro sans hideBranding: texte discret
        doc.text("GestionFlow", margin, pageHeight - 10);
      }
    }
    
    // Center: Page number
    doc.text(`Page ${currentPage} sur ${total}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    
    // Right: Auto-generated mention (seulement si branding visible)
    if (!canHideBranding) {
      doc.text("Document généré automatiquement", pageWidth - margin, pageHeight - 10, { align: 'right' });
    }
    
    // Reset text color
    doc.setTextColor(...COLORS.dark);
  };

  // ===== HEADER SECTION =====
  // Logo/Branding (left side) - selon le plan
  if (showFullBranding) {
    // Free: Logo complet avec fond coloré
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(margin, yPosition, 40, 12, 2, 2, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text("GestionFlow", margin + 20, yPosition + 8, { align: 'center' });
  } else if (showDiscreteBranding || (planType === 'pro' && !hideBranding)) {
    // Premium/Pro: Texte simple sans fond
    doc.setTextColor(...COLORS.gray);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text("GestionFlow", margin, yPosition + 8);
  }
  // Pro avec hideBranding: rien du tout
  
  // Report title (right side)
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text("Rapport des ventes par produit", pageWidth - margin, yPosition + 5, { align: 'right' });
  
  yPosition += 18;
  
  // Company name and period info
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.dark);
  
  if (companyName) {
    doc.text(`Entreprise: ${companyName}`, margin, yPosition);
    yPosition += 6;
  }
  
  // Period
  let periodText = "Toutes les périodes";
  if (startDate && endDate) {
    periodText = `Période: ${format(startDate, 'd MMMM yyyy', { locale: fr })} – ${format(endDate, 'd MMMM yyyy', { locale: fr })}`;
  } else if (startDate) {
    periodText = `À partir du: ${format(startDate, 'd MMMM yyyy', { locale: fr })}`;
  } else if (endDate) {
    periodText = `Jusqu'au: ${format(endDate, 'd MMMM yyyy', { locale: fr })}`;
  }
  doc.text(periodText, margin, yPosition);
  yPosition += 6;
  
  // Included statuses
  const statusLabels: Record<InvoiceStatus, string> = {
    paid: 'Payées',
    sent: 'Envoyées',
    overdue: 'En retard',
    draft: 'Brouillons'
  };
  const statusNames = includedStatuses.map(s => statusLabels[s]).join(', ');
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(11);
  doc.text(`Factures incluses : ${statusNames}`, margin, yPosition);
  yPosition += 6;
  
  // Generation date
  doc.setTextColor(...COLORS.gray);
  doc.setFontSize(9);
  doc.text(`Généré le: ${format(new Date(), 'd MMMM yyyy à HH:mm', { locale: fr })}`, margin, yPosition);
  
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
  doc.text("Résumé", margin, yPosition);
  yPosition += 8;
  
  // Summary cards - 3 boxes horizontally
  const cardWidth = (contentWidth - 10) / 3;
  const cardHeight = 28;
  const cardPadding = 5;
  
  // Calculate totals for products only
  const productRevenue = salesData.products.reduce((sum, p) => sum + p.total_revenue, 0);
  const productQuantity = salesData.products.reduce((sum, p) => sum + p.total_quantity_sold, 0);
  const productInvoices = salesData.products.reduce((sum, p) => sum + p.number_of_sales, 0);
  
  const summaryCards = [
    { label: "Produits vendus", value: salesData.uniqueProductsSold.toString(), color: COLORS.primary },
    { label: "Quantité totale vendue", value: productQuantity.toLocaleString('fr-FR'), color: COLORS.green },
    { label: "Revenus totaux", value: new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(productRevenue), color: COLORS.dark }
  ];
  
  summaryCards.forEach((card, index) => {
    const cardX = margin + (index * (cardWidth + 5));
    
    // Card background
    doc.setFillColor(...COLORS.lightGray);
    doc.roundedRect(cardX, yPosition, cardWidth, cardHeight, 3, 3, 'F');
    
    // Card content
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
  doc.text("Détail des ventes", margin, yPosition);
  yPosition += 8;
  
  // Prepare table data
  const tableData = salesData.products.map(product => [
    product.product_name,
    product.total_quantity_sold.toString(),
    new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(product.average_sale_price),
    new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(product.total_revenue)
  ]);
  
  // Add totals row
  const avgUnitPrice = productQuantity > 0 ? productRevenue / productQuantity : 0;
  tableData.push([
    'TOTAL',
    productQuantity.toString(),
    new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(avgUnitPrice),
    new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(productRevenue)
  ]);
  
  autoTable(doc, {
    head: [['Produit', 'Quantité vendue', 'Prix unitaire moyen', 'Revenus générés']],
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
    // Style the last row (totals) differently
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
      doc.text("Top 10 - Revenus par produit", margin, yPosition);
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
        doc.text("Top 10 - Revenus par produit", margin, yPosition);
        yPosition += 8;
      }
      
      doc.addImage(chartImgData, 'PNG', margin, yPosition, imgWidth, imgHeight);
      yPosition += imgHeight + 15;
      
    } catch (error) {
      console.error('Error capturing chart:', error);
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.gray);
      doc.text("(Graphique non disponible)", margin, yPosition);
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
  const statusDescriptions: Record<InvoiceStatus, string> = {
    paid: 'payées',
    sent: 'envoyées',
    overdue: 'en retard',
    draft: 'brouillons'
  };
  const statusList = includedStatuses.map(s => statusDescriptions[s]).join(', ');
  const noteText = `Ce rapport présente les ventes par produit sur la période sélectionnée, basé sur les factures ${statusList}.`;
  const splitNote = doc.splitTextToSize(noteText, contentWidth);
  doc.text(splitNote, margin, yPosition);
  
  // Update total pages and add footers to all pages
  totalPages.value = doc.getNumberOfPages();
  
  for (let i = 1; i <= totalPages.value; i++) {
    doc.setPage(i);
    addFooter(i, totalPages.value);
  }
  
  // Generate filename
  let filename = "rapport-ventes-produits";
  if (startDate && endDate) {
    filename += `-${format(startDate, 'yyyy-MM-dd')}-${format(endDate, 'yyyy-MM-dd')}`;
  }
  filename += ".pdf";
  
  // Retourner Blob ou sauvegarder selon l'option
  if (returnBlob) {
    return doc.output('blob');
  }
  
  doc.save(filename);
};
