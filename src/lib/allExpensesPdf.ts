import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import type { ExpenseReportData } from "@/hooks/useExpenseReports";

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

export interface AllExpensesPdfOptions {
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
    reportTitle: 'Détail de toutes les dépenses',
    company: 'Entreprise',
    period: 'Période',
    since: 'À partir du',
    until: "Jusqu'au",
    allPeriods: 'Toutes les périodes',
    generatedOn: 'Généré le',
    date: 'Date',
    description: 'Description',
    category: 'Catégorie',
    companyCol: 'Entreprise',
    vendor: 'Fournisseur',
    amount: 'Montant',
    taxes: 'Taxes',
    total: 'Total',
    status: 'Statut',
    paid: 'Payée',
    unpaid: 'Impayée',
    totalRow: 'TOTAL',
    totalAmount: 'Total Montant',
    totalTaxes: 'Total Taxes',
    grandTotal: 'Grand Total',
    page: 'Page',
    of: 'sur',
    generatedBy: 'Généré avec GestionFlow',
    noExpenses: 'Aucune dépense enregistrée'
  } : {
    reportTitle: 'All Expenses Detail',
    company: 'Company',
    period: 'Period',
    since: 'From',
    until: 'Until',
    allPeriods: 'All periods',
    generatedOn: 'Generated on',
    date: 'Date',
    description: 'Description',
    category: 'Category',
    companyCol: 'Company',
    vendor: 'Vendor',
    amount: 'Amount',
    taxes: 'Taxes',
    total: 'Total',
    status: 'Status',
    paid: 'Paid',
    unpaid: 'Unpaid',
    totalRow: 'TOTAL',
    totalAmount: 'Total Amount',
    totalTaxes: 'Total Taxes',
    grandTotal: 'Grand Total',
    page: 'Page',
    of: 'of',
    generatedBy: 'Generated with GestionFlow',
    noExpenses: 'No expenses recorded'
  };
};

export const generateAllExpensesPdf = async (options: AllExpensesPdfOptions): Promise<Blob | void> => {
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

  const doc = new jsPDF('l', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 15;

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


  doc.setTextColor(...COLORS.gray);
  doc.setFontSize(9);
  const dateFormat = language === 'fr' ? 'd MMMM yyyy à HH:mm' : 'd MMMM yyyy, HH:mm';
  doc.text(`${t.generatedOn}: ${format(new Date(), dateFormat, { locale: dateLocale })}`, margin, yPosition);
  yPosition += 12;

  doc.setDrawColor(...COLORS.lightGray);
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // ===== EXPENSES TABLE =====
  if (reportData.expenseDetails.length === 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.gray);
    doc.text(t.noExpenses, margin, yPosition + 10);
  } else {
    // Sort by date ascending
    const sortedExpenses = [...reportData.expenseDetails].sort((a, b) => 
      new Date(a.expense_date).getTime() - new Date(b.expense_date).getTime()
    );

    let totalAmount = 0;
    let totalTaxes = 0;
    let grandTotal = 0;

    const tableData = sortedExpenses.map(expense => {
      const expenseTaxes = expense.taxes?.reduce((sum, tax) => sum + (tax.amount || 0), 0) || 0;
      const expenseTotal = expense.amount + expenseTaxes;
      
      totalAmount += expense.amount;
      totalTaxes += expenseTaxes;
      grandTotal += expenseTotal;

      const taxDisplay = expense.taxes && expense.taxes.length > 0
        ? expense.taxes.map(tax => `${tax.name}: ${new Intl.NumberFormat(currencyLocale, { style: 'currency', currency: 'CAD' }).format(tax.amount || 0)}`).join(', ')
        : '-';

      return [
        format(new Date(expense.expense_date), 'dd/MM/yyyy'),
        expense.description.length > 35 ? expense.description.substring(0, 35) + '...' : expense.description,
        expense.category,
        expense.company_name || '-',
        expense.vendor || '-',
        new Intl.NumberFormat(currencyLocale, { style: 'currency', currency: 'CAD' }).format(expense.amount),
        taxDisplay,
        new Intl.NumberFormat(currencyLocale, { style: 'currency', currency: 'CAD' }).format(expenseTotal),
        expense.deductible_percent.toFixed(0) + '%',
        new Intl.NumberFormat(currencyLocale, { style: 'currency', currency: 'CAD' }).format(expense.deductible_amount),
        expense.status === 'paid' ? t.paid : t.unpaid
      ];
    });

    const totalDeductible = sortedExpenses.reduce((sum, e) => sum + e.deductible_amount, 0);

    // Add totals row
    tableData.push([
      t.totalRow,
      '',
      '',
      '',
      '',
      new Intl.NumberFormat(currencyLocale, { style: 'currency', currency: 'CAD' }).format(totalAmount),
      new Intl.NumberFormat(currencyLocale, { style: 'currency', currency: 'CAD' }).format(totalTaxes),
      new Intl.NumberFormat(currencyLocale, { style: 'currency', currency: 'CAD' }).format(grandTotal),
      '',
      new Intl.NumberFormat(currencyLocale, { style: 'currency', currency: 'CAD' }).format(totalDeductible),
      ''
    ]);

    autoTable(doc, {
      head: [[t.date, t.description, t.category, t.companyCol, t.vendor, t.amount, t.taxes, t.total, language === 'fr' ? 'Déd. %' : 'Ded. %', language === 'fr' ? 'Montant déd.' : 'Ded. Amt', t.status]],
      body: tableData,
      startY: yPosition,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 8,
        cellPadding: 3,
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
        0: { halign: 'left', cellWidth: 20 },
        1: { halign: 'left', cellWidth: 40 },
        2: { halign: 'left', cellWidth: 25 },
        3: { halign: 'left', cellWidth: 30 },
        4: { halign: 'left', cellWidth: 25 },
        5: { halign: 'right', cellWidth: 22 },
        6: { halign: 'left', cellWidth: 32 },
        7: { halign: 'right', cellWidth: 22 },
        8: { halign: 'right', cellWidth: 16 },
        9: { halign: 'right', cellWidth: 22 },
        10: { halign: 'center', cellWidth: 18 },
      },
      didParseCell: (data) => {
        // Style the totals row
        if (data.row.index === tableData.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = COLORS.lightGray;
        }
        // Color the status column
        if (data.column.index === 10 && data.section === 'body' && data.row.index < tableData.length - 1) {
          const statusText = data.cell.raw as string;
          if (statusText === t.paid) {
            data.cell.styles.textColor = COLORS.green;
          } else if (statusText === t.unpaid) {
            data.cell.styles.textColor = COLORS.orange;
          }
        }
      },
      didDrawPage: () => {
        totalPages.value = doc.getNumberOfPages();
      }
    });
  }

  // Add footers to all pages
  totalPages.value = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages.value; i++) {
    doc.setPage(i);
    addFooter(i, totalPages.value);
  }

  let filename = language === 'fr' ? "detail-toutes-depenses" : "all-expenses-detail";
  if (startDate && endDate) {
    filename += `-${format(startDate, 'yyyy-MM-dd')}-${format(endDate, 'yyyy-MM-dd')}`;
  }
  filename += ".pdf";

  if (returnBlob) {
    return doc.output('blob');
  }

  doc.save(filename);
};
