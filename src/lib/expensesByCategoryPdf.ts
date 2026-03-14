import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import type { ExpenseReportData, ExpenseDetail } from "@/hooks/useExpenseReports";

// Brand colors
const COLORS = {
  primary: [59, 130, 246] as [number, number, number],
  dark: [31, 41, 55] as [number, number, number],
  gray: [107, 114, 128] as [number, number, number],
  lightGray: [243, 244, 246] as [number, number, number],
  green: [34, 197, 94] as [number, number, number],
  orange: [249, 115, 22] as [number, number, number],
  red: [239, 68, 68] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

export type PlanType = 'free' | 'premium' | 'pro';

export interface ExpensesByCategoryPdfOptions {
  reportData: ExpenseReportData;
  startDate?: Date;
  endDate?: Date;
  companyName?: string;
  companyFilterName?: string;
  language?: 'fr' | 'en';
  planType?: PlanType;
  hideBranding?: boolean;
  returnBlob?: boolean;
}

const getTranslations = (language: 'fr' | 'en') => {
  return language === 'fr' ? {
    reportTitle: 'Dépenses par catégorie',
    company: 'Entreprise',
    period: 'Période',
    since: 'À partir du',
    until: "Jusqu'au",
    allPeriods: 'Toutes les périodes',
    generatedOn: 'Généré le',
    summary: 'Résumé',
    totalExpenses: 'Total des dépenses',
    deductibleExpenses: 'Dépenses déductibles',
    totalCategories: 'Nombre de catégories',
    avgPerCategory: 'Moyenne par catégorie',
    categoryDetails: 'Détail par catégorie',
    category: 'Catégorie',
    count: 'Nombre',
    totalAmount: 'Montant total',
    deductiblePct: 'Déd. %',
    deductibleAmount: 'Montant déd.',
    avgAmount: 'Montant moyen',
    percentage: '% du total',
    totalRow: 'TOTAL',
    page: 'Page',
    of: 'sur',
    generatedBy: 'Généré avec GestionFlow',
    noData: 'Aucune dépense pour cette période'
  } : {
    reportTitle: 'Expenses by Category',
    company: 'Company',
    period: 'Period',
    since: 'From',
    until: 'Until',
    allPeriods: 'All periods',
    generatedOn: 'Generated on',
    summary: 'Summary',
    totalExpenses: 'Total Expenses',
    deductibleExpenses: 'Deductible Expenses',
    totalCategories: 'Number of Categories',
    avgPerCategory: 'Average per Category',
    categoryDetails: 'Category Details',
    category: 'Category',
    count: 'Count',
    totalAmount: 'Total Amount',
    deductiblePct: 'Ded. %',
    deductibleAmount: 'Ded. Amount',
    avgAmount: 'Average Amount',
    percentage: '% of Total',
    totalRow: 'TOTAL',
    page: 'Page',
    of: 'of',
    generatedBy: 'Generated with GestionFlow',
    noData: 'No expenses for this period'
  };
};

export const generateExpensesByCategoryPdf = async (options: ExpensesByCategoryPdfOptions): Promise<Blob | void> => {
  const {
    reportData,
    startDate,
    endDate,
    companyName,
    companyFilterName,
    language = 'fr',
    hideBranding = false,
    returnBlob = false
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

  const showBranding = !hideBranding;

  const addFooter = (currentPage: number, total: number) => {
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.gray);
    if (showBranding) {
      doc.text(t.generatedBy, margin, pageHeight - 10);
    }
    doc.text(`${t.page} ${currentPage} ${t.of} ${total}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.setTextColor(...COLORS.dark);
  };

  // ===== HEADER =====
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(t.reportTitle, pageWidth - margin, yPosition + 5, { align: 'right' });
  yPosition += 18;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  if (companyName) {
    doc.text(`${t.company}: ${companyName}`, margin, yPosition);
    yPosition += 6;
  }

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

  if (companyFilterName) {
    doc.text(`${t.company}: ${companyFilterName}`, margin, yPosition);
    yPosition += 6;
  }

  doc.setTextColor(...COLORS.gray);
  doc.setFontSize(9);
  const dateFormat = language === 'fr' ? 'd MMMM yyyy à HH:mm' : 'd MMMM yyyy, HH:mm';
  doc.text(`${t.generatedOn}: ${format(new Date(), dateFormat, { locale: dateLocale })}`, margin, yPosition);
  yPosition += 12;

  doc.setDrawColor(...COLORS.lightGray);
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // ===== SUMMARY =====
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);
  doc.text(t.summary, margin, yPosition);
  yPosition += 8;

  const cardWidth = (contentWidth - 10) / 3;
  const cardHeight = 28;
  const cardPadding = 5;

  const avgPerCategory = reportData.expensesByCategory.length > 0 
    ? reportData.totalExpenses / reportData.expensesByCategory.length 
    : 0;

  const summaryCards = [
    { label: t.totalExpenses, value: new Intl.NumberFormat(currencyLocale, { style: 'currency', currency: 'CAD' }).format(reportData.totalExpenses), color: COLORS.red },
    { label: t.totalCategories, value: reportData.expensesByCategory.length.toString(), color: COLORS.primary },
    { label: t.avgPerCategory, value: new Intl.NumberFormat(currencyLocale, { style: 'currency', currency: 'CAD' }).format(avgPerCategory), color: COLORS.dark }
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

  // ===== CATEGORY TABLE =====
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);
  doc.text(t.categoryDetails, margin, yPosition);
  yPosition += 8;

  if (reportData.expensesByCategory.length === 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.gray);
    doc.text(t.noData, margin, yPosition + 10);
  } else {
    const sortedCategories = [...reportData.expensesByCategory].sort((a, b) => b.total_amount - a.total_amount);

    const tableData = sortedCategories.map(cat => {
      const percentage = reportData.totalExpenses > 0 
        ? ((cat.total_amount / reportData.totalExpenses) * 100).toFixed(1) + '%'
        : '0%';
      return [
        cat.category,
        cat.count.toString(),
        new Intl.NumberFormat(currencyLocale, { style: 'currency', currency: 'CAD' }).format(cat.total_amount),
        new Intl.NumberFormat(currencyLocale, { style: 'currency', currency: 'CAD' }).format(cat.total_amount / cat.count),
        percentage
      ];
    });

    const totalCount = sortedCategories.reduce((sum, cat) => sum + cat.count, 0);
    tableData.push([
      t.totalRow,
      totalCount.toString(),
      new Intl.NumberFormat(currencyLocale, { style: 'currency', currency: 'CAD' }).format(reportData.totalExpenses),
      new Intl.NumberFormat(currencyLocale, { style: 'currency', currency: 'CAD' }).format(reportData.totalExpenses / totalCount),
      '100%'
    ]);

    autoTable(doc, {
      head: [[t.category, t.count, t.totalAmount, t.avgAmount, t.percentage]],
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
        1: { halign: 'right', cellWidth: 25 },
        2: { halign: 'right', cellWidth: 35 },
        3: { halign: 'right', cellWidth: 35 },
        4: { halign: 'right', cellWidth: 25 },
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
  }

  totalPages.value = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages.value; i++) {
    doc.setPage(i);
    addFooter(i, totalPages.value);
  }

  let filename = language === 'fr' ? "depenses-par-categorie" : "expenses-by-category";
  if (startDate && endDate) {
    filename += `-${format(startDate, 'yyyy-MM-dd')}-${format(endDate, 'yyyy-MM-dd')}`;
  }
  filename += ".pdf";

  if (returnBlob) {
    return doc.output('blob');
  }

  doc.save(filename);
};
