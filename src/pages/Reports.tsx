
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useReports, type RevenueByPeriod } from "@/hooks/useReports";
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
import { useSubscription } from "@/hooks/useSubscription";
import { useReminderLogs } from "@/hooks/useReminderLogs";
import { useState, useMemo, useRef } from "react";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
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
import { getReportTranslation, getStatusLabel } from "@/lib/reportTranslations";

const Reports = () => {
  const { t, language } = useLanguage();
  const { planLimits } = useSubscription();
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');
  const [activeTab, setActiveTab] = useState('custom');
  
  // Check if a specific report tab is available based on plan
  const isTabAvailable = (tab: string) => {
    if (tab === 'overview' || tab === 'revenue') return true; // Always available
    if (planLimits?.all_reports) return true; // Pro plan - all reports available
    // Premium plan - only taxes additional access
    if (planLimits?.plan_type === 'premium') {
      return tab === 'taxes';
    }
    return false; // Free plan - only overview and revenue
  };
  
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
        // Si une plage d'années est sélectionnée, utiliser celle-ci
        if (yearRangeStart || yearRangeEnd) {
          const startOfRange = yearRangeStart ? new Date(yearRangeStart.getFullYear(), 0, 1) : undefined;
          const endOfRange = yearRangeEnd ? new Date(yearRangeEnd.getFullYear(), 11, 31) : undefined;
          return { startDate: startOfRange, endDate: endOfRange };
        }
        // Sinon, utiliser l'année spécifique sélectionnée
        if (selectedYear) {
          const startOfYear = new Date(selectedYear.getFullYear(), 0, 1);
          const endOfYear = new Date(selectedYear.getFullYear(), 11, 31);
          return { startDate: startOfYear, endDate: endOfYear };
        }
        return { startDate: undefined, endDate: undefined };
      default:
        return { startDate: undefined, endDate: undefined };
    }
  }, [activeTab, customStartDate, customEndDate, selectedMonth, selectedYear, yearRangeStart, yearRangeEnd]);
  
  const { revenueData: realRevenueData, loading, error } = useReports(
    startDate, 
    endDate, 
    filterType, 
    filterType === 'company' ? selectedCompanyId : selectedClientId
  );
  const { profitData, loading: profitLoading } = useProductProfit(startDate, endDate);
  const { salesData, loading: salesLoading } = useSalesReport(startDate, endDate);
  const { invoices } = useInvoices();
  const { companies } = useCompanies();
  const { clients } = useClients();
  const { data: dashboardData } = useDashboard(t);
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
  const [taxStartOpen, setTaxStartOpen] = useState(false);
  const [taxEndOpen, setTaxEndOpen] = useState(false);
  
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
  
  // États pour le rapport de factures
  const [invoiceStatusFilters, setInvoiceStatusFilters] = useState<string[]>(['all']);
  const [invoiceCompanyFilter, setInvoiceCompanyFilter] = useState<string>('all');
  const [invoiceClientFilter, setInvoiceClientFilter] = useState<string>('all');

  // États pour le rapport de rappels
  const [reminderStartDate, setReminderStartDate] = useState<Date | undefined>();
  const [reminderEndDate, setReminderEndDate] = useState<Date | undefined>();
  const [reminderClientId, setReminderClientId] = useState<string>('all');
  const [reminderType, setReminderType] = useState<'all' | 'manual' | 'automatic'>('all');
  const [reminderInvoiceStatus, setReminderInvoiceStatus] = useState<'all' | 'draft' | 'sent' | 'paid' | 'overdue'>('all');

  const { logs: reminderLogs, loading: remindersLoading } = useReminderLogs(
    reminderStartDate,
    reminderEndDate,
    reminderClientId === 'all' ? undefined : reminderClientId,
    reminderType,
    reminderInvoiceStatus
  );

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
    
    // En mode mensuel, remplir tous les mois manquants entre le début et la fin
    if (viewMode === 'monthly' && data.length > 0) {
      const parsePeriod = (p: string) => {
        const [y, m] = p.split('-').map(Number);
        return new Date(y, m - 1, 1);
      };
      
      // Déterminer bornes: utiliser la sélection si dispo, sinon min/max des données
      const originalMonthly = realRevenueData.monthlyData; // déjà trié
      const startBound = startDate
        ? new Date(startDate.getFullYear(), startDate.getMonth(), 1)
        : parsePeriod(originalMonthly[0].period);
      const endBound = endDate
        ? new Date(endDate.getFullYear(), endDate.getMonth(), 1)
        : parsePeriod(originalMonthly[originalMonthly.length - 1].period);
      
      const map = new Map(data.map(d => [d.period, d]));
      const filled: RevenueByPeriod[] = [];
      const cursor = new Date(startBound);
      
      while (cursor <= endBound) {
        const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
        const entry = map.get(key) || { period: key, revenue: 0, invoiceCount: 0 };
        filled.push(entry);
        cursor.setMonth(cursor.getMonth() + 1);
      }
      
      data = filled;
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
    const dateLocale = language === 'fr' ? fr : enUS;
    
    // Title
    doc.setFontSize(18);
    doc.text(getReportTranslation('revenueReport', language) + ' - ' + getReportTranslation('details', language), pageWidth / 2, 20, { align: 'center' });
    
    // Date range
    let dateRangeText = '';
    if (startDate && endDate) {
      dateRangeText = `${format(startDate, 'dd/MM/yyyy', { locale: dateLocale })} - ${format(endDate, 'dd/MM/yyyy', { locale: dateLocale })}`;
    } else if (startDate) {
      dateRangeText = `${getReportTranslation('since', language)} ${format(startDate, 'dd/MM/yyyy', { locale: dateLocale })}`;
    } else if (endDate) {
      dateRangeText = `${getReportTranslation('until', language)} ${format(endDate, 'dd/MM/yyyy', { locale: dateLocale })}`;
    }
    
    if (dateRangeText) {
      doc.setFontSize(12);
      doc.text(dateRangeText, pageWidth / 2, 30, { align: 'center' });
    }
    
    // Filter info
    let filterText = getReportTranslation('allData', language);
    if (filterType === 'company' && selectedCompanyId) {
      const company = companies.find(c => c.id === selectedCompanyId);
      filterText = `${getReportTranslation('company', language)}: ${company?.name || getReportTranslation('unknown', language)}`;
    } else if (filterType === 'client' && selectedClientId) {
      const client = clients.find(c => c.id === selectedClientId);
      filterText = `${getReportTranslation('client', language)}: ${client?.name || getReportTranslation('unknown', language)}`;
    }
    doc.setFontSize(11);
    doc.text(`${getReportTranslation('filter', language)}: ${filterText}`, pageWidth / 2, 40, { align: 'center' });
    
    let yPosition = 60;
    
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
        const barChartTitle = `${t('reports.revenue.revenueEvolution')} ${viewMode === 'monthly' ? t('reports.revenue.perMonth').toLowerCase() : t('reports.revenue.perYear').toLowerCase()}`;
        doc.text(barChartTitle, 20, yPosition);
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
        doc.text(t('reports.revenue.revenueTrend'), 20, yPosition);
        yPosition += 10;
        
        const imgWidth = pageWidth - 40;
        const imgHeight = (lineCanvas.height * imgWidth) / lineCanvas.width;
        
        doc.addImage(lineImgData, 'PNG', 20, yPosition, imgWidth, imgHeight);
        yPosition += imgHeight + 20;
      }
    } catch (error) {
      console.error('Error capturing charts:', error);
      doc.setFontSize(12);
      doc.text(language === 'fr' ? 'Erreur lors de la capture des graphiques' : 'Error capturing charts', pageWidth / 2, yPosition, { align: 'center' });
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
        new Intl.NumberFormat(language === 'fr' ? 'fr-FR' : 'en-US', { style: 'currency', currency: 'CAD' }).format(item.revenue),
        item.invoiceCount.toString()
      ]);
      
      autoTable(doc, {
        head: [[getReportTranslation('period', language), getReportTranslation('revenue', language), getReportTranslation('totalInvoices', language)]],
        body: tableData,
        startY: yPosition,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
      });
    }
    
    const filename = `${getReportTranslation('revenueChartsFile', language)}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(filename);
  };

  // Filter invoices based on selected date range and paid status
  // Export functions
  const exportToPDF = () => {
    if (!realRevenueData || !chartData.length) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const dateLocale = language === 'fr' ? fr : enUS;
    
    // Title
    doc.setFontSize(20);
    doc.text(getReportTranslation('revenueReport', language), pageWidth / 2, 20, { align: 'center' });
    
    // Date range
    let dateRangeText = '';
    if (startDate && endDate) {
      dateRangeText = `${format(startDate, 'dd/MM/yyyy', { locale: dateLocale })} - ${format(endDate, 'dd/MM/yyyy', { locale: dateLocale })}`;
    } else if (startDate) {
      dateRangeText = `${getReportTranslation('since', language)} ${format(startDate, 'dd/MM/yyyy', { locale: dateLocale })}`;
    } else if (endDate) {
      dateRangeText = `${getReportTranslation('until', language)} ${format(endDate, 'dd/MM/yyyy', { locale: dateLocale })}`;
    }
    
    doc.setFontSize(12);
    doc.text(dateRangeText, pageWidth / 2, 30, { align: 'center' });
    
    // Filter info
    let filterText = getReportTranslation('allData', language);
    if (filterType === 'company' && selectedCompanyId) {
      const company = companies.find(c => c.id === selectedCompanyId);
      filterText = `${getReportTranslation('company', language)}: ${company?.name || getReportTranslation('unknown', language)}`;
    } else if (filterType === 'client' && selectedClientId) {
      const client = clients.find(c => c.id === selectedClientId);
      filterText = `${getReportTranslation('client', language)}: ${client?.name || getReportTranslation('unknown', language)}`;
    }
    doc.text(`${getReportTranslation('filter', language)}: ${filterText}`, pageWidth / 2, 40, { align: 'center' });
    
    // Summary statistics
    doc.setFontSize(14);
    doc.text(getReportTranslation('summary', language), 20, 60);
    doc.setFontSize(10);
    doc.text(`${getReportTranslation('totalRevenue', language)}: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(realRevenueData.totalRevenue)}`, 20, 70);
    doc.text(`${getReportTranslation(viewMode === 'monthly' ? 'numberOfMonths' : 'numberOfYears', language)}: ${viewMode === 'monthly' ? realRevenueData.monthlyData.length : realRevenueData.yearlyData.length}`, 20, 80);
    doc.text(`${getReportTranslation(viewMode === 'monthly' ? 'averageRevenuePerMonth' : 'averageRevenuePerYear', language)}: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(realRevenueData.totalRevenue / Math.max(1, viewMode === 'monthly' ? realRevenueData.monthlyData.length : realRevenueData.yearlyData.length))}`, 20, 90);
    
    // Revenue by period table
    const tableData = chartData.map(item => [
      item.period,
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.revenue),
      item.invoiceCount.toString(),
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.revenue / item.invoiceCount)
    ]);
    
    let finalY = 110;
    autoTable(doc, {
      head: [[getReportTranslation('period', language), getReportTranslation('revenue', language), getReportTranslation('totalInvoices', language), getReportTranslation('avgPerInvoice', language)]],
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
    const filename = `${getReportTranslation('revenueReportFile', language)}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(filename);
  };

  // Export functions for taxes
  const exportTaxesToPDF = () => {
    if (!taxData) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const dateLocale = language === 'fr' ? fr : enUS;
    
    // Title
    doc.setFontSize(20);
    doc.text(getReportTranslation('taxReport', language), pageWidth / 2, 20, { align: 'center' });
    
    // Date generated
    doc.setFontSize(12);
    doc.text(`${getReportTranslation('generatedOn', language)}: ${format(new Date(), 'dd/MM/yyyy', { locale: dateLocale })}`, pageWidth / 2, 30, { align: 'center' });
    
    // Company filter
    if (taxSelectedCompany && taxSelectedCompany !== 'all') {
      const companyName = companies.find(c => c.id === taxSelectedCompany)?.name;
      doc.text(`${getReportTranslation('company', language)}: ${companyName}`, pageWidth / 2, 40, { align: 'center' });
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
    const filename = `${getReportTranslation('taxReportFile', language)}${companyFilter}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(filename);
  };

  const exportTaxesToExcel = () => {
    if (!taxData) return;
    
    const wb = XLSX.utils.book_new();
    const dateLocale = language === 'fr' ? fr : enUS;
    
    // Summary sheet
    const summaryData = [
      [getReportTranslation('taxName', language), getReportTranslation('amount', language), getReportTranslation('totalInvoices', language)],
      ...taxData.taxSummary.map(tax => [
        tax.name,
        tax.amount,
        tax.invoiceCount
      ])
    ];
    
    const summaryWs = XLSX.utils.aoa_to_sheet([
      [`${getReportTranslation('taxReport', language)} - ${format(new Date(), 'dd/MM/yyyy', { locale: dateLocale })}`],
      taxSelectedCompany && taxSelectedCompany !== 'all' 
        ? [`${getReportTranslation('company', language)}: ${companies.find(c => c.id === taxSelectedCompany)?.name}`]
        : [getReportTranslation('allCompanies', language)],
      taxEffectiveStart && taxEffectiveEnd 
        ? [`${getReportTranslation('period', language)}: ${format(taxEffectiveStart, 'dd/MM/yyyy', { locale: dateLocale })} - ${format(taxEffectiveEnd, 'dd/MM/yyyy', { locale: dateLocale })}`]
        : [],
      [`${getReportTranslation('totalTax', language)}: ${taxData.totalTaxAmount}`],
      [],
      ...summaryData
    ].filter(row => row.length > 0));
    
    XLSX.utils.book_append_sheet(wb, summaryWs, getReportTranslation('summary', language));
    
    // Monthly/Yearly data sheet
    const periodData = taxViewMode === 'monthly' ? taxData.monthlyData : taxData.yearlyData;
    const periodSheetData = [
      [getReportTranslation('period', language), getReportTranslation('totalTax', language), getReportTranslation('totalInvoices', language), getReportTranslation('taxDetails', language)],
      ...periodData.map(period => [
        period.period,
        period.totalTaxAmount,
        period.invoiceCount,
        period.taxBreakdown.map(tax => `${tax.name}: ${tax.amount}`).join(', ')
      ])
    ];
    
    const periodWs = XLSX.utils.aoa_to_sheet(periodSheetData);
    XLSX.utils.book_append_sheet(wb, periodWs, taxViewMode === 'monthly' ? getReportTranslation('month', language) : getReportTranslation('year', language));
    
    // Generate filename and save
    const companyFilter = taxSelectedCompany && taxSelectedCompany !== 'all' 
      ? `-${companies.find(c => c.id === taxSelectedCompany)?.name?.replace(/\s+/g, '-')}`
      : '';
    const filename = `${getReportTranslation('taxReportFile', language)}${companyFilter}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  // Export functions for products
  const exportProductsToPDF = async () => {
    if (!products || products.length === 0) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Title
    doc.setFontSize(20);
    doc.text(t("reports.pdf.inventoryReport"), pageWidth / 2, 20, { align: 'center' });
    
    // Filters
    doc.setFontSize(12);
    let filterText = t("reports.pdf.allPeriods");
    if (customStartDate && customEndDate) {
      filterText = `${t("reports.pdf.period")}: ${format(customStartDate, 'dd/MM/yyyy')} - ${format(customEndDate, 'dd/MM/yyyy')}`;
    } else if (customStartDate) {
      filterText = `${t("reports.pdf.since")} ${format(customStartDate, 'dd/MM/yyyy')}`;
    } else if (customEndDate) {
      filterText = `${t("reports.pdf.until")} ${format(customEndDate, 'dd/MM/yyyy')}`;
    }
    doc.text(filterText, pageWidth / 2, 30, { align: 'center' });
    
    // Company filter
    if (productFilterType === 'company' && productSelectedCompanyId) {
      const company = companies?.find(c => c.id === productSelectedCompanyId);
      if (company) {
        doc.text(`${t("reports.pdf.company")}: ${company.name}`, pageWidth / 2, 38, { align: 'center' });
      }
    } else {
      doc.text(t("reports.pdf.allCompanies"), pageWidth / 2, 38, { align: 'center' });
    }
    
    // Summary
    const totalProducts = products.length;
    const activeProducts = products.filter(p => p.is_active).length;
    const lowStockProducts = products.filter(p => (p.quantity || 0) <= 5 && p.is_active).length;
    const totalInventoryValue = products.reduce((total, p) => total + ((p.quantity || 0) * (p.cost || 0)), 0);
    
    doc.text(`${t("reports.pdf.reportDate")}: ${format(new Date(), 'dd/MM/yyyy')}`, 20, 55);
    doc.text(`${t("reports.pdf.totalProducts")}: ${totalProducts}`, 20, 65);
    doc.text(`${t("reports.pdf.activeProducts")}: ${activeProducts}`, 20, 75);
    doc.text(`${t("reports.pdf.lowStockAlerts")}: ${lowStockProducts}`, 20, 85);
    doc.text(`${t("reports.pdf.totalInventoryValue")}: $${totalInventoryValue.toFixed(2)}`, 20, 95);
    
    let yPosition = 115;
    
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
    
    const filename = `${getReportTranslation('inventoryReportFile', language)}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
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
    
    const filename = `${getReportTranslation('inventoryReportFile', language)}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
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
    const filename = `${getReportTranslation('revenueReportFile', language)}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  // Export functions for clients
  const exportClientsToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const dateLocale = language === 'fr' ? fr : enUS;
    
    // Title
    doc.setFontSize(20);
    doc.text(getReportTranslation('clientsReport', language), pageWidth / 2, 20, { align: 'center' });
    
    // Date generated
    doc.setFontSize(12);
    doc.text(`${getReportTranslation('generatedOn', language)}: ${format(new Date(), 'dd/MM/yyyy', { locale: dateLocale })}`, pageWidth / 2, 30, { align: 'center' });
    
    // Summary
    doc.setFontSize(14);
    doc.text(getReportTranslation('summary', language), 20, 50);
    doc.setFontSize(10);
    doc.text(`${getReportTranslation('numberOfClients', language)}: ${clients.length}`, 20, 60);
    doc.text(`${getReportTranslation('numberOfCompanies', language)}: ${companies.length}`, 20, 70);
    
    let yPosition = 90;
    
    // All clients table
    const allClientsData = clients.map(client => [
      client.name,
      client.companies?.name || getReportTranslation('withoutCompany', language),
      client.email || 'N/A',
      client.phone || 'N/A',
      client.contact_person || 'N/A'
    ]);
    
    autoTable(doc, {
      head: [[getReportTranslation('clientName', language), getReportTranslation('company', language), getReportTranslation('email', language), getReportTranslation('phone', language), getReportTranslation('contactPerson', language)]],
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
    doc.text(getReportTranslation('companyBreakdown', language), 20, yPosition);
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
        doc.text(`${company.name} (${companyClients.length} ${getReportTranslation('client', language).toLowerCase()}${companyClients.length > 1 ? 's' : ''})`, 20, yPosition);
        yPosition += 10;
        
        const companyClientsData = companyClients.map(client => [
          client.name,
          client.email || 'N/A',
          client.phone || 'N/A',
          client.contact_person || 'N/A'
        ]);
        
        autoTable(doc, {
          head: [[getReportTranslation('clientName', language), getReportTranslation('email', language), getReportTranslation('phone', language), getReportTranslation('contactPerson', language)]],
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
    const filename = `${getReportTranslation('clientsReportFile', language)}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
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
    const filename = `${getReportTranslation('clientsReportFile', language)}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
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
    const dateLocale = language === 'fr' ? fr : enUS;
    
    // Title
    doc.setFontSize(20);
    doc.text(getReportTranslation('expensesReport', language), pageWidth / 2, 20, { align: 'center' });
    
    // Date range
    doc.setFontSize(12);
    let dateRangeText = getReportTranslation('generatedOn', language) + ': ' + format(new Date(), 'dd/MM/yyyy', { locale: dateLocale });
    if (expenseStartDate && expenseEndDate) {
      dateRangeText = `${getReportTranslation('period', language)}: ${format(expenseStartDate, 'dd/MM/yyyy', { locale: dateLocale })} - ${format(expenseEndDate, 'dd/MM/yyyy', { locale: dateLocale })}`;
    } else if (expenseStartDate) {
      dateRangeText = `${getReportTranslation('since', language)}: ${format(expenseStartDate, 'dd/MM/yyyy', { locale: dateLocale })}`;
    } else if (expenseEndDate) {
      dateRangeText = `${getReportTranslation('until', language)}: ${format(expenseEndDate, 'dd/MM/yyyy', { locale: dateLocale })}`;
    }
    doc.text(dateRangeText, pageWidth / 2, 35, { align: 'center' });
    
    // Filter info
    let filterText = getReportTranslation('all', language);
    if (expenseFilterType === 'company' && expenseSelectedCompanyId) {
      const company = companies.find(c => c.id === expenseSelectedCompanyId);
      filterText = `${getReportTranslation('company', language)}: ${company?.name || getReportTranslation('unknown', language)}`;
    } else if (expenseFilterType === 'category' && expenseSelectedCategory) {
      filterText = `${getReportTranslation('category', language)}: ${expenseSelectedCategory}`;
    }
    doc.setFontSize(11);
    doc.text(`${getReportTranslation('filter', language)}: ${filterText}`, pageWidth / 2, 45, { align: 'center' });
    
    // Summary
    doc.setFontSize(14);
    doc.text(getReportTranslation('summary', language), 20, 65);
    doc.setFontSize(12);
    doc.text(`${getReportTranslation('totalExpenses', language)}: $${expenseReportData.totalExpenses.toFixed(2)}`, 20, 80);
    doc.text(`${getStatusLabel('paid', language)} ${getReportTranslation('expensesReport', language)}: $${expenseReportData.totalPaidExpenses.toFixed(2)}`, 20, 90);
    doc.text(`${getStatusLabel('pending', language)} ${getReportTranslation('expensesReport', language)}: $${expenseReportData.totalUnpaidExpenses.toFixed(2)}`, 20, 100);
    
    let yPosition = 120;
    
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
        
        yPosition = (doc as any).lastAutoTable.finalY + 20;
      }
      
      // Detailed Expenses table with taxes
      if (expenseReportData.expenseDetails.length > 0) {
        // Check if we need a new page
        if (yPosition > 220) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFontSize(14);
        doc.text('Detailed Expenses with Taxes', 20, yPosition);
        yPosition += 10;
        
        const detailTableData = expenseReportData.expenseDetails.map(expense => {
          const taxLines = (expense.taxes || []).map((tax: any) => {
            // Use the stored amount directly if it exists, otherwise calculate it
            let amount = 0;
            if (typeof tax?.amount === 'number') {
              // Use the stored amount directly (user-entered value)
              amount = Number(tax.amount);
            } else if (typeof tax?.percentage === 'number') {
              // Fallback: calculate from percentage if amount not stored
              amount = Number(expense.amount) * Number(tax.percentage) / 100;
            } else if (tax?.type === 'percentage' && typeof tax?.value === 'number') {
              // Fallback: calculate from type/value format
              amount = Number(expense.amount) * Number(tax.value) / 100;
            } else if (tax?.type === 'amount' && typeof tax?.value === 'number') {
              // Fallback: use value if type is amount
              amount = Number(tax.value);
            }
            
            const label = typeof tax?.percentage === 'number'
              ? `${tax.name} (${tax.percentage}%)`
              : (tax?.type === 'percentage' && typeof tax?.value === 'number')
                ? `${tax.name} (${tax.value}%)`
                : `${tax.name}`;
            return { label, amount };
          });
          const totalTaxes = taxLines.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
          const totalWithTaxes = Number(expense.amount) + totalTaxes;
          const taxesDetail = taxLines.length
            ? taxLines.map((t: any) => `${t.label}: $${(t.amount || 0).toFixed(2)}`).join('; ')
            : '-';
          
          return [
            format(new Date(expense.expense_date), 'dd/MM/yyyy'),
            expense.description,
            expense.category,
            expense.company_name || '-',
            expense.vendor || '-',
            '$' + Number(expense.amount).toFixed(2),
            taxesDetail,
            '$' + totalTaxes.toFixed(2),
            '$' + totalWithTaxes.toFixed(2),
            expense.status === 'paid' ? 'Paid' : 'Unpaid'
          ];
        });
        
        autoTable(doc, {
          head: [['Date', 'Description', 'Category', 'Company', 'Vendor', 'Amount', 'Tax Details', 'Total Taxes', 'Total', 'Status']],
          body: detailTableData,
          startY: yPosition,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [34, 197, 94] },
          columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 25 },
            2: { cellWidth: 20 },
            3: { cellWidth: 20 },
            4: { cellWidth: 20 },
            5: { cellWidth: 18 },
            6: { cellWidth: 30 },
            7: { cellWidth: 18 },
            8: { cellWidth: 18 },
            9: { cellWidth: 15 }
          },
        });
        
        yPosition = (doc as any).lastAutoTable.finalY + 20;
        
        // Calculate tax totals by type
        const taxTotalsByType: { [key: string]: number } = {};
        expenseReportData.expenseDetails.forEach(expense => {
          (expense.taxes || []).forEach((tax: any) => {
            // Use the stored amount directly if it exists, otherwise calculate it
            let amount = 0;
            if (typeof tax?.amount === 'number') {
              // Use the stored amount directly (user-entered value)
              amount = Number(tax.amount);
            } else if (typeof tax?.percentage === 'number') {
              // Fallback: calculate from percentage if amount not stored
              amount = Number(expense.amount) * Number(tax.percentage) / 100;
            } else if (tax?.type === 'percentage' && typeof tax?.value === 'number') {
              // Fallback: calculate from type/value format
              amount = Number(expense.amount) * Number(tax.value) / 100;
            } else if (tax?.type === 'amount' && typeof tax?.value === 'number') {
              // Fallback: use value if type is amount
              amount = Number(tax.value);
            }
            const taxName = tax?.name || 'Unknown Tax';
            taxTotalsByType[taxName] = (taxTotalsByType[taxName] || 0) + amount;
          });
        });
        
        // Add Tax Summary table
        if (Object.keys(taxTotalsByType).length > 0) {
          // Check if we need a new page
          if (yPosition > 220) {
            doc.addPage();
            yPosition = 20;
          }
          
          doc.setFontSize(14);
          doc.text('Tax Summary by Type', 20, yPosition);
          yPosition += 10;
          
          const taxSummaryData = Object.entries(taxTotalsByType).map(([taxName, total]) => [
            taxName,
            '$' + total.toFixed(2)
          ]);
          
          // Add total row
          const grandTotalTaxes = Object.values(taxTotalsByType).reduce((sum, val) => sum + val, 0);
          taxSummaryData.push(['Total Taxes', '$' + grandTotalTaxes.toFixed(2)]);
          
          autoTable(doc, {
            head: [['Tax Type', 'Total Amount']],
            body: taxSummaryData,
            startY: yPosition,
            styles: { fontSize: 10 },
            headStyles: { fillColor: [168, 85, 247] },
            columnStyles: {
              0: { cellWidth: 100 },
              1: { cellWidth: 60 }
            },
          });
        }
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
    
    const filename = `${getReportTranslation('expenseReportFile', language)}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(filename);
  };

  const exportExpenseCategoryChartToPDF = async () => {
    if (!expenseReportData || expenseReportData.expensesByCategory.length === 0) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const dateLocale = language === 'fr' ? fr : enUS;
    
    // Title
    doc.setFontSize(20);
    doc.text(t("reports.expenses.byCategory"), pageWidth / 2, 20, { align: 'center' });
    
    // Date range
    doc.setFontSize(12);
    let dateRangeText = getReportTranslation('generatedOn', language) + ': ' + format(new Date(), 'dd/MM/yyyy', { locale: dateLocale });
    if (expenseStartDate && expenseEndDate) {
      dateRangeText = `${getReportTranslation('period', language)}: ${format(expenseStartDate, 'dd/MM/yyyy', { locale: dateLocale })} - ${format(expenseEndDate, 'dd/MM/yyyy', { locale: dateLocale })}`;
    }
    doc.text(dateRangeText, pageWidth / 2, 35, { align: 'center' });
    
    let yPosition = 50;
    
    try {
      // Capture Category Chart
      if (expenseCategoryChartRef.current) {
        const categoryCanvas = await html2canvas(expenseCategoryChartRef.current, {
          backgroundColor: '#ffffff',
          scale: 2,
          useCORS: true
        });
        const categoryImgData = categoryCanvas.toDataURL('image/png');
        
        const imgWidth = pageWidth - 40;
        const imgHeight = (categoryCanvas.height * imgWidth) / categoryCanvas.width;
        
        doc.addImage(categoryImgData, 'PNG', 20, yPosition, imgWidth, imgHeight);
        yPosition += imgHeight + 20;
      }
      
      // Add data table
      if (yPosition > 200) {
        doc.addPage();
        yPosition = 20;
      }
      
      const categoryTableData = expenseReportData.expensesByCategory.map(category => [
        category.category,
        category.count.toString(),
        '$' + category.total_amount.toFixed(2),
        '$' + (category.total_amount / category.count).toFixed(2)
      ]);
      
      autoTable(doc, {
        head: [[t("reports.expenses.category"), t("reports.expenses.count"), t("reports.expenses.totalAmount"), t("reports.expenses.averageAmount")]],
        body: categoryTableData,
        startY: yPosition,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [239, 68, 68] },
      });
    } catch (error) {
      console.error('Error capturing chart:', error);
    }
    
    const filename = `${t("reports.expenses.byCategory")}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(filename);
  };

  const exportExpenseCompanyChartToPDF = async () => {
    if (!expenseReportData || expenseReportData.expensesByCompany.length === 0) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const dateLocale = language === 'fr' ? fr : enUS;
    
    // Title
    doc.setFontSize(20);
    doc.text(t("reports.expenses.byCompany"), pageWidth / 2, 20, { align: 'center' });
    
    // Date range
    doc.setFontSize(12);
    let dateRangeText = getReportTranslation('generatedOn', language) + ': ' + format(new Date(), 'dd/MM/yyyy', { locale: dateLocale });
    if (expenseStartDate && expenseEndDate) {
      dateRangeText = `${getReportTranslation('period', language)}: ${format(expenseStartDate, 'dd/MM/yyyy', { locale: dateLocale })} - ${format(expenseEndDate, 'dd/MM/yyyy', { locale: dateLocale })}`;
    }
    doc.text(dateRangeText, pageWidth / 2, 35, { align: 'center' });
    
    let yPosition = 50;
    
    try {
      // Capture Company Chart
      if (expenseCompanyChartRef.current) {
        const companyCanvas = await html2canvas(expenseCompanyChartRef.current, {
          backgroundColor: '#ffffff',
          scale: 2,
          useCORS: true
        });
        const companyImgData = companyCanvas.toDataURL('image/png');
        
        const imgWidth = pageWidth - 40;
        const imgHeight = (companyCanvas.height * imgWidth) / companyCanvas.width;
        
        doc.addImage(companyImgData, 'PNG', 20, yPosition, imgWidth, imgHeight);
        yPosition += imgHeight + 20;
      }
      
      // Add data table
      if (yPosition > 200) {
        doc.addPage();
        yPosition = 20;
      }
      
      const companyTableData = expenseReportData.expensesByCompany.map(company => [
        company.company_name,
        company.count.toString(),
        '$' + company.total_amount.toFixed(2),
        '$' + (company.total_amount / company.count).toFixed(2)
      ]);
      
      autoTable(doc, {
        head: [[t("reports.expenses.company"), t("reports.expenses.count"), t("reports.expenses.totalAmount"), t("reports.expenses.averageAmount")]],
        body: companyTableData,
        startY: yPosition,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [59, 130, 246] },
      });
    } catch (error) {
      console.error('Error capturing chart:', error);
    }
    
    const filename = `${t("reports.expenses.byCompany")}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(filename);
  };

  const exportExpensesToExcel = () => {
    if (!expenseReportData) return;
    
    const wb = XLSX.utils.book_new();
    const dateLocale = language === 'fr' ? fr : enUS;
    
    // Summary sheet
    const summaryData = [
      [getReportTranslation('expensesReport', language)],
      [''],
      [getReportTranslation('generatedOn', language), format(new Date(), 'dd/MM/yyyy', { locale: dateLocale })],
      ...(expenseStartDate && expenseEndDate ? [[getReportTranslation('period', language), `${format(expenseStartDate, 'dd/MM/yyyy', { locale: dateLocale })} - ${format(expenseEndDate, 'dd/MM/yyyy', { locale: dateLocale })}`]] : []),
      [''],
      [getReportTranslation('totalExpenses', language), expenseReportData.totalExpenses],
      [`${getStatusLabel('paid', language)} ${getReportTranslation('expensesReport', language)}`, expenseReportData.totalPaidExpenses],
      [`${getStatusLabel('pending', language)} ${getReportTranslation('expensesReport', language)}`, expenseReportData.totalUnpaidExpenses],
    ];
    
    const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWS, getReportTranslation('summary', language));
    
    // Expenses by Category sheet
    if (expenseReportData.expensesByCategory.length > 0) {
      const categoryData = [
        [getReportTranslation('expensesByCategory', language)],
        [''],
        [getReportTranslation('category', language), getReportTranslation('totalInvoices', language), getReportTranslation('amount', language), getReportTranslation('avgPerInvoice', language)],
        ...expenseReportData.expensesByCategory.map(category => [
          category.category,
          category.count,
          category.total_amount,
          category.total_amount / category.count
        ])
      ];
      
      const categoryWS = XLSX.utils.aoa_to_sheet(categoryData);
      XLSX.utils.book_append_sheet(wb, categoryWS, getReportTranslation('category', language));
    }
    
    // Expenses by Company sheet
    if (expenseReportData.expensesByCompany.length > 0) {
      const companyData = [
        [getReportTranslation('expensesByCompany', language)],
        [''],
        [getReportTranslation('company', language), getReportTranslation('totalInvoices', language), getReportTranslation('amount', language), getReportTranslation('avgPerInvoice', language)],
        ...expenseReportData.expensesByCompany.map(company => [
          company.company_name,
          company.count,
          company.total_amount,
          company.total_amount / company.count
        ])
      ];
      
      const companyWS = XLSX.utils.aoa_to_sheet(companyData);
      XLSX.utils.book_append_sheet(wb, companyWS, getReportTranslation('company', language));
    }
    
    // Detailed Expenses with Taxes sheet
    if (expenseReportData.expenseDetails.length > 0) {
      const detailData = [
        ['Detailed Expenses with Taxes'],
        [''],
        ['Date', 'Description', 'Category', 'Company', 'Vendor', 'Amount', 'Tax Details', 'Total Taxes', 'Total with Taxes', 'Status'],
        ...expenseReportData.expenseDetails.map(expense => {
          const taxLines = (expense.taxes || []).map((tax: any) => {
            // Use the stored amount directly if it exists, otherwise calculate it
            let amount = 0;
            if (typeof tax?.amount === 'number') {
              // Use the stored amount directly (user-entered value)
              amount = Number(tax.amount);
            } else if (typeof tax?.percentage === 'number') {
              // Fallback: calculate from percentage if amount not stored
              amount = Number(expense.amount) * Number(tax.percentage) / 100;
            } else if (tax?.type === 'percentage' && typeof tax?.value === 'number') {
              // Fallback: calculate from type/value format
              amount = Number(expense.amount) * Number(tax.value) / 100;
            } else if (tax?.type === 'amount' && typeof tax?.value === 'number') {
              // Fallback: use value if type is amount
              amount = Number(tax.value);
            }
            
            const label = typeof tax?.percentage === 'number'
              ? `${tax.name} (${tax.percentage}%)`
              : (tax?.type === 'percentage' && typeof tax?.value === 'number')
                ? `${tax.name} (${tax.value}%)`
                : `${tax.name}`;
            return { label, amount };
          });
          const totalTaxes = taxLines.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
          const totalWithTaxes = Number(expense.amount) + totalTaxes;
          const taxesDetail = taxLines.length
            ? taxLines.map((t: any) => `${t.label}: $${(t.amount || 0).toFixed(2)}`).join('; ')
            : '-';
          
          return [
            format(new Date(expense.expense_date), 'dd/MM/yyyy'),
            expense.description,
            expense.category,
            expense.company_name || '-',
            expense.vendor || '-',
            Number(expense.amount),
            taxesDetail,
            totalTaxes,
            totalWithTaxes,
            expense.status === 'paid' ? 'Paid' : 'Unpaid'
          ];
        })
      ];
      
      const detailWS = XLSX.utils.aoa_to_sheet(detailData);
      XLSX.utils.book_append_sheet(wb, detailWS, 'Detailed Expenses');
    }
    
    // Tax Summary by Type sheet
    const taxTotalsByType: { [key: string]: number } = {};
    expenseReportData.expenseDetails.forEach(expense => {
      (expense.taxes || []).forEach((tax: any) => {
        // Use the stored amount directly if it exists, otherwise calculate it
        let amount = 0;
        if (typeof tax?.amount === 'number') {
          // Use the stored amount directly (user-entered value)
          amount = Number(tax.amount);
        } else if (typeof tax?.percentage === 'number') {
          // Fallback: calculate from percentage if amount not stored
          amount = Number(expense.amount) * Number(tax.percentage) / 100;
        } else if (tax?.type === 'percentage' && typeof tax?.value === 'number') {
          // Fallback: calculate from type/value format
          amount = Number(expense.amount) * Number(tax.value) / 100;
        } else if (tax?.type === 'amount' && typeof tax?.value === 'number') {
          // Fallback: use value if type is amount
          amount = Number(tax.value);
        }
        const taxName = tax?.name || 'Unknown Tax';
        taxTotalsByType[taxName] = (taxTotalsByType[taxName] || 0) + amount;
      });
    });
    
    if (Object.keys(taxTotalsByType).length > 0) {
      const taxSummaryData = [
        ['Tax Summary by Type'],
        [''],
        ['Tax Type', 'Total Amount'],
        ...Object.entries(taxTotalsByType).map(([taxName, total]) => [
          taxName,
          total
        ]),
        [''],
        ['Total Taxes', Object.values(taxTotalsByType).reduce((sum, val) => sum + val, 0)]
      ];
      
      const taxSummaryWS = XLSX.utils.aoa_to_sheet(taxSummaryData);
      XLSX.utils.book_append_sheet(wb, taxSummaryWS, 'Tax Summary');
    }
    
    const filename = `${getReportTranslation('expenseReportFile', language)}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  // Export functions for product profits
  const exportProductProfitToPDF = async () => {
    if (!filteredProfitData) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const dateLocale = language === 'fr' ? fr : enUS;
    
    // Title
    doc.setFontSize(20);
    doc.text(getReportTranslation('productProfitReport', language), pageWidth / 2, 20, { align: 'center' });
    
    // Date range
    doc.setFontSize(12);
    let dateRangeText = t("reports.pdf.allPeriods");
    if (customStartDate && customEndDate) {
      dateRangeText = `${t("reports.pdf.period")}: ${format(customStartDate, 'dd/MM/yyyy')} - ${format(customEndDate, 'dd/MM/yyyy')}`;
    } else if (customStartDate) {
      dateRangeText = `${t("reports.pdf.since")} ${format(customStartDate, 'dd/MM/yyyy')}`;
    } else if (customEndDate) {
      dateRangeText = `${t("reports.pdf.until")} ${format(customEndDate, 'dd/MM/yyyy')}`;
    }
    doc.text(dateRangeText, pageWidth / 2, 30, { align: 'center' });
    
    // Company filter
    let companyFilterText = t("reports.pdf.allCompanies");
    if (productFilterType === 'company' && productSelectedCompanyId) {
      const company = companies.find(c => c.id === productSelectedCompanyId);
      companyFilterText = `${t("reports.pdf.company")}: ${company?.name || 'Inconnue'}`;
    }
    doc.setFontSize(11);
    doc.text(`${companyFilterText}`, pageWidth / 2, 40, { align: 'center' });
    
    // Summary
    doc.setFontSize(14);
    doc.text(t("reports.pdf.summary"), 20, 60);
    doc.setFontSize(12);
    doc.text(`${t("reports.products.totalProfit")}: $${filteredProfitData.totalProfit.toFixed(2)}`, 20, 75);
    doc.text(`${t("reports.products.totalRevenue")}: $${filteredProfitData.totalRevenue.toFixed(2)}`, 20, 85);
    doc.text(`${t("reports.products.totalCost")}: $${filteredProfitData.totalCost.toFixed(2)}`, 20, 95);
    doc.text(`${t("reports.products.overallMargin")}: ${filteredProfitData.overallMargin.toFixed(1)}%`, 20, 105);
    
    let yPosition = 125;
    
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
        doc.text(t("reports.pdf.profitByProductChart"), 20, yPosition);
        yPosition += 10;
        
        const imgWidth = pageWidth - 40;
        const imgHeight = (chartCanvas.height * imgWidth) / chartCanvas.width;
        
        // Check if we need a new page
        if (yPosition + imgHeight > 280) {
          doc.addPage();
          yPosition = 20;
          doc.setFontSize(14);
          doc.text(t("reports.pdf.profitByProductChart"), 20, yPosition);
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
        doc.text(t("reports.pdf.productDetails"), 20, yPosition);
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
          head: [[t("reports.products.product"), t("reports.products.qtySold"), t("reports.products.revenue"), t("reports.products.cost"), t("reports.products.profit"), t("reports.products.marginPercent"), t("reports.products.avgPrice")]],
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
    
    const filename = `${getReportTranslation('productProfitReportFile', language)}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(filename);
  };

  const exportProductProfitToExcel = () => {
    if (!filteredProfitData) return;
    
    const wb = XLSX.utils.book_new();
    const dateLocale = language === 'fr' ? fr : enUS;
    
    // Summary sheet
    const summaryData = [
      [getReportTranslation('productProfitReport', language)],
      [''],
      [getReportTranslation('generatedOn', language), format(new Date(), 'dd/MM/yyyy', { locale: dateLocale })],
      ...(customStartDate && customEndDate ? [[getReportTranslation('period', language), `${format(customStartDate, 'dd/MM/yyyy', { locale: dateLocale })} - ${format(customEndDate, 'dd/MM/yyyy', { locale: dateLocale })}`]] : []),
      [''],
      [getReportTranslation('profit', language), filteredProfitData.totalProfit],
      [getReportTranslation('revenue', language), filteredProfitData.totalRevenue],
      [getReportTranslation('totalCost', language), filteredProfitData.totalCost],
      [getReportTranslation('overallMargin', language) + ' (%)', filteredProfitData.overallMargin],
    ];
    
    const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWS, getReportTranslation('summary', language));
    
    // Product details sheet
    if (filteredProfitData.products.length > 0) {
      const productData = [
        [getReportTranslation('productDetails', language)],
        [''],
        [getReportTranslation('product', language), getReportTranslation('soldQuantity', language), getReportTranslation('revenue', language), getReportTranslation('cost', language), getReportTranslation('profit', language), getReportTranslation('margin', language) + ' (%)', getReportTranslation('avgSalePrice', language), getReportTranslation('avgCostPrice', language)],
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
      XLSX.utils.book_append_sheet(wb, productWS, getReportTranslation('details', language));
    }
    
    const filename = `${getReportTranslation('productProfitReportFile', language)}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  // Export functions for sales report
  const exportSalesReportToPDF = async () => {
    if (!salesData) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Title
    doc.setFontSize(20);
    doc.text(t("reports.pdf.salesReport"), pageWidth / 2, 20, { align: 'center' });
    
    // Date range
    doc.setFontSize(12);
    let dateRangeText = t("reports.pdf.allPeriods");
    if (customStartDate && customEndDate) {
      dateRangeText = `${t("reports.pdf.period")}: ${format(customStartDate, 'dd/MM/yyyy')} - ${format(customEndDate, 'dd/MM/yyyy')}`;
    } else if (customStartDate) {
      dateRangeText = `${t("reports.pdf.since")} ${format(customStartDate, 'dd/MM/yyyy')}`;
    } else if (customEndDate) {
      dateRangeText = `${t("reports.pdf.until")} ${format(customEndDate, 'dd/MM/yyyy')}`;
    }
    doc.text(dateRangeText, pageWidth / 2, 35, { align: 'center' });
    
    // Company filter
    if (productFilterType === 'company' && productSelectedCompanyId) {
      const company = companies?.find(c => c.id === productSelectedCompanyId);
      if (company) {
        doc.text(`${t("reports.pdf.company")}: ${company.name}`, pageWidth / 2, 43, { align: 'center' });
      }
    } else {
      doc.text(t("reports.pdf.allCompanies"), pageWidth / 2, 43, { align: 'center' });
    }
    
    // Summary
    doc.setFontSize(14);
    doc.text(t("reports.pdf.summary"), 20, 63);
    doc.setFontSize(12);
    doc.text(`${t("reports.products.totalRevenue")}: $${salesData.totalRevenue.toFixed(2)}`, 20, 78);
    doc.text(`${t("reports.products.totalQuantitySold")}: ${salesData.totalQuantitySold}`, 20, 88);
    doc.text(`${t("reports.products.numberOfSales")}: ${salesData.totalNumberOfSales}`, 20, 98);
    doc.text(`${t("reports.products.productsSold")}: ${salesData.uniqueProductsSold}`, 20, 108);
    
    let yPosition = 128;
    
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
        doc.text(t("reports.pdf.revenueByProductChart"), 20, yPosition);
        yPosition += 10;
        
        const imgWidth = pageWidth - 40;
        const imgHeight = (chartCanvas.height * imgWidth) / chartCanvas.width;
        
        // Check if we need a new page
        if (yPosition + imgHeight > 280) {
          doc.addPage();
          yPosition = 20;
          doc.setFontSize(14);
          doc.text(t("reports.pdf.revenueByProductChart"), 20, yPosition);
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
        doc.text(t("reports.pdf.revenueByServiceChart"), 20, yPosition);
        yPosition += 10;
        
        const serviceImgWidth = pageWidth - 40;
        const serviceImgHeight = (serviceChartCanvas.height * serviceImgWidth) / serviceChartCanvas.width;
        
        // Check if we need a new page for the service chart
        if (yPosition + serviceImgHeight > 280) {
          doc.addPage();
          yPosition = 20;
          doc.setFontSize(14);
          doc.text(t("reports.pdf.revenueByServiceChart"), 20, yPosition);
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
        doc.text(t("reports.pdf.salesDetails"), 20, yPosition);
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
          head: [[t("reports.products.productServiceLabel"), t("reports.products.qtySold"), t("reports.products.revenue"), t("reports.products.salesCount"), t("reports.products.avgPrice"), t("reports.products.firstSale"), t("reports.products.lastSale")]],
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
    
    const filename = `${getReportTranslation('salesReportFile', language)}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(filename);
  };

  const exportSalesReportToExcel = () => {
    if (!salesData) return;
    
    const wb = XLSX.utils.book_new();
    const dateLocale = language === 'fr' ? fr : enUS;
    
    // Summary sheet
    const summaryData = [
      [getReportTranslation('salesReport', language)],
      [''],
      [getReportTranslation('dateRange', language), customStartDate && customEndDate ? `${format(customStartDate, 'dd/MM/yyyy', { locale: dateLocale })} - ${format(customEndDate, 'dd/MM/yyyy', { locale: dateLocale })}` : getReportTranslation('allPeriods', language)],
      [''],
      [getReportTranslation('totalRevenue', language), salesData.totalRevenue],
      [getReportTranslation('soldQuantity', language), salesData.totalQuantitySold],
      [getReportTranslation('totalInvoices', language), salesData.totalNumberOfSales],
      [getReportTranslation('totalProducts', language), salesData.uniqueProductsSold]
    ];
    
    const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWS, getReportTranslation('summary', language));
    
    // Sales details sheet
    const salesData_export = [
      [getReportTranslation('product', language), getReportTranslation('category', language), getReportTranslation('soldQuantity', language), getReportTranslation('revenue', language), getReportTranslation('totalInvoices', language), getReportTranslation('avgSalePrice', language), getReportTranslation('date', language), getReportTranslation('date', language)],
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
    
    const filename = `${getReportTranslation('salesReportFile', language)}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
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

  // Filtrer les factures pour l'affichage
  const filteredInvoicesByStatus = useMemo(() => {
    if (!invoices) return [];
    
    let filtered = invoices;
    
    // Filtrer par statut
    if (!invoiceStatusFilters.includes('all')) {
      filtered = filtered.filter(inv => invoiceStatusFilters.includes(inv.status));
    }
    
    // Filtrer par compagnie
    if (invoiceCompanyFilter !== 'all') {
      filtered = filtered.filter(inv => {
        const client = clients.find(c => c.id === inv.client_id);
        return client?.company_id === invoiceCompanyFilter;
      });
    }
    
    // Filtrer par client
    if (invoiceClientFilter !== 'all') {
      filtered = filtered.filter(inv => inv.client_id === invoiceClientFilter);
    }
    
    return filtered;
  }, [invoices, invoiceStatusFilters, invoiceCompanyFilter, invoiceClientFilter, clients]);

  // Calculer le grand total
  const invoiceGrandTotal = useMemo(() => {
    return filteredInvoicesByStatus.reduce((sum, invoice) => sum + Number(invoice.total), 0);
  }, [filteredInvoicesByStatus]);

  const handleStatusToggle = (status: string) => {
    if (status === 'all') {
      setInvoiceStatusFilters(['all']);
    } else {
      setInvoiceStatusFilters(prev => {
        // Retirer "all" si présent
        const withoutAll = prev.filter(s => s !== 'all');
        
        if (withoutAll.includes(status)) {
          // Si le statut est déjà sélectionné, le retirer
          const newFilters = withoutAll.filter(s => s !== status);
          // Si plus aucun filtre, revenir à "all"
          return newFilters.length === 0 ? ['all'] : newFilters;
        } else {
          // Ajouter le statut
          return [...withoutAll, status];
        }
      });
    }
  };

  const exportInvoicesToPDF = () => {
    const doc = new jsPDF();
    const tr = (key: string) => getReportTranslation(key, language);
    
    doc.setFontSize(18);
    doc.text(tr('invoicesReport'), 14, 22);
    
    doc.setFontSize(11);
    doc.text(`${tr('reportDate')}: ${format(new Date(), 'dd/MM/yyyy', { locale: language === 'fr' ? fr : enUS })}`, 14, 32);
    
    // Afficher les filtres
    const filterText = invoiceStatusFilters.includes('all') 
      ? tr('allStatuses')
      : invoiceStatusFilters.map(s => getStatusLabel(s, language)).join(', ');
    
    const companyName = invoiceCompanyFilter !== 'all' 
      ? companies.find(c => c.id === invoiceCompanyFilter)?.name || 'N/A'
      : tr('allCompanies');
    
    const clientName = invoiceClientFilter !== 'all'
      ? clients.find(c => c.id === invoiceClientFilter)?.name || 'N/A'
      : tr('allClients');
    
    let yPos = 40;
    doc.text(`${tr('filters')}: ${filterText}`, 14, yPos);
    yPos += 8;
    doc.text(`${tr('company')}: ${companyName}`, 14, yPos);
    yPos += 8;
    doc.text(`${tr('client')}: ${clientName}`, 14, yPos);
    yPos += 8;
    doc.text(`${tr('total')}: $${invoiceGrandTotal.toFixed(2)}`, 14, yPos);
    
    // Préparer les données du tableau
    const tableData = filteredInvoicesByStatus.map(invoice => {
      const client = clients.find(c => c.id === invoice.client_id);
      const statusText = getStatusLabel(invoice.status, language);
      return [
        invoice.invoice_number,
        client?.name || 'N/A',
        format(new Date(invoice.issue_date), 'dd/MM/yyyy', { locale: language === 'fr' ? fr : enUS }),
        invoice.due_date ? format(new Date(invoice.due_date), 'dd/MM/yyyy', { locale: language === 'fr' ? fr : enUS }) : 'N/A',
        `$${Number(invoice.total).toFixed(2)}`,
        statusText
      ];
    });
    
    autoTable(doc, {
      head: [[tr('number'), tr('client'), tr('issueDate'), tr('dueDate'), tr('amount'), tr('status')]],
      body: tableData,
      startY: yPos + 8,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [66, 139, 202] }
    });
    
    doc.save(`rapport-factures-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const exportInvoicesToExcel = () => {
    const tr = (key: string) => getReportTranslation(key, language);
    
    const filterText = invoiceStatusFilters.includes('all') 
      ? tr('allStatuses')
      : invoiceStatusFilters.map(s => getStatusLabel(s, language)).join(', ');
    
    const companyName = invoiceCompanyFilter !== 'all' 
      ? companies.find(c => c.id === invoiceCompanyFilter)?.name || 'N/A'
      : tr('allCompanies');
    
    const clientName = invoiceClientFilter !== 'all'
      ? clients.find(c => c.id === invoiceClientFilter)?.name || 'N/A'
      : tr('allClients');
    
    // Données de l'en-tête
    const headerData = [
      [tr('invoicesReport')],
      [`${tr('reportDate')}: ${format(new Date(), 'dd/MM/yyyy', { locale: language === 'fr' ? fr : enUS })}`],
      [`${tr('filters')}: ${filterText}`],
      [`${tr('company')}: ${companyName}`],
      [`${tr('client')}: ${clientName}`],
      [`${tr('grandTotal')}: $${invoiceGrandTotal.toFixed(2)}`],
      []
    ];
    
    // Données des factures
    const invoiceData = filteredInvoicesByStatus.map(invoice => {
      const client = clients.find(c => c.id === invoice.client_id);
      return {
        [tr('number')]: invoice.invoice_number,
        [tr('client')]: client?.name || 'N/A',
        [tr('issueDate')]: format(new Date(invoice.issue_date), 'dd/MM/yyyy', { locale: language === 'fr' ? fr : enUS }),
        [tr('dueDate')]: invoice.due_date ? format(new Date(invoice.due_date), 'dd/MM/yyyy', { locale: language === 'fr' ? fr : enUS }) : 'N/A',
        [tr('amount')]: Number(invoice.total).toFixed(2),
        [tr('status')]: getStatusLabel(invoice.status, language)
      };
    });
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(headerData);
    XLSX.utils.sheet_add_json(ws, invoiceData, { origin: -1 });
    
    XLSX.utils.book_append_sheet(wb, ws, language === 'fr' ? 'Factures' : 'Invoices');
    XLSX.writeFile(wb, `rapport-factures-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('reports')}</h1>
        <p className="text-muted-foreground">
          {t('reportsDescription')}
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
          <TabsTrigger value="products" disabled={!isTabAvailable('products')}>{t("reports.tabs.products")}</TabsTrigger>
          <TabsTrigger value="expenses" disabled={!isTabAvailable('expenses')}>{t("reports.tabs.expenses")}</TabsTrigger>
          <TabsTrigger value="clients" disabled={!isTabAvailable('clients')}>{t("reports.tabs.clients")}</TabsTrigger>
          <TabsTrigger value="taxes" disabled={!isTabAvailable('taxes')}>{t("reports.tabs.taxes")}</TabsTrigger>
          <TabsTrigger value="invoices" disabled={!isTabAvailable('invoices')}>{t("reports.tabs.invoices")}</TabsTrigger>
          <TabsTrigger value="reminders" disabled={!isTabAvailable('reminders')}>
            {language === "fr" ? "Rappels" : "Reminders"}
          </TabsTrigger>
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
                <CardDescription>{t("reports.overview.recentActivityDesc")}</CardDescription>
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
                    {dashboardData ? t("reports.overview.noRecentActivity") : t("reports.overview.loading")}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-2xl font-bold">{t("reports.revenue.title")}</h2>
              <p className="text-muted-foreground">{t("reports.revenue.description")}</p>
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
                      t={t}
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
                      t={t}
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
                          t={t}
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
                              t={t}
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
                              t={t}
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
                    <CardTitle className="text-sm font-medium">{t('reports.revenue.totalRevenue')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {new Intl.NumberFormat('en-US').format(realRevenueData.totalRevenue)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t('reports.revenue.paidInvoicesOnly')}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {viewMode === 'monthly' ? t('reports.revenue.numberOfMonths') : t('reports.revenue.numberOfYears')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {viewMode === 'monthly' ? realRevenueData.monthlyData.length : realRevenueData.yearlyData.length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t('reports.revenue.withRevenue')}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t('reports.revenue.averageRevenue')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {new Intl.NumberFormat('en-US').format(
                        realRevenueData.totalRevenue / 
                        Math.max(1, viewMode === 'monthly' ? realRevenueData.monthlyData.length : realRevenueData.yearlyData.length)
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {viewMode === 'monthly' ? t('reports.revenue.perMonth') : t('reports.revenue.perYear')}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Bouton de téléchargement des graphiques */}
              {chartData.length > 0 && (
                <div className="flex justify-end mb-4">
                  <Button onClick={downloadChartsAsPDF} variant="outline" className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    {t('reports.revenue.downloadCharts')}
                  </Button>
                </div>
              )}

              {/* Graphiques des revenus */}
              {chartData.length > 0 && (
                <div className="space-y-4 mb-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t('reports.revenue.revenueEvolution')} {viewMode === 'monthly' ? t('reports.revenue.perMonth').toLowerCase() : t('reports.revenue.perYear').toLowerCase()}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div ref={barChartRef}>
                        <BarChart width={600} height={300} data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="period" />
                          <YAxis />
                          <Tooltip formatter={(value) => [`${Number(value).toLocaleString('fr-FR')} $`, 'Revenus']} />
                          <Bar dataKey="revenue" fill="#22c55e" minPointSize={5} />
                        </BarChart>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>{t('reports.revenue.revenueTrend')}</CardTitle>
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
                    <CardTitle>{t("reports.revenue.detailsByPeriod")}</CardTitle>
                    <CardDescription>
                      {t("reports.revenue.detailedDataBy")} {viewMode === 'monthly' ? t("reports.revenue.month") : t("reports.revenue.year")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">{t("reports.revenue.period")}</th>
                            <th className="text-right py-2">{t("reports.revenue.revenue")}</th>
                            <th className="text-right py-2">{t("reports.revenue.numberOfInvoices")}</th>
                            <th className="text-right py-2">{t("reports.revenue.averageRevenuePerInvoice")}</th>
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
                    <CardTitle>{t('reports.revenue.invoicesList')}</CardTitle>
                    <CardDescription>
                      {t('reports.revenue.invoicesListDescription')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('reports.revenue.invoiceNumber')}</TableHead>
                          <TableHead>{t('reports.revenue.clientName')}</TableHead>
                          <TableHead>{t('reports.revenue.issueDate')}</TableHead>
                          <TableHead className="text-right">{t('reports.revenue.totalAmount')}</TableHead>
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
                  <p className="text-lg font-medium">{t("reports.revenue.noPeriodSelected")}</p>
                  <p className="text-muted-foreground">
                    {t("reports.revenue.selectPeriod")}
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
              <h2 className="text-2xl font-bold">{t("reports.products.profitTitle")}</h2>
              <p className="text-muted-foreground">{t("reports.products.profitDesc")}</p>
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
                <CardTitle>{t("reports.products.dateFilters")}</CardTitle>
                <CardDescription>{t("reports.products.selectPeriodProfit")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <DateRangePicker
                  startDate={startDate}
                  endDate={endDate}
                  onStartDateChange={setCustomStartDate}
                  onEndDateChange={setCustomEndDate}
                  t={t}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("reports.products.companyFilter")}</CardTitle>
                <CardDescription>{t("reports.products.companyFilterDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t("reports.products.filterType")}</Label>
                    <Select value={productFilterType} onValueChange={(value: 'all' | 'company') => {
                      setProductFilterType(value);
                      setProductSelectedCompanyId('');
                    }}>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder={t("reports.products.selectFilterType")} />
                      </SelectTrigger>
                      <SelectContent className="bg-background border border-border shadow-lg z-50">
                        <SelectItem value="all">{t("reports.products.allCompanies")}</SelectItem>
                        <SelectItem value="company">{t("reports.products.byCompany")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {productFilterType === 'company' && (
                    <div className="space-y-2">
                      <Label htmlFor="product-company-select">{t("reports.products.company")}</Label>
                      <Select value={productSelectedCompanyId} onValueChange={setProductSelectedCompanyId}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder={t("reports.products.selectCompany")} />
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
                  <div className="text-center">{t("reports.products.loadingProfit")}</div>
                </CardContent>
              </Card>
            ) : filteredProfitData ? (
              <div className="space-y-4">
                {/* Résumé des profits */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{t("reports.products.totalProfit")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'CAD' }).format(filteredProfitData.totalProfit)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{t("reports.products.totalRevenue")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'CAD' }).format(filteredProfitData.totalRevenue)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{t("reports.products.totalCost")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-orange-600">
                        {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'CAD' }).format(filteredProfitData.totalCost)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{t("reports.products.overallMargin")}</CardTitle>
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
                    <CardTitle>{t("reports.products.profitByProduct")}</CardTitle>
                    <CardDescription>{t("reports.products.profitByProductDesc")}</CardDescription>
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
                            name === "Profit" ? t("reports.products.profit") : 
                            name === "Revenue" ? t("reports.products.revenue") : t("reports.products.cost")
                          ]}
                        />
                        <Bar dataKey="total_profit" fill="#22c55e" name={t("reports.products.profit")} />
                        <Bar dataKey="total_cost" fill="#f97316" name={t("reports.products.cost")} />
                    </BarChart>
                  </CardContent>
                </Card>

                {/* Tableau détaillé */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t("reports.products.productDetails")}</CardTitle>
                    <CardDescription>{t("reports.products.productDetailsDesc")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("reports.products.product")}</TableHead>
                          <TableHead className="text-right">{t("reports.products.qtySold")}</TableHead>
                          <TableHead className="text-right">{t("reports.products.revenue")}</TableHead>
                          <TableHead className="text-right">{t("reports.products.cost")}</TableHead>
                          <TableHead className="text-right">{t("reports.products.profit")}</TableHead>
                          <TableHead className="text-right">{t("reports.products.marginPercent")}</TableHead>
                          <TableHead className="text-right">{t("reports.products.avgPrice")}</TableHead>
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
                    {t("reports.products.noProfitData")}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Inventory Report Section */}
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div>
              <h2 className="text-2xl font-bold">{t("reports.products.inventoryTitle")}</h2>
              <p className="text-muted-foreground">{t("reports.products.inventoryDesc")}</p>
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
                <CardTitle className="text-sm font-medium">{t("reports.products.totalProducts")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{products?.length || 0}</div>
                <p className="text-xs text-muted-foreground">{t("reports.products.productsInInventory")}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("reports.products.activeProducts")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {products?.filter(p => p.is_active).length || 0}
                </div>
                <p className="text-xs text-muted-foreground">{t("reports.products.activeProductsCount")}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("reports.products.lowStockAlert")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {products?.filter(p => (p.quantity || 0) <= 5 && p.is_active).length || 0}
                </div>
                <p className="text-xs text-muted-foreground">{t("reports.products.productsOutOfStock")}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("reports.products.totalInventoryValue")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${products?.reduce((total, p) => total + ((p.quantity || 0) * (p.cost || 0)), 0).toFixed(2) || "0.00"}
                </div>
                <p className="text-xs text-muted-foreground">{t("reports.products.totalInventoryValueDesc")}</p>
              </CardContent>
            </Card>
          </div>

          {/* Stock Level Chart */}
          <Card>
            <CardHeader>
              <CardTitle>{t("reports.products.stockLevelsByProduct")}</CardTitle>
              <CardDescription>{t("reports.products.stockLevelsDesc")}</CardDescription>
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
                      formatter={(value) => [`${value}`, t("reports.products.quantityLabel")]}
                      labelFormatter={(label) => `${t("reports.products.product")}: ${label}`}
                    />
                    <Bar 
                      dataKey="quantity" 
                      fill="#22c55e"
                      name={t("reports.products.quantity")}
                    />
                  </BarChart>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  {t("reports.products.noProductsFound")}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Products Table */}
          <Card>
            <CardHeader>
              <CardTitle>{t("reports.products.inventoryDetails")}</CardTitle>
              <CardDescription>{t("reports.products.inventoryDetailsDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {products && products.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("reports.products.name")}</TableHead>
                      <TableHead>{t("reports.products.sku")}</TableHead>
                      <TableHead>{t("reports.products.category")}</TableHead>
                      <TableHead>{t("reports.products.quantity")}</TableHead>
                      <TableHead>{t("reports.products.cost")}</TableHead>
                      <TableHead>{t("reports.products.price")}</TableHead>
                      <TableHead>{t("reports.products.margin")}</TableHead>
                      <TableHead>{t("reports.products.stockValue")}</TableHead>
                      <TableHead>{t("reports.products.status")}</TableHead>
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
                              {product.is_active ? t("reports.products.active") : t("reports.products.inactive")}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  {t("reports.products.noProductsFound")}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sales Report Section */}
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div>
              <h2 className="text-2xl font-bold">{t("reports.products.salesTitle")}</h2>
              <p className="text-muted-foreground">{t("reports.products.salesDesc")}</p>
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
                <CardTitle>{t("reports.products.dateFilters")}</CardTitle>
                <CardDescription>{t("reports.products.selectPeriodSales")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <DateRangePicker
                  startDate={customStartDate}
                  endDate={customEndDate}
                  onStartDateChange={setCustomStartDate}
                  onEndDateChange={setCustomEndDate}
                  t={t}
                />
              </CardContent>
            </Card>

            {salesLoading ? (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">{t("reports.products.loadingSales")}</div>
                </CardContent>
              </Card>
            ) : salesData ? (
              <div className="space-y-4">
                {/* Sales Summary Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{t("reports.products.totalRevenue")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(salesData.totalRevenue)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{t("reports.products.totalQuantitySold")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {salesData.totalQuantitySold.toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{t("reports.products.numberOfSales")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {salesData.totalNumberOfSales.toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{t("reports.products.productsSold")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {salesData.uniqueProductsSold}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{t("reports.products.servicesSold")}</CardTitle>
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
                      <CardTitle>{t("reports.products.revenueByProduct")}</CardTitle>
                      <CardDescription>{t("reports.products.revenueByProductDesc")}</CardDescription>
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
                            name === "total_revenue" ? t("reports.products.revenue") : 
                            name === "total_quantity_sold" ? t("reports.products.qtySold") : name
                          ]}
                        />
                        <Bar dataKey="total_revenue" fill="#22c55e" name={t("reports.products.revenue")} />
                      </BarChart>
                    </CardContent>
                  </Card>
                )}

                {/* Services Chart */}
                {salesData.services.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("reports.products.revenueByService")}</CardTitle>
                      <CardDescription>{t("reports.products.revenueByServiceDesc")}</CardDescription>
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
                            name === "total_revenue" ? t("reports.products.revenue") : 
                            name === "total_quantity_sold" ? t("reports.products.qtySold") : name
                          ]}
                        />
                        <Bar dataKey="total_revenue" fill="#3b82f6" name={t("reports.products.revenue")} />
                      </BarChart>
                    </CardContent>
                  </Card>
                )}

                {/* Combined Sales Details Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t("reports.products.salesDetails")}</CardTitle>
                    <CardDescription>{t("reports.products.salesDetailsDesc")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("reports.products.productServiceLabel")}</TableHead>
                          <TableHead className="text-right">{t("reports.products.qtySold")}</TableHead>
                          <TableHead className="text-right">{t("reports.products.revenue")}</TableHead>
                          <TableHead className="text-right">{t("reports.products.salesCount")}</TableHead>
                          <TableHead className="text-right">{t("reports.products.avgPrice")}</TableHead>
                          <TableHead className="text-right">{t("reports.products.firstSale")}</TableHead>
                          <TableHead className="text-right">{t("reports.products.lastSale")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {/* Products */}
                        {salesData.products.map((product) => (
                          <TableRow key={product.product_id}>
                            <TableCell className="font-medium">{product.product_name} <span className="text-xs text-muted-foreground">({t("reports.products.productLabel")})</span></TableCell>
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
                            <TableCell className="font-medium">{service.product_name} <span className="text-xs text-muted-foreground">({t("reports.products.serviceLabel")})</span></TableCell>
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
                    {t("reports.products.noSalesData")}
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
                <h2 className="text-2xl font-bold">{t("reports.expenses.title")}</h2>
                <p className="text-muted-foreground">{t("reports.expenses.description")}</p>
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
                <CardTitle>{t("reports.expenses.filters")}</CardTitle>
                <CardDescription>{t("reports.expenses.filtersCriteria")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label>{t("reports.expenses.dateRange")}</Label>
                    <DateRangePicker
                      startDate={expenseStartDate}
                      endDate={expenseEndDate}
                      onStartDateChange={setExpenseStartDate}
                      onEndDateChange={setExpenseEndDate}
                      t={t}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>{t("reports.expenses.filterType")}</Label>
                    <Select value={expenseFilterType} onValueChange={(value: 'all' | 'company' | 'category') => setExpenseFilterType(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("reports.expenses.selectFilterType")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("reports.expenses.allExpenses")}</SelectItem>
                        <SelectItem value="company">{t("reports.expenses.byCompanyFilter")}</SelectItem>
                        <SelectItem value="category">{t("reports.expenses.byCategoryFilter")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {expenseFilterType === 'company' && (
                    <div className="space-y-2">
                      <Label>{t("reports.expenses.company")}</Label>
                      <Select value={expenseSelectedCompanyId} onValueChange={setExpenseSelectedCompanyId}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("reports.expenses.selectCompany")} />
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
                      <Label>{t("reports.expenses.category")}</Label>
                      <Select value={expenseSelectedCategory} onValueChange={setExpenseSelectedCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("reports.expenses.selectCategory")} />
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
                  <div className="text-center">{t("reports.expenses.loading")}</div>
                </CardContent>
              </Card>
            ) : expenseReportData ? (
              <div className="space-y-4">
                {/* Résumé des dépenses */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{t("reports.expenses.totalExpenses")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">
                        {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'CAD' }).format(expenseReportData.totalExpenses)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{t("reports.expenses.paidExpenses")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'CAD' }).format(expenseReportData.totalPaidExpenses)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{t("reports.expenses.unpaidExpenses")}</CardTitle>
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
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{t("reports.expenses.byCategory")}</CardTitle>
                        <CardDescription>{t("reports.expenses.byCategoryDesc")}</CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={exportExpenseCategoryChartToPDF}
                        disabled={expenseReportData.expensesByCategory.length === 0}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        PDF
                      </Button>
                    </div>
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
                        {t("reports.expenses.noData")}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Graphique des dépenses par compagnie */}
                {expenseReportData.expensesByCompany.length > 0 && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>{t("reports.expenses.byCompany")}</CardTitle>
                          <CardDescription>{t("reports.expenses.byCompanyDesc")}</CardDescription>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={exportExpenseCompanyChartToPDF}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          PDF
                        </Button>
                      </div>
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
                    <CardTitle>{t("reports.expenses.detailByCategory")}</CardTitle>
                    <CardDescription>{t("reports.expenses.detailByCategoryDesc")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {expenseReportData.expensesByCategory.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("reports.expenses.category")}</TableHead>
                            <TableHead className="text-right">{t("reports.expenses.count")}</TableHead>
                            <TableHead className="text-right">{t("reports.expenses.totalAmount")}</TableHead>
                            <TableHead className="text-right">{t("reports.expenses.averageAmount")}</TableHead>
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
                        {t("reports.expenses.noCategoryData")}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Tableau détaillé des dépenses par compagnie */}
                {expenseReportData.expensesByCompany.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("reports.expenses.detailByCompany")}</CardTitle>
                      <CardDescription>{t("reports.expenses.detailByCompanyDesc")}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("reports.expenses.company")}</TableHead>
                            <TableHead className="text-right">{t("reports.expenses.count")}</TableHead>
                            <TableHead className="text-right">{t("reports.expenses.totalAmount")}</TableHead>
                            <TableHead className="text-right">{t("reports.expenses.averageAmount")}</TableHead>
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

                {/* Tableau détaillé de toutes les dépenses avec taxes */}
                {expenseReportData.expenseDetails && expenseReportData.expenseDetails.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("reports.expenses.allExpensesDetail")}</CardTitle>
                      <CardDescription>
                        {t("reports.expenses.allExpensesDetailDesc")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("reports.expenses.date")}</TableHead>
                            <TableHead>{t("reports.expenses.descriptionField")}</TableHead>
                            <TableHead>{t("reports.expenses.category")}</TableHead>
                            <TableHead>{t("reports.expenses.company")}</TableHead>
                            <TableHead>{t("reports.expenses.vendor")}</TableHead>
                            <TableHead className="text-right">{t("reports.expenses.amount")}</TableHead>
                            <TableHead className="text-right">{t("reports.expenses.taxes")}</TableHead>
                            <TableHead className="text-right">{t("reports.expenses.total")}</TableHead>
                            <TableHead>{t("reports.expenses.status")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {expenseReportData.expenseDetails.map((expense) => {
                            const totalTaxes = expense.taxes?.reduce((sum, tax) => sum + (tax.amount || 0), 0) || 0;
                            const totalWithTaxes = expense.amount + totalTaxes;
                            
                            return (
                              <TableRow key={expense.id}>
                                <TableCell>{format(new Date(expense.expense_date), 'dd/MM/yyyy')}</TableCell>
                                <TableCell className="font-medium">{expense.description}</TableCell>
                                <TableCell>{expense.category}</TableCell>
                                <TableCell>{expense.company_name || '-'}</TableCell>
                                <TableCell>{expense.vendor || '-'}</TableCell>
                                <TableCell className="text-right">
                                  {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'CAD' }).format(expense.amount)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {expense.taxes && expense.taxes.length > 0 ? (
                                    <div className="space-y-1">
                                      {expense.taxes.map((tax, idx) => (
                                        <div key={idx} className="text-xs">
                                          {tax.name} ({tax.percentage}%): {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'CAD' }).format(tax.amount || 0)}
                                        </div>
                                      ))}
                                      <div className="font-semibold pt-1 border-t">
                                        {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'CAD' }).format(totalTaxes)}
                                      </div>
                                    </div>
                                  ) : (
                                    '-'
                                  )}
                                </TableCell>
                                <TableCell className="text-right font-semibold">
                                  {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'CAD' }).format(totalWithTaxes)}
                                </TableCell>
                                <TableCell>
                                  <Badge className={expense.status === 'paid' ? 'bg-green-500' : 'bg-yellow-500'}>
                                    {expense.status === 'paid' ? t("reports.expenses.paid") : t("reports.expenses.unpaid")}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          {/* Total row */}
                          <TableRow className="bg-muted/50 font-bold">
                            <TableCell colSpan={5} className="text-right">
                              {language === "fr" ? "TOTAL" : "TOTAL"}
                            </TableCell>
                            <TableCell className="text-right">
                              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'CAD' }).format(
                                expenseReportData.expenseDetails.reduce((sum, exp) => sum + exp.amount, 0)
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="space-y-1">
                                {(() => {
                                  // Group taxes by name
                                  const taxTotals = new Map<string, { name: string; total: number }>();
                                  
                                  expenseReportData.expenseDetails.forEach(exp => {
                                    exp.taxes?.forEach(tax => {
                                      const existing = taxTotals.get(tax.name);
                                      if (existing) {
                                        existing.total += (tax.amount || 0);
                                      } else {
                                        taxTotals.set(tax.name, {
                                          name: tax.name,
                                          total: tax.amount || 0
                                        });
                                      }
                                    });
                                  });
                                  
                                  const totalAllTaxes = Array.from(taxTotals.values()).reduce((sum, tax) => sum + tax.total, 0);
                                  
                                  return (
                                    <>
                                      {Array.from(taxTotals.values()).map((tax, idx) => (
                                        <div key={idx} className="text-sm">
                                          {tax.name}: {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'CAD' }).format(tax.total)}
                                        </div>
                                      ))}
                                      <div className="pt-1 border-t">
                                        {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'CAD' }).format(totalAllTaxes)}
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'CAD' }).format(
                                expenseReportData.expenseDetails.reduce((sum, exp) => {
                                  const totalTaxes = exp.taxes?.reduce((taxSum, tax) => taxSum + (tax.amount || 0), 0) || 0;
                                  return sum + exp.amount + totalTaxes;
                                }, 0)
                              )}
                            </TableCell>
                            <TableCell></TableCell>
                          </TableRow>
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
                <h2 className="text-2xl font-bold">{t("reports.clients.title")}</h2>
                <p className="text-muted-foreground">{t("reports.clients.description")}</p>
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
                <CardTitle>{t("reports.clients.filters")}</CardTitle>
                <CardDescription>{t("reports.clients.filterDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("reports.clients.createdFromDate")}</Label>
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
                          {createdFromDate ? format(createdFromDate, "dd/MM/yyyy") : t("reports.clients.selectDate")}
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
                    <Label>{t("reports.clients.createdToDate")}</Label>
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
                          {createdToDate ? format(createdToDate, "dd/MM/yyyy") : t("reports.clients.selectDate")}
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
                      {t("reports.clients.clearFilters")}
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
                      <CardTitle>{t("reports.clients.allClients")}</CardTitle>
                      <CardDescription>{t("reports.clients.allClientsDescription")}</CardDescription>
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
                        <TableHead>{t("reports.clients.clientName")}</TableHead>
                        <TableHead>{t("reports.clients.company")}</TableHead>
                        <TableHead>{t("reports.clients.email")}</TableHead>
                        <TableHead>{t("reports.clients.phone")}</TableHead>
                        <TableHead>{t("reports.clients.contactPerson")}</TableHead>
                        <TableHead>{t("reports.clients.creationDate")}</TableHead>
                        <TableHead>{t("reports.clients.lastInvoice")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClientsByDate.map((client) => (
                        <TableRow key={client.id}>
                          <TableCell className="font-medium">{client.name}</TableCell>
                          <TableCell>{client.companies?.name || t("reports.clients.noCompany")}</TableCell>
                          <TableCell>{client.email || 'N/A'}</TableCell>
                          <TableCell>{client.phone || 'N/A'}</TableCell>
                          <TableCell>{client.contact_person || 'N/A'}</TableCell>
                          <TableCell>
                            {format(new Date(client.created_at), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell>
                            {getLastInvoiceDate(client.id) 
                              ? format(new Date(getLastInvoiceDate(client.id)!), 'dd/MM/yyyy')
                              : t("reports.clients.noInvoice")
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredClientsByDate.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground">
                            {t("reports.clients.noClientsFound")}
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
                  <CardTitle>{t("reports.clients.clientsByCompany")}</CardTitle>
                  <CardDescription>{t("reports.clients.clientsByCompanyDesc")}</CardDescription>
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
                                {companyClients.length} {companyClients.length > 1 ? t("reports.clients.clientCountPlural") : t("reports.clients.clientCount")}
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
                                  <TableHead>{t("reports.clients.clientName")}</TableHead>
                                  <TableHead>{t("reports.clients.email")}</TableHead>
                                  <TableHead>{t("reports.clients.phone")}</TableHead>
                                  <TableHead>{t("reports.clients.contactPerson")}</TableHead>
                                  <TableHead>{t("reports.clients.creationDate")}</TableHead>
                                  <TableHead>{t("reports.clients.lastInvoice")}</TableHead>
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
                                        : t("reports.clients.noInvoice")
                                      }
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <p className="text-muted-foreground text-sm">{t("reports.clients.noClientsForCompany")}</p>
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
                              <h3 className="font-semibold text-lg">{t("reports.clients.clientsWithoutCompany")}</h3>
                              <span className="text-sm text-muted-foreground">
                                {clientsWithoutCompany.length} {clientsWithoutCompany.length > 1 ? t("reports.clients.clientCountPlural") : t("reports.clients.clientCount")}
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
                              <TableHead>{t("reports.clients.clientName")}</TableHead>
                              <TableHead>{t("reports.clients.email")}</TableHead>
                              <TableHead>{t("reports.clients.phone")}</TableHead>
                              <TableHead>{t("reports.clients.contactPerson")}</TableHead>
                              <TableHead>{t("reports.clients.creationDate")}</TableHead>
                              <TableHead>{t("reports.clients.lastInvoice")}</TableHead>
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
                                      : t("reports.clients.noInvoice")
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
                <CardTitle>{t("reports.taxes.filters")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Filtre par compagnie */}
                  <div className="space-y-2">
                    <Label>{t("reports.taxes.company")}</Label>
                    <Select value={taxSelectedCompany} onValueChange={setTaxSelectedCompany}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("reports.taxes.allCompanies")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("reports.taxes.allCompanies")}</SelectItem>
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
                    <Label>{t("reports.taxes.periodType")}</Label>
                    <Select value={taxDateFilter} onValueChange={(value: 'custom' | 'month' | 'year') => setTaxDateFilter(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom">{t("reports.taxes.customDates")}</SelectItem>
                        <SelectItem value="month">{t("reports.taxes.byMonth")}</SelectItem>
                        <SelectItem value="year">{t("reports.taxes.byYear")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Mode d'affichage */}
                  <div className="space-y-2">
                    <Label>{t("reports.taxes.display")}</Label>
                    <Select value={taxViewMode} onValueChange={(value: 'monthly' | 'yearly') => setTaxViewMode(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">{t("reports.taxes.monthly")}</SelectItem>
                        <SelectItem value="yearly">{t("reports.taxes.yearly")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Sélection de dates selon le type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {taxDateFilter === 'custom' && (
                    <>
                      <div className="space-y-2">
                        <Label>{t("reports.taxes.startDate")}</Label>
                        <Popover open={taxStartOpen} onOpenChange={setTaxStartOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !taxStartDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {taxStartDate ? format(taxStartDate, "dd/MM/yyyy") : t("reports.taxes.select")}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={taxStartDate}
                              onSelect={(date) => {
                                setTaxStartDate(date);
                                setTaxStartOpen(false);
                              }}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-2">
                        <Label>{t("reports.taxes.endDate")}</Label>
                        <Popover open={taxEndOpen} onOpenChange={setTaxEndOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !taxEndDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {taxEndDate ? format(taxEndDate, "dd/MM/yyyy") : t("reports.taxes.select")}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={taxEndDate}
                              onSelect={(date) => {
                                setTaxEndDate(date);
                                setTaxEndOpen(false);
                              }}
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
                      <Label>{t("reports.taxes.month")}</Label>
                      <MonthYearPicker
                        selectedDate={taxSelectedMonth}
                        onDateChange={setTaxSelectedMonth}
                        mode="month"
                        t={t}
                      />
                    </div>
                  )}
                  
                  {taxDateFilter === 'year' && (
                    <div className="space-y-2">
                      <Label>{t("reports.taxes.year")}</Label>
                      <MonthYearPicker
                        selectedDate={taxSelectedYear}
                        onDateChange={setTaxSelectedYear}
                        mode="year"
                        t={t}
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
                    <CardTitle>{t("reports.taxes.taxSummary")}</CardTitle>
                    <CardDescription>
                      {taxSelectedCompany && taxSelectedCompany !== 'all'
                        ? `${t("reports.taxes.company")}: ${companies.find(c => c.id === taxSelectedCompany)?.name}`
                        : t("reports.taxes.allCompanies")
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">{t("reports.taxes.grandTotal")}</p>
                        <div className="text-3xl font-bold text-primary">
                          {taxData.totalTaxAmount.toLocaleString('fr-FR', { 
                            style: 'currency', 
                            currency: 'CAD' 
                          })}
                        </div>
                      </div>
                      
                      <div className="border-t pt-4">
                        <h4 className="text-lg font-semibold mb-4">{t("reports.taxes.totalByType")}</h4>
                        <div className="space-y-3">
                          {taxData.taxSummary.map((tax, index) => (
                            <div key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                              <div>
                                <span className="font-medium text-base">{tax.name}</span>
                                <p className="text-sm text-muted-foreground">
                                  {tax.invoiceCount} {tax.invoiceCount > 1 ? t("reports.taxes.invoices") : t("reports.taxes.invoice")}
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
                    <CardTitle>{t("reports.taxes.distribution")}</CardTitle>
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
                          t("reports.taxes.amount")
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
                  <CardTitle>{t("reports.taxes.evolutionBy")} {taxViewMode === 'monthly' ? t("reports.taxes.month").toLowerCase() : t("reports.taxes.year").toLowerCase()}</CardTitle>
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
                        t("reports.taxes.taxesAmount")
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
                    <p className="text-lg font-medium">{t("reports.taxes.noData")}</p>
                    <p className="text-muted-foreground">
                      {t("reports.taxes.noDataDesc")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tableau résumé des taxes */}
            {taxData && taxData.taxSummary && taxData.taxSummary.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t("reports.taxes.summaryCollected")}</CardTitle>
                  <CardDescription>{t("reports.taxes.summaryDesc")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("reports.taxes.taxType")}</TableHead>
                        <TableHead>{t("reports.taxes.totalAmount")}</TableHead>
                        <TableHead>{t("reports.taxes.invoiceCount")}</TableHead>
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
                  <CardTitle>{t("reports.taxes.detailBy")} {taxViewMode === 'monthly' ? t("reports.taxes.month").toLowerCase() : t("reports.taxes.year").toLowerCase()}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("reports.taxes.period")}</TableHead>
                        <TableHead>{t("reports.taxes.totalTaxes")}</TableHead>
                        <TableHead>{t("reports.taxes.invoicesLabel")}</TableHead>
                        <TableHead>{t("reports.taxes.detailByTax")}</TableHead>
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
                  <CardTitle>{t("reports.taxes.download")}</CardTitle>
                  <CardDescription>{t("reports.taxes.exportDesc")}</CardDescription>
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
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{t("reports.invoices.listTitle")}</CardTitle>
                    <CardDescription>
                      {t("reports.invoices.listDesc", { count: filteredInvoicesByStatus.length })}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">{t("reports.invoices.grandTotal")}</div>
                      <div className="text-2xl font-bold">${invoiceGrandTotal.toFixed(2)}</div>
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-48">
                          {t("reports.invoices.filterByStatus", { count: invoiceStatusFilters.includes('all') ? t("reports.invoices.allStatuses") : invoiceStatusFilters.length })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56">
                        <div className="space-y-3">
                          <h4 className="font-medium text-sm">{t("reports.invoices.statuses")}</h4>
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="status-all"
                                checked={invoiceStatusFilters.includes('all')}
                                onCheckedChange={() => handleStatusToggle('all')}
                              />
                              <label
                                htmlFor="status-all"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {t("reports.invoices.allStatuses")} {t("reports.invoices.statuses").toLowerCase()}
                              </label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="status-draft"
                                checked={invoiceStatusFilters.includes('draft')}
                                onCheckedChange={() => handleStatusToggle('draft')}
                              />
                              <label
                                htmlFor="status-draft"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {t("reports.invoices.draft")}
                              </label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="status-sent"
                                checked={invoiceStatusFilters.includes('sent')}
                                onCheckedChange={() => handleStatusToggle('sent')}
                              />
                              <label
                                htmlFor="status-sent"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {t("reports.invoices.sent")}
                              </label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="status-paid"
                                checked={invoiceStatusFilters.includes('paid')}
                                onCheckedChange={() => handleStatusToggle('paid')}
                              />
                              <label
                                htmlFor="status-paid"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {t("reports.invoices.paid")}
                              </label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="status-overdue"
                                checked={invoiceStatusFilters.includes('overdue')}
                                onCheckedChange={() => handleStatusToggle('overdue')}
                              />
                              <label
                                htmlFor="status-overdue"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {t("reports.invoices.overdue")}
                              </label>
                            </div>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="invoice-company-filter">{t("reports.invoices.filterByCompany")}</Label>
                    <Select value={invoiceCompanyFilter} onValueChange={setInvoiceCompanyFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("reports.invoices.allCompanies")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("reports.invoices.allCompanies")}</SelectItem>
                        {companies.map(company => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="invoice-client-filter">{t("reports.invoices.filterByClient")}</Label>
                    <Select value={invoiceClientFilter} onValueChange={setInvoiceClientFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("reports.invoices.allClients")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("reports.invoices.allClients")}</SelectItem>
                        {clients.map(client => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("reports.invoices.number")}</TableHead>
                    <TableHead>{t("reports.invoices.client")}</TableHead>
                    <TableHead>{t("reports.invoices.issueDate")}</TableHead>
                    <TableHead>{t("reports.invoices.dueDate")}</TableHead>
                    <TableHead>{t("reports.invoices.amount")}</TableHead>
                    <TableHead>{t("reports.invoices.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoicesByStatus.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        {t("reports.invoices.noInvoicesFound")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInvoicesByStatus.map((invoice) => {
                      const client = clients.find(c => c.id === invoice.client_id);
                      const statusColors: Record<string, string> = {
                        paid: 'bg-green-100 text-green-800',
                        sent: 'bg-yellow-100 text-yellow-800',
                        overdue: 'bg-red-100 text-red-800',
                        draft: 'bg-gray-100 text-gray-800'
                      };
                      
                      return (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                          <TableCell>{client?.name || 'N/A'}</TableCell>
                          <TableCell>{format(new Date(invoice.issue_date), 'dd/MM/yyyy')}</TableCell>
                          <TableCell>{invoice.due_date ? format(new Date(invoice.due_date), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                          <TableCell>${Number(invoice.total).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge className={statusColors[invoice.status] || 'bg-gray-100 text-gray-800'}>
                              {t(`reports.invoices.${invoice.status}`) || invoice.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("reports.invoices.download")}</CardTitle>
              <CardDescription>{t("reports.invoices.exportDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button onClick={exportInvoicesToPDF} variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  PDF
                </Button>
                <Button onClick={exportInvoicesToExcel} variant="outline" size="sm">
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Excel
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reminders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {language === "fr" ? "Filtres" : "Filters"}
              </CardTitle>
              <CardDescription>
                {language === "fr" 
                  ? "Filtrer les rappels par date, client et type" 
                  : "Filter reminders by date, client and type"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label>{language === "fr" ? "Date de début" : "Start Date"}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !reminderStartDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {reminderStartDate ? format(reminderStartDate, "PPP") : (language === "fr" ? "Sélectionner" : "Pick a date")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={reminderStartDate}
                        onSelect={setReminderStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>{language === "fr" ? "Date de fin" : "End Date"}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !reminderEndDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {reminderEndDate ? format(reminderEndDate, "PPP") : (language === "fr" ? "Sélectionner" : "Pick a date")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={reminderEndDate}
                        onSelect={setReminderEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>{language === "fr" ? "Client" : "Client"}</Label>
                  <Select value={reminderClientId} onValueChange={setReminderClientId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{language === "fr" ? "Tous les clients" : "All clients"}</SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{language === "fr" ? "Type de rappel" : "Reminder Type"}</Label>
                  <Select value={reminderType} onValueChange={(value: 'all' | 'manual' | 'automatic') => setReminderType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{language === "fr" ? "Tous" : "All"}</SelectItem>
                      <SelectItem value="manual">{language === "fr" ? "Manuel" : "Manual"}</SelectItem>
                      <SelectItem value="automatic">{language === "fr" ? "Automatique" : "Automatic"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{language === "fr" ? "Statut de la facture" : "Invoice Status"}</Label>
                  <Select value={reminderInvoiceStatus} onValueChange={(value: 'all' | 'draft' | 'sent' | 'paid' | 'overdue') => setReminderInvoiceStatus(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{language === "fr" ? "Tous" : "All"}</SelectItem>
                      <SelectItem value="draft">{language === "fr" ? "Brouillon" : "Draft"}</SelectItem>
                      <SelectItem value="sent">{language === "fr" ? "Envoyée" : "Sent"}</SelectItem>
                      <SelectItem value="paid">{language === "fr" ? "Payée" : "Paid"}</SelectItem>
                      <SelectItem value="overdue">{language === "fr" ? "En retard" : "Overdue"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {language === "fr" ? "Historique des rappels" : "Reminder History"}
              </CardTitle>
              <CardDescription>
                {language === "fr" 
                  ? `${reminderLogs.length} rappel(s) envoyé(s)` 
                  : `${reminderLogs.length} reminder(s) sent`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {remindersLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === "fr" ? "Date d'envoi" : "Sent Date"}</TableHead>
                      <TableHead>{language === "fr" ? "Facture" : "Invoice"}</TableHead>
                      <TableHead>{language === "fr" ? "Client" : "Client"}</TableHead>
                      <TableHead>{language === "fr" ? "Montant" : "Amount"}</TableHead>
                      <TableHead>{language === "fr" ? "Type" : "Type"}</TableHead>
                      <TableHead>{language === "fr" ? "Statut" : "Status"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reminderLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          {language === "fr" ? "Aucun rappel envoyé" : "No reminders sent"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      reminderLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            {format(new Date(log.sent_at), "PPP", { locale: language === "fr" ? fr : enUS })}
                          </TableCell>
                          <TableCell className="font-medium">
                            {log.invoices?.invoice_number || "—"}
                          </TableCell>
                          <TableCell>
                            {log.invoices?.clients?.name || "—"}
                          </TableCell>
                          <TableCell>
                            ${log.invoices?.total?.toFixed(2) || "0.00"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={log.reminder_type === "automatic" ? "default" : "secondary"}>
                              {log.reminder_type === "automatic" 
                                ? (language === "fr" ? "Automatique" : "Automatic")
                                : (language === "fr" ? "Manuel" : "Manual")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={log.status === "sent" ? "default" : "destructive"}>
                              {log.status === "sent" 
                                ? (language === "fr" ? "Envoyé" : "Sent")
                                : (language === "fr" ? "Échec" : "Failed")}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
