import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";

// GestionFlow brand colors
const COLORS = {
  primary: [59, 130, 246] as [number, number, number], // Blue
  dark: [31, 41, 55] as [number, number, number], // Gray-800
  gray: [107, 114, 128] as [number, number, number], // Gray-500
  lightGray: [243, 244, 246] as [number, number, number], // Gray-100
  green: [34, 197, 94] as [number, number, number], // Green
  orange: [249, 115, 22] as [number, number, number], // Orange
  red: [239, 68, 68] as [number, number, number], // Red
  white: [255, 255, 255] as [number, number, number],
};

export type PlanType = 'free' | 'premium' | 'pro';

export interface StockProduct {
  id: string;
  name: string;
  sku?: string | null;
  category?: string | null;
  quantity: number;
  minStock?: number; // Minimum stock threshold (default: 5)
}

export interface StockStatusSummary {
  totalProducts: number;
  inStockCount: number;
  lowStockCount: number;
  outOfStockCount: number;
}

interface StockStatusPdfOptions {
  products: StockProduct[];
  companyName?: string;
  companyFilterName?: string;
  language?: 'fr' | 'en';
  returnBlob?: boolean;
  planType?: PlanType;
  hideBranding?: boolean;
}

const getTranslations = (language: 'fr' | 'en') => {
  return language === 'fr' ? {
    reportTitle: 'État des Stocks',
    generatedOn: 'Généré le',
    company: 'Entreprise',
    companyFilter: 'Filtre entreprise',
    summary: 'Résumé',
    totalProducts: 'Produits totaux',
    inStock: 'En stock',
    lowStock: 'Stock bas',
    outOfStock: 'Épuisé',
    stockStatusTable: 'Détail des Stocks',
    productName: 'Produit',
    sku: 'SKU',
    category: 'Catégorie',
    currentStock: 'Quantité',
    minStockLevel: 'Stock min.',
    status: 'Statut',
    page: 'Page',
    of: 'sur',
    generatedBy: 'Généré avec GestionFlow',
    noData: 'Aucune donnée',
  } : {
    reportTitle: 'Stock Status',
    generatedOn: 'Generated on',
    company: 'Company',
    companyFilter: 'Company filter',
    summary: 'Summary',
    totalProducts: 'Total Products',
    inStock: 'In Stock',
    lowStock: 'Low Stock',
    outOfStock: 'Out of Stock',
    stockStatusTable: 'Stock Details',
    productName: 'Product',
    sku: 'SKU',
    category: 'Category',
    currentStock: 'Quantity',
    minStockLevel: 'Min. Stock',
    status: 'Status',
    page: 'Page',
    of: 'of',
    generatedBy: 'Generated with GestionFlow',
    noData: 'No data',
  };
};

const getStockStatus = (quantity: number, minStock: number, language: 'fr' | 'en'): { label: string; color: [number, number, number]; priority: number } => {
  if (quantity === 0) {
    return {
      label: language === 'fr' ? 'Épuisé' : 'Out of Stock',
      color: COLORS.red,
      priority: 0, // Highest priority for sorting
    };
  } else if (quantity <= minStock) {
    return {
      label: language === 'fr' ? 'Stock bas' : 'Low Stock',
      color: COLORS.orange,
      priority: 1,
    };
  }
  return {
    label: language === 'fr' ? 'En stock' : 'In Stock',
    color: COLORS.green,
    priority: 2, // Lowest priority
  };
};

export const generateStockStatusPdf = async (options: StockStatusPdfOptions): Promise<Blob | void> => {
  const {
    products,
    companyName,
    companyFilterName,
    language = 'fr',
    returnBlob = false,
    planType = 'free',
    hideBranding = false,
  } = options;

  const t = getTranslations(language);
  const dateLocale = language === 'fr' ? fr : enUS;

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

  // Calculate summary stats
  const minStockThreshold = 5; // Default threshold
  const summary: StockStatusSummary = {
    totalProducts: products.length,
    inStockCount: products.filter(p => p.quantity > (p.minStock ?? minStockThreshold)).length,
    lowStockCount: products.filter(p => p.quantity > 0 && p.quantity <= (p.minStock ?? minStockThreshold)).length,
    outOfStockCount: products.filter(p => p.quantity === 0).length,
  };

  // Sort products: Out of Stock first, then Low Stock, then In Stock, and alphabetically within each group
  const sortedProducts = [...products].sort((a, b) => {
    const minStockA = a.minStock ?? minStockThreshold;
    const minStockB = b.minStock ?? minStockThreshold;
    const statusA = getStockStatus(a.quantity, minStockA, language);
    const statusB = getStockStatus(b.quantity, minStockB, language);
    
    if (statusA.priority !== statusB.priority) {
      return statusA.priority - statusB.priority;
    }
    return a.name.localeCompare(b.name);
  });

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

  // Summary cards - 4 boxes horizontally
  const cardWidth = (contentWidth - 15) / 4;
  const cardHeight = 28;
  const cardPadding = 4;

  const summaryCards = [
    { label: t.totalProducts, value: summary.totalProducts.toString(), color: COLORS.dark },
    { label: t.inStock, value: summary.inStockCount.toString(), color: COLORS.green },
    { label: t.lowStock, value: summary.lowStockCount.toString(), color: COLORS.orange },
    { label: t.outOfStock, value: summary.outOfStockCount.toString(), color: COLORS.red }
  ];

  summaryCards.forEach((card, index) => {
    const cardX = margin + (index * (cardWidth + 5));

    doc.setFillColor(...COLORS.lightGray);
    doc.roundedRect(cardX, yPosition, cardWidth, cardHeight, 3, 3, 'F');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.gray);
    doc.text(card.label, cardX + cardPadding, yPosition + 10);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...card.color);
    doc.text(card.value, cardX + cardPadding, yPosition + 22);
  });

  yPosition += cardHeight + 12;

  // ===== STOCK STATUS TABLE =====
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);
  doc.text(t.stockStatusTable, margin, yPosition);
  yPosition += 8;

  // Prepare table data
  const tableData = sortedProducts.map(product => {
    const minStock = product.minStock ?? minStockThreshold;
    const status = getStockStatus(product.quantity, minStock, language);
    
    return [
      product.name,
      product.sku || '-',
      product.category || '-',
      product.quantity.toString(),
      minStock.toString(),
      status.label
    ];
  });

  // Define row colors based on status
  autoTable(doc, {
    head: [[t.productName, t.sku, t.category, t.currentStock, t.minStockLevel, t.status]],
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
    columnStyles: {
      0: { halign: 'left', cellWidth: 'auto' },
      1: { halign: 'left', cellWidth: 25 },
      2: { halign: 'left', cellWidth: 30 },
      3: { halign: 'center', cellWidth: 22 },
      4: { halign: 'center', cellWidth: 22 },
      5: { halign: 'center', cellWidth: 28 },
    },
    didParseCell: (data) => {
      // Style status column based on stock status
      if (data.section === 'body' && data.column.index === 5) {
        const statusText = data.cell.raw as string;
        const isOutOfStock = statusText === 'Épuisé' || statusText === 'Out of Stock';
        const isLowStock = statusText === 'Stock bas' || statusText === 'Low Stock';
        
        if (isOutOfStock) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = COLORS.red;
        } else if (isLowStock) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = COLORS.orange;
        } else {
          data.cell.styles.textColor = COLORS.green;
        }
      }
      
      // Highlight entire row for out of stock
      if (data.section === 'body') {
        const product = sortedProducts[data.row.index];
        if (product) {
          const minStock = product.minStock ?? minStockThreshold;
          if (product.quantity === 0) {
            data.cell.styles.fillColor = [254, 242, 242]; // Light red background
          } else if (product.quantity <= minStock) {
            data.cell.styles.fillColor = [255, 247, 237]; // Light orange background
          }
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
  const filename = language === 'fr' 
    ? `rapport-etat-stocks-${format(new Date(), 'yyyy-MM-dd')}.pdf`
    : `stock-status-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;

  if (returnBlob) {
    return doc.output('blob');
  }

  doc.save(filename);
};
