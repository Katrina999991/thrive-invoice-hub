
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useReports } from "@/hooks/useReports";
import { useTaxReports } from "@/hooks/useTaxReports";
import { useInvoices } from "@/hooks/useInvoices";
import { useCompanies } from "@/hooks/useCompanies";
import { useClients } from "@/hooks/useClients";
import { useDashboard } from "@/hooks/useDashboard";
import { useState, useMemo, useRef } from "react";
import { format } from "date-fns";
import { DateRangePicker } from "@/components/DateRangePicker";
import { MonthYearPicker } from "@/components/MonthYearPicker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Download, FileSpreadsheet, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";

const Reports = () => {
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');
  const [activeTab, setActiveTab] = useState('custom');
  
  // Refs pour capturer les graphiques
  const barChartRef = useRef<HTMLDivElement>(null);
  const lineChartRef = useRef<HTMLDivElement>(null);
  
  // États séparés pour chaque onglet
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const [selectedMonth, setSelectedMonth] = useState<Date | undefined>();
  const [selectedYear, setSelectedYear] = useState<Date | undefined>();
  
  // États pour la plage d'années dans la vue annuelle
  const [yearRangeStart, setYearRangeStart] = useState<Date | undefined>();
  const [yearRangeEnd, setYearRangeEnd] = useState<Date | undefined>();
  
  // États pour les filtres
  const [filterType, setFilterType] = useState<'all' | 'company' | 'client'>('all');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  
  // États pour les filtres de clients par date de création
  const [createdFromDate, setCreatedFromDate] = useState<Date | undefined>();
  const [createdToDate, setCreatedToDate] = useState<Date | undefined>();
  // Mémoriser les dates actives pour éviter les re-renders
  const { startDate, endDate } = useMemo(() => {
    switch (activeTab) {
      case 'custom':
        return { startDate: customStartDate, endDate: customEndDate };
      case 'month':
        if (selectedMonth) {
          const startOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
          const endOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
          return { startDate: startOfMonth, endDate: endOfMonth };
        }
        return { startDate: undefined, endDate: undefined };
      case 'year':
        if (selectedYear) {
          const startOfYear = new Date(selectedYear.getFullYear(), 0, 1);
          const endOfYear = new Date(selectedYear.getFullYear(), 11, 31);
          return { startDate: startOfYear, endDate: endOfYear };
        }
        return { startDate: undefined, endDate: undefined };
      default:
        return { startDate: undefined, endDate: undefined };
    }
  }, [activeTab, customStartDate, customEndDate, selectedMonth, selectedYear]);
  
  const { revenueData: realRevenueData, loading, error } = useReports(
    startDate, 
    endDate, 
    filterType, 
    filterType === 'company' ? selectedCompanyId : selectedClientId
  );
  const { invoices } = useInvoices();
  const { companies } = useCompanies();
  const { clients } = useClients();
  const { data: dashboardData } = useDashboard();
  
  // États pour le rapport de taxes
  const [taxDateFilter, setTaxDateFilter] = useState<'custom' | 'month' | 'year'>('custom');
  const [taxStartDate, setTaxStartDate] = useState<Date | undefined>();
  const [taxEndDate, setTaxEndDate] = useState<Date | undefined>();
  const [taxSelectedMonth, setTaxSelectedMonth] = useState<Date | undefined>();
  const [taxSelectedYear, setTaxSelectedYear] = useState<Date | undefined>();
  const [taxSelectedCompany, setTaxSelectedCompany] = useState<string>('all');
  const [taxViewMode, setTaxViewMode] = useState<'monthly' | 'yearly'>('monthly');
  
  // Calculer les dates pour le rapport de taxes
  const { startDate: taxEffectiveStart, endDate: taxEffectiveEnd } = useMemo(() => {
    switch (taxDateFilter) {
      case 'custom':
        return { startDate: taxStartDate, endDate: taxEndDate };
      case 'month':
        if (taxSelectedMonth) {
          const startOfMonth = new Date(taxSelectedMonth.getFullYear(), taxSelectedMonth.getMonth(), 1);
          const endOfMonth = new Date(taxSelectedMonth.getFullYear(), taxSelectedMonth.getMonth() + 1, 0);
          return { startDate: startOfMonth, endDate: endOfMonth };
        }
        return { startDate: undefined, endDate: undefined };
      case 'year':
        if (taxSelectedYear) {
          const startOfYear = new Date(taxSelectedYear.getFullYear(), 0, 1);
          const endOfYear = new Date(taxSelectedYear.getFullYear(), 11, 31);
          return { startDate: startOfYear, endDate: endOfYear };
        }
        return { startDate: undefined, endDate: undefined };
      default:
        return { startDate: undefined, endDate: undefined };
    }
  }, [taxDateFilter, taxStartDate, taxEndDate, taxSelectedMonth, taxSelectedYear]);
  
  const { taxData, loading: taxLoading } = useTaxReports(
    taxEffectiveStart,
    taxEffectiveEnd,
    taxSelectedCompany && taxSelectedCompany !== 'all' ? taxSelectedCompany : undefined
  );
  
  // Fonction pour récupérer la dernière facture d'un client
  const getLastInvoiceDate = (clientId: string) => {
    const clientInvoices = invoices.filter(invoice => invoice.client_id === clientId);
    if (clientInvoices.length === 0) return null;
    
    const sortedInvoices = clientInvoices.sort((a, b) => 
      new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime()
    );
    
    return sortedInvoices[0].issue_date;
  };

  // Filtrer les clients par date de création
  const filteredClientsByDate = useMemo(() => {
    return clients.filter(client => {
      const clientCreatedDate = new Date(client.created_at);
      
      if (createdFromDate && clientCreatedDate < createdFromDate) {
        return false;
      }
      
      if (createdToDate && clientCreatedDate > createdToDate) {
        return false;
      }
      
      return true;
    });
  }, [clients, createdFromDate, createdToDate]);

  // Format data for charts
  const formatRevenueDataForChart = () => {
    if (!realRevenueData) return [];
    
    let data = viewMode === 'monthly' ? realRevenueData.monthlyData : realRevenueData.yearlyData;
    
    // Filtrer par plage d'années si spécifiée en mode annuel
    if (viewMode === 'yearly' && (yearRangeStart || yearRangeEnd)) {
      data = data.filter(item => {
        const year = parseInt(item.period);
        const startYear = yearRangeStart ? yearRangeStart.getFullYear() : 0;
        const endYear = yearRangeEnd ? yearRangeEnd.getFullYear() : 9999;
        return year >= startYear && year <= endYear;
      });
    }
    
    return data.map(item => {
      if (viewMode === 'monthly') {
        const [year, month] = item.period.split('-');
        const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
        return {
          period: `${monthNames[parseInt(month) - 1]} ${year}`,
          revenue: item.revenue,
          invoiceCount: item.invoiceCount
        };
      }
      return {
        period: item.period,
        revenue: item.revenue,
        invoiceCount: item.invoiceCount
      };
    });
  };

  const chartData = formatRevenueDataForChart();

  // Function to download charts as PDF
  const downloadChartsAsPDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Title
    doc.setFontSize(18);
    doc.text('Graphiques des Revenus', pageWidth / 2, 20, { align: 'center' });
    
    // Date range
    let dateRangeText = '';
    if (startDate && endDate) {
      dateRangeText = `${format(startDate, 'dd/MM/yyyy')} - ${format(endDate, 'dd/MM/yyyy')}`;
    } else if (startDate) {
      dateRangeText = `À partir du ${format(startDate, 'dd/MM/yyyy')}`;
    } else if (endDate) {
      dateRangeText = `Jusqu'au ${format(endDate, 'dd/MM/yyyy')}`;
    }
    
    if (dateRangeText) {
      doc.setFontSize(12);
      doc.text(dateRangeText, pageWidth / 2, 30, { align: 'center' });
    }
    
    let yPosition = 50;
    
    try {
      // Capture Bar Chart
      if (barChartRef.current) {
        const barCanvas = await html2canvas(barChartRef.current, {
          backgroundColor: '#ffffff',
          scale: 1,
          useCORS: true
        });
        const barImgData = barCanvas.toDataURL('image/png');
        
        doc.setFontSize(14);
        doc.text('Graphique en barres - Revenus par période', 20, yPosition);
        yPosition += 10;
        
        const imgWidth = pageWidth - 40;
        const imgHeight = (barCanvas.height * imgWidth) / barCanvas.width;
        
        doc.addImage(barImgData, 'PNG', 20, yPosition, imgWidth, imgHeight);
        yPosition += imgHeight + 20;
      }
      
      // Check if we need a new page
      if (yPosition > 200) {
        doc.addPage();
        yPosition = 20;
      }
      
      // Capture Line Chart
      if (lineChartRef.current) {
        const lineCanvas = await html2canvas(lineChartRef.current, {
          backgroundColor: '#ffffff',
          scale: 1,
          useCORS: true
        });
        const lineImgData = lineCanvas.toDataURL('image/png');
        
        doc.setFontSize(14);
        doc.text('Graphique en ligne - Évolution des revenus', 20, yPosition);
        yPosition += 10;
        
        const imgWidth = pageWidth - 40;
        const imgHeight = (lineCanvas.height * imgWidth) / lineCanvas.width;
        
        doc.addImage(lineImgData, 'PNG', 20, yPosition, imgWidth, imgHeight);
        yPosition += imgHeight + 20;
      }
    } catch (error) {
      console.error('Erreur lors de la capture des graphiques:', error);
      doc.setFontSize(12);
      doc.text('Erreur lors de la capture des graphiques', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 20;
    }
    
    // Add data table if there's space
    if (chartData.length > 0 && yPosition < 250) {
      if (yPosition > 200) {
        doc.addPage();
        yPosition = 20;
      }
      
      const tableData = chartData.map(item => [
        item.period,
        new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'CAD' }).format(item.revenue),
        item.invoiceCount.toString()
      ]);
      
      autoTable(doc, {
        head: [['Période', 'Revenus', 'Nb Factures']],
        body: tableData,
        startY: yPosition,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
      });
    }
    
    const filename = `graphiques-revenus-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(filename);
  };

  // Filter invoices based on selected date range and paid status
  // Export functions
  const exportToPDF = () => {
    if (!realRevenueData || !chartData.length) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Title
    doc.setFontSize(20);
    doc.text('Revenue Report', pageWidth / 2, 20, { align: 'center' });
    
    // Date range
    let dateRangeText = '';
    if (startDate && endDate) {
      dateRangeText = `${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}`;
    } else if (startDate) {
      dateRangeText = `From ${format(startDate, 'MMM dd, yyyy')}`;
    } else if (endDate) {
      dateRangeText = `Until ${format(endDate, 'MMM dd, yyyy')}`;
    }
    
    doc.setFontSize(12);
    doc.text(dateRangeText, pageWidth / 2, 30, { align: 'center' });
    
    // Filter info
    let filterText = 'All Data';
    if (filterType === 'company' && selectedCompanyId) {
      const company = companies.find(c => c.id === selectedCompanyId);
      filterText = `Company: ${company?.name || 'Unknown'}`;
    } else if (filterType === 'client' && selectedClientId) {
      const client = clients.find(c => c.id === selectedClientId);
      filterText = `Client: ${client?.name || 'Unknown'}`;
    }
    doc.text(`Filter: ${filterText}`, pageWidth / 2, 40, { align: 'center' });
    
    // Summary statistics
    doc.setFontSize(14);
    doc.text('Summary', 20, 60);
    doc.setFontSize(10);
    doc.text(`Total Revenue: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(realRevenueData.totalRevenue)}`, 20, 70);
    doc.text(`Number of ${viewMode === 'monthly' ? 'Months' : 'Years'}: ${viewMode === 'monthly' ? realRevenueData.monthlyData.length : realRevenueData.yearlyData.length}`, 20, 80);
    doc.text(`Average Revenue per ${viewMode === 'monthly' ? 'Month' : 'Year'}: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(realRevenueData.totalRevenue / Math.max(1, viewMode === 'monthly' ? realRevenueData.monthlyData.length : realRevenueData.yearlyData.length))}`, 20, 90);
    
    // Revenue by period table
    const tableData = chartData.map(item => [
      item.period,
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.revenue),
      item.invoiceCount.toString(),
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.revenue / item.invoiceCount)
    ]);
    
    let finalY = 110;
    autoTable(doc, {
      head: [['Period', 'Revenue', 'Invoices', 'Avg per Invoice']],
      body: tableData,
      startY: finalY,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      didDrawPage: (data) => {
        finalY = data.cursor.y;
      }
    });
    
    // Invoices table (if space permits)
    if (filteredInvoices.length > 0 && finalY < 200) {
      const invoiceTableData = filteredInvoices.slice(0, 20).map(invoice => [
        invoice.invoice_number,
        (invoice as any).clients?.name || 'N/A',
        format(new Date(invoice.issue_date), 'MMM dd, yyyy'),
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(invoice.total))
      ]);
      
      autoTable(doc, {
        head: [['Invoice #', 'Client', 'Date', 'Amount']],
        body: invoiceTableData,
        startY: finalY + 20,
        theme: 'striped',
        headStyles: { fillColor: [34, 197, 94] },
      });
    }
    
    // Generate filename
    const filename = `revenue-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(filename);
  };

  // Export functions for taxes
  const exportTaxesToPDF = () => {
    if (!taxData) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Title
    doc.setFontSize(20);
    doc.text('Rapport des Taxes', pageWidth / 2, 20, { align: 'center' });
    
    // Date generated
    doc.setFontSize(12);
    doc.text(`Généré le: ${format(new Date(), 'dd/MM/yyyy')}`, pageWidth / 2, 30, { align: 'center' });
    
    // Company filter
    if (taxSelectedCompany && taxSelectedCompany !== 'all') {
      const companyName = companies.find(c => c.id === taxSelectedCompany)?.name;
      doc.text(`Compagnie: ${companyName}`, pageWidth / 2, 40, { align: 'center' });
    }
    
    // Date range
    if (taxEffectiveStart && taxEffectiveEnd) {
      doc.text(`Période: ${format(taxEffectiveStart, 'dd/MM/yyyy')} - ${format(taxEffectiveEnd, 'dd/MM/yyyy')}`, pageWidth / 2, 50, { align: 'center' });
    }
    
    // Summary
    doc.setFontSize(14);
    doc.text('Résumé des taxes', 20, 70);
    doc.setFontSize(10);
    doc.text(`Total des taxes: ${taxData.totalTaxAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'CAD' })}`, 20, 80);
    
    let yPosition = 100;
    
    // Tax breakdown table
    if (taxData.taxSummary.length > 0) {
      const taxSummaryData = taxData.taxSummary.map(tax => [
        tax.name,
        tax.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'CAD' }),
        tax.invoiceCount.toString()
      ]);
      
      autoTable(doc, {
        head: [['Type de taxe', 'Montant', 'Nombre de factures']],
        body: taxSummaryData,
        startY: yPosition,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 8 }
      });
      
      yPosition = (doc as any).lastAutoTable.finalY + 20;
    }
    
    // Monthly/Yearly breakdown
    if (yPosition + 50 > doc.internal.pageSize.height) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setFontSize(14);
    doc.text(`Évolution ${taxViewMode === 'monthly' ? 'mensuelle' : 'annuelle'}`, 20, yPosition);
    yPosition += 20;
    
    const periodData = taxViewMode === 'monthly' ? taxData.monthlyData : taxData.yearlyData;
    const periodTableData = periodData.map(period => [
      period.period,
      period.totalTaxAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'CAD' }),
      period.invoiceCount.toString(),
      period.taxBreakdown.map(tax => `${tax.name}: ${tax.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'CAD' })}`).join(', ')
    ]);
    
    autoTable(doc, {
      head: [['Période', 'Total taxes', 'Factures', 'Détail par taxe']],
      body: periodTableData,
      startY: yPosition,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 8 },
      columnStyles: {
        3: { cellWidth: 'wrap' }
      }
    });
    
    // Generate filename and save
    const companyFilter = taxSelectedCompany && taxSelectedCompany !== 'all' 
      ? `-${companies.find(c => c.id === taxSelectedCompany)?.name?.replace(/\s+/g, '-')}`
      : '';
    const filename = `rapport-taxes${companyFilter}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(filename);
  };

  const exportTaxesToExcel = () => {
    if (!taxData) return;
    
    const wb = XLSX.utils.book_new();
    
    // Summary sheet
    const summaryData = [
      ['Type de taxe', 'Montant', 'Nombre de factures'],
      ...taxData.taxSummary.map(tax => [
        tax.name,
        tax.amount,
        tax.invoiceCount
      ])
    ];
    
    const summaryWs = XLSX.utils.aoa_to_sheet([
      [`Rapport des Taxes - ${format(new Date(), 'dd/MM/yyyy')}`],
      taxSelectedCompany && taxSelectedCompany !== 'all' 
        ? [`Compagnie: ${companies.find(c => c.id === taxSelectedCompany)?.name}`]
        : ['Toutes les compagnies'],
      taxEffectiveStart && taxEffectiveEnd 
        ? [`Période: ${format(taxEffectiveStart, 'dd/MM/yyyy')} - ${format(taxEffectiveEnd, 'dd/MM/yyyy')}`]
        : [],
      [`Total des taxes: ${taxData.totalTaxAmount}`],
      [],
      ...summaryData
    ].filter(row => row.length > 0));
    
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Résumé');
    
    // Monthly/Yearly data sheet
    const periodData = taxViewMode === 'monthly' ? taxData.monthlyData : taxData.yearlyData;
    const periodSheetData = [
      ['Période', 'Total taxes', 'Nombre factures', 'Détail par taxe'],
      ...periodData.map(period => [
        period.period,
        period.totalTaxAmount,
        period.invoiceCount,
        period.taxBreakdown.map(tax => `${tax.name}: ${tax.amount}`).join(', ')
      ])
    ];
    
    const periodWs = XLSX.utils.aoa_to_sheet(periodSheetData);
    XLSX.utils.book_append_sheet(wb, periodWs, taxViewMode === 'monthly' ? 'Mensuel' : 'Annuel');
    
    // Generate filename and save
    const companyFilter = taxSelectedCompany && taxSelectedCompany !== 'all' 
      ? `-${companies.find(c => c.id === taxSelectedCompany)?.name?.replace(/\s+/g, '-')}`
      : '';
    const filename = `rapport-taxes${companyFilter}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(wb, filename);
  };
  
  const exportToExcel = () => {
    if (!realRevenueData || !chartData.length) return;
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Summary sheet
    const summaryData = [
      ['Revenue Report Summary'],
      [''],
      ['Date Range:', startDate && endDate ? `${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}` : 'Custom range'],
      ['Filter:', filterType === 'company' && selectedCompanyId ? `Company: ${companies.find(c => c.id === selectedCompanyId)?.name}` : 
                filterType === 'client' && selectedClientId ? `Client: ${clients.find(c => c.id === selectedClientId)?.name}` : 'All Data'],
      [''],
      ['Total Revenue:', realRevenueData.totalRevenue],
      [`Number of ${viewMode === 'monthly' ? 'Months' : 'Years'}:`, viewMode === 'monthly' ? realRevenueData.monthlyData.length : realRevenueData.yearlyData.length],
      [`Average Revenue per ${viewMode === 'monthly' ? 'Month' : 'Year'}:`, realRevenueData.totalRevenue / Math.max(1, viewMode === 'monthly' ? realRevenueData.monthlyData.length : realRevenueData.yearlyData.length)]
    ];
    
    const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWS, 'Summary');
    
    // Revenue by period sheet
    const revenueData = [
      ['Period', 'Revenue', 'Number of Invoices', 'Average Revenue per Invoice'],
      ...chartData.map(item => [
        item.period,
        item.revenue,
        item.invoiceCount,
        item.revenue / item.invoiceCount
      ])
    ];
    
    const revenueWS = XLSX.utils.aoa_to_sheet(revenueData);
    XLSX.utils.book_append_sheet(wb, revenueWS, 'Revenue by Period');
    
    // Invoices sheet
    if (filteredInvoices.length > 0) {
      const invoicesData = [
        ['Invoice Number', 'Client', 'Issue Date', 'Total Amount'],
        ...filteredInvoices.map(invoice => [
          invoice.invoice_number,
          (invoice as any).clients?.name || 'N/A',
          format(new Date(invoice.issue_date), 'MMM dd, yyyy'),
          Number(invoice.total)
        ])
      ];
      
      const invoicesWS = XLSX.utils.aoa_to_sheet(invoicesData);
      XLSX.utils.book_append_sheet(wb, invoicesWS, 'Invoices');
    }
    
    // Generate filename and save
    const filename = `revenue-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  // Export functions for clients
  const exportClientsToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Title
    doc.setFontSize(20);
    doc.text('Rapport des Clients', pageWidth / 2, 20, { align: 'center' });
    
    // Date generated
    doc.setFontSize(12);
    doc.text(`Généré le: ${format(new Date(), 'dd/MM/yyyy')}`, pageWidth / 2, 30, { align: 'center' });
    
    // Summary
    doc.setFontSize(14);
    doc.text('Résumé', 20, 50);
    doc.setFontSize(10);
    doc.text(`Nombre total de clients: ${clients.length}`, 20, 60);
    doc.text(`Nombre de compagnies: ${companies.length}`, 20, 70);
    
    let yPosition = 90;
    
    // All clients table
    const allClientsData = clients.map(client => [
      client.name,
      client.companies?.name || 'Aucune compagnie',
      client.email || 'N/A',
      client.phone || 'N/A',
      client.contact_person || 'N/A'
    ]);
    
    autoTable(doc, {
      head: [['Nom du client', 'Compagnie', 'Email', 'Téléphone', 'Contact']],
      body: allClientsData,
      startY: yPosition,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 8 },
      didDrawPage: (data) => {
        yPosition = data.cursor.y;
      }
    });
    
    // Add new page for company breakdown if needed
    if (yPosition > 200) {
      doc.addPage();
      yPosition = 20;
    } else {
      yPosition += 20;
    }
    
    // Company breakdown
    doc.setFontSize(14);
    doc.text('Répartition par compagnie', 20, yPosition);
    yPosition += 20;
    
    companies.forEach(company => {
      const companyClients = clients.filter(client => client.company_id === company.id);
      
      if (companyClients.length > 0) {
        // Check if we need a new page
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFontSize(12);
        doc.text(`${company.name} (${companyClients.length} clients)`, 20, yPosition);
        yPosition += 10;
        
        const companyClientsData = companyClients.map(client => [
          client.name,
          client.email || 'N/A',
          client.phone || 'N/A',
          client.contact_person || 'N/A'
        ]);
        
        autoTable(doc, {
          head: [['Nom du client', 'Email', 'Téléphone', 'Contact']],
          body: companyClientsData,
          startY: yPosition,
          theme: 'grid',
          headStyles: { fillColor: [34, 197, 94] },
          styles: { fontSize: 8 },
          margin: { left: 30 },
          didDrawPage: (data) => {
            yPosition = data.cursor.y + 10;
          }
        });
      }
    });
    
    // Generate filename
    const filename = `rapport-clients-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(filename);
  };
  
  const exportClientsToExcel = () => {
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Summary sheet
    const summaryData = [
      ['Rapport des Clients'],
      [''],
      ['Généré le:', format(new Date(), 'dd/MM/yyyy')],
      [''],
      ['Nombre total de clients:', clients.length],
      ['Nombre de compagnies:', companies.length],
      ['Clients sans compagnie:', clients.filter(client => !client.company_id).length]
    ];
    
    const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWS, 'Résumé');
    
    // All clients sheet
    const allClientsData = [
      ['Nom du client', 'Compagnie', 'Email', 'Téléphone', 'Personne de contact', 'Adresse', 'Notes'],
      ...clients.map(client => [
        client.name,
        client.companies?.name || 'Aucune compagnie',
        client.email || '',
        client.phone || '',
        client.contact_person || '',
        client.address || '',
        client.notes || ''
      ])
    ];
    
    const allClientsWS = XLSX.utils.aoa_to_sheet(allClientsData);
    XLSX.utils.book_append_sheet(wb, allClientsWS, 'Tous les clients');
    
    // Company breakdown sheets
    companies.forEach(company => {
      const companyClients = clients.filter(client => client.company_id === company.id);
      
      if (companyClients.length > 0) {
        const companyData = [
          [`Clients de ${company.name}`],
          [''],
          ['Nom du client', 'Email', 'Téléphone', 'Personne de contact', 'Adresse', 'Notes'],
          ...companyClients.map(client => [
            client.name,
            client.email || '',
            client.phone || '',
            client.contact_person || '',
            client.address || '',
            client.notes || ''
          ])
        ];
        
        const companyWS = XLSX.utils.aoa_to_sheet(companyData);
        // Sanitize sheet name (max 31 chars, no special chars)
        const sheetName = company.name.substring(0, 31).replace(/[\\/:*?[\]]/g, '');
        XLSX.utils.book_append_sheet(wb, companyWS, sheetName);
      }
    });
    
    // Clients without company sheet
    const clientsWithoutCompany = clients.filter(client => !client.company_id);
    if (clientsWithoutCompany.length > 0) {
      const noCompanyData = [
        ['Clients sans compagnie'],
        [''],
        ['Nom du client', 'Email', 'Téléphone', 'Personne de contact', 'Adresse', 'Notes'],
        ...clientsWithoutCompany.map(client => [
          client.name,
          client.email || '',
          client.phone || '',
          client.contact_person || '',
          client.address || '',
          client.notes || ''
        ])
      ];
      
      const noCompanyWS = XLSX.utils.aoa_to_sheet(noCompanyData);
      XLSX.utils.book_append_sheet(wb, noCompanyWS, 'Sans compagnie');
    }
    
    // Generate filename and save
    const filename = `rapport-clients-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  // Export all clients functions
  const exportAllClientsToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Title
    doc.setFontSize(20);
    doc.text("Tous les clients", pageWidth / 2, 20, { align: 'center' });
    
    // Date generated
    doc.setFontSize(12);
    doc.text(`Généré le: ${format(new Date(), 'dd/MM/yyyy')}`, pageWidth / 2, 30, { align: 'center' });
    
    // Summary
    doc.setFontSize(14);
    doc.text('Résumé', 20, 50);
    doc.setFontSize(10);
    doc.text(`Nombre total de clients: ${clients.length}`, 20, 60);
    
    // All clients table
    const allClientsData = clients.map(client => [
      client.name,
      client.companies?.name || 'Aucune compagnie',
      client.email || 'N/A',
      client.phone || 'N/A',
      client.contact_person || 'N/A'
    ]);
    
    autoTable(doc, {
      head: [['Nom du client', 'Compagnie', 'Email', 'Téléphone', 'Contact']],
      body: allClientsData,
      startY: 80,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 }
    });
    
    const filename = `tous-les-clients-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(filename);
  };

  const exportAllClientsToExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // All clients data
    const allClientsData = [
      ['Nom du client', 'Compagnie', 'Email', 'Téléphone', 'Personne de contact', 'Adresse', 'Notes'],
      ...clients.map(client => [
        client.name,
        client.companies?.name || 'Aucune compagnie',
        client.email || '',
        client.phone || '',
        client.contact_person || '',
        client.address || '',
        client.notes || ''
      ])
    ];
    
    const allClientsWS = XLSX.utils.aoa_to_sheet(allClientsData);
    XLSX.utils.book_append_sheet(wb, allClientsWS, 'Tous les clients');
    
    const filename = `tous-les-clients-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  // Export company-specific clients functions
  const exportCompanyClientsToPDF = (company: any) => {
    const companyClients = clients.filter(client => client.company_id === company.id);
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Title
    doc.setFontSize(20);
    doc.text(`Clients de ${company.name}`, pageWidth / 2, 20, { align: 'center' });
    
    // Date generated
    doc.setFontSize(12);
    doc.text(`Généré le: ${format(new Date(), 'dd/MM/yyyy')}`, pageWidth / 2, 30, { align: 'center' });
    
    // Summary
    doc.setFontSize(14);
    doc.text('Résumé', 20, 50);
    doc.setFontSize(10);
    doc.text(`Compagnie: ${company.name}`, 20, 60);
    doc.text(`Nombre de clients: ${companyClients.length}`, 20, 70);
    
    if (companyClients.length > 0) {
      const companyClientsData = companyClients.map(client => [
        client.name,
        client.email || 'N/A',
        client.phone || 'N/A',
        client.contact_person || 'N/A'
      ]);
      
      autoTable(doc, {
        head: [['Nom du client', 'Email', 'Téléphone', 'Contact']],
        body: companyClientsData,
        startY: 90,
        theme: 'striped',
        headStyles: { fillColor: [34, 197, 94] },
        styles: { fontSize: 10 }
      });
    } else {
      doc.text('Aucun client pour cette compagnie', 20, 90);
    }
    
    const filename = `clients-${company.name.replace(/[^a-zA-Z0-9]/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(filename);
  };

  const exportCompanyClientsToExcel = (company: any) => {
    const companyClients = clients.filter(client => client.company_id === company.id);
    
    const wb = XLSX.utils.book_new();
    
    const companyData = [
      [`Clients de ${company.name}`],
      [''],
      [`Généré le: ${format(new Date(), 'dd/MM/yyyy')}`],
      [`Nombre de clients: ${companyClients.length}`],
      [''],
      ['Nom du client', 'Email', 'Téléphone', 'Personne de contact', 'Adresse', 'Notes'],
      ...companyClients.map(client => [
        client.name,
        client.email || '',
        client.phone || '',
        client.contact_person || '',
        client.address || '',
        client.notes || ''
      ])
    ];
    
    const companyWS = XLSX.utils.aoa_to_sheet(companyData);
    XLSX.utils.book_append_sheet(wb, companyWS, 'Clients');
    
    const filename = `clients-${company.name.replace(/[^a-zA-Z0-9]/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  // Export clients without company functions
  const exportClientsWithoutCompanyToPDF = () => {
    const clientsWithoutCompany = clients.filter(client => !client.company_id);
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Title
    doc.setFontSize(20);
    doc.text("Clients sans compagnie", pageWidth / 2, 20, { align: 'center' });
    
    // Date generated
    doc.setFontSize(12);
    doc.text(`Généré le: ${format(new Date(), 'dd/MM/yyyy')}`, pageWidth / 2, 30, { align: 'center' });
    
    // Summary
    doc.setFontSize(14);
    doc.text('Résumé', 20, 50);
    doc.setFontSize(10);
    doc.text(`Nombre de clients sans compagnie: ${clientsWithoutCompany.length}`, 20, 60);
    
    if (clientsWithoutCompany.length > 0) {
      const clientsData = clientsWithoutCompany.map(client => [
        client.name,
        client.email || 'N/A',
        client.phone || 'N/A',
        client.contact_person || 'N/A'
      ]);
      
      autoTable(doc, {
        head: [['Nom du client', 'Email', 'Téléphone', 'Contact']],
        body: clientsData,
        startY: 80,
        theme: 'striped',
        headStyles: { fillColor: [168, 85, 247] },
        styles: { fontSize: 10 }
      });
    } else {
      doc.text('Aucun client sans compagnie', 20, 80);
    }
    
    const filename = `clients-sans-compagnie-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(filename);
  };

  const exportClientsWithoutCompanyToExcel = () => {
    const clientsWithoutCompany = clients.filter(client => !client.company_id);
    
    const wb = XLSX.utils.book_new();
    
    const noCompanyData = [
      ['Clients sans compagnie'],
      [''],
      [`Généré le: ${format(new Date(), 'dd/MM/yyyy')}`],
      [`Nombre de clients: ${clientsWithoutCompany.length}`],
      [''],
      ['Nom du client', 'Email', 'Téléphone', 'Personne de contact', 'Adresse', 'Notes'],
      ...clientsWithoutCompany.map(client => [
        client.name,
        client.email || '',
        client.phone || '',
        client.contact_person || '',
        client.address || '',
        client.notes || ''
      ])
    ];
    
    const noCompanyWS = XLSX.utils.aoa_to_sheet(noCompanyData);
    XLSX.utils.book_append_sheet(wb, noCompanyWS, 'Sans compagnie');
    
    const filename = `clients-sans-compagnie-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const filteredInvoices = useMemo(() => {
    if (!invoices || (!startDate && !endDate)) return [];
    
    return invoices.filter(invoice => {
      // Only show paid invoices
      if (invoice.status !== 'paid') return false;
      
      const invoiceDate = new Date(invoice.issue_date);
      
      if (startDate && invoiceDate < startDate) return false;
      if (endDate && invoiceDate > endDate) return false;
      
      // Apply additional filters
      if (filterType === 'company' && selectedCompanyId) {
        return (invoice as any).clients?.company_id === selectedCompanyId;
      }
      if (filterType === 'client' && selectedClientId) {
        return invoice.client_id === selectedClientId;
      }
      
      return true;
    });
  }, [invoices, startDate, endDate, filterType, selectedCompanyId, selectedClientId]);


  const invoiceStatusData = [
    { status: "Paid", count: 45, color: "#00ff88" },
    { status: "Pending", count: 12, color: "#ffc658" },
    { status: "Overdue", count: 8, color: "#ff7300" },
    { status: "Draft", count: 5, color: "#8884d8" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">
          Business analytics and performance metrics
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="taxes">Taxes</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenus totaux</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboardData ? `$${dashboardData.totalRevenue.toLocaleString('fr-FR')}` : 'Chargement...'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Revenus des factures payées
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Factures en attente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboardData ? dashboardData.openInvoicesCount : 'Chargement...'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {dashboardData ? `$${dashboardData.openInvoicesTotal.toLocaleString('fr-FR')} en attente` : ''}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clients actifs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboardData ? dashboardData.activeClients : 'Chargement...'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {dashboardData ? `${dashboardData.newClientsThisMonth} nouveaux ce mois` : ''}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Produits actifs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboardData ? dashboardData.activeProducts : 'Chargement...'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Produits disponibles
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-1">
            <Card>
              <CardHeader>
                <CardTitle>Activité récente</CardTitle>
                <CardDescription>Les dernières activités de votre entreprise</CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardData && dashboardData.recentActivity.length > 0 ? (
                  <div className="space-y-4">
                    {dashboardData.recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{activity.message}</p>
                          <p className="text-xs text-muted-foreground">{activity.timeAgo}</p>
                        </div>
                        {activity.amount && (
                          <div className={`text-sm font-semibold ${activity.color === 'green' ? 'text-green-600' : activity.color === 'orange' ? 'text-orange-600' : 'text-blue-600'}`}>
                            {activity.amount}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    {dashboardData ? 'Aucune activité récente' : 'Chargement...'}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-2xl font-bold">Revenue by Period</h2>
              <p className="text-muted-foreground">Analyze revenue by custom date range, month, or year</p>
            </div>

            <Tabs defaultValue="custom" className="w-full" onValueChange={(value) => {
              setActiveTab(value);
            }}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="custom">Custom Date Range</TabsTrigger>
                <TabsTrigger value="month">By Month</TabsTrigger>
                <TabsTrigger value="year">By Year</TabsTrigger>
              </TabsList>
              
              <TabsContent value="custom" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Custom Date Range</CardTitle>
                    <CardDescription>Select a specific date range for revenue analysis</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <DateRangePicker
                      startDate={customStartDate}
                      endDate={customEndDate}
                      onStartDateChange={setCustomStartDate}
                      onEndDateChange={setCustomEndDate}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="filter-type">Filter by</Label>
                        <Select value={filterType} onValueChange={(value: 'all' | 'company' | 'client') => {
                          setFilterType(value);
                          setSelectedCompanyId('');
                          setSelectedClientId('');
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select filter" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Data</SelectItem>
                            <SelectItem value="company">By Company</SelectItem>
                            <SelectItem value="client">By Client</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {filterType === 'company' && (
                        <div className="space-y-2">
                          <Label htmlFor="company-select">Company</Label>
                          <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select company" />
                            </SelectTrigger>
                            <SelectContent>
                              {companies.map(company => (
                                <SelectItem key={company.id} value={company.id}>
                                  {company.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      
                      {filterType === 'client' && (
                        <div className="space-y-2">
                          <Label htmlFor="client-select">Client</Label>
                          <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select client" />
                            </SelectTrigger>
                            <SelectContent>
                              {clients.map(client => (
                                <SelectItem key={client.id} value={client.id}>
                                  {client.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="month" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Revenue</CardTitle>
                    <CardDescription>Select a specific month to view revenue data</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <MonthYearPicker
                      selectedDate={selectedMonth}
                      onDateChange={(date) => {
                        setSelectedMonth(date);
                        setViewMode('monthly');
                      }}
                      mode="month"
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="filter-type">Filter by</Label>
                        <Select value={filterType} onValueChange={(value: 'all' | 'company' | 'client') => {
                          setFilterType(value);
                          setSelectedCompanyId('');
                          setSelectedClientId('');
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select filter" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Data</SelectItem>
                            <SelectItem value="company">By Company</SelectItem>
                            <SelectItem value="client">By Client</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {filterType === 'company' && (
                        <div className="space-y-2">
                          <Label htmlFor="company-select">Company</Label>
                          <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select company" />
                            </SelectTrigger>
                            <SelectContent>
                              {companies.map(company => (
                                <SelectItem key={company.id} value={company.id}>
                                  {company.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      
                      {filterType === 'client' && (
                        <div className="space-y-2">
                          <Label htmlFor="client-select">Client</Label>
                          <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select client" />
                            </SelectTrigger>
                            <SelectContent>
                              {clients.map(client => (
                                <SelectItem key={client.id} value={client.id}>
                                  {client.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="year" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Yearly Revenue</CardTitle>
                    <CardDescription>Select a specific year to view revenue data or a year range</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <div>
                        <Label>Option 1: Sélectionner une année spécifique</Label>
                        <MonthYearPicker
                          selectedDate={selectedYear}
                          onDateChange={(date) => {
                            setSelectedYear(date);
                            setViewMode('yearly');
                            // Clear year range when selecting specific year
                            setYearRangeStart(undefined);
                            setYearRangeEnd(undefined);
                          }}
                          mode="year"
                        />
                      </div>
                      
                      <div className="border-t pt-4">
                        <Label>Option 2: Sélectionner une plage d'années</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                          <div className="space-y-2">
                            <Label>Année de début</Label>
                            <MonthYearPicker
                              selectedDate={yearRangeStart}
                              onDateChange={(date) => {
                                setYearRangeStart(date);
                                setViewMode('yearly');
                                // Clear specific year when selecting range
                                setSelectedYear(undefined);
                              }}
                              mode="year"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Année de fin</Label>
                            <MonthYearPicker
                              selectedDate={yearRangeEnd}
                              onDateChange={(date) => {
                                setYearRangeEnd(date);
                                setViewMode('yearly');
                                // Clear specific year when selecting range
                                setSelectedYear(undefined);
                              }}
                              mode="year"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="filter-type">Filter by</Label>
                        <Select value={filterType} onValueChange={(value: 'all' | 'company' | 'client') => {
                          setFilterType(value);
                          setSelectedCompanyId('');
                          setSelectedClientId('');
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select filter" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Data</SelectItem>
                            <SelectItem value="company">By Company</SelectItem>
                            <SelectItem value="client">By Client</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {filterType === 'company' && (
                        <div className="space-y-2">
                          <Label htmlFor="company-select">Company</Label>
                          <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select company" />
                            </SelectTrigger>
                            <SelectContent>
                              {companies.map(company => (
                                <SelectItem key={company.id} value={company.id}>
                                  {company.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      
                      {filterType === 'client' && (
                        <div className="space-y-2">
                          <Label htmlFor="client-select">Client</Label>
                          <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select client" />
                            </SelectTrigger>
                            <SelectContent>
                              {clients.map(client => (
                                <SelectItem key={client.id} value={client.id}>
                                  {client.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Boutons Clear spécifiques à chaque onglet */}
            {activeTab === 'custom' && (customStartDate || customEndDate) && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCustomStartDate(undefined);
                    setCustomEndDate(undefined);
                  }}
                >
                  Clear Custom Range
                </Button>
              </div>
            )}

            {activeTab === 'month' && selectedMonth && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedMonth(undefined);
                  }}
                >
                  Clear Month
                </Button>
              </div>
            )}

            {activeTab === 'year' && (selectedYear || yearRangeStart || yearRangeEnd) && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedYear(undefined);
                    setYearRangeStart(undefined);
                    setYearRangeEnd(undefined);
                  }}
                >
                  Clear Year Selection
                </Button>
              </div>
            )}
          </div>

          {loading && (
            <Card>
              <CardContent className="flex justify-center items-center h-96">
                <p>Loading data...</p>
              </CardContent>
            </Card>
          )}

          {error && (
            <Card>
              <CardContent className="flex justify-center items-center h-96">
                <p className="text-destructive">Error: {error}</p>
              </CardContent>
            </Card>
          )}

          {!loading && !error && realRevenueData && (startDate || endDate) && (
            <>
              {/* Export buttons */}
              <div className="flex justify-end gap-2 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToPDF}
                  disabled={!realRevenueData || !chartData.length}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToExcel}
                  disabled={!realRevenueData || !chartData.length}
                  className="flex items-center gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Export Excel
                </Button>
              </div>

              {/* Statistics Cards */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {new Intl.NumberFormat('en-US').format(realRevenueData.totalRevenue)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Paid invoices only
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Number of {viewMode === 'monthly' ? 'months' : 'years'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {viewMode === 'monthly' ? realRevenueData.monthlyData.length : realRevenueData.yearlyData.length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      With revenue
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Average Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {new Intl.NumberFormat('en-US').format(
                        realRevenueData.totalRevenue / 
                        Math.max(1, viewMode === 'monthly' ? realRevenueData.monthlyData.length : realRevenueData.yearlyData.length)
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Per {viewMode === 'monthly' ? 'month' : 'year'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Bouton de téléchargement des graphiques */}
              {chartData.length > 0 && (
                <div className="flex justify-end mb-4">
                  <Button onClick={downloadChartsAsPDF} variant="outline" className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Télécharger les graphiques (PDF)
                  </Button>
                </div>
              )}

              {/* Graphiques des revenus */}
              {chartData.length > 0 && (
                <div className="space-y-4 mb-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Évolution des revenus par {viewMode === 'monthly' ? 'mois' : 'année'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div ref={barChartRef}>
                        <BarChart width={600} height={300} data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="period" />
                          <YAxis />
                          <Tooltip formatter={(value) => [`${Number(value).toLocaleString('fr-FR')} $`, 'Revenus']} />
                          <Bar dataKey="revenue" fill="#22c55e" />
                        </BarChart>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Tendance des revenus</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div ref={lineChartRef}>
                        <LineChart width={600} height={300} data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="period" />
                          <YAxis />
                          <Tooltip formatter={(value) => [`${Number(value).toLocaleString('fr-FR')} $`, 'Revenus']} />
                          <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} />
                        </LineChart>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}


              {/* Detailed Table */}
              {chartData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Details by Period</CardTitle>
                    <CardDescription>
                      Detailed data by {viewMode === 'monthly' ? 'month' : 'year'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">Period</th>
                            <th className="text-right py-2">Revenue</th>
                            <th className="text-right py-2">Number of Invoices</th>
                            <th className="text-right py-2">Average Revenue per Invoice</th>
                          </tr>
                        </thead>
                        <tbody>
                          {chartData.map((item, index) => (
                            <tr key={index} className="border-b">
                              <td className="py-2">{item.period}</td>
                              <td className="text-right py-2 font-medium">
                                {new Intl.NumberFormat('en-US').format(item.revenue)}
                              </td>
                              <td className="text-right py-2">{item.invoiceCount}</td>
                              <td className="text-right py-2">
                                {new Intl.NumberFormat('en-US').format(item.revenue / item.invoiceCount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Invoices Table */}
              {filteredInvoices.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Invoices List</CardTitle>
                    <CardDescription>
                      Detailed list of paid invoices in the selected period
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice Number</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead>Issue Date</TableHead>
                          <TableHead className="text-right">Total Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredInvoices.map((invoice) => (
                          <TableRow key={invoice.id}>
                            <TableCell className="font-medium">
                              {invoice.invoice_number}
                            </TableCell>
                            <TableCell>
                              {(invoice as any).clients?.name || 'N/A'}
                            </TableCell>
                            <TableCell>
                              {format(new Date(invoice.issue_date), 'MMM dd, yyyy')}
                            </TableCell>
                            <TableCell className="text-right">
                              {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'USD'
                              }).format(Number(invoice.total))}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {chartData.length === 0 && (
                <Card>
                  <CardContent className="flex justify-center items-center h-96">
                    <div className="text-center">
                      <p className="text-lg font-medium">No revenue data</p>
                      <p className="text-muted-foreground">
                        Create and pay some invoices to see data appear here.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {!loading && !error && (!startDate && !endDate) && (
            <Card>
              <CardContent className="flex justify-center items-center h-96">
                <div className="text-center">
                  <p className="text-lg font-medium">No period selected</p>
                  <p className="text-muted-foreground">
                    Please select a date range, month, or year to view revenue data.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="clients" className="space-y-4">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Rapport des clients</h2>
                <p className="text-muted-foreground">Liste des clients par compagnie et statistiques</p>
              </div>
              
              <div className="flex space-x-2">
                <Button onClick={exportClientsToPDF} variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  PDF
                </Button>
                <Button onClick={exportClientsToExcel} variant="outline" size="sm">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Excel
                </Button>
              </div>
            </div>

            {/* Filtre par date de création */}
            <Card>
              <CardHeader>
                <CardTitle>Filtres</CardTitle>
                <CardDescription>Filtrer les clients par date de création</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date de création (du)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !createdFromDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {createdFromDate ? format(createdFromDate, "dd/MM/yyyy") : "Sélectionner une date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={createdFromDate}
                          onSelect={setCreatedFromDate}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Date de création (au)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !createdToDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {createdToDate ? format(createdToDate, "dd/MM/yyyy") : "Sélectionner une date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={createdToDate}
                          onSelect={setCreatedToDate}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                {(createdFromDate || createdToDate) && (
                  <div className="flex justify-end mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCreatedFromDate(undefined);
                        setCreatedToDate(undefined);
                      }}
                    >
                      Effacer les filtres
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6">
              {/* Section: Tous les clients */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Tous les clients</CardTitle>
                      <CardDescription>Liste complète de tous les clients</CardDescription>
                    </div>
                    <div className="flex space-x-2">
                      <Button onClick={exportAllClientsToPDF} variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        PDF
                      </Button>
                      <Button onClick={exportAllClientsToExcel} variant="outline" size="sm">
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Excel
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom du client</TableHead>
                        <TableHead>Compagnie</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Téléphone</TableHead>
                        <TableHead>Personne de contact</TableHead>
                        <TableHead>Date de création</TableHead>
                        <TableHead>Dernière facture</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClientsByDate.map((client) => (
                        <TableRow key={client.id}>
                          <TableCell className="font-medium">{client.name}</TableCell>
                          <TableCell>{client.companies?.name || 'Aucune compagnie'}</TableCell>
                          <TableCell>{client.email || 'N/A'}</TableCell>
                          <TableCell>{client.phone || 'N/A'}</TableCell>
                          <TableCell>{client.contact_person || 'N/A'}</TableCell>
                          <TableCell>
                            {format(new Date(client.created_at), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell>
                            {getLastInvoiceDate(client.id) 
                              ? format(new Date(getLastInvoiceDate(client.id)!), 'dd/MM/yyyy')
                              : 'Aucune facture'
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredClientsByDate.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground">
                            Aucun client trouvé pour cette période
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Section: Clients par compagnie */}
              <Card>
                <CardHeader>
                  <CardTitle>Clients par compagnie</CardTitle>
                  <CardDescription>Répartition des clients selon leurs compagnies</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {companies.map((company) => {
                      const companyClients = filteredClientsByDate.filter(client => client.company_id === company.id);
                      
                      return (
                        <div key={company.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h3 className="font-semibold text-lg">{company.name}</h3>
                              <span className="text-sm text-muted-foreground">
                                {companyClients.length} client{companyClients.length > 1 ? 's' : ''}
                              </span>
                            </div>
                            <div className="flex space-x-2">
                              <Button onClick={() => exportCompanyClientsToPDF(company)} variant="outline" size="sm">
                                <Download className="w-4 h-4 mr-2" />
                                PDF
                              </Button>
                              <Button onClick={() => exportCompanyClientsToExcel(company)} variant="outline" size="sm">
                                <FileSpreadsheet className="w-4 h-4 mr-2" />
                                Excel
                              </Button>
                            </div>
                          </div>
                          
                          {companyClients.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Nom du client</TableHead>
                                  <TableHead>Email</TableHead>
                                  <TableHead>Téléphone</TableHead>
                                  <TableHead>Personne de contact</TableHead>
                                  <TableHead>Date de création</TableHead>
                                  <TableHead>Dernière facture</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {companyClients.map((client) => (
                                  <TableRow key={client.id}>
                                    <TableCell className="font-medium">{client.name}</TableCell>
                                    <TableCell>{client.email || 'N/A'}</TableCell>
                                    <TableCell>{client.phone || 'N/A'}</TableCell>
                                    <TableCell>{client.contact_person || 'N/A'}</TableCell>
                                    <TableCell>
                                      {format(new Date(client.created_at), 'dd/MM/yyyy')}
                                    </TableCell>
                                    <TableCell>
                                      {getLastInvoiceDate(client.id) 
                                        ? format(new Date(getLastInvoiceDate(client.id)!), 'dd/MM/yyyy')
                                        : 'Aucune facture'
                                      }
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <p className="text-muted-foreground text-sm">Aucun client associé à cette compagnie</p>
                          )}
                        </div>
                      );
                    })}
                    
                    {/* Clients sans compagnie */}
                    {(() => {
                      const clientsWithoutCompany = filteredClientsByDate.filter(client => !client.company_id);
                      
                      return clientsWithoutCompany.length > 0 && (
                        <div className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h3 className="font-semibold text-lg">Clients sans compagnie assignée</h3>
                              <span className="text-sm text-muted-foreground">
                                {clientsWithoutCompany.length} client{clientsWithoutCompany.length > 1 ? 's' : ''}
                              </span>
                            </div>
                            <div className="flex space-x-2">
                              <Button onClick={exportClientsWithoutCompanyToPDF} variant="outline" size="sm">
                                <Download className="w-4 h-4 mr-2" />
                                PDF
                              </Button>
                              <Button onClick={exportClientsWithoutCompanyToExcel} variant="outline" size="sm">
                                <FileSpreadsheet className="w-4 h-4 mr-2" />
                                Excel
                              </Button>
                            </div>
                          </div>
                          
                          <Table>
                            <TableHeader>
                            <TableRow>
                              <TableHead>Nom du client</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Téléphone</TableHead>
                              <TableHead>Personne de contact</TableHead>
                              <TableHead>Date de création</TableHead>
                              <TableHead>Dernière facture</TableHead>
                            </TableRow>
                          </TableHeader>
                            <TableBody>
                              {clientsWithoutCompany.map((client) => (
                                <TableRow key={client.id}>
                                  <TableCell className="font-medium">{client.name}</TableCell>
                                  <TableCell>{client.email || 'N/A'}</TableCell>
                                  <TableCell>{client.phone || 'N/A'}</TableCell>
                                  <TableCell>{client.contact_person || 'N/A'}</TableCell>
                                  <TableCell>
                                    {format(new Date(client.created_at), 'dd/MM/yyyy')}
                                  </TableCell>
                                  <TableCell>
                                    {getLastInvoiceDate(client.id) 
                                      ? format(new Date(getLastInvoiceDate(client.id)!), 'dd/MM/yyyy')
                                      : 'Aucune facture'
                                    }
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="taxes" className="space-y-4">
          <div className="grid gap-4">
            {/* Filtres pour le rapport de taxes */}
            <Card>
              <CardHeader>
                <CardTitle>Filtres du rapport de taxes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Filtre par compagnie */}
                  <div className="space-y-2">
                    <Label>Compagnie</Label>
                    <Select value={taxSelectedCompany} onValueChange={setTaxSelectedCompany}>
                      <SelectTrigger>
                        <SelectValue placeholder="Toutes les compagnies" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes les compagnies</SelectItem>
                        {companies.map(company => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Filtre de période */}
                  <div className="space-y-2">
                    <Label>Type de période</Label>
                    <Select value={taxDateFilter} onValueChange={(value: 'custom' | 'month' | 'year') => setTaxDateFilter(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom">Dates personnalisées</SelectItem>
                        <SelectItem value="month">Par mois</SelectItem>
                        <SelectItem value="year">Par année</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Mode d'affichage */}
                  <div className="space-y-2">
                    <Label>Affichage</Label>
                    <Select value={taxViewMode} onValueChange={(value: 'monthly' | 'yearly') => setTaxViewMode(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Mensuel</SelectItem>
                        <SelectItem value="yearly">Annuel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Sélection de dates selon le type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {taxDateFilter === 'custom' && (
                    <>
                      <div className="space-y-2">
                        <Label>Date de début</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !taxStartDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {taxStartDate ? format(taxStartDate, "dd/MM/yyyy") : "Sélectionner"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={taxStartDate}
                              onSelect={setTaxStartDate}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-2">
                        <Label>Date de fin</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !taxEndDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {taxEndDate ? format(taxEndDate, "dd/MM/yyyy") : "Sélectionner"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={taxEndDate}
                              onSelect={setTaxEndDate}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </>
                  )}
                  
                  {taxDateFilter === 'month' && (
                    <div className="space-y-2">
                      <Label>Mois</Label>
                      <MonthYearPicker
                        selectedDate={taxSelectedMonth}
                        onDateChange={setTaxSelectedMonth}
                        mode="month"
                      />
                    </div>
                  )}
                  
                  {taxDateFilter === 'year' && (
                    <div className="space-y-2">
                      <Label>Année</Label>
                      <MonthYearPicker
                        selectedDate={taxSelectedYear}
                        onDateChange={setTaxSelectedYear}
                        mode="year"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Résumé des taxes */}
            {taxData && taxData.totalTaxAmount > 0 && (
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Résumé des taxes</CardTitle>
                    <CardDescription>
                      {taxSelectedCompany && taxSelectedCompany !== 'all'
                        ? `Compagnie: ${companies.find(c => c.id === taxSelectedCompany)?.name}`
                        : 'Toutes les compagnies'
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Total général des taxes</p>
                        <div className="text-3xl font-bold text-primary">
                          {taxData.totalTaxAmount.toLocaleString('fr-FR', { 
                            style: 'currency', 
                            currency: 'CAD' 
                          })}
                        </div>
                      </div>
                      
                      <div className="border-t pt-4">
                        <h4 className="text-lg font-semibold mb-4">Total par type de taxe</h4>
                        <div className="space-y-3">
                          {taxData.taxSummary.map((tax, index) => (
                            <div key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                              <div>
                                <span className="font-medium text-base">{tax.name}</span>
                                <p className="text-sm text-muted-foreground">
                                  {tax.invoiceCount} facture{tax.invoiceCount > 1 ? 's' : ''}
                                </p>
                              </div>
                              <div className="text-right">
                                <span className="text-xl font-semibold">
                                  {tax.amount.toLocaleString('fr-FR', { 
                                    style: 'currency', 
                                    currency: 'CAD' 
                                  })}
                                </span>
                                <p className="text-sm text-muted-foreground">
                                  {((tax.amount / taxData.totalTaxAmount) * 100).toFixed(1)}%
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Graphique circulaire */}
                <Card>
                  <CardHeader>
                    <CardTitle>Répartition des taxes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PieChart width={400} height={250}>
                      <Pie
                        data={taxData.taxSummary || []}
                        dataKey="amount"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {(taxData.taxSummary || []).map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={`hsl(${index * 45}, 70%, 60%)`} 
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [
                          value.toLocaleString('fr-FR', { style: 'currency', currency: 'CAD' }),
                          'Montant'
                        ]}
                      />
                    </PieChart>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Graphique des taxes par période */}
            {taxData && taxData.totalTaxAmount > 0 && (taxViewMode === 'monthly' ? taxData.monthlyData.length > 0 : taxData.yearlyData.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle>Évolution des taxes par {taxViewMode === 'monthly' ? 'mois' : 'année'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <BarChart 
                    width={800} 
                    height={400}
                    data={taxViewMode === 'monthly' ? taxData.monthlyData : taxData.yearlyData}
                    key={`${taxViewMode}-${taxData.monthlyData.length}-${taxData.yearlyData.length}`}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => [
                        value.toLocaleString('fr-FR', { style: 'currency', currency: 'CAD' }),
                        'Montant des taxes'
                      ]}
                    />
                    <Bar dataKey="totalTaxAmount" fill="#8884d8" />
                  </BarChart>
                </CardContent>
              </Card>
            )}

            {/* Message si aucune donnée de taxes */}
            {taxData && taxData.totalTaxAmount === 0 && (
              <Card>
                <CardContent className="flex justify-center items-center h-96">
                  <div className="text-center">
                    <p className="text-lg font-medium">Aucune donnée de taxes</p>
                    <p className="text-muted-foreground">
                      Aucune facture payée avec taxes trouvée pour cette période.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tableau résumé des taxes */}
            {taxData && taxData.taxSummary && taxData.taxSummary.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Résumé des taxes collectées</CardTitle>
                  <CardDescription>Vue d'ensemble des taxes par type</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type de taxe</TableHead>
                        <TableHead>Montant total</TableHead>
                        <TableHead>Nombre de factures</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {taxData.taxSummary.map((tax, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{tax.name}</TableCell>
                          <TableCell>
                            {tax.amount.toLocaleString('fr-FR', { 
                              style: 'currency', 
                              currency: 'CAD' 
                            })}
                          </TableCell>
                          <TableCell>{tax.invoiceCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Tableau détaillé des taxes par période */}
            {taxData && (
              <Card>
                <CardHeader>
                  <CardTitle>Détail des taxes par {taxViewMode === 'monthly' ? 'mois' : 'année'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Période</TableHead>
                        <TableHead>Total taxes</TableHead>
                        <TableHead>Factures</TableHead>
                        <TableHead>Détail par taxe</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(taxViewMode === 'monthly' ? taxData.monthlyData : taxData.yearlyData).map((period) => (
                        <TableRow key={period.period}>
                          <TableCell className="font-medium">{period.period}</TableCell>
                          <TableCell>
                            {period.totalTaxAmount.toLocaleString('fr-FR', { 
                              style: 'currency', 
                              currency: 'CAD' 
                            })}
                          </TableCell>
                          <TableCell>{period.invoiceCount}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {period.taxBreakdown.map((tax, index) => (
                                <div key={index} className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">{tax.name}:</span>
                                  <span>
                                    {tax.amount.toLocaleString('fr-FR', { 
                                      style: 'currency', 
                                      currency: 'CAD' 
                                    })}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Export buttons */}
            {taxData && (
              <Card>
                <CardHeader>
                  <CardTitle>Téléchargement</CardTitle>
                  <CardDescription>Exporter le rapport de taxes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button onClick={exportTaxesToPDF} variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      PDF
                    </Button>
                    <Button onClick={exportTaxesToExcel} variant="outline" size="sm">
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Excel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Status Overview</CardTitle>
              <CardDescription>Current invoice status distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={invoiceStatusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8">
                    {invoiceStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
