
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useReports } from "@/hooks/useReports";
import { useTaxReports } from "@/hooks/useTaxReports";
import { useSalesReport } from "@/hooks/useSalesReport";
import { useProductProfit } from "@/hooks/useProductProfit";
import { useExpenseReports } from "@/hooks/useExpenseReports";
import { useInvoices } from "@/hooks/useInvoices";
import { useCompanies } from "@/hooks/useCompanies";
import { useClients } from "@/hooks/useClients";
import { useDashboard } from "@/hooks/useDashboard";
import { useProducts } from "@/hooks/useProducts";
import { useLanguage } from "@/hooks/useLanguage";
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
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');
  const [activeTab, setActiveTab] = useState('custom');
  
  // Refs pour capturer les graphiques
  const barChartRef = useRef<HTMLDivElement>(null);
  const lineChartRef = useRef<HTMLDivElement>(null);
  const expenseCategoryChartRef = useRef<HTMLDivElement>(null);
  const expenseCompanyChartRef = useRef<HTMLDivElement>(null);
  const productProfitChartRef = useRef<HTMLDivElement>(null);
  const stockChartRef = useRef<HTMLDivElement>(null);
  const salesProductChartRef = useRef<HTMLDivElement>(null);
  const salesServiceChartRef = useRef<HTMLDivElement>(null);
  
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
  const { profitData, loading: profitLoading } = useProductProfit(customStartDate, customEndDate);
  const { salesData, loading: salesLoading } = useSalesReport(customStartDate, customEndDate);
  const { invoices } = useInvoices();
  const { companies } = useCompanies();
  const { clients } = useClients();
  const { data: dashboardData } = useDashboard();
  const { products: allProducts } = useProducts();
  
  // États pour les filtres de la section Products
  const [productFilterType, setProductFilterType] = useState<'all' | 'company'>('all');
  const [productSelectedCompanyId, setProductSelectedCompanyId] = useState<string>('');
  
  // États pour les filtres de la section Expenses
  const [expenseFilterType, setExpenseFilterType] = useState<'all' | 'company' | 'category'>('all');
  const [expenseSelectedCompanyId, setExpenseSelectedCompanyId] = useState<string>('');
  const [expenseSelectedCategory, setExpenseSelectedCategory] = useState<string>('');
  const [expenseStartDate, setExpenseStartDate] = useState<Date | undefined>();
  const [expenseEndDate, setExpenseEndDate] = useState<Date | undefined>();
  
  const { reportData: expenseReportData, loading: expenseLoading } = useExpenseReports(
    expenseStartDate, 
    expenseEndDate, 
    expenseFilterType, 
    expenseFilterType === 'company' ? expenseSelectedCompanyId : expenseSelectedCategory
  );
  
  // Filter to show only physical products (exclude services)
  const products = useMemo(() => {
    return allProducts?.filter(product => {
      // More precise filtering - exclude services based on category and unit
      const isService = 
        product.category?.toLowerCase().includes('design') ||
        product.category?.toLowerCase().includes('service') ||
        product.category?.toLowerCase().includes('consultation') ||
        product.category?.toLowerCase().includes('formation') ||
        product.unit?.toLowerCase().includes('heure') ||
        product.unit?.toLowerCase().includes('hour') ||
        product.unit?.toLowerCase().includes('session');
      
      return !isService;
    }) || [];
  }, [allProducts]);

  // Filter profit data to show only physical products and optionally by company
  const filteredProfitData = useMemo(() => {
    if (!profitData) return null;
    
    const productIds = new Set(products.map(p => p.id));
    
    // Filter by company if specified
    if (productFilterType === 'company' && productSelectedCompanyId && invoices) {
      // Get invoices for this company
      const companyInvoices = invoices.filter((invoice: any) => 
        invoice.clients?.company_id === productSelectedCompanyId && invoice.status === 'paid'
      );
      
      if (companyInvoices.length === 0) {
        // No invoices for this company, return empty data
        return {
          totalProfit: 0,
          totalRevenue: 0,
          totalCost: 0,
          overallMargin: 0,
          products: []
        };
      }
      
      // Recalculate profit data for this specific company only
      const companyProductData = new Map<string, {
        product_name: string;
        total_quantity_sold: number;
        total_revenue: number;
        total_cost: number;
      }>();
      
      // Process invoices for this company
      companyInvoices.forEach((invoice: any) => {
        invoice.invoice_items?.forEach((item: any) => {
          if (!productIds.has(item.product_id)) return;
          
          const product = products.find(p => p.id === item.product_id);
          if (!product) return;
          
          const revenue = Number(item.total) || 0;
          const quantity = Number(item.quantity) || 0;
          const cost = (Number(product.cost) || 0) * quantity;
          
          if (companyProductData.has(item.product_id)) {
            const existing = companyProductData.get(item.product_id)!;
            companyProductData.set(item.product_id, {
              product_name: existing.product_name,
              total_quantity_sold: existing.total_quantity_sold + quantity,
              total_revenue: existing.total_revenue + revenue,
              total_cost: existing.total_cost + cost
            });
          } else {
            companyProductData.set(item.product_id, {
              product_name: product.name,
              total_quantity_sold: quantity,
              total_revenue: revenue,
              total_cost: cost
            });
          }
        });
      });
      
      // Convert to ProductProfitData format
      const filteredProducts = Array.from(companyProductData.entries()).map(([productId, data]) => ({
        product_id: productId,
        product_name: data.product_name,
        total_quantity_sold: data.total_quantity_sold,
        total_revenue: data.total_revenue,
        total_cost: data.total_cost,
        total_profit: data.total_revenue - data.total_cost,
        profit_margin: data.total_revenue > 0 ? ((data.total_revenue - data.total_cost) / data.total_revenue) * 100 : 0,
        average_sale_price: data.total_quantity_sold > 0 ? data.total_revenue / data.total_quantity_sold : 0,
        average_cost_price: data.total_quantity_sold > 0 ? data.total_cost / data.total_quantity_sold : 0
      }));
      
      const totalProfit = filteredProducts.reduce((sum, product) => sum + product.total_profit, 0);
      const totalRevenue = filteredProducts.reduce((sum, product) => sum + product.total_revenue, 0);
      const totalCost = filteredProducts.reduce((sum, product) => sum + product.total_cost, 0);
      const overallMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
      
      return {
        totalProfit,
        totalRevenue,
        totalCost,
        overallMargin,
        products: filteredProducts
      };
    }
    
    // No company filter, just filter by physical products
    const filteredProducts = profitData.products.filter(p => productIds.has(p.product_id));
    const totalProfit = filteredProducts.reduce((sum, product) => sum + product.total_profit, 0);
    const totalRevenue = filteredProducts.reduce((sum, product) => sum + product.total_revenue, 0);
    const totalCost = filteredProducts.reduce((sum, product) => sum + product.total_cost, 0);
    const overallMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    
    return {
      totalProfit,
      totalRevenue,
      totalCost,
      overallMargin,
      products: filteredProducts
    };
  }, [profitData, products, productFilterType, productSelectedCompanyId, invoices]);
  
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

  // Export functions for products
  const exportProductsToPDF = async () => {
    if (!products || products.length === 0) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Title
    doc.setFontSize(20);
    doc.text('Inventory Report', pageWidth / 2, 20, { align: 'center' });
    
    // Summary
    doc.setFontSize(12);
    const totalProducts = products.length;
    const activeProducts = products.filter(p => p.is_active).length;
    const lowStockProducts = products.filter(p => (p.quantity || 0) <= 5 && p.is_active).length;
    const totalInventoryValue = products.reduce((total, p) => total + ((p.quantity || 0) * (p.cost || 0)), 0);
    
    doc.text(`Report date: ${format(new Date(), 'dd/MM/yyyy')}`, 20, 40);
    doc.text(`Total products: ${totalProducts}`, 20, 50);
    doc.text(`Active products: ${activeProducts}`, 20, 60);
    doc.text(`Low stock alerts: ${lowStockProducts}`, 20, 70);
    doc.text(`Total inventory value: $${totalInventoryValue.toFixed(2)}`, 20, 80);
    
    let yPosition = 100;
    
    try {
      // Capture Stock Chart
      if (stockChartRef.current && products.length > 0) {
        const chartCanvas = await html2canvas(stockChartRef.current, {
          backgroundColor: '#ffffff',
          scale: 1,
          useCORS: true
        });
        const chartImgData = chartCanvas.toDataURL('image/png');
        
        doc.setFontSize(14);
        doc.text('Stock Levels Chart', 20, yPosition);
        yPosition += 10;
        
        const imgWidth = pageWidth - 40;
        const imgHeight = (chartCanvas.height * imgWidth) / chartCanvas.width;
        
        doc.addImage(chartImgData, 'PNG', 20, yPosition, imgWidth, imgHeight);
        yPosition += imgHeight + 20;
        
        // Check if we need a new page for the table
        if (yPosition > 200) {
          doc.addPage();
          yPosition = 20;
        }
      }
    } catch (error) {
      console.error('Error capturing stock chart:', error);
    }
    
    // Products table
    const tableData = products.map(product => {
      const margin = product.price && product.cost ? 
        ((product.price - product.cost) / product.price * 100).toFixed(1) + '%' : '0.0%';
      const stockValue = ((product.quantity || 0) * (product.cost || 0)).toFixed(2);
      
      return [
        product.name,
        product.sku || '-',
        product.category || '-',
        (product.quantity || 0).toString(),
        '$' + (product.cost || 0).toFixed(2),
        '$' + (product.price || 0).toFixed(2),
        margin,
        '$' + stockValue,
        product.is_active ? 'Active' : 'Inactive'
      ];
    });
    
    autoTable(doc, {
      head: [['Name', 'SKU', 'Category', 'Quantity', 'Cost', 'Price', 'Margin', 'Stock Value', 'Status']],
      body: tableData,
      startY: yPosition,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 139, 202] },
    });
    
    const filename = `inventory-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(filename);
  };

  const exportProductsToExcel = () => {
    if (!products || products.length === 0) return;
    
    const wb = XLSX.utils.book_new();
    
    // Summary sheet
    const totalProducts = products.length;
    const activeProducts = products.filter(p => p.is_active).length;
    const lowStockProducts = products.filter(p => (p.quantity || 0) <= 5 && p.is_active).length;
    const totalInventoryValue = products.reduce((total, p) => total + ((p.quantity || 0) * (p.cost || 0)), 0);
    
    const summaryData = [
      ['Inventory Report'],
      [''],
      ['Report date:', format(new Date(), 'dd/MM/yyyy')],
      ['Total products:', totalProducts],
      ['Active products:', activeProducts],
      ['Low stock alerts:', lowStockProducts],
      ['Total inventory value:', '$' + totalInventoryValue.toFixed(2)],
    ];
    
    const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWS, 'Summary');
    
    // Products detail sheet
    const productsData = [
      ['Name', 'SKU', 'Category', 'Quantity', 'Cost', 'Price', 'Margin (%)', 'Stock Value', 'Status'],
      ...products.map(product => {
        const margin = product.price && product.cost ? 
          ((product.price - product.cost) / product.price * 100).toFixed(1) : '0.0';
        const stockValue = ((product.quantity || 0) * (product.cost || 0)).toFixed(2);
        
        return [
          product.name,
          product.sku || '-',
          product.category || '-',
          product.quantity || 0,
          product.cost || 0,
          product.price || 0,
          parseFloat(margin),
          parseFloat(stockValue),
          product.is_active ? 'Active' : 'Inactive'
        ];
      })
    ];
    
    const productsWS = XLSX.utils.aoa_to_sheet(productsData);
    XLSX.utils.book_append_sheet(wb, productsWS, 'Product Details');
    
    const filename = `inventory-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
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

  // Export functions for expenses
  const exportExpensesToPDF = async () => {
    if (!expenseReportData) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Title
    doc.setFontSize(20);
    doc.text('Expense Report', pageWidth / 2, 20, { align: 'center' });
    
    // Date range
    doc.setFontSize(12);
    let dateRangeText = 'Date generated: ' + format(new Date(), 'dd/MM/yyyy');
    if (expenseStartDate && expenseEndDate) {
      dateRangeText = `Period: ${format(expenseStartDate, 'dd/MM/yyyy')} - ${format(expenseEndDate, 'dd/MM/yyyy')}`;
    }
    doc.text(dateRangeText, pageWidth / 2, 35, { align: 'center' });
    
    // Summary
    doc.setFontSize(14);
    doc.text('Summary', 20, 55);
    doc.setFontSize(12);
    doc.text(`Total Expenses: $${expenseReportData.totalExpenses.toFixed(2)}`, 20, 70);
    doc.text(`Paid Expenses: $${expenseReportData.totalPaidExpenses.toFixed(2)}`, 20, 80);
    doc.text(`Unpaid Expenses: $${expenseReportData.totalUnpaidExpenses.toFixed(2)}`, 20, 90);
    
    let yPosition = 110;
    
    try {
      // Capture Category Chart
      if (expenseCategoryChartRef.current && expenseReportData.expensesByCategory.length > 0) {
        const categoryCanvas = await html2canvas(expenseCategoryChartRef.current, {
          backgroundColor: '#ffffff',
          scale: 1,
          useCORS: true
        });
        const categoryImgData = categoryCanvas.toDataURL('image/png');
        
        doc.setFontSize(14);
        doc.text('Expenses by Category', 20, yPosition);
        yPosition += 10;
        
        const imgWidth = pageWidth - 40;
        const imgHeight = (categoryCanvas.height * imgWidth) / categoryCanvas.width;
        
        // Check if we need a new page
        if (yPosition + imgHeight > 280) {
          doc.addPage();
          yPosition = 20;
          doc.setFontSize(14);
          doc.text('Expenses by Category', 20, yPosition);
          yPosition += 10;
        }
        
        doc.addImage(categoryImgData, 'PNG', 20, yPosition, imgWidth, imgHeight);
        yPosition += imgHeight + 20;
      }
      
      // Capture Company Chart
      if (expenseCompanyChartRef.current && expenseReportData.expensesByCompany.length > 0) {
        // Check if we need a new page
        if (yPosition > 200) {
          doc.addPage();
          yPosition = 20;
        }
        
        const companyCanvas = await html2canvas(expenseCompanyChartRef.current, {
          backgroundColor: '#ffffff',
          scale: 1,
          useCORS: true
        });
        const companyImgData = companyCanvas.toDataURL('image/png');
        
        doc.setFontSize(14);
        doc.text('Expenses by Company', 20, yPosition);
        yPosition += 10;
        
        const imgWidth = pageWidth - 40;
        const imgHeight = (companyCanvas.height * imgWidth) / companyCanvas.width;
        
        // Check if we need a new page
        if (yPosition + imgHeight > 280) {
          doc.addPage();
          yPosition = 20;
          doc.setFontSize(14);
          doc.text('Expenses by Company', 20, yPosition);
          yPosition += 10;
        }
        
        doc.addImage(companyImgData, 'PNG', 20, yPosition, imgWidth, imgHeight);
        yPosition += imgHeight + 20;
      }
      
      // Add data tables on a new page
      doc.addPage();
      yPosition = 20;
      
      // Expenses by Category table
      if (expenseReportData.expensesByCategory.length > 0) {
        doc.setFontSize(14);
        doc.text('Category Details', 20, yPosition);
        yPosition += 10;
        
        const categoryTableData = expenseReportData.expensesByCategory.map(category => [
          category.category,
          category.count.toString(),
          '$' + category.total_amount.toFixed(2),
          '$' + (category.total_amount / category.count).toFixed(2)
        ]);
        
        autoTable(doc, {
          head: [['Category', 'Count', 'Total Amount', 'Average Amount']],
          body: categoryTableData,
          startY: yPosition,
          styles: { fontSize: 10 },
          headStyles: { fillColor: [239, 68, 68] },
        });
        
        yPosition = (doc as any).lastAutoTable.finalY + 20;
      }
      
      // Expenses by Company table
      if (expenseReportData.expensesByCompany.length > 0) {
        // Check if we need a new page
        if (yPosition > 220) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFontSize(14);
        doc.text('Company Details', 20, yPosition);
        yPosition += 10;
        
        const companyTableData = expenseReportData.expensesByCompany.map(company => [
          company.company_name,
          company.count.toString(),
          '$' + company.total_amount.toFixed(2),
          '$' + (company.total_amount / company.count).toFixed(2)
        ]);
        
        autoTable(doc, {
          head: [['Company', 'Count', 'Total Amount', 'Average Amount']],
          body: companyTableData,
          startY: yPosition,
          styles: { fontSize: 10 },
          headStyles: { fillColor: [59, 130, 246] },
        });
      }
      
    } catch (error) {
      console.error('Error capturing charts:', error);
      // Fallback to tables only if chart capture fails
      doc.addPage();
      yPosition = 20;
      
      doc.setFontSize(14);
      doc.text('Note: Charts could not be captured, showing data tables only', 20, yPosition);
      yPosition += 20;
      
      // Add tables as fallback
      if (expenseReportData.expensesByCategory.length > 0) {
        const categoryTableData = expenseReportData.expensesByCategory.map(category => [
          category.category,
          category.count.toString(),
          '$' + category.total_amount.toFixed(2),
          '$' + (category.total_amount / category.count).toFixed(2)
        ]);
        
        autoTable(doc, {
          head: [['Category', 'Count', 'Total Amount', 'Average Amount']],
          body: categoryTableData,
          startY: yPosition,
          styles: { fontSize: 10 },
          headStyles: { fillColor: [239, 68, 68] },
        });
      }
    }
    
    const filename = `expense-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(filename);
  };

  const exportExpensesToExcel = () => {
    if (!expenseReportData) return;
    
    const wb = XLSX.utils.book_new();
    
    // Summary sheet
    const summaryData = [
      ['Expense Report'],
      [''],
      ['Date generated:', format(new Date(), 'dd/MM/yyyy')],
      ...(expenseStartDate && expenseEndDate ? [['Period:', `${format(expenseStartDate, 'dd/MM/yyyy')} - ${format(expenseEndDate, 'dd/MM/yyyy')}`]] : []),
      [''],
      ['Total Expenses:', expenseReportData.totalExpenses],
      ['Paid Expenses:', expenseReportData.totalPaidExpenses],
      ['Unpaid Expenses:', expenseReportData.totalUnpaidExpenses],
    ];
    
    const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWS, 'Summary');
    
    // Expenses by Category sheet
    if (expenseReportData.expensesByCategory.length > 0) {
      const categoryData = [
        ['Expenses by Category'],
        [''],
        ['Category', 'Count', 'Total Amount', 'Average Amount'],
        ...expenseReportData.expensesByCategory.map(category => [
          category.category,
          category.count,
          category.total_amount,
          category.total_amount / category.count
        ])
      ];
      
      const categoryWS = XLSX.utils.aoa_to_sheet(categoryData);
      XLSX.utils.book_append_sheet(wb, categoryWS, 'By Category');
    }
    
    // Expenses by Company sheet
    if (expenseReportData.expensesByCompany.length > 0) {
      const companyData = [
        ['Expenses by Company'],
        [''],
        ['Company', 'Count', 'Total Amount', 'Average Amount'],
        ...expenseReportData.expensesByCompany.map(company => [
          company.company_name,
          company.count,
          company.total_amount,
          company.total_amount / company.count
        ])
      ];
      
      const companyWS = XLSX.utils.aoa_to_sheet(companyData);
      XLSX.utils.book_append_sheet(wb, companyWS, 'By Company');
    }
    
    const filename = `expense-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  // Export functions for product profits
  const exportProductProfitToPDF = async () => {
    if (!filteredProfitData) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Title
    doc.setFontSize(20);
    doc.text('Product Profit Report', pageWidth / 2, 20, { align: 'center' });
    
    // Date range
    doc.setFontSize(12);
    let dateRangeText = 'Date generated: ' + format(new Date(), 'dd/MM/yyyy');
    if (customStartDate && customEndDate) {
      dateRangeText = `Period: ${format(customStartDate, 'dd/MM/yyyy')} - ${format(customEndDate, 'dd/MM/yyyy')}`;
    }
    doc.text(dateRangeText, pageWidth / 2, 35, { align: 'center' });
    
    // Summary
    doc.setFontSize(14);
    doc.text('Summary', 20, 55);
    doc.setFontSize(12);
    doc.text(`Total Profit: $${filteredProfitData.totalProfit.toFixed(2)}`, 20, 70);
    doc.text(`Total Revenue: $${filteredProfitData.totalRevenue.toFixed(2)}`, 20, 80);
    doc.text(`Total Cost: $${filteredProfitData.totalCost.toFixed(2)}`, 20, 90);
    doc.text(`Overall Margin: ${filteredProfitData.overallMargin.toFixed(1)}%`, 20, 100);
    
    let yPosition = 120;
    
    try {
      // Capture Product Profit Chart
      if (productProfitChartRef.current && filteredProfitData.products.length > 0) {
        const chartCanvas = await html2canvas(productProfitChartRef.current, {
          backgroundColor: '#ffffff',
          scale: 1,
          useCORS: true
        });
        const chartImgData = chartCanvas.toDataURL('image/png');
        
        doc.setFontSize(14);
        doc.text('Profit by Product Chart', 20, yPosition);
        yPosition += 10;
        
        const imgWidth = pageWidth - 40;
        const imgHeight = (chartCanvas.height * imgWidth) / chartCanvas.width;
        
        // Check if we need a new page
        if (yPosition + imgHeight > 280) {
          doc.addPage();
          yPosition = 20;
          doc.setFontSize(14);
          doc.text('Profit by Product Chart', 20, yPosition);
          yPosition += 10;
        }
        
        doc.addImage(chartImgData, 'PNG', 20, yPosition, imgWidth, imgHeight);
        yPosition += imgHeight + 20;
      }
      
      // Add data table on a new page
      doc.addPage();
      yPosition = 20;
      
      // Product details table
      if (filteredProfitData.products.length > 0) {
        doc.setFontSize(14);
        doc.text('Product Details', 20, yPosition);
        yPosition += 10;
        
        const productTableData = filteredProfitData.products.map(product => [
          product.product_name,
          product.total_quantity_sold.toString(),
          '$' + product.total_revenue.toFixed(2),
          '$' + product.total_cost.toFixed(2),
          '$' + product.total_profit.toFixed(2),
          product.profit_margin.toFixed(1) + '%',
          '$' + product.average_sale_price.toFixed(2)
        ]);
        
        autoTable(doc, {
          head: [['Product', 'Qty Sold', 'Revenue', 'Cost', 'Profit', 'Margin %', 'Avg Price']],
          body: productTableData,
          startY: yPosition,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [34, 197, 94] },
        });
      }
      
    } catch (error) {
      console.error('Error capturing product chart:', error);
      // Fallback to table only if chart capture fails
      doc.addPage();
      yPosition = 20;
      
      doc.setFontSize(14);
      doc.text('Note: Chart could not be captured, showing data table only', 20, yPosition);
      yPosition += 20;
      
      // Add table as fallback
      if (filteredProfitData.products.length > 0) {
        const productTableData = filteredProfitData.products.map(product => [
          product.product_name,
          product.total_quantity_sold.toString(),
          '$' + product.total_revenue.toFixed(2),
          '$' + product.total_cost.toFixed(2),
          '$' + product.total_profit.toFixed(2),
          product.profit_margin.toFixed(1) + '%',
          '$' + product.average_sale_price.toFixed(2)
        ]);
        
        autoTable(doc, {
          head: [['Product', 'Qty Sold', 'Revenue', 'Cost', 'Profit', 'Margin %', 'Avg Price']],
          body: productTableData,
          startY: yPosition,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [34, 197, 94] },
        });
      }
    }
    
    const filename = `product-profit-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(filename);
  };

  const exportProductProfitToExcel = () => {
    if (!filteredProfitData) return;
    
    const wb = XLSX.utils.book_new();
    
    // Summary sheet
    const summaryData = [
      ['Product Profit Report'],
      [''],
      ['Date generated:', format(new Date(), 'dd/MM/yyyy')],
      ...(customStartDate && customEndDate ? [['Period:', `${format(customStartDate, 'dd/MM/yyyy')} - ${format(customEndDate, 'dd/MM/yyyy')}`]] : []),
      [''],
      ['Total Profit:', filteredProfitData.totalProfit],
      ['Total Revenue:', filteredProfitData.totalRevenue],
      ['Total Cost:', filteredProfitData.totalCost],
      ['Overall Margin (%):', filteredProfitData.overallMargin],
    ];
    
    const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWS, 'Summary');
    
    // Product details sheet
    if (filteredProfitData.products.length > 0) {
      const productData = [
        ['Product Profit Details'],
        [''],
        ['Product', 'Qty Sold', 'Revenue', 'Cost', 'Profit', 'Margin %', 'Avg Sale Price', 'Avg Cost Price'],
        ...filteredProfitData.products.map(product => [
          product.product_name,
          product.total_quantity_sold,
          product.total_revenue,
          product.total_cost,
          product.total_profit,
          product.profit_margin,
          product.average_sale_price,
          product.average_cost_price
        ])
      ];
      
      const productWS = XLSX.utils.aoa_to_sheet(productData);
      XLSX.utils.book_append_sheet(wb, productWS, 'Product Details');
    }
    
    const filename = `product-profit-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  // Export functions for sales report
  const exportSalesReportToPDF = async () => {
    if (!salesData) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Title
    doc.setFontSize(20);
    doc.text('Sales Report', pageWidth / 2, 20, { align: 'center' });
    
    // Date range
    doc.setFontSize(12);
    let dateRangeText = 'Date generated: ' + format(new Date(), 'dd/MM/yyyy');
    if (customStartDate && customEndDate) {
      dateRangeText = `Period: ${format(customStartDate, 'dd/MM/yyyy')} - ${format(customEndDate, 'dd/MM/yyyy')}`;
    }
    doc.text(dateRangeText, pageWidth / 2, 35, { align: 'center' });
    
    // Summary
    doc.setFontSize(14);
    doc.text('Summary', 20, 55);
    doc.setFontSize(12);
    doc.text(`Total Revenue: $${salesData.totalRevenue.toFixed(2)}`, 20, 70);
    doc.text(`Total Quantity Sold: ${salesData.totalQuantitySold}`, 20, 80);
    doc.text(`Number of Sales: ${salesData.totalNumberOfSales}`, 20, 90);
    doc.text(`Unique Products Sold: ${salesData.uniqueProductsSold}`, 20, 100);
    
    let yPosition = 120;
    
    try {
      // Capture Sales Charts
      if (salesProductChartRef.current && salesData.products.length > 0) {
        const chartCanvas = await html2canvas(salesProductChartRef.current, {
          backgroundColor: '#ffffff',
          scale: 1,
          useCORS: true
        });
        const chartImgData = chartCanvas.toDataURL('image/png');
        
        doc.setFontSize(14);
        doc.text('Revenue by Product Chart', 20, yPosition);
        yPosition += 10;
        
        const imgWidth = pageWidth - 40;
        const imgHeight = (chartCanvas.height * imgWidth) / chartCanvas.width;
        
        // Check if we need a new page
        if (yPosition + imgHeight > 280) {
          doc.addPage();
          yPosition = 20;
          doc.setFontSize(14);
          doc.text('Revenue by Product Chart', 20, yPosition);
          yPosition += 10;
        }
        
        doc.addImage(chartImgData, 'PNG', 20, yPosition, imgWidth, imgHeight);
        yPosition += imgHeight + 20;
      }
      
      // Capture Services Chart if it exists
      if (salesServiceChartRef.current && salesData.services.length > 0) {
        // Check if we need a new page
        if (yPosition > 200) {
          doc.addPage();
          yPosition = 20;
        }
        
        const serviceChartCanvas = await html2canvas(salesServiceChartRef.current, {
          backgroundColor: '#ffffff',
          scale: 1,
          useCORS: true
        });
        const serviceChartImgData = serviceChartCanvas.toDataURL('image/png');
        
        doc.setFontSize(14);
        doc.text('Revenue by Service Chart', 20, yPosition);
        yPosition += 10;
        
        const serviceImgWidth = pageWidth - 40;
        const serviceImgHeight = (serviceChartCanvas.height * serviceImgWidth) / serviceChartCanvas.width;
        
        // Check if we need a new page for the service chart
        if (yPosition + serviceImgHeight > 280) {
          doc.addPage();
          yPosition = 20;
          doc.setFontSize(14);
          doc.text('Revenue by Service Chart', 20, yPosition);
          yPosition += 10;
        }
        
        doc.addImage(serviceChartImgData, 'PNG', 20, yPosition, serviceImgWidth, serviceImgHeight);
        yPosition += serviceImgHeight + 20;
      }
      
      // Add data table on a new page
      doc.addPage();
      yPosition = 20;
      
      // Sales details table
      if (salesData.products.length > 0 || salesData.services.length > 0) {
        doc.setFontSize(14);
        doc.text('Sales Details', 20, yPosition);
        yPosition += 10;
        
        // Combine products and services for the table
        const combinedSalesData = [
          ...salesData.products.map(product => [
            product.product_name + ' (Product)',
            product.total_quantity_sold.toString(),
            '$' + product.total_revenue.toFixed(2),
            product.number_of_sales.toString(),
            '$' + product.average_sale_price.toFixed(2),
            format(new Date(product.first_sale_date), 'dd/MM/yyyy'),
            format(new Date(product.last_sale_date), 'dd/MM/yyyy')
          ]),
          ...salesData.services.map(service => [
            service.product_name + ' (Service)',
            service.total_quantity_sold.toString(),
            '$' + service.total_revenue.toFixed(2),
            service.number_of_sales.toString(),
            '$' + service.average_sale_price.toFixed(2),
            format(new Date(service.first_sale_date), 'dd/MM/yyyy'),
            format(new Date(service.last_sale_date), 'dd/MM/yyyy')
          ])
        ];
        
        autoTable(doc, {
          head: [['Product/Service', 'Qty Sold', 'Revenue', 'Sales Count', 'Avg Price', 'First Sale', 'Last Sale']],
          body: combinedSalesData,
          startY: yPosition,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [34, 197, 94] },
        });
      }
      
    } catch (error) {
      console.error('Error capturing sales chart:', error);
      // Fallback to table only if chart capture fails
      doc.addPage();
      yPosition = 20;
      
      doc.setFontSize(14);
      doc.text('Note: Chart could not be captured, showing data table only', 20, yPosition);
      yPosition += 20;
      
      // Add table as fallback
      if (salesData.products.length > 0 || salesData.services.length > 0) {
        // Combine products and services for the fallback table
        const combinedSalesData = [
          ...salesData.products.map(product => [
            product.product_name + ' (Product)',
            product.total_quantity_sold.toString(),
            '$' + product.total_revenue.toFixed(2),
            product.number_of_sales.toString(),
            '$' + product.average_sale_price.toFixed(2),
            format(new Date(product.first_sale_date), 'dd/MM/yyyy'),
            format(new Date(product.last_sale_date), 'dd/MM/yyyy')
          ]),
          ...salesData.services.map(service => [
            service.product_name + ' (Service)',
            service.total_quantity_sold.toString(),
            '$' + service.total_revenue.toFixed(2),
            service.number_of_sales.toString(),
            '$' + service.average_sale_price.toFixed(2),
            format(new Date(service.first_sale_date), 'dd/MM/yyyy'),
            format(new Date(service.last_sale_date), 'dd/MM/yyyy')
          ])
        ];
        
        autoTable(doc, {
          head: [['Product/Service', 'Qty Sold', 'Revenue', 'Sales Count', 'Avg Price', 'First Sale', 'Last Sale']],
          body: combinedSalesData,
          startY: yPosition,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [34, 197, 94] },
        });
      }
    }
    
    const filename = `sales-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(filename);
  };

  const exportSalesReportToExcel = () => {
    if (!salesData) return;
    
    const wb = XLSX.utils.book_new();
    
    // Summary sheet
    const summaryData = [
      ['Sales Report'],
      [''],
      ['Date Range:', customStartDate && customEndDate ? `${format(customStartDate, 'dd/MM/yyyy')} - ${format(customEndDate, 'dd/MM/yyyy')}` : 'All Time'],
      [''],
      ['Total Revenue:', salesData.totalRevenue],
      ['Total Quantity Sold:', salesData.totalQuantitySold],
      ['Number of Sales:', salesData.totalNumberOfSales],
      ['Unique Products Sold:', salesData.uniqueProductsSold]
    ];
    
    const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWS, 'Summary');
    
    // Sales details sheet
    const salesData_export = [
      ['Product/Service', 'Type', 'Quantity Sold', 'Revenue', 'Sales Count', 'Average Price', 'First Sale Date', 'Last Sale Date'],
      ...salesData.products.map(product => [
        product.product_name,
        'Product',
        product.total_quantity_sold,
        product.total_revenue,
        product.number_of_sales,
        product.average_sale_price,
        product.first_sale_date,
        product.last_sale_date
      ]),
      ...salesData.services.map(service => [
        service.product_name,
        'Service',
        service.total_quantity_sold,
        service.total_revenue,
        service.number_of_sales,
        service.average_sale_price,
        service.first_sale_date,
        service.last_sale_date
      ])
    ];
    
    const salesWS = XLSX.utils.aoa_to_sheet(salesData_export);
    XLSX.utils.book_append_sheet(wb, salesWS, 'Sales Details');
    
    const filename = `sales-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
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
        
        {/* Active Filters Display */}
        {(() => {
          const hasDateFilters = startDate || endDate || customStartDate || customEndDate;
          const hasCompanyFilters = (filterType === 'company' && selectedCompanyId) || 
                                   (productFilterType === 'company' && productSelectedCompanyId) || 
                                   (expenseFilterType === 'company' && expenseSelectedCompanyId);
          const hasOtherFilters = (filterType === 'client' && selectedClientId) || 
                                 expenseSelectedCategory;
          
          return hasDateFilters || hasCompanyFilters || hasOtherFilters;
        })() && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg border">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Filtres appliqués :</h3>
            <div className="flex flex-wrap gap-2">
              {/* Dates - Affichage unifié pour tous les rapports */}
              {(() => {
                const effectiveStartDate = startDate || customStartDate;
                const effectiveEndDate = endDate || customEndDate;
                
                if (effectiveStartDate && effectiveEndDate) {
                  return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      Période: {format(effectiveStartDate, 'dd/MM/yyyy')} - {format(effectiveEndDate, 'dd/MM/yyyy')}
                    </span>
                  );
                } else if (effectiveStartDate) {
                  return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      À partir du: {format(effectiveStartDate, 'dd/MM/yyyy')}
                    </span>
                  );
                } else if (effectiveEndDate) {
                  return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      Jusqu'au: {format(effectiveEndDate, 'dd/MM/yyyy')}
                    </span>
                  );
                }
                return null;
              })()}
              
              {/* Compagnies - Affichage unifié pour tous les rapports */}
              {(() => {
                // Affichage prioritaire selon la section active
                if (selectedCompanyId && companies?.find(c => c.id === selectedCompanyId)?.name) {
                  return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary/80 text-secondary-foreground">
                      Compagnie: {companies.find(c => c.id === selectedCompanyId)?.name}
                    </span>
                  );
                }
                
                if (productSelectedCompanyId && companies?.find(c => c.id === productSelectedCompanyId)?.name) {
                  return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary/80 text-secondary-foreground">
                      Compagnie: {companies.find(c => c.id === productSelectedCompanyId)?.name}
                    </span>
                  );
                }
                
                if (expenseSelectedCompanyId && companies?.find(c => c.id === expenseSelectedCompanyId)?.name) {
                  return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary/80 text-secondary-foreground">
                      Compagnie: {companies.find(c => c.id === expenseSelectedCompanyId)?.name}
                    </span>
                  );
                }
                
                return null;
              })()}
              
              {/* Autres filtres */}
              {filterType === 'client' && selectedClientId && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary/80 text-secondary-foreground">
                  Client: {clients?.find(c => c.id === selectedClientId)?.name || selectedClientId}
                </span>
              )}
              
              {/* Filtres produits */}
              {productFilterType === 'company' && productSelectedCompanyId && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent/80 text-accent-foreground">
                  Compagnie (Produits): {companies?.find(c => c.id === productSelectedCompanyId)?.name || productSelectedCompanyId}
                </span>
              )}
              
              {/* Filtres dépenses */}
              {expenseFilterType === 'company' && expenseSelectedCompanyId && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-destructive/80 text-destructive-foreground">
                  Compagnie (Dépenses): {companies?.find(c => c.id === expenseSelectedCompanyId)?.name || expenseSelectedCompanyId}
                </span>
              )}
              {expenseFilterType === 'category' && expenseSelectedCategory && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-destructive/80 text-destructive-foreground">
                  Catégorie (Dépenses): {expenseSelectedCategory}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">{t("reports.tabs.overview")}</TabsTrigger>
          <TabsTrigger value="revenue">{t("reports.tabs.revenue")}</TabsTrigger>
          <TabsTrigger value="products">{t("reports.tabs.products")}</TabsTrigger>
          <TabsTrigger value="expenses">{t("reports.tabs.expenses")}</TabsTrigger>
          <TabsTrigger value="clients">{t("reports.tabs.clients")}</TabsTrigger>
          <TabsTrigger value="taxes">{t("reports.tabs.taxes")}</TabsTrigger>
          <TabsTrigger value="invoices">{t("reports.tabs.invoices")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("reports.overview.totalRevenue")}</CardTitle>
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
                <CardTitle className="text-sm font-medium">{t("reports.overview.pendingInvoices")}</CardTitle>
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
                <CardTitle className="text-sm font-medium">{t("reports.overview.activeClients")}</CardTitle>
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
                <CardTitle className="text-sm font-medium">{t("reports.overview.activeProducts")}</CardTitle>
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
                <CardTitle>{t("reports.overview.recentActivity")}</CardTitle>
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
                <TabsTrigger value="custom">{t("reports.revenue.customDateRange")}</TabsTrigger>
                <TabsTrigger value="month">{t("reports.revenue.byMonth")}</TabsTrigger>
                <TabsTrigger value="year">{t("reports.revenue.byYear")}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="custom" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("reports.revenue.customDateRange")}</CardTitle>
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
                        <Label htmlFor="filter-type">{t("reports.revenue.filterBy")}</Label>
                        <Select value={filterType} onValueChange={(value: 'all' | 'company' | 'client') => {
                          setFilterType(value);
                          setSelectedCompanyId('');
                          setSelectedClientId('');
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select filter" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t("reports.revenue.all")}</SelectItem>
                            <SelectItem value="company">{t("reports.revenue.company")}</SelectItem>
                            <SelectItem value="client">{t("reports.revenue.client")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {filterType === 'company' && (
                        <div className="space-y-2">
                          <Label htmlFor="company-select">{t("reports.revenue.company")}</Label>
                          <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                            <SelectTrigger>
                              <SelectValue placeholder={t("reports.revenue.selectCompany")} />
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
                          <Label htmlFor="client-select">{t("reports.revenue.client")}</Label>
                          <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                            <SelectTrigger>
                              <SelectValue placeholder={t("reports.revenue.selectClient")} />
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
                    <CardTitle>{t("reports.revenue.monthlyRevenue")}</CardTitle>
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
                        <Label htmlFor="filter-type">{t("reports.revenue.filterBy")}</Label>
                        <Select value={filterType} onValueChange={(value: 'all' | 'company' | 'client') => {
                          setFilterType(value);
                          setSelectedCompanyId('');
                          setSelectedClientId('');
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select filter" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t("reports.revenue.all")}</SelectItem>
                            <SelectItem value="company">{t("reports.revenue.company")}</SelectItem>
                            <SelectItem value="client">{t("reports.revenue.client")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {filterType === 'company' && (
                        <div className="space-y-2">
                          <Label htmlFor="company-select">{t("reports.revenue.company")}</Label>
                          <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                            <SelectTrigger>
                              <SelectValue placeholder={t("reports.revenue.selectCompany")} />
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
                          <Label htmlFor="client-select">{t("reports.revenue.client")}</Label>
                          <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                            <SelectTrigger>
                              <SelectValue placeholder={t("reports.revenue.selectClient")} />
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
                    <CardTitle>{t("reports.revenue.yearlyRevenue")}</CardTitle>
                    <CardDescription>Select a specific year to view revenue data or a year range</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <div>
                        <Label>{t("reports.revenue.option1")}</Label>
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
                        <Label>{t("reports.revenue.option2")}</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                          <div className="space-y-2">
                            <Label>{t("reports.revenue.startYear")}</Label>
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
                            <Label>{t("reports.revenue.endYear")}</Label>
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
                        <Label htmlFor="filter-type">{t("reports.revenue.filterBy")}</Label>
                        <Select value={filterType} onValueChange={(value: 'all' | 'company' | 'client') => {
                          setFilterType(value);
                          setSelectedCompanyId('');
                          setSelectedClientId('');
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select filter" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t("reports.revenue.all")}</SelectItem>
                            <SelectItem value="company">{t("reports.revenue.company")}</SelectItem>
                            <SelectItem value="client">{t("reports.revenue.client")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {filterType === 'company' && (
                        <div className="space-y-2">
                          <Label htmlFor="company-select">{t("reports.revenue.company")}</Label>
                          <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                            <SelectTrigger>
                              <SelectValue placeholder={t("reports.revenue.selectCompany")} />
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
                          <Label htmlFor="client-select">{t("reports.revenue.client")}</Label>
                          <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                            <SelectTrigger>
                              <SelectValue placeholder={t("reports.revenue.selectClient")} />
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


        <TabsContent value="products" className="space-y-4">
          {/* Product Profit Report Section */}
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div>
              <h2 className="text-2xl font-bold">Product Profit Report</h2>
              <p className="text-muted-foreground">Profitability analysis by sold product</p>
            </div>
            
            <div className="flex space-x-2">
              <Button onClick={exportProductProfitToPDF} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                PDF
              </Button>
              <Button onClick={exportProductProfitToExcel} variant="outline" size="sm">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Excel
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Date Filters</CardTitle>
                <CardDescription>Select a period to analyze profits</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <DateRangePicker
                  startDate={startDate}
                  endDate={endDate}
                  onStartDateChange={setCustomStartDate}
                  onEndDateChange={setCustomEndDate}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Company Filter</CardTitle>
                <CardDescription>Filter by company (optional)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Filter Type</Label>
                    <Select value={productFilterType} onValueChange={(value: 'all' | 'company') => {
                      setProductFilterType(value);
                      setProductSelectedCompanyId('');
                    }}>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select filter type" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border border-border shadow-lg z-50">
                        <SelectItem value="all">All Companies</SelectItem>
                        <SelectItem value="company">By Company</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {productFilterType === 'company' && (
                    <div className="space-y-2">
                      <Label htmlFor="product-company-select">Company</Label>
                      <Select value={productSelectedCompanyId} onValueChange={setProductSelectedCompanyId}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select company" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border border-border shadow-lg z-50">
                          {companies.map((company) => (
                            <SelectItem key={company.id} value={company.id}>
                              {company.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {profitLoading ? (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">Loading profit data...</div>
                </CardContent>
              </Card>
            ) : filteredProfitData ? (
              <div className="space-y-4">
                {/* Résumé des profits */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'CAD' }).format(filteredProfitData.totalProfit)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'CAD' }).format(filteredProfitData.totalRevenue)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-orange-600">
                        {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'CAD' }).format(filteredProfitData.totalCost)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Overall Margin</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {filteredProfitData.overallMargin.toFixed(1)}%
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Graphique des profits par produit */}
                <Card>
                  <CardHeader>
                    <CardTitle>Profit by Product</CardTitle>
                    <CardDescription>Comparative analysis of profits generated by each product</CardDescription>
                  </CardHeader>
                  <CardContent ref={productProfitChartRef}>
                    <BarChart width={600} height={400} data={filteredProfitData.products.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="product_name" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: any, name: string) => [
                          new Intl.NumberFormat("fr-FR", { style: "currency", currency: "CAD" }).format(value),
                          name === "Profit" ? "Profit" : 
                          name === "Revenue" ? "Revenue" : "Cost"
                        ]}
                      />
                      <Bar dataKey="total_profit" fill="#22c55e" name="Profit" />
                      <Bar dataKey="total_cost" fill="#f97316" name="Cost" />
                    </BarChart>
                  </CardContent>
                </Card>

                {/* Tableau détaillé */}
                <Card>
                  <CardHeader>
                    <CardTitle>Product Details</CardTitle>
                    <CardDescription>Detailed analysis of each product's profitability</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Qty Sold</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                          <TableHead className="text-right">Cost</TableHead>
                          <TableHead className="text-right">Profit</TableHead>
                          <TableHead className="text-right">Margin %</TableHead>
                          <TableHead className="text-right">Avg Price</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProfitData.products.map((product) => (
                          <TableRow key={product.product_id}>
                            <TableCell className="font-medium">{product.product_name}</TableCell>
                            <TableCell className="text-right">{product.total_quantity_sold}</TableCell>
                            <TableCell className="text-right">
                              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'CAD' }).format(product.total_revenue)}
                            </TableCell>
                            <TableCell className="text-right">
                              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'CAD' }).format(product.total_cost)}
                            </TableCell>
                            <TableCell className={`text-right font-medium ${product.total_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'CAD' }).format(product.total_profit)}
                            </TableCell>
                            <TableCell className={`text-right ${product.profit_margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {product.profit_margin.toFixed(1)}%
                            </TableCell>
                            <TableCell className="text-right">
                              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'CAD' }).format(product.average_sale_price)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center text-muted-foreground">
                    No profit data available for the selected period.
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Inventory Report Section */}
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div>
              <h2 className="text-2xl font-bold">Inventory Report</h2>
              <p className="text-muted-foreground">Stock analysis and inventory management</p>
            </div>
            <div className="flex space-x-2">
              <Button 
                onClick={() => exportProductsToPDF()} 
                variant="outline" 
                size="sm"
              >
                <Download className="mr-2 h-4 w-4" />
                PDF
              </Button>
              <Button 
                onClick={() => exportProductsToExcel()} 
                variant="outline" 
                size="sm"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Excel
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{products?.length || 0}</div>
                <p className="text-xs text-muted-foreground">products in inventory</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {products?.filter(p => p.is_active).length || 0}
                </div>
                <p className="text-xs text-muted-foreground">active products</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Low Stock Alert</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {products?.filter(p => (p.quantity || 0) <= 5 && p.is_active).length || 0}
                </div>
                <p className="text-xs text-muted-foreground">products out of stock</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Inventory Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${products?.reduce((total, p) => total + ((p.quantity || 0) * (p.cost || 0)), 0).toFixed(2) || "0.00"}
                </div>
                <p className="text-xs text-muted-foreground">total inventory value</p>
              </CardContent>
            </Card>
          </div>

          {/* Stock Level Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Stock Levels by Product</CardTitle>
              <CardDescription>Available quantities for each product</CardDescription>
            </CardHeader>
            <CardContent>
              {products && products.length > 0 ? (
                <div className="w-full overflow-x-auto" ref={stockChartRef}>
                  <BarChart 
                    width={800} 
                    height={400}
                    data={products.map(p => ({
                      name: p.name,
                      quantity: p.quantity || 0,
                      cost: p.cost || 0,
                      price: p.price || 0,
                      isLowStock: (p.quantity || 0) <= 5
                    }))}
                    margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      interval={0}
                      fontSize={12}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [`${value}`, 'Quantity']}
                      labelFormatter={(label) => `Product: ${label}`}
                    />
                    <Bar 
                      dataKey="quantity" 
                      fill="#22c55e"
                      name="Quantity"
                    />
                  </BarChart>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No products found
                </div>
              )}
            </CardContent>
          </Card>

          {/* Products Table */}
          <Card>
            <CardHeader>
              <CardTitle>Product Details</CardTitle>
              <CardDescription>Complete information on all products</CardDescription>
            </CardHeader>
            <CardContent>
              {products && products.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Margin</TableHead>
                      <TableHead>Stock Value</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => {
                      const margin = product.price && product.cost ? 
                        ((product.price - product.cost) / product.price * 100).toFixed(1) : "0.0";
                      const stockValue = ((product.quantity || 0) * (product.cost || 0)).toFixed(2);
                      const isLowStock = (product.quantity || 0) <= 5;
                      
                      return (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>{product.sku || "-"}</TableCell>
                          <TableCell>{product.category || "-"}</TableCell>
                          <TableCell className={isLowStock ? "text-destructive font-semibold" : ""}>
                            {product.quantity || 0}
                            {isLowStock && " ⚠️"}
                          </TableCell>
                          <TableCell>${(product.cost || 0).toFixed(2)}</TableCell>
                          <TableCell>${(product.price || 0).toFixed(2)}</TableCell>
                          <TableCell>{margin}%</TableCell>
                          <TableCell>${stockValue}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              product.is_active 
                                ? "bg-green-100 text-green-800" 
                                : "bg-red-100 text-red-800"
                            }`}>
                              {product.is_active ? "Active" : "Inactive"}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No products found
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sales Report Section */}
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div>
              <h2 className="text-2xl font-bold">Sales Report</h2>
              <p className="text-muted-foreground">Sales analysis and performance by product</p>
            </div>
            
            <div className="flex space-x-2">
              <Button onClick={exportSalesReportToPDF} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                PDF
              </Button>
              <Button onClick={exportSalesReportToExcel} variant="outline" size="sm">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Excel
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Date Filters</CardTitle>
                <CardDescription>Select a period to analyze sales</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <DateRangePicker
                  startDate={customStartDate}
                  endDate={customEndDate}
                  onStartDateChange={setCustomStartDate}
                  onEndDateChange={setCustomEndDate}
                />
              </CardContent>
            </Card>

            {salesLoading ? (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">Loading sales data...</div>
                </CardContent>
              </Card>
            ) : salesData ? (
              <div className="space-y-4">
                {/* Sales Summary Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(salesData.totalRevenue)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Quantity Sold</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {salesData.totalQuantitySold.toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Number of Sales</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {salesData.totalNumberOfSales.toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Products Sold</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {salesData.uniqueProductsSold}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Services Sold</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {salesData.uniqueServicesSold}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Products Chart */}
                {salesData.products.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Revenue by Product</CardTitle>
                      <CardDescription>Sales performance analysis by physical products</CardDescription>
                    </CardHeader>
                    <CardContent ref={salesProductChartRef}>
                      <BarChart width={600} height={400} data={salesData.products.slice(0, 10)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="product_name" 
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis />
                        <Tooltip 
                          formatter={(value: any, name: string) => [
                            new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value),
                            name === "total_revenue" ? "Revenue" : 
                            name === "total_quantity_sold" ? "Quantity Sold" : name
                          ]}
                        />
                        <Bar dataKey="total_revenue" fill="#22c55e" name="Revenue" />
                      </BarChart>
                    </CardContent>
                  </Card>
                )}

                {/* Services Chart */}
                {salesData.services.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Revenue by Service</CardTitle>
                      <CardDescription>Sales performance analysis by services</CardDescription>
                    </CardHeader>
                    <CardContent ref={salesServiceChartRef}>
                      <BarChart width={600} height={400} data={salesData.services.slice(0, 10)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="product_name" 
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis />
                        <Tooltip 
                          formatter={(value: any, name: string) => [
                            new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value),
                            name === "total_revenue" ? "Revenue" : 
                            name === "total_quantity_sold" ? "Quantity Sold" : name
                          ]}
                        />
                        <Bar dataKey="total_revenue" fill="#3b82f6" name="Revenue" />
                      </BarChart>
                    </CardContent>
                  </Card>
                )}

                {/* Combined Sales Details Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Sales Details</CardTitle>
                    <CardDescription>Detailed sales information for products and services</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product/Service</TableHead>
                          <TableHead className="text-right">Qty Sold</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                          <TableHead className="text-right">Sales Count</TableHead>
                          <TableHead className="text-right">Avg Price</TableHead>
                          <TableHead className="text-right">First Sale</TableHead>
                          <TableHead className="text-right">Last Sale</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {/* Products */}
                        {salesData.products.map((product) => (
                          <TableRow key={product.product_id}>
                            <TableCell className="font-medium">{product.product_name} <span className="text-xs text-muted-foreground">(Product)</span></TableCell>
                            <TableCell className="text-right">{product.total_quantity_sold}</TableCell>
                            <TableCell className="text-right">
                              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(product.total_revenue)}
                            </TableCell>
                            <TableCell className="text-right">{product.number_of_sales}</TableCell>
                            <TableCell className="text-right">
                              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(product.average_sale_price)}
                            </TableCell>
                            <TableCell className="text-right">
                              {format(new Date(product.first_sale_date), 'MMM dd, yyyy')}
                            </TableCell>
                            <TableCell className="text-right">
                              {format(new Date(product.last_sale_date), 'MMM dd, yyyy')}
                            </TableCell>
                          </TableRow>
                        ))}
                        {/* Services */}
                        {salesData.services.map((service) => (
                          <TableRow key={service.product_id}>
                            <TableCell className="font-medium">{service.product_name} <span className="text-xs text-muted-foreground">(Service)</span></TableCell>
                            <TableCell className="text-right">{service.total_quantity_sold}</TableCell>
                            <TableCell className="text-right">
                              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(service.total_revenue)}
                            </TableCell>
                            <TableCell className="text-right">{service.number_of_sales}</TableCell>
                            <TableCell className="text-right">
                              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(service.average_sale_price)}
                            </TableCell>
                            <TableCell className="text-right">
                              {format(new Date(service.first_sale_date), 'MMM dd, yyyy')}
                            </TableCell>
                            <TableCell className="text-right">
                              {format(new Date(service.last_sale_date), 'MMM dd, yyyy')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center text-muted-foreground">
                    No sales data available for the selected period.
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Rapport des dépenses</h2>
                <p className="text-muted-foreground">Analyse des dépenses par compagnie et catégorie</p>
              </div>
              
              <div className="flex space-x-2">
                <Button onClick={exportExpensesToPDF} variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  PDF
                </Button>
                <Button onClick={exportExpensesToExcel} variant="outline" size="sm">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Excel
                </Button>
              </div>
            </div>

            {/* Filtres pour les dépenses */}
            <Card>
              <CardHeader>
                <CardTitle>Filtres</CardTitle>
                <CardDescription>Sélectionnez les critères pour filtrer les dépenses</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label>Plage de dates</Label>
                    <DateRangePicker
                      startDate={expenseStartDate}
                      endDate={expenseEndDate}
                      onStartDateChange={setExpenseStartDate}
                      onEndDateChange={setExpenseEndDate}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Type de filtre</Label>
                    <Select value={expenseFilterType} onValueChange={(value: 'all' | 'company' | 'category') => setExpenseFilterType(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner le type de filtre" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes les dépenses</SelectItem>
                        <SelectItem value="company">Par compagnie</SelectItem>
                        <SelectItem value="category">Par catégorie</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {expenseFilterType === 'company' && (
                    <div className="space-y-2">
                      <Label>Compagnie</Label>
                      <Select value={expenseSelectedCompanyId} onValueChange={setExpenseSelectedCompanyId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une compagnie" />
                        </SelectTrigger>
                        <SelectContent>
                          {companies?.map((company) => (
                            <SelectItem key={company.id} value={company.id}>
                              {company.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {expenseFilterType === 'category' && (
                    <div className="space-y-2">
                      <Label>Catégorie</Label>
                      <Select value={expenseSelectedCategory} onValueChange={setExpenseSelectedCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une catégorie" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Office">Bureau</SelectItem>
                          <SelectItem value="Travel">Voyage</SelectItem>
                          <SelectItem value="Meals">Repas</SelectItem>
                          <SelectItem value="Marketing">Marketing</SelectItem>
                          <SelectItem value="Equipment">Équipement</SelectItem>
                          <SelectItem value="Professional Services">Services professionnels</SelectItem>
                          <SelectItem value="Utilities">Services publics</SelectItem>
                          <SelectItem value="Other">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {expenseLoading ? (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">Loading expense data...</div>
                </CardContent>
              </Card>
            ) : expenseReportData ? (
              <div className="space-y-4">
                {/* Résumé des dépenses */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Dépenses</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">
                        {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'CAD' }).format(expenseReportData.totalExpenses)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Dépenses Payées</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'CAD' }).format(expenseReportData.totalPaidExpenses)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Dépenses Impayées</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-orange-600">
                        {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'CAD' }).format(expenseReportData.totalUnpaidExpenses)}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Graphique des dépenses par catégorie */}
                <Card>
                  <CardHeader>
                    <CardTitle>Expenses by Category</CardTitle>
                    <CardDescription>Distribution of expense amounts by category</CardDescription>
                  </CardHeader>
                  <CardContent ref={expenseCategoryChartRef}>
                    {expenseReportData.expensesByCategory.length > 0 ? (
                      <BarChart width={600} height={400} data={expenseReportData.expensesByCategory}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="category" 
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis />
                        <Tooltip 
                          formatter={(value: number) => [
                            new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'CAD' }).format(value),
                            'Amount'
                          ]}
                        />
                        <Bar dataKey="total_amount" fill="#ef4444" />
                      </BarChart>
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        Aucune donnée de dépense disponible
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Graphique des dépenses par compagnie */}
                {expenseReportData.expensesByCompany.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Expenses by Company</CardTitle>
                      <CardDescription>Distribution of expense amounts by client company</CardDescription>
                    </CardHeader>
                    <CardContent ref={expenseCompanyChartRef}>
                      <BarChart width={600} height={400} data={expenseReportData.expensesByCompany}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="company_name" 
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis />
                        <Tooltip 
                          formatter={(value: number) => [
                            new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'CAD' }).format(value),
                            'Amount'
                          ]}
                        />
                        <Bar dataKey="total_amount" fill="#3b82f6" />
                      </BarChart>
                    </CardContent>
                  </Card>
                )}

                {/* Tableau détaillé des dépenses par catégorie */}
                <Card>
                  <CardHeader>
                    <CardTitle>Detail by Category</CardTitle>
                    <CardDescription>Detailed breakdown of expenses by category</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {expenseReportData.expensesByCategory.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-right">Count</TableHead>
                            <TableHead className="text-right">Total Amount</TableHead>
                            <TableHead className="text-right">Average Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {expenseReportData.expensesByCategory.map((category) => (
                            <TableRow key={category.category}>
                              <TableCell className="font-medium">{category.category}</TableCell>
                              <TableCell className="text-right">{category.count}</TableCell>
                              <TableCell className="text-right">
                                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'CAD' }).format(category.total_amount)}
                              </TableCell>
                              <TableCell className="text-right">
                                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'CAD' }).format(category.total_amount / category.count)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        No category data available
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Tableau détaillé des dépenses par compagnie */}
                {expenseReportData.expensesByCompany.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Detail by Company</CardTitle>
                      <CardDescription>Detailed breakdown of expenses by client company</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Company</TableHead>
                            <TableHead className="text-right">Count</TableHead>
                            <TableHead className="text-right">Total Amount</TableHead>
                            <TableHead className="text-right">Average Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {expenseReportData.expensesByCompany.map((company) => (
                            <TableRow key={company.company_id}>
                              <TableCell className="font-medium">{company.company_name}</TableCell>
                              <TableCell className="text-right">{company.count}</TableCell>
                              <TableCell className="text-right">
                                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'CAD' }).format(company.total_amount)}
                              </TableCell>
                              <TableCell className="text-right">
                                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'CAD' }).format(company.total_amount / company.count)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center text-muted-foreground">
                    Sélectionnez une plage de dates pour voir les données de dépenses
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
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
