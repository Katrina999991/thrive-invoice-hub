
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useReports, type RevenueByPeriod } from "@/hooks/useReports";
import { useTaxReports } from "@/hooks/useTaxReports";
import { useSalesReport } from "@/hooks/useSalesReport";
import { useProductProfit } from "@/hooks/useProductProfit";
import { useExpenseReports } from "@/hooks/useExpenseReports";
import { useInvoices } from "@/hooks/useInvoices";
import { useCompanies } from "@/hooks/useCompanies";
import { useClients } from "@/hooks/useClients";
import { useCategories } from "@/hooks/useCategories";
import { useDashboard } from "@/hooks/useDashboard";
import { useProducts } from "@/hooks/useProducts";
import { useLanguage } from "@/hooks/useLanguage";
import { useSubscription } from "@/hooks/useSubscription";
import { useReminderLogs } from "@/hooks/useReminderLogs";
import { useAuth } from "@/hooks/useAuth";
import { RevenueByClientReport } from "@/components/reports/RevenueByClientReport";
import { RevenueByProductReport } from "@/components/reports/RevenueByProductReport";
import { useState, useMemo, useRef, useCallback } from "react";
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
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Download, FileSpreadsheet, CalendarIcon, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { applyWorksheetFormatting, formatReportWorksheet, createFormattedSheet } from "@/lib/excelUtils";
import html2canvas from "html2canvas";
import { getReportTranslation, getStatusLabel } from "@/lib/reportTranslations";
import { generateSalesReportPdf } from "@/lib/salesReportPdf";
import { generateRevenueReportPdf } from "@/lib/revenueReportPdf";
import { generateRevenueByClientPdf } from "@/lib/revenueByClientPdf";
import { generateRevenueByProductPdf } from "@/lib/revenueByProductPdf";
import { generateStockStatusPdf, type StockProduct } from "@/lib/stockStatusPdf";
import { generateStockValuePdf, type StockValueProduct } from "@/lib/stockValuePdf";
import { generateExpensesPeriodPdf } from "@/lib/expensesPeriodPdf";
import { generateExpensesByCategoryPdf } from "@/lib/expensesByCategoryPdf";
import { generateAllExpensesPdf } from "@/lib/allExpensesPdf";
import { useRevenueByClient } from "@/hooks/useRevenueByClient";
import { useRevenueByProduct } from "@/hooks/useRevenueByProduct";
import { EmailReportDialog } from "@/components/EmailReportDialog";
import { logAuditEvent } from "@/lib/auditLogger";
import { supabase } from "@/integrations/supabase/client";

const Reports = () => {
  const { t, language } = useLanguage();
  const { planLimits } = useSubscription();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');
  const [activeTab, setActiveTab] = useState('custom');
  const [showNoProductsDialog, setShowNoProductsDialog] = useState(false);
  
  // États pour les dialogues d'envoi par courriel
  const [emailDialogOpen, setEmailDialogOpen] = useState<string | null>(null);
  const [currentPdfBlob, setCurrentPdfBlob] = useState<Blob | null>(null);
  const [selectedCompanyForEmail, setSelectedCompanyForEmail] = useState<any>(null);
  
  // Option Pro pour masquer le branding GestionFlow des PDF (lu depuis les paramètres)
  const [hidePdfBranding, setHidePdfBranding] = useState(() => {
    return localStorage.getItem("hide-pdf-branding") === "true";
  });
  
  // Helper function to log export events
  const logExport = useCallback((reportType: string, exportFormat: 'pdf' | 'excel' | 'csv', description: string) => {
    if (!user) return;
    logAuditEvent({
      userId: user.id,
      userName: user.email || 'Unknown',
      category: 'exports',
      eventType: exportFormat === 'pdf' ? 'pdf_download' : exportFormat === 'csv' ? 'csv_export' : 'excel_export',
      description,
      metadata: { reportType, format: exportFormat }
    });
  }, [user]);
  
  // Check if a specific report tab is available based on plan
  const isTabAvailable = (tab: string) => {
    if (tab === 'overview' || tab === 'revenue' || tab === 'reminders') return true; // Always available
    if (planLimits?.all_reports) return true; // Pro plan - all reports available
    // Premium plan - taxes, products and expenses access
    if (planLimits?.plan_type === 'premium') {
      return tab === 'taxes' || tab === 'products' || tab === 'expenses';
    }
    return false; // Free plan - only overview, revenue and reminders
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
  const revenueByClientChartRef = useRef<HTMLDivElement>(null);
  
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
  const { invoices } = useInvoices();
  const { companies } = useCompanies();
  const { clients } = useClients();
  const { categories } = useCategories();
  const { data: dashboardData } = useDashboard(t);
  const { products: allProducts } = useProducts();
  
  // Filter categories for expenses
  const expenseCategories = useMemo(() => {
    return categories.filter(cat => cat.for_expenses);
  }, [categories]);

  // Fallback translations for common categories not in database
  const fallbackTranslations: Record<string, { en: string; fr: string }> = {
    'products': { en: 'Products', fr: 'Produits' },
    'produits': { en: 'Products', fr: 'Produits' },
    'services': { en: 'Services', fr: 'Services' },
    'uncategorized': { en: 'Uncategorized', fr: 'Non catégorisé' },
  };

  // Helper function to get translated category name
  const getTranslatedCategoryName = (categoryName: string) => {
    if (!categoryName) return categoryName;
    
    const normalizedName = categoryName.toLowerCase().trim();
    
    // Find category by matching name, name_en or name_fr (case-insensitive)
    const category = categories.find(cat => 
      cat.name?.toLowerCase() === normalizedName || 
      cat.name_en?.toLowerCase() === normalizedName || 
      cat.name_fr?.toLowerCase() === normalizedName
    );
    
    if (category) {
      return language === 'fr' 
        ? (category.name_fr || category.name) 
        : (category.name_en || category.name);
    }
    
    // Use fallback translations if category not found in database
    const fallback = fallbackTranslations[normalizedName];
    if (fallback) {
      return language === 'fr' ? fallback.fr : fallback.en;
    }
    
    return categoryName;
  };
  // États pour les filtres de la section Products
  const [productFilterType, setProductFilterType] = useState<'all' | 'company'>('all');
  const [productSelectedCompanyId, setProductSelectedCompanyId] = useState<string>('');
  const [productStartDate, setProductStartDate] = useState<Date | undefined>();
  const [productEndDate, setProductEndDate] = useState<Date | undefined>();
  
  // États pour les filtres de statut des factures dans le rapport de ventes
  const [salesStatusFilters, setSalesStatusFilters] = useState({
    paid: true,
    sent: false,
    overdue: false,
    draft: false
  });
  
  // Convertir les filtres de statut en tableau pour le hook
  const selectedSalesStatuses = Object.entries(salesStatusFilters)
    .filter(([_, checked]) => checked)
    .map(([status]) => status as 'paid' | 'sent' | 'overdue' | 'draft');
  
  const { salesData, loading: salesLoading } = useSalesReport(
    productStartDate, 
    productEndDate, 
    productFilterType === 'company' ? productSelectedCompanyId : undefined,
    selectedSalesStatuses
  );
  
  // États pour les filtres de la section Expenses
  const [expenseFilterType, setExpenseFilterType] = useState<'all' | 'company' | 'category'>('all');
  const [expenseSelectedCompanyId, setExpenseSelectedCompanyId] = useState<string>('');
  const [expenseSelectedCategory, setExpenseSelectedCategory] = useState<string>('');
  const [expenseStartDate, setExpenseStartDate] = useState<Date | undefined>();
  const [expenseEndDate, setExpenseEndDate] = useState<Date | undefined>();
  
  // États pour le sous-onglet revenue et les nouveaux rapports By Client / By Product
  const [revenueSubTab, setRevenueSubTab] = useState<'period' | 'client' | 'product'>('period');
  const [clientRevenueStartDate, setClientRevenueStartDate] = useState<Date | undefined>();
  const [clientRevenueEndDate, setClientRevenueEndDate] = useState<Date | undefined>();
  const [clientRevenueCompanyId, setClientRevenueCompanyId] = useState<string>('');
  const [productRevenueStartDate, setProductRevenueStartDate] = useState<Date | undefined>();
  const [productRevenueEndDate, setProductRevenueEndDate] = useState<Date | undefined>();
  const [productRevenueCompanyId, setProductRevenueCompanyId] = useState<string>('');
  
  // Hook for Revenue by Client data
  const { clientRevenueData, loading: clientRevenueLoading } = useRevenueByClient(
    clientRevenueStartDate,
    clientRevenueEndDate,
    clientRevenueCompanyId && clientRevenueCompanyId !== 'all' ? clientRevenueCompanyId : undefined
  );

  // Hook for Revenue by Product data
  const { productRevenueData, loading: productRevenueLoading } = useRevenueByProduct(
    productRevenueStartDate,
    productRevenueEndDate,
    productRevenueCompanyId && productRevenueCompanyId !== 'all' ? productRevenueCompanyId : undefined
  );

  const { reportData: expenseReportDataRaw, loading: expenseLoading } = useExpenseReports(
    expenseStartDate, 
    expenseEndDate, 
    expenseFilterType, 
    expenseFilterType === 'company' ? expenseSelectedCompanyId : expenseSelectedCategory
  );

  // Transform expense report data with translated category names
  const expenseReportData = useMemo(() => {
    if (!expenseReportDataRaw) return null;
    
    return {
      ...expenseReportDataRaw,
      expensesByCategory: expenseReportDataRaw.expensesByCategory.map(cat => ({
        ...cat,
        category: getTranslatedCategoryName(cat.category)
      })),
      expenseDetails: expenseReportDataRaw.expenseDetails.map(expense => ({
        ...expense,
        category: getTranslatedCategoryName(expense.category)
      }))
    };
  }, [expenseReportDataRaw, categories, language]);
  
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

  // Filter products for inventory report by company (using the same filters as product profit)
  const filteredInventoryProducts = useMemo(() => {
    if (productFilterType === 'all' || !productSelectedCompanyId) {
      return products;
    }
    
    return products.filter(product => product.company_id === productSelectedCompanyId);
  }, [products, productFilterType, productSelectedCompanyId]);

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
  const [reminderStartOpen, setReminderStartOpen] = useState(false);
  const [reminderEndOpen, setReminderEndOpen] = useState(false);

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
        const monthNamesFr = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
        const monthNamesEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthNames = language === 'fr' ? monthNamesFr : monthNamesEn;
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
    logExport('revenue_charts', 'pdf', language === 'fr' ? 'Téléchargement PDF graphiques revenus' : 'Revenue charts PDF download');
  };

  // Filter invoices based on selected date range and paid status
  // Export functions
  const exportToPDF = async () => {
    if (!realRevenueData || !chartData.length) return;
    
    // Prepare filter name
    let filterName: string | undefined;
    if (filterType === 'company' && selectedCompanyId) {
      filterName = companies.find(c => c.id === selectedCompanyId)?.name;
    } else if (filterType === 'client' && selectedClientId) {
      filterName = clients.find(c => c.id === selectedClientId)?.name;
    }
    
    // Prepare invoice data for the PDF
    const invoiceData = filteredInvoices.slice(0, 50).map(invoice => ({
      invoice_number: invoice.invoice_number,
      client_name: (invoice as any).clients?.name || 'N/A',
      issue_date: invoice.issue_date,
      total: Number(invoice.total),
      status: invoice.status
    }));
    
    await generateRevenueReportPdf({
      revenueData: {
        totalRevenue: realRevenueData.totalRevenue,
        periodData: chartData
      },
      companyName: filterType === 'company' && selectedCompanyId 
        ? companies.find(c => c.id === selectedCompanyId)?.name 
        : undefined,
      startDate,
      endDate,
      filterType,
      filterName,
      viewMode,
      invoices: invoiceData,
      language: language as 'fr' | 'en',
      planType: planLimits?.plan_type || 'free',
      hideBranding: hidePdfBranding
    });
    
    logExport('revenue', 'pdf', language === 'fr' ? 'Téléchargement PDF rapport revenus' : 'Revenue report PDF download');
  };

  // Export Revenue by Client to PDF
  const exportRevenueByClientToPDF = async () => {
    if (!clientRevenueData || clientRevenueData.clientData.length === 0) return;
    
    // Get invoice details for each client
    const clientInvoices = invoices
      .filter(inv => {
        // Filter by date range
        if (clientRevenueStartDate || clientRevenueEndDate) {
          const invoiceDate = new Date(inv.issue_date);
          if (clientRevenueStartDate && invoiceDate < clientRevenueStartDate) return false;
          if (clientRevenueEndDate && invoiceDate > clientRevenueEndDate) return false;
        }
        // Filter by company if selected
        if (clientRevenueCompanyId && clientRevenueCompanyId !== 'all') {
          const client = clients.find(c => c.id === inv.client_id);
          if (client?.company_id !== clientRevenueCompanyId) return false;
        }
        // Only include invoices with valid statuses
        return ['sent', 'paid', 'overdue'].includes(inv.status);
      })
      .map(inv => ({
        invoice_number: inv.invoice_number,
        issue_date: inv.issue_date,
        total: Number(inv.total),
        status: inv.status,
        client_id: inv.client_id || ''
      }));

    // Get company filter name
    const companyFilterName = clientRevenueCompanyId && clientRevenueCompanyId !== 'all'
      ? companies.find(c => c.id === clientRevenueCompanyId)?.name
      : undefined;

    await generateRevenueByClientPdf({
      clientRevenueData,
      startDate: clientRevenueStartDate,
      endDate: clientRevenueEndDate,
      companyFilterName,
      invoiceDetails: clientInvoices,
      language: language as 'fr' | 'en',
      planType: planLimits?.plan_type || 'free',
      hideBranding: hidePdfBranding
    });

    logExport('revenue_by_client', 'pdf', language === 'fr' ? 'Téléchargement PDF rapport revenus par client' : 'Revenue by client report PDF download');
  };

  // Export Revenue by Client to Excel
  const exportRevenueByClientToExcel = () => {
    if (!clientRevenueData || clientRevenueData.clientData.length === 0) return;
    
    const wb = XLSX.utils.book_new();
    const dateLocale = language === 'fr' ? fr : enUS;
    
    // Summary sheet
    const summaryRows = [
      [language === 'fr' ? 'Rapport Revenus par Client' : 'Revenue by Client Report'],
      [language === 'fr' ? 'Généré le' : 'Generated on', format(new Date(), 'dd/MM/yyyy', { locale: dateLocale })],
      [],
      [language === 'fr' ? 'Période' : 'Period', 
        clientRevenueStartDate ? format(clientRevenueStartDate, 'dd/MM/yyyy', { locale: dateLocale }) : '',
        language === 'fr' ? 'au' : 'to',
        clientRevenueEndDate ? format(clientRevenueEndDate, 'dd/MM/yyyy', { locale: dateLocale }) : ''
      ],
      [],
      [language === 'fr' ? 'Total Facturé' : 'Total Invoiced', clientRevenueData.totalRevenue],
      [language === 'fr' ? 'Total Encaissé' : 'Total Paid', clientRevenueData.totalPaid],
      [language === 'fr' ? 'Nombre de Factures' : 'Number of Invoices', clientRevenueData.totalInvoices],
      []
    ];
    
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryRows);
    formatReportWorksheet(summaryWs, summaryRows.length);
    XLSX.utils.book_append_sheet(wb, summaryWs, language === 'fr' ? 'Résumé' : 'Summary');
    
    // Client details sheet with formatting
    const clientHeaders = [
      language === 'fr' ? 'Client' : 'Client',
      language === 'fr' ? 'Facturé' : 'Invoiced',
      language === 'fr' ? 'Payé' : 'Paid',
      language === 'fr' ? 'Factures' : 'Invoices',
      language === 'fr' ? '% du Total' : '% of Total'
    ];
    
    const clientRows = clientRevenueData.clientData.map(client => [
      client.clientName,
      client.totalInvoiced,
      client.totalPaid,
      client.invoiceCount,
      client.percentageOfTotal.toFixed(1) + '%'
    ]);
    
    const clientWs = createFormattedSheet(clientHeaders, clientRows);
    XLSX.utils.book_append_sheet(wb, clientWs, language === 'fr' ? 'Clients' : 'Clients');
    
    // Generate filename and save
    const companyFilter = clientRevenueCompanyId && clientRevenueCompanyId !== 'all' 
      ? `-${companies.find(c => c.id === clientRevenueCompanyId)?.name?.replace(/\s+/g, '-')}`
      : '';
    const filename = `${language === 'fr' ? 'revenus-par-client' : 'revenue-by-client'}${companyFilter}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(wb, filename);
    logExport('revenue_by_client', 'excel', language === 'fr' ? 'Export Excel rapport revenus par client' : 'Revenue by client report Excel export');
  };

  // Export Revenue by Client Charts to PDF
  const exportRevenueByClientChartsToPDF = async () => {
    if (!clientRevenueData || clientRevenueData.clientData.length === 0) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const dateLocale = language === 'fr' ? fr : enUS;
    
    // Title
    doc.setFontSize(18);
    doc.text(language === 'fr' ? 'Revenus par Client - Graphiques' : 'Revenue by Client - Charts', pageWidth / 2, 20, { align: 'center' });
    
    // Date range
    let dateRangeText = '';
    if (clientRevenueStartDate && clientRevenueEndDate) {
      dateRangeText = `${format(clientRevenueStartDate, 'dd/MM/yyyy', { locale: dateLocale })} - ${format(clientRevenueEndDate, 'dd/MM/yyyy', { locale: dateLocale })}`;
    }
    
    if (dateRangeText) {
      doc.setFontSize(12);
      doc.text(dateRangeText, pageWidth / 2, 30, { align: 'center' });
    }
    
    let yPosition = 50;
    
    try {
      // Capture Pie Chart
      if (revenueByClientChartRef.current) {
        const chartCanvas = await html2canvas(revenueByClientChartRef.current, {
          backgroundColor: '#ffffff',
          scale: 2,
          useCORS: true
        });
        const chartImgData = chartCanvas.toDataURL('image/png');
        
        doc.setFontSize(14);
        doc.text(language === 'fr' ? 'Distribution des revenus' : 'Revenue Distribution', 20, yPosition);
        yPosition += 10;
        
        const imgWidth = pageWidth - 40;
        const imgHeight = (chartCanvas.height * imgWidth) / chartCanvas.width;
        
        doc.addImage(chartImgData, 'PNG', 20, yPosition, imgWidth, Math.min(imgHeight, 120));
        yPosition += Math.min(imgHeight, 120) + 20;
      }
    } catch (error) {
      console.error('Error capturing charts:', error);
    }
    
    // Add client summary table
    if (yPosition > 200) {
      doc.addPage();
      yPosition = 20;
    }
    
    const tableData = clientRevenueData.clientData.slice(0, 10).map(client => [
      client.clientName,
      new Intl.NumberFormat(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' }).format(client.totalInvoiced),
      client.percentageOfTotal.toFixed(1) + '%'
    ]);
    
    autoTable(doc, {
      head: [[
        language === 'fr' ? 'Client' : 'Client',
        language === 'fr' ? 'Facturé' : 'Invoiced',
        language === 'fr' ? '% du Total' : '% of Total'
      ]],
      body: tableData,
      startY: yPosition,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
    });
    
    const filename = `${language === 'fr' ? 'revenus-par-client-graphiques' : 'revenue-by-client-charts'}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(filename);
    logExport('revenue_by_client_charts', 'pdf', language === 'fr' ? 'Téléchargement PDF graphiques revenus par client' : 'Revenue by client charts PDF download');
  };

  // Export Revenue by Product to PDF
  const exportRevenueByProductToPDF = async () => {
    if (!productRevenueData || productRevenueData.productData.length === 0) return;
    
    // Get invoice line details
    const invoiceLineDetails = invoices
      .filter(inv => {
        if (productRevenueStartDate || productRevenueEndDate) {
          const invoiceDate = new Date(inv.issue_date);
          if (productRevenueStartDate && invoiceDate < productRevenueStartDate) return false;
          if (productRevenueEndDate && invoiceDate > productRevenueEndDate) return false;
        }
        if (productRevenueCompanyId && productRevenueCompanyId !== 'all') {
          const client = clients.find(c => c.id === inv.client_id);
          if (client?.company_id !== productRevenueCompanyId) return false;
        }
        return inv.status === 'paid';
      })
      .flatMap(inv => {
        const items = (inv as any).invoice_items || [];
        return items.map((item: any) => ({
          invoice_number: inv.invoice_number,
          client_name: (inv as any).clients?.name || '-',
          issue_date: inv.issue_date,
          product_name: item.description || '-',
          quantity: Number(item.quantity) || 0,
          line_total: Number(item.total) || 0
        }));
      })
      .slice(0, 100); // Limit to 100 lines for PDF

    const companyFilterName = productRevenueCompanyId && productRevenueCompanyId !== 'all'
      ? companies.find(c => c.id === productRevenueCompanyId)?.name
      : undefined;

    await generateRevenueByProductPdf({
      productRevenueData,
      startDate: productRevenueStartDate,
      endDate: productRevenueEndDate,
      companyFilterName,
      invoiceLineDetails,
      language: language as 'fr' | 'en',
      planType: planLimits?.plan_type || 'free',
      hideBranding: hidePdfBranding
    });

    logExport('revenue_by_product', 'pdf', language === 'fr' ? 'Téléchargement PDF rapport revenus par produit' : 'Revenue by product report PDF download');
  };

  // Export Revenue by Product to Excel
  const exportRevenueByProductToExcel = () => {
    if (!productRevenueData || productRevenueData.productData.length === 0) return;
    
    const wb = XLSX.utils.book_new();
    const dateLocale = language === 'fr' ? fr : enUS;
    
    // Calculate average revenue per sale
    const avgRevenuePerSale = productRevenueData.totalQuantity > 0 
      ? productRevenueData.totalRevenue / productRevenueData.totalQuantity 
      : 0;
    
    // Summary sheet
    const summaryRows = [
      [language === 'fr' ? 'Rapport Revenus par Produit/Service' : 'Revenue by Product/Service Report'],
      [language === 'fr' ? 'Généré le' : 'Generated on', format(new Date(), 'dd/MM/yyyy', { locale: dateLocale })],
      [],
      [language === 'fr' ? 'Période' : 'Period', 
        productRevenueStartDate ? format(productRevenueStartDate, 'dd/MM/yyyy', { locale: dateLocale }) : '',
        language === 'fr' ? 'au' : 'to',
        productRevenueEndDate ? format(productRevenueEndDate, 'dd/MM/yyyy', { locale: dateLocale }) : ''
      ],
      [],
      [language === 'fr' ? 'Revenus Totaux' : 'Total Revenue', productRevenueData.totalRevenue],
      [language === 'fr' ? 'Nombre de Produits/Services' : 'Number of Products/Services', productRevenueData.uniqueProducts],
      [language === 'fr' ? 'Quantité Totale Vendue' : 'Total Quantity Sold', productRevenueData.totalQuantity],
      [language === 'fr' ? 'Revenu Moyen par Vente' : 'Average Revenue per Sale', avgRevenuePerSale],
      []
    ];
    
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryRows);
    formatReportWorksheet(summaryWs, summaryRows.length);
    XLSX.utils.book_append_sheet(wb, summaryWs, language === 'fr' ? 'Résumé' : 'Summary');
    
    // Product details sheet with formatting
    const productHeaders = [
      language === 'fr' ? 'Produit/Service' : 'Product/Service',
      language === 'fr' ? 'Qté Vendue' : 'Qty Sold',
      language === 'fr' ? 'Revenus' : 'Revenue',
      language === 'fr' ? 'Moy/Vente' : 'Avg/Sale',
      language === 'fr' ? '% du Total' : '% of Total'
    ];
    
    const productRows = productRevenueData.productData.map(product => [
      product.productName,
      product.quantitySold,
      product.totalRevenue,
      product.averageRevenuePerSale,
      product.percentageOfTotal.toFixed(1) + '%'
    ]);
    
    const productWs = createFormattedSheet(productHeaders, productRows);
    XLSX.utils.book_append_sheet(wb, productWs, language === 'fr' ? 'Produits' : 'Products');
    
    // Generate filename and save
    const companyFilter = productRevenueCompanyId && productRevenueCompanyId !== 'all' 
      ? `-${companies.find(c => c.id === productRevenueCompanyId)?.name?.replace(/\s+/g, '-')}`
      : '';
    const filename = `${language === 'fr' ? 'revenus-par-produit' : 'revenue-by-product'}${companyFilter}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(wb, filename);
    logExport('revenue_by_product', 'excel', language === 'fr' ? 'Export Excel rapport revenus par produit' : 'Revenue by product report Excel export');
  };

  // Export functions for taxes - Full Taxes Report (mirrors entire Taxes tab UI)
  const exportTaxesToPDF = () => {
    if (!taxData) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const dateLocale = language === 'fr' ? fr : enUS;
    const margin = 15;
    let pageNumber = 1;
    
    // Get company name for header
    const companyName = taxSelectedCompany && taxSelectedCompany !== 'all'
      ? companies.find(c => c.id === taxSelectedCompany)?.name || ''
      : (language === 'fr' ? 'Toutes les entreprises' : 'All Companies');
    
    const addFooter = () => {
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      // Page number (right side)
      doc.text(
        `Page ${pageNumber}`,
        pageWidth - margin,
        pageHeight - 10,
        { align: 'right' }
      );
      // Branding (center) - only if not hidden
      if (!hidePdfBranding) {
        doc.text(
          language === 'fr' ? 'Généré par GestionFlow • gestionflow.com' : 'Generated by GestionFlow • gestionflow.com',
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }
      doc.setTextColor(0, 0, 0);
    };
    
    // ========== HEADER ==========
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(language === 'fr' ? 'Rapport de taxes' : 'Tax Report', pageWidth / 2, 25, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(companyName, pageWidth / 2, 35, { align: 'center' });
    
    // Date range
    let yOffset = 45;
    const reportEndDate = taxEffectiveEnd || new Date();
    if (taxEffectiveStart) {
      doc.setFontSize(10);
      doc.text(
        `${language === 'fr' ? 'Période' : 'Period'}: ${format(taxEffectiveStart, 'dd MMMM yyyy', { locale: dateLocale })} – ${format(reportEndDate, 'dd MMMM yyyy', { locale: dateLocale })}`,
        pageWidth / 2, yOffset, { align: 'center' }
      );
      yOffset += 8;
    } else {
      doc.setFontSize(10);
      doc.text(
        `${language === 'fr' ? 'Période : Toutes les périodes' : 'Period: All time'}`,
        pageWidth / 2, yOffset, { align: 'center' }
      );
      yOffset += 8;
    }
    
    // Display mode
    doc.setFontSize(10);
    doc.text(
      `${language === 'fr' ? 'Affichage' : 'Display'}: ${taxViewMode === 'monthly' ? (language === 'fr' ? 'Mensuel' : 'Monthly') : (language === 'fr' ? 'Annuel' : 'Yearly')}`,
      pageWidth / 2, yOffset, { align: 'center' }
    );
    yOffset += 8;
    
    // Generated date
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `${language === 'fr' ? 'Généré le' : 'Generated on'}: ${format(new Date(), 'dd MMMM yyyy, HH:mm', { locale: dateLocale })}`,
      pageWidth / 2,
      yOffset,
      { align: 'center' }
    );
    doc.setTextColor(0, 0, 0);
    
    yOffset += 18;
    
    // ========== TAX SUMMARY SECTION ==========
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(language === 'fr' ? 'Résumé des taxes' : 'Tax Summary', margin, yOffset);
    yOffset += 10;
    
    // Tax Calculation box
    doc.setFillColor(248, 250, 252); // Light gray background
    doc.roundedRect(margin, yOffset, pageWidth - (margin * 2), 55, 3, 3, 'F');
    
    const labelX = margin + 8;
    const valueX = margin + 120;
    
    // Collected Taxes
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(
      language === 'fr' ? 'Taxes collectées' : 'Collected Taxes',
      labelX, yOffset + 12
    );
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(34, 197, 94);
    doc.text(
      taxData.totalInvoiceTaxAmount.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' }),
      valueX, yOffset + 12, { align: 'right' }
    );
    doc.setTextColor(0, 0, 0);
    
    // Recoverable Credits
    doc.setFont('helvetica', 'normal');
    doc.text(
      language === 'fr' ? 'Crédits récupérables' : 'Recoverable Credits',
      labelX, yOffset + 22
    );
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(249, 115, 22);
    doc.text(
      `-${taxData.totalExpenseTaxAmount.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' })}`,
      valueX, yOffset + 22, { align: 'right' }
    );
    doc.setTextColor(0, 0, 0);
    
    // Separator
    doc.setDrawColor(200, 200, 200);
    doc.line(labelX, yOffset + 28, valueX, yOffset + 28);
    
    // Net Amount Payable
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(
      language === 'fr' ? 'Montant net à remettre' : 'Net Amount Payable',
      labelX, yOffset + 38
    );
    doc.setTextColor(59, 130, 246);
    doc.text(
      taxData.totalTaxAmount.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' }),
      valueX, yOffset + 38, { align: 'right' }
    );
    doc.setTextColor(0, 0, 0);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text(
      language === 'fr' 
        ? 'Taxes collectées sur les ventes moins les crédits de taxes sur les dépenses' 
        : 'Taxes collected on revenue minus tax credits from expenses',
      labelX, yOffset + 48
    );
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    
    yOffset += 65;
    
    // Collected Taxes & Tax Credits side by side
    const boxWidth = (pageWidth - (margin * 2) - 10) / 2;
    
    // Collected Taxes box (green)
    doc.setFillColor(240, 253, 244); // Light green
    doc.roundedRect(margin, yOffset, boxWidth, 40, 3, 3, 'F');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(language === 'fr' ? 'Taxes collectees' : 'Collected Taxes', margin + 5, yOffset + 10);
    
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
      language === 'fr' ? 'Collectees sur les factures payees' : 'Collected from paid invoices',
      margin + 5,
      yOffset + 18
    );
    doc.setTextColor(0, 0, 0);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(34, 197, 94); // Green
    doc.text(
      taxData.totalInvoiceTaxAmount.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' }),
      margin + 5,
      yOffset + 32
    );
    doc.setTextColor(0, 0, 0);
    
    // Tax Credits box (orange)
    doc.setFillColor(255, 247, 237); // Light orange
    doc.roundedRect(margin + boxWidth + 10, yOffset, boxWidth, 40, 3, 3, 'F');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(language === 'fr' ? 'Credits de taxes' : 'Tax Credits', margin + boxWidth + 15, yOffset + 10);
    
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
      language === 'fr' ? 'Credits recuperables sur les depenses' : 'Recoverable credits from expenses',
      margin + boxWidth + 15,
      yOffset + 18
    );
    doc.setTextColor(0, 0, 0);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(249, 115, 22); // Orange
    doc.text(
      taxData.totalExpenseTaxAmount.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' }),
      margin + boxWidth + 15,
      yOffset + 32
    );
    doc.setTextColor(0, 0, 0);
    
    yOffset += 55;
    
    // ========== BREAKDOWN BY TAX TYPE ==========
    if (taxData.taxSummary.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(language === 'fr' ? 'Répartition par type de taxe' : 'Breakdown by Tax Type', margin, yOffset);
      yOffset += 10;
      
      // Create tax type cards
      taxData.taxSummary.forEach((tax, index) => {
        // Check if we need a new page
        if (yOffset > pageHeight - 70) {
          addFooter();
          doc.addPage();
          pageNumber++;
          yOffset = 20;
        }
        
        // Tax type box
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(margin, yOffset, pageWidth - (margin * 2), 35, 3, 3, 'F');
        
        // Tax name and net amount
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(tax.name, margin + 5, yOffset + 10);
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(language === 'fr' ? 'Montant du' : 'Amount Owed', pageWidth - margin - 45, yOffset + 8);
        doc.setTextColor(0, 0, 0);
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(
          tax.netAmount.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' }),
          pageWidth - margin - 5,
          yOffset + 10,
          { align: 'right' }
        );
        
        // Collected and Credits
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        
        // Collected
        doc.setTextColor(34, 197, 94);
        doc.text(
          `${language === 'fr' ? 'Collectees' : 'Collected'}: ${tax.invoiceAmount.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' })}`,
          margin + 5,
          yOffset + 22
        );
        doc.setTextColor(100, 100, 100);
        doc.text(
          `(${tax.invoiceCount || 0} ${(tax.invoiceCount || 0) > 1 ? (language === 'fr' ? 'factures' : 'invoices') : (language === 'fr' ? 'facture' : 'invoice')})`,
          margin + 5,
          yOffset + 30
        );
        
        // Credits
        doc.setTextColor(249, 115, 22);
        doc.text(
          `${language === 'fr' ? 'Credits' : 'Credits'}: ${tax.expenseAmount.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' })}`,
          margin + 80,
          yOffset + 22
        );
        doc.setTextColor(100, 100, 100);
        doc.text(
          `(${tax.expenseCount || 0} ${(tax.expenseCount || 0) > 1 ? (language === 'fr' ? 'depenses' : 'expenses') : (language === 'fr' ? 'depense' : 'expense')})`,
          margin + 80,
          yOffset + 30
        );
        doc.setTextColor(0, 0, 0);
        
        yOffset += 42;
      });
    }
    
    // ========== SUMMARY TABLE ==========
    if (taxData.taxSummary.length > 0) {
      // Check if we need a new page
      if (yOffset > pageHeight - 80) {
        addFooter();
        doc.addPage();
        pageNumber++;
        yOffset = 20;
      }
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(language === 'fr' ? 'Résumé' : 'Summary', margin, yOffset);
      yOffset += 8;
      
      const summaryTableData = taxData.taxSummary.map(tax => [
        tax.name,
        `${tax.invoiceAmount.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' })}\n(${tax.invoiceCount || 0} ${(tax.invoiceCount || 0) > 1 ? (language === 'fr' ? 'factures' : 'invoices') : (language === 'fr' ? 'facture' : 'invoice')})`,
        `${tax.expenseAmount.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' })}\n(${tax.expenseCount || 0} ${(tax.expenseCount || 0) > 1 ? (language === 'fr' ? 'depenses' : 'expenses') : (language === 'fr' ? 'depense' : 'expense')})`,
        tax.netAmount.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' })
      ]);
      
      // Add totals row
      const totalInvoiceCount = taxData.taxSummary.reduce((sum, t) => sum + (t.invoiceCount || 0), 0);
      const totalExpenseCount = taxData.taxSummary.reduce((sum, t) => sum + (t.expenseCount || 0), 0);
      summaryTableData.push([
        'TOTAL',
        `${taxData.totalInvoiceTaxAmount.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' })}\n(${totalInvoiceCount} ${totalInvoiceCount > 1 ? (language === 'fr' ? 'factures' : 'invoices') : (language === 'fr' ? 'facture' : 'invoice')})`,
        `${taxData.totalExpenseTaxAmount.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' })}\n(${totalExpenseCount} ${totalExpenseCount > 1 ? (language === 'fr' ? 'depenses' : 'expenses') : (language === 'fr' ? 'depense' : 'expense')})`,
        taxData.totalTaxAmount.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' })
      ]);
      
      autoTable(doc, {
        head: [[
          language === 'fr' ? 'Type de taxe' : 'Tax Type',
          language === 'fr' ? 'Taxes collectees' : 'Collected Taxes',
          language === 'fr' ? 'Credits de taxes' : 'Tax Credits',
          language === 'fr' ? 'Montant net a remettre' : 'Net Amount Payable'
        ]],
        body: summaryTableData,
        startY: yOffset,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: {
          1: { textColor: [34, 197, 94] },
          2: { textColor: [249, 115, 22] },
          3: { fontStyle: 'bold' }
        },
        didParseCell: (data) => {
          if (data.row.index === summaryTableData.length - 1) {
            data.cell.styles.fillColor = [229, 231, 235];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      });
    }
    
    // Add footer
    addFooter();
    
    // Generate filename and save
    const companyFilter = taxSelectedCompany && taxSelectedCompany !== 'all' 
      ? `-${companies.find(c => c.id === taxSelectedCompany)?.name?.replace(/\s+/g, '-')}`
      : '';
    const filename = `${getReportTranslation('taxReportFile', language)}${companyFilter}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(filename);
    logExport('taxes', 'pdf', language === 'fr' ? 'Telechargement PDF rapport taxes' : 'Tax report PDF download');
  };

  const exportTaxesToExcel = () => {
    if (!taxData) return;
    
    const wb = XLSX.utils.book_new();
    const dateLocale = language === 'fr' ? fr : enUS;
    
    // Summary sheet with updated labels
    const summaryData = [
      [
        getReportTranslation('taxName', language), 
        getReportTranslation('collectedTaxes', language),
        getReportTranslation('taxCredits', language),
        getReportTranslation('netPayable', language)
      ],
      ...taxData.taxSummary.map(tax => [
        tax.name,
        tax.invoiceAmount,
        tax.expenseAmount,
        tax.netAmount
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
      [],
      [getReportTranslation('taxSummary', language)],
      [`${getReportTranslation('netPayable', language)}: ${taxData.totalTaxAmount}`],
      [getReportTranslation('netPayableDescription', language)],
      [],
      [`${getReportTranslation('collectedTaxes', language)}: ${taxData.totalInvoiceTaxAmount}`],
      [`(${getReportTranslation('collectedTaxesDescription', language)})`],
      [],
      [`${getReportTranslation('taxCredits', language)}: ${taxData.totalExpenseTaxAmount}`],
      [`(${getReportTranslation('taxCreditsDescription', language)})`],
      [],
      [],
      ...summaryData
    ].filter(row => row.length > 0));
    
    applyWorksheetFormatting(summaryWs, { headerRowIndex: 15 });
    XLSX.utils.book_append_sheet(wb, summaryWs, getReportTranslation('summary', language));
    // Generate filename and save
    const companyFilter = taxSelectedCompany && taxSelectedCompany !== 'all' 
      ? `-${companies.find(c => c.id === taxSelectedCompany)?.name?.replace(/\s+/g, '-')}`
      : '';
    const filename = `${getReportTranslation('taxReportFile', language)}${companyFilter}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(wb, filename);
    logExport('taxes', 'excel', language === 'fr' ? 'Export Excel rapport taxes' : 'Tax report Excel export');
  };

  // Export functions for Taxes Collected (Sales) - Only invoice taxes
  const exportTaxesCollectedToPDF = async () => {
    if (!taxData || taxData.totalInvoiceTaxAmount === 0) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const dateLocale = language === 'fr' ? fr : enUS;
    const margin = 20;
    
    // Get company name for header
    const companyName = taxSelectedCompany && taxSelectedCompany !== 'all' 
      ? companies.find(c => c.id === taxSelectedCompany)?.name 
      : (language === 'fr' ? 'Toutes les entreprises' : 'All Companies');
    
    // Fetch invoice details for the detail table
    let invoiceDetails: any[] = [];
    try {
      let query = supabase
        .from('invoices')
        .select(`
          invoice_number,
          issue_date,
          subtotal,
          tax_amount,
          total,
          clients (
            name,
            company_id,
            companies (
              taxes
            )
          )
        `)
        .eq('user_id', user?.id || '')
        .eq('status', 'paid')
        .gt('tax_amount', 0);

      if (taxEffectiveStart) {
        query = query.gte('issue_date', taxEffectiveStart.toISOString().split('T')[0]);
      }
      if (taxEffectiveEnd) {
        query = query.lte('issue_date', taxEffectiveEnd.toISOString().split('T')[0]);
      }
      if (taxSelectedCompany && taxSelectedCompany !== 'all') {
        query = query.eq('clients.company_id', taxSelectedCompany);
      }

      const { data } = await query.order('issue_date', { ascending: false });
      invoiceDetails = data || [];
    } catch (err) {
      console.error('Error fetching invoice details for PDF:', err);
    }

    // Calculate total taxable amount (subtotal of all invoices)
    const totalTaxableAmount = invoiceDetails.reduce((sum, inv) => sum + Number(inv.subtotal || 0), 0);
    
    // ========== HEADER ==========
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(language === 'fr' ? 'Taxes collectées (Ventes)' : 'Taxes Collected (Sales)', pageWidth / 2, 25, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(companyName || '', pageWidth / 2, 35, { align: 'center' });
    
    // Date range
    let yOffset = 45;
    const reportEndDate = taxEffectiveEnd || new Date();
    if (taxEffectiveStart) {
      doc.setFontSize(10);
      doc.text(
        `${language === 'fr' ? 'Période' : 'Period'}: ${format(taxEffectiveStart, 'dd MMMM yyyy', { locale: dateLocale })} – ${format(reportEndDate, 'dd MMMM yyyy', { locale: dateLocale })}`,
        pageWidth / 2, yOffset, { align: 'center' }
      );
      yOffset += 8;
    } else {
      doc.setFontSize(10);
      doc.text(
        `${language === 'fr' ? 'Période : Toutes les périodes' : 'Period: All time'}`,
        pageWidth / 2, yOffset, { align: 'center' }
      );
      yOffset += 8;
    }
    
    // Display mode
    doc.setFontSize(10);
    doc.text(
      `${language === 'fr' ? 'Affichage' : 'Display'}: ${taxViewMode === 'monthly' ? (language === 'fr' ? 'Mensuel' : 'Monthly') : (language === 'fr' ? 'Annuel' : 'Yearly')}`,
      pageWidth / 2, yOffset, { align: 'center' }
    );
    yOffset += 8;
    
    // Generated date
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `${language === 'fr' ? 'Généré le' : 'Generated on'}: ${format(new Date(), 'dd MMMM yyyy, HH:mm', { locale: dateLocale })}`,
      pageWidth / 2,
      yOffset,
      { align: 'center' }
    );
    doc.setTextColor(0, 0, 0);
    
    yOffset += 15;
    
    // ========== SUMMARY SECTION ==========
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(margin, yOffset, pageWidth - (margin * 2), 45, 3, 3, 'F');
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(language === 'fr' ? 'Resume' : 'Summary', margin + 5, yOffset + 10);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    // Total taxable sales
    doc.text(
      `${language === 'fr' ? 'Total ventes taxables' : 'Total Taxable Sales'}:`,
      margin + 5,
      yOffset + 22
    );
    doc.setFont('helvetica', 'bold');
    doc.text(
      totalTaxableAmount.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' }),
      margin + 80,
      yOffset + 22
    );
    
    // Total taxes collected
    doc.setFont('helvetica', 'normal');
    doc.text(
      `${language === 'fr' ? 'Total taxes collectees' : 'Total Taxes Collected'}:`,
      margin + 5,
      yOffset + 32
    );
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(34, 139, 34);
    doc.text(
      taxData.totalInvoiceTaxAmount.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' }),
      margin + 80,
      yOffset + 32
    );
    doc.setTextColor(0, 0, 0);
    
    // Number of invoices
    doc.setFont('helvetica', 'normal');
    const totalInvoiceCount = taxData.taxSummary.reduce((sum, tax) => sum + (tax.invoiceCount || 0), 0) / Math.max(taxData.taxSummary.length, 1);
    doc.text(
      `${language === 'fr' ? 'Nombre de factures' : 'Number of Invoices'}: ${invoiceDetails.length}`,
      margin + 5,
      yOffset + 42
    );
    
    yOffset += 55;
    
    // ========== BREAKDOWN BY TAX TYPE ==========
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(language === 'fr' ? 'Repartition par type de taxe' : 'Breakdown by Tax Type', margin, yOffset);
    yOffset += 8;
    
    if (taxData.taxSummary.length > 0) {
      const taxBreakdownData = taxData.taxSummary
        .filter(tax => tax.invoiceAmount > 0)
        .map(tax => {
          // Calculate taxable amount from collected tax and rate
          const taxRate = tax.name.includes('TPS') || tax.name.includes('GST') ? 5 :
                         tax.name.includes('TVQ') || tax.name.includes('QST') ? 9.975 :
                         tax.name.includes('TVH') || tax.name.includes('HST') ? 13 : 0;
          const taxableForThisTax = taxRate > 0 ? (tax.invoiceAmount / taxRate) * 100 : 0;
          
          return [
            tax.name,
            (tax.invoiceCount || 0).toString(),
            taxableForThisTax.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' }),
            tax.invoiceAmount.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' })
          ];
        });
      
      // Add total row
      taxBreakdownData.push([
        language === 'fr' ? 'TOTAL' : 'TOTAL',
        '',
        totalTaxableAmount.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' }),
        taxData.totalInvoiceTaxAmount.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' })
      ]);
      
      autoTable(doc, {
        head: [[
          language === 'fr' ? 'Type de taxe' : 'Tax Type',
          language === 'fr' ? 'Factures' : 'Invoices',
          language === 'fr' ? 'Montant taxable' : 'Taxable Amount',
          language === 'fr' ? 'Taxe collectee' : 'Tax Collected'
        ]],
        body: taxBreakdownData,
        startY: yOffset,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 4 },
        footStyles: { fontStyle: 'bold', fillColor: [240, 240, 240] },
        didParseCell: (data) => {
          // Style the total row
          if (data.row.index === taxBreakdownData.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [240, 240, 240];
          }
        }
      });
      
      yOffset = (doc as any).lastAutoTable.finalY + 15;
    }
    
    // ========== INVOICE DETAILS TABLE ==========
    if (invoiceDetails.length > 0) {
      // Check if we need a new page
      if (yOffset > pageHeight - 80) {
        doc.addPage();
        yOffset = 25;
      }
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(language === 'fr' ? 'Détails des factures' : 'Invoice Details', margin, yOffset);
      yOffset += 8;
      
      const invoiceTableData = invoiceDetails.map(inv => {
        // Get tax types from company taxes
        const companyTaxes = (inv.clients?.companies?.taxes as any[]) || [];
        const taxTypes = companyTaxes.map((t: any) => t.name).join(', ') || 
          (language === 'fr' ? 'Taxe' : 'Tax');
        
        return [
          inv.invoice_number,
          format(new Date(inv.issue_date), 'dd/MM/yyyy'),
          inv.clients?.name || '-',
          Number(inv.subtotal || 0).toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' }),
          Number(inv.tax_amount || 0).toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' }),
          taxTypes
        ];
      });
      
      autoTable(doc, {
        head: [[
          language === 'fr' ? 'No Facture' : 'Invoice #',
          language === 'fr' ? 'Date' : 'Date',
          language === 'fr' ? 'Client' : 'Client',
          language === 'fr' ? 'Montant taxable' : 'Taxable Amount',
          language === 'fr' ? 'Taxes' : 'Taxes',
          language === 'fr' ? 'Type' : 'Type'
        ]],
        body: invoiceTableData,
        startY: yOffset,
        theme: 'striped',
        headStyles: { fillColor: [100, 116, 139], fontStyle: 'bold', fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 22 },
          2: { cellWidth: 40 },
          3: { cellWidth: 30, halign: 'right' },
          4: { cellWidth: 25, halign: 'right' },
          5: { cellWidth: 28 }
        },
        didParseCell: (data) => {
          // Bold total-like last row if needed
          if (data.row.index === invoiceTableData.length - 1 && invoiceTableData.length > 1) {
            // No total row here, just ensure consistent styling
          }
        }
      });
    }
    
    // ========== FOOTER ==========
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Page number (right side)
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${i} / ${pageCount}`,
        pageWidth - margin,
        pageHeight - 10,
        { align: 'right' }
      );
      
      // Branding (center) - only if not hidden
      if (!hidePdfBranding) {
        doc.text(
          language === 'fr' ? 'Généré par GestionFlow • gestionflow.com' : 'Generated by GestionFlow • gestionflow.com',
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }
    }
    
    // Generate filename and save
    const companyFilter = taxSelectedCompany && taxSelectedCompany !== 'all' 
      ? `-${companies.find(c => c.id === taxSelectedCompany)?.name?.replace(/\s+/g, '-')}`
      : '';
    const filename = `${language === 'fr' ? 'Taxes-Collectees-Ventes' : 'Taxes-Collected-Sales'}${companyFilter}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(filename);
    logExport('taxes_collected_sales', 'pdf', language === 'fr' ? 'Telechargement PDF rapport taxes collectees' : 'Taxes collected PDF download');
  };

  const exportTaxesCollectedToExcel = () => {
    if (!taxData || taxData.totalInvoiceTaxAmount === 0) return;
    
    const wb = XLSX.utils.book_new();
    const dateLocale = language === 'fr' ? fr : enUS;
    
    // Summary data - only collected taxes
    const summaryData = [
      [
        getReportTranslation('taxName', language), 
        language === 'fr' ? 'Nombre de factures' : 'Number of Invoices',
        getReportTranslation('taxCollected', language)
      ],
      ...taxData.taxSummary
        .filter(tax => tax.invoiceAmount > 0)
        .map(tax => [
          tax.name,
          tax.invoiceCount || 0,
          tax.invoiceAmount
        ])
    ];
    
    const summaryWs = XLSX.utils.aoa_to_sheet([
      [getReportTranslation('taxesCollectedSales', language)],
      [`${getReportTranslation('generatedOn', language)}: ${format(new Date(), 'dd/MM/yyyy', { locale: dateLocale })}`],
      taxSelectedCompany && taxSelectedCompany !== 'all' 
        ? [`${getReportTranslation('company', language)}: ${companies.find(c => c.id === taxSelectedCompany)?.name}`]
        : [getReportTranslation('allCompanies', language)],
      taxEffectiveStart && taxEffectiveEnd 
        ? [`${getReportTranslation('period', language)}: ${format(taxEffectiveStart, 'dd/MM/yyyy', { locale: dateLocale })} - ${format(taxEffectiveEnd, 'dd/MM/yyyy', { locale: dateLocale })}`]
        : [],
      [],
      [getReportTranslation('taxSummary', language)],
      [`${getReportTranslation('totalTaxCollected', language)}: ${taxData.totalInvoiceTaxAmount}`],
      [getReportTranslation('taxesCollectedSalesDesc', language)],
      [],
      [],
      ...summaryData
    ].filter(row => row.length > 0));
    
    applyWorksheetFormatting(summaryWs, { headerRowIndex: 10 });
    XLSX.utils.book_append_sheet(wb, summaryWs, getReportTranslation('summary', language));
    
    // Generate filename and save
    const companyFilter = taxSelectedCompany && taxSelectedCompany !== 'all' 
      ? `-${companies.find(c => c.id === taxSelectedCompany)?.name?.replace(/\s+/g, '-')}`
      : '';
    const filename = `${getReportTranslation('taxesCollectedSalesFile', language)}${companyFilter}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(wb, filename);
    logExport('taxes_collected_sales', 'excel', language === 'fr' ? 'Export Excel rapport taxes collectées' : 'Taxes collected Excel export');
  };

  // Export functions for Taxes Paid on Expenses - Only expense taxes
  const exportTaxesPaidToPDF = async () => {
    if (!taxData || taxData.totalExpenseTaxAmount === 0) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const dateLocale = language === 'fr' ? fr : enUS;
    const margin = 20;
    
    // Get company name for header
    const companyName = taxSelectedCompany && taxSelectedCompany !== 'all' 
      ? companies.find(c => c.id === taxSelectedCompany)?.name 
      : (language === 'fr' ? 'Toutes les entreprises' : 'All Companies');
    
    // Fetch expense details for the detail table
    let expenseDetails: any[] = [];
    try {
      let query = supabase
        .from('expenses')
        .select(`
          id, description, expense_date, amount, category, vendor, status,
          taxes, tax_recoverable_percent, company_id,
          companies ( name )
        `)
        .eq('user_id', user?.id || '')
        .eq('status', 'paid')
        .neq('taxes', '[]');

      if (taxEffectiveStart) {
        query = query.gte('expense_date', taxEffectiveStart.toISOString().split('T')[0]);
      }
      if (taxEffectiveEnd) {
        query = query.lte('expense_date', taxEffectiveEnd.toISOString().split('T')[0]);
      }
      if (taxSelectedCompany && taxSelectedCompany !== 'all') {
        query = query.eq('company_id', taxSelectedCompany);
      }

      const { data } = await query.order('expense_date', { ascending: false });
      expenseDetails = data || [];
    } catch (err) {
      console.error('Error fetching expense details for PDF:', err);
    }

    // Calculate total expense amount (before taxes)
    const totalExpenseAmount = expenseDetails.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
    
    // ========== HEADER ==========
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(language === 'fr' ? 'Taxes payées sur les dépenses' : 'Taxes Paid on Expenses', pageWidth / 2, 25, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(companyName || '', pageWidth / 2, 35, { align: 'center' });
    
    // Date range
    let yOffset = 45;
    const reportEndDate = taxEffectiveEnd || new Date();
    if (taxEffectiveStart) {
      doc.setFontSize(10);
      doc.text(
        `${language === 'fr' ? 'Période' : 'Period'}: ${format(taxEffectiveStart, 'dd MMMM yyyy', { locale: dateLocale })} – ${format(reportEndDate, 'dd MMMM yyyy', { locale: dateLocale })}`,
        pageWidth / 2, yOffset, { align: 'center' }
      );
      yOffset += 8;
    } else {
      doc.setFontSize(10);
      doc.text(
        `${language === 'fr' ? 'Période : Toutes les périodes' : 'Period: All time'}`,
        pageWidth / 2, yOffset, { align: 'center' }
      );
      yOffset += 8;
    }
    
    // Display mode
    doc.setFontSize(10);
    doc.text(
      `${language === 'fr' ? 'Affichage' : 'Display'}: ${taxViewMode === 'monthly' ? (language === 'fr' ? 'Mensuel' : 'Monthly') : (language === 'fr' ? 'Annuel' : 'Yearly')}`,
      pageWidth / 2, yOffset, { align: 'center' }
    );
    yOffset += 8;
    
    // Generated date
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `${language === 'fr' ? 'Généré le' : 'Generated on'}: ${format(new Date(), 'dd MMMM yyyy, HH:mm', { locale: dateLocale })}`,
      pageWidth / 2,
      yOffset,
      { align: 'center' }
    );
    doc.setTextColor(0, 0, 0);
    
    yOffset += 15;
    
    // ========== SUMMARY SECTION ==========
    doc.setFillColor(255, 247, 237); // Light orange background
    doc.roundedRect(margin, yOffset, pageWidth - (margin * 2), 45, 3, 3, 'F');
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(language === 'fr' ? 'Résumé' : 'Summary', margin + 5, yOffset + 10);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    // Total expenses
    doc.text(
      `${language === 'fr' ? 'Total des dépenses' : 'Total Expenses'}:`,
      margin + 5,
      yOffset + 22
    );
    doc.setFont('helvetica', 'bold');
    doc.text(
      totalExpenseAmount.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' }),
      margin + 75,
      yOffset + 22
    );
    
    // Total tax credits
    doc.setFont('helvetica', 'normal');
    doc.text(
      `${language === 'fr' ? 'Total crédits de taxes' : 'Total Tax Credits'}:`,
      margin + 5,
      yOffset + 32
    );
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(249, 115, 22); // Orange
    doc.text(
      taxData.totalExpenseTaxAmount.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' }),
      margin + 75,
      yOffset + 32
    );
    doc.setTextColor(0, 0, 0);
    
    // Number of expenses
    doc.setFont('helvetica', 'normal');
    doc.text(
      `${language === 'fr' ? 'Nombre de dépenses' : 'Number of Expenses'}: ${expenseDetails.length}`,
      margin + 5,
      yOffset + 42
    );
    
    yOffset += 55;
    
    // ========== BREAKDOWN BY TAX TYPE ==========
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(language === 'fr' ? 'Répartition par type de taxe' : 'Breakdown by Tax Type', margin, yOffset);
    yOffset += 8;
    
    if (taxData.taxSummary.length > 0) {
      const taxBreakdownData = taxData.taxSummary
        .filter(tax => tax.expenseAmount > 0)
        .map(tax => [
          tax.name,
          (tax.expenseCount || 0).toString(),
          tax.expenseAmount.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' })
        ]);
      
      // Add total row
      taxBreakdownData.push([
        language === 'fr' ? 'TOTAL' : 'TOTAL',
        expenseDetails.length.toString(),
        taxData.totalExpenseTaxAmount.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' })
      ]);
      
      autoTable(doc, {
        head: [[
          language === 'fr' ? 'Type de taxe' : 'Tax Type',
          language === 'fr' ? 'Dépenses' : 'Expenses',
          language === 'fr' ? 'Crédit de taxe' : 'Tax Credit'
        ]],
        body: taxBreakdownData,
        startY: yOffset,
        theme: 'striped',
        headStyles: { fillColor: [249, 115, 22], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 4 },
        didParseCell: (data) => {
          if (data.row.index === taxBreakdownData.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [255, 237, 213];
          }
        }
      });
      
      yOffset = (doc as any).lastAutoTable.finalY + 15;
    }
    
    // ========== EXPENSE DETAILS TABLE ==========
    if (expenseDetails.length > 0) {
      // Check if we need a new page
      if (yOffset > pageHeight - 80) {
        doc.addPage();
        yOffset = 25;
      }
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(language === 'fr' ? 'Détails des dépenses' : 'Expense Details', margin, yOffset);
      yOffset += 8;
      
      const expenseTableData = expenseDetails.map(exp => {
        const expenseTaxes = (exp.taxes as any[]) || [];
        const totalTaxAmount = expenseTaxes.reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
        const taxTypes = expenseTaxes.map((t: any) => t.name).join(', ') || '-';
        const recoverablePct = exp.tax_recoverable_percent != null ? Number(exp.tax_recoverable_percent) : 100;
        const recoverableAmount = totalTaxAmount * (recoverablePct / 100);
        const translatedCategory = getTranslatedCategoryName(exp.category);
        
        return [
          format(new Date(exp.expense_date), 'dd/MM/yyyy'),
          exp.vendor || '-',
          translatedCategory,
          Number(exp.amount || 0).toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' }),
          totalTaxAmount.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' }),
          `${recoverablePct}%`,
          recoverableAmount.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' }),
          taxTypes
        ];
      });
      
      autoTable(doc, {
        head: [[
          language === 'fr' ? 'Date' : 'Date',
          language === 'fr' ? 'Fournisseur' : 'Vendor',
          language === 'fr' ? 'Catégorie' : 'Category',
          language === 'fr' ? 'Montant' : 'Amount',
          language === 'fr' ? 'Taxes' : 'Taxes',
          language === 'fr' ? '% Récupérable' : 'Recoverable %',
          language === 'fr' ? 'Montant récupérable' : 'Recoverable Tax Amount',
          language === 'fr' ? 'Type' : 'Type'
        ]],
        body: expenseTableData,
        startY: yOffset,
        theme: 'striped',
        headStyles: { fillColor: [100, 116, 139], fontStyle: 'bold', fontSize: 7 },
        styles: { fontSize: 6.5, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 18 },
          1: { cellWidth: 25 },
          2: { cellWidth: 24 },
          3: { cellWidth: 22, halign: 'right' },
          4: { cellWidth: 20, halign: 'right' },
          5: { cellWidth: 14, halign: 'center' },
          6: { cellWidth: 22, halign: 'right' },
          7: { cellWidth: 22 }
        }
      });
    }
    
    // ========== FOOTER ==========
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      // Page number (right side)
      doc.text(
        `Page ${i} / ${pageCount}`,
        pageWidth - margin,
        pageHeight - 10,
        { align: 'right' }
      );
      // Branding (center) - only if not hidden
      if (!hidePdfBranding) {
        doc.text(
          language === 'fr' ? 'Généré par GestionFlow • gestionflow.com' : 'Generated by GestionFlow • gestionflow.com',
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }
      doc.setTextColor(0, 0, 0);
    }
    
    // Generate filename and save
    const companyFilter = taxSelectedCompany && taxSelectedCompany !== 'all' 
      ? `-${companies.find(c => c.id === taxSelectedCompany)?.name?.replace(/\s+/g, '-')}`
      : '';
    const filename = `${language === 'fr' ? 'Taxes-Payees-Depenses' : 'Taxes-Paid-Expenses'}${companyFilter}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(filename);
    logExport('taxes_paid_expenses', 'pdf', language === 'fr' ? 'Telechargement PDF rapport taxes depenses' : 'Taxes paid on expenses PDF download');
  };

  const exportTaxesPaidToExcel = async () => {
    if (!taxData || taxData.totalExpenseTaxAmount === 0) return;
    
    const wb = XLSX.utils.book_new();
    const dateLocale = language === 'fr' ? fr : enUS;
    
    // Summary data - only expense taxes
    const summaryData = [
      [
        getReportTranslation('taxName', language), 
        getReportTranslation('numberOfExpenses', language),
        getReportTranslation('taxPaid', language)
      ],
      ...taxData.taxSummary
        .filter(tax => tax.expenseAmount > 0)
        .map(tax => [
          tax.name,
          tax.expenseCount || 0,
          tax.expenseAmount
        ])
    ];
    
    const summaryWs = XLSX.utils.aoa_to_sheet([
      [getReportTranslation('taxesPaidExpenses', language)],
      [`${getReportTranslation('generatedOn', language)}: ${format(new Date(), 'dd/MM/yyyy', { locale: dateLocale })}`],
      taxSelectedCompany && taxSelectedCompany !== 'all' 
        ? [`${getReportTranslation('company', language)}: ${companies.find(c => c.id === taxSelectedCompany)?.name}`]
        : [getReportTranslation('allCompanies', language)],
      taxEffectiveStart && taxEffectiveEnd 
        ? [`${getReportTranslation('period', language)}: ${format(taxEffectiveStart, 'dd/MM/yyyy', { locale: dateLocale })} - ${format(taxEffectiveEnd, 'dd/MM/yyyy', { locale: dateLocale })}`]
        : [],
      [],
      [getReportTranslation('taxSummary', language)],
      [`${getReportTranslation('totalTaxPaid', language)}: ${taxData.totalExpenseTaxAmount}`],
      [getReportTranslation('taxesPaidExpensesDesc', language)],
      [],
      [],
      ...summaryData
    ].filter(row => row.length > 0));
    
    applyWorksheetFormatting(summaryWs, { headerRowIndex: 10 });
    XLSX.utils.book_append_sheet(wb, summaryWs, getReportTranslation('summary', language));
    
    // Fetch expense details for the detail sheet
    try {
      let query = supabase
        .from('expenses')
        .select(`
          id, description, expense_date, amount, category, vendor, status,
          taxes, tax_recoverable_percent, company_id,
          companies ( name )
        `)
        .eq('user_id', user?.id || '')
        .eq('status', 'paid')
        .neq('taxes', '[]');

      if (taxEffectiveStart) query = query.gte('expense_date', taxEffectiveStart.toISOString().split('T')[0]);
      if (taxEffectiveEnd) query = query.lte('expense_date', taxEffectiveEnd.toISOString().split('T')[0]);
      if (taxSelectedCompany && taxSelectedCompany !== 'all') query = query.eq('company_id', taxSelectedCompany);

      const { data: expenseDetails } = await query.order('expense_date', { ascending: false });
      
      if (expenseDetails && expenseDetails.length > 0) {
        const detailHeaders = [
          language === 'fr' ? 'Date' : 'Date',
          language === 'fr' ? 'Fournisseur' : 'Vendor',
          language === 'fr' ? 'Catégorie' : 'Category',
          language === 'fr' ? 'Montant avant taxes' : 'Amount Before Tax',
          language === 'fr' ? 'Type de taxe' : 'Tax Type',
          language === 'fr' ? 'Montant taxe' : 'Tax Amount',
          language === 'fr' ? '% Récupérable' : 'Recoverable %',
          language === 'fr' ? 'Taxe récupérable' : 'Recoverable Tax',
          language === 'fr' ? 'Entreprise' : 'Company'
        ];
        
        const detailRows: any[][] = [];
        expenseDetails.forEach(exp => {
          const expTaxes = (exp.taxes as any[]) || [];
          const recoverablePct = exp.tax_recoverable_percent != null ? Number(exp.tax_recoverable_percent) : 100;
          const companyName = (exp.companies as any)?.name || '-';
          const translatedCategory = getTranslatedCategoryName(exp.category);
          
          expTaxes.forEach((tax: any) => {
            const taxAmount = Number(tax.amount) || 0;
            const recoverableAmount = taxAmount * (recoverablePct / 100);
            detailRows.push([
              format(new Date(exp.expense_date), 'dd/MM/yyyy'),
              exp.vendor || '-',
              translatedCategory,
              Number(exp.amount || 0),
              tax.name || '-',
              taxAmount,
              recoverablePct,
              recoverableAmount,
              companyName
            ]);
          });
        });
        
        const detailWs = createFormattedSheet(detailHeaders, detailRows);
        XLSX.utils.book_append_sheet(wb, detailWs, language === 'fr' ? 'Détails' : 'Details');
      }
    } catch (err) {
      console.error('Error fetching expense details for Excel:', err);
    }
    
    // Generate filename and save
    const companyFilter = taxSelectedCompany && taxSelectedCompany !== 'all' 
      ? `-${companies.find(c => c.id === taxSelectedCompany)?.name?.replace(/\s+/g, '-')}`
      : '';
    const filename = `${getReportTranslation('taxesPaidExpensesFile', language)}${companyFilter}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(wb, filename);
    logExport('taxes_paid_expenses', 'excel', language === 'fr' ? 'Export Excel rapport taxes dépenses' : 'Taxes paid on expenses Excel export');
  };

  // Export functions for Net Tax Report (Collected - Credits = Net)
  const exportNetTaxReportToPDF = async () => {
    if (!taxData) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const dateLocale = language === 'fr' ? fr : enUS;
    const margin = 15;
    let pageNumber = 1;
    
    // Get company name for header
    const companyName = taxSelectedCompany && taxSelectedCompany !== 'all'
      ? companies.find(c => c.id === taxSelectedCompany)?.name || ''
      : (language === 'fr' ? 'Toutes les entreprises' : 'All Companies');
    
    const addFooter = () => {
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      // Page number (right side)
      doc.text(
        `Page ${pageNumber}`,
        pageWidth - margin,
        pageHeight - 10,
        { align: 'right' }
      );
      // Branding (center) - only if not hidden
      if (!hidePdfBranding) {
        doc.text(
          language === 'fr' ? 'Généré par GestionFlow • gestionflow.com' : 'Generated by GestionFlow • gestionflow.com',
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }
      doc.setTextColor(0, 0, 0);
    };
    
    // Fetch invoice details for appendix
    let invoiceDetails: any[] = [];
    try {
      let invoiceQuery = supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          issue_date,
          total,
          subtotal,
          tax_amount,
          status,
          client_id,
          clients (
            name,
            company_id
          )
        `)
        .eq('user_id', user?.id || '')
        .eq('status', 'paid')
        .gt('tax_amount', 0);

      if (taxEffectiveStart) {
        invoiceQuery = invoiceQuery.gte('issue_date', taxEffectiveStart.toISOString().split('T')[0]);
      }
      if (taxEffectiveEnd) {
        invoiceQuery = invoiceQuery.lte('issue_date', taxEffectiveEnd.toISOString().split('T')[0]);
      }

      const { data: invoicesData } = await invoiceQuery.order('issue_date', { ascending: false });
      
      if (invoicesData && taxSelectedCompany && taxSelectedCompany !== 'all') {
        invoiceDetails = invoicesData.filter(inv => (inv.clients as any)?.company_id === taxSelectedCompany);
      } else {
        invoiceDetails = invoicesData || [];
      }
    } catch (err) {
      console.error('Error fetching invoice details for net tax PDF:', err);
    }
    
    // Fetch expense details for appendix
    let expenseDetails: any[] = [];
    try {
      let expenseQuery = supabase
        .from('expenses')
        .select(`
          id, description, expense_date, amount, category, vendor, status,
          taxes, tax_recoverable_percent, company_id,
          companies ( name )
        `)
        .eq('user_id', user?.id || '')
        .eq('status', 'paid')
        .neq('taxes', '[]');

      if (taxEffectiveStart) {
        expenseQuery = expenseQuery.gte('expense_date', taxEffectiveStart.toISOString().split('T')[0]);
      }
      if (taxEffectiveEnd) {
        expenseQuery = expenseQuery.lte('expense_date', taxEffectiveEnd.toISOString().split('T')[0]);
      }
      if (taxSelectedCompany && taxSelectedCompany !== 'all') {
        expenseQuery = expenseQuery.eq('company_id', taxSelectedCompany);
      }

      const { data } = await expenseQuery.order('expense_date', { ascending: false });
      expenseDetails = data || [];
    } catch (err) {
      console.error('Error fetching expense details for net tax PDF:', err);
    }
    
    // ========== HEADER ==========
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(language === 'fr' ? 'Rapport de taxe nette' : 'Net Tax Report', pageWidth / 2, 25, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(companyName, pageWidth / 2, 35, { align: 'center' });
    
    // Date range
    let yOffset = 45;
    const reportEndDate = taxEffectiveEnd || new Date();
    if (taxEffectiveStart) {
      doc.setFontSize(10);
      doc.text(
        `${language === 'fr' ? 'Période' : 'Period'}: ${format(taxEffectiveStart, 'dd MMMM yyyy', { locale: dateLocale })} – ${format(reportEndDate, 'dd MMMM yyyy', { locale: dateLocale })}`,
        pageWidth / 2, yOffset, { align: 'center' }
      );
      yOffset += 8;
    } else {
      doc.setFontSize(10);
      doc.text(
        `${language === 'fr' ? 'Période : Toutes les périodes' : 'Period: All time'}`,
        pageWidth / 2, yOffset, { align: 'center' }
      );
      yOffset += 8;
    }
    
    // Display mode
    doc.setFontSize(10);
    doc.text(
      `${language === 'fr' ? 'Affichage' : 'Display'}: ${taxViewMode === 'monthly' ? (language === 'fr' ? 'Mensuel' : 'Monthly') : (language === 'fr' ? 'Annuel' : 'Yearly')}`,
      pageWidth / 2, yOffset, { align: 'center' }
    );
    yOffset += 8;
    
    // Generated date
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `${language === 'fr' ? 'Généré le' : 'Generated on'}: ${format(new Date(), 'dd MMMM yyyy, HH:mm', { locale: dateLocale })}`,
      pageWidth / 2,
      yOffset,
      { align: 'center' }
    );
    doc.setTextColor(0, 0, 0);
    
    yOffset += 18;
    
    // ========== SUMMARY SECTION ==========
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, yOffset, pageWidth - (margin * 2), 65, 3, 3, 'F');
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(language === 'fr' ? 'Résumé du calcul' : 'Tax Calculation Summary', margin + 8, yOffset + 12);
    
    const labelX = margin + 8;
    const valueX = margin + 130;
    
    // Collected Taxes
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(
      `${language === 'fr' ? 'Taxes collectées' : 'Collected Taxes'}:`,
      labelX, yOffset + 26
    );
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(34, 197, 94);
    doc.text(
      taxData.totalInvoiceTaxAmount.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' }),
      valueX, yOffset + 26, { align: 'right' }
    );
    doc.setTextColor(0, 0, 0);
    
    // Tax Credits
    doc.setFont('helvetica', 'normal');
    doc.text(
      `${language === 'fr' ? 'Crédits de taxes' : 'Tax Credits'}:`,
      labelX, yOffset + 36
    );
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(249, 115, 22);
    doc.text(
      `-${taxData.totalExpenseTaxAmount.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' })}`,
      valueX, yOffset + 36, { align: 'right' }
    );
    doc.setTextColor(0, 0, 0);
    
    // Separator
    doc.setDrawColor(200, 200, 200);
    doc.line(labelX, yOffset + 41, valueX, yOffset + 41);
    
    // Net Amount Payable
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(
      `${language === 'fr' ? 'Montant net à payer' : 'Net Amount Payable'}:`,
      labelX, yOffset + 52
    );
    doc.setTextColor(59, 130, 246);
    doc.text(
      taxData.totalTaxAmount.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' }),
      valueX, yOffset + 52, { align: 'right' }
    );
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    
    yOffset += 75;
    
    // ========== NET BY TAX TYPE ==========
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(language === 'fr' ? 'Net par type de taxe' : 'Net by Tax Type', margin, yOffset);
    yOffset += 8;
    
    if (taxData.taxSummary.length > 0) {
      const netByTaxTypeData = taxData.taxSummary.map(tax => [
        tax.name,
        tax.invoiceAmount.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' }),
        tax.expenseAmount.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' }),
        tax.netAmount.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' })
      ]);
      
      // Add total row
      netByTaxTypeData.push([
        'TOTAL',
        taxData.totalInvoiceTaxAmount.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' }),
        taxData.totalExpenseTaxAmount.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' }),
        taxData.totalTaxAmount.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' })
      ]);
      
      autoTable(doc, {
        head: [[
          language === 'fr' ? 'Type de taxe' : 'Tax Type',
          language === 'fr' ? 'Collectées' : 'Collected',
          language === 'fr' ? 'Crédits' : 'Credits',
          language === 'fr' ? 'Net à payer' : 'Net Payable'
        ]],
        body: netByTaxTypeData,
        startY: yOffset,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: {
          1: { halign: 'right' },
          2: { halign: 'right' },
          3: { halign: 'right' }
        },
        didParseCell: (data) => {
          if (data.row.index === netByTaxTypeData.length - 1) {
            data.cell.styles.fillColor = [229, 231, 235];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      });
      
      yOffset = (doc as any).lastAutoTable.finalY + 20;
    }
    
    // ========== APPENDIX: INVOICE DETAILS (if available) ==========
    if (invoiceDetails.length > 0) {
      // Check if we need a new page
      if (yOffset > pageHeight - 100) {
        addFooter();
        doc.addPage();
        pageNumber++;
        yOffset = 20;
      }
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(language === 'fr' ? 'Annexe A : Détails des factures (Taxes collectées)' : 'Appendix A: Invoice Details (Collected Taxes)', margin, yOffset);
      yOffset += 8;
      
      const invoiceTableData = invoiceDetails.map(inv => [
        inv.invoice_number || '-',
        format(new Date(inv.issue_date), 'dd/MM/yyyy'),
        (inv.clients as any)?.name || '-',
        Number(inv.subtotal || 0).toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' }),
        Number(inv.tax_amount || 0).toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' })
      ]);
      
      autoTable(doc, {
        head: [[
          language === 'fr' ? 'No facture' : 'Invoice #',
          language === 'fr' ? 'Date' : 'Date',
          language === 'fr' ? 'Client' : 'Client',
          language === 'fr' ? 'Montant taxable' : 'Taxable Amount',
          language === 'fr' ? 'Taxe collectée' : 'Tax Collected'
        ]],
        body: invoiceTableData,
        startY: yOffset,
        theme: 'striped',
        headStyles: { fillColor: [34, 197, 94], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: {
          3: { halign: 'right' },
          4: { halign: 'right' }
        },
        didDrawPage: () => {
          addFooter();
          pageNumber++;
        }
      });
      
      yOffset = (doc as any).lastAutoTable.finalY + 20;
    }
    
    // ========== APPENDIX: EXPENSE DETAILS (if available) ==========
    if (expenseDetails.length > 0) {
      // Check if we need a new page
      if (yOffset > pageHeight - 100) {
        addFooter();
        doc.addPage();
        pageNumber++;
        yOffset = 20;
      }
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(language === 'fr' ? 'Annexe B : Détails des dépenses (Crédits de taxes)' : 'Appendix B: Expense Details (Tax Credits)', margin, yOffset);
      yOffset += 8;
      
      const expenseTableData = expenseDetails.map(exp => {
        const taxes = Array.isArray(exp.taxes) ? exp.taxes : [];
        const totalTaxes = taxes.reduce((sum: number, tax: any) => sum + (Number(tax.amount) || 0), 0);
        const taxTypes = taxes.map((t: any) => t.name).join(', ') || '-';
        const recoverablePct = exp.tax_recoverable_percent != null ? Number(exp.tax_recoverable_percent) : 100;
        const recoverableAmount = totalTaxes * (recoverablePct / 100);
        
        return [
          format(new Date(exp.expense_date), 'dd/MM/yyyy'),
          exp.vendor || '-',
          exp.category || '-',
          Number(exp.amount || 0).toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' }),
          totalTaxes.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' }),
          `${recoverablePct}%`,
          recoverableAmount.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' }),
          taxTypes
        ];
      });
      
      autoTable(doc, {
        head: [[
          language === 'fr' ? 'Date' : 'Date',
          language === 'fr' ? 'Fournisseur' : 'Vendor',
          language === 'fr' ? 'Catégorie' : 'Category',
          language === 'fr' ? 'Montant' : 'Amount',
          language === 'fr' ? 'Taxes' : 'Taxes',
          language === 'fr' ? '% Récupérable' : 'Recoverable %',
          language === 'fr' ? 'Montant récupérable' : 'Recoverable Tax Amount',
          language === 'fr' ? 'Type' : 'Type'
        ]],
        body: expenseTableData,
        startY: yOffset,
        theme: 'striped',
        headStyles: { fillColor: [249, 115, 22], fontStyle: 'bold', fontSize: 7 },
        styles: { fontSize: 7, cellPadding: 2 },
        columnStyles: {
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'center' },
          6: { halign: 'right' }
        },
        didDrawPage: () => {
          addFooter();
          pageNumber++;
        }
      });
    }
    
    // Add footer to last page
    addFooter();
    
    // Generate filename and save
    const companyFilter = taxSelectedCompany && taxSelectedCompany !== 'all' 
      ? `-${companies.find(c => c.id === taxSelectedCompany)?.name?.replace(/\s+/g, '-')}`
      : '';
    const filename = `${getReportTranslation('netTaxReportFile', language)}${companyFilter}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(filename);
    logExport('net_tax_report', 'pdf', language === 'fr' ? 'Telechargement PDF rapport taxes nettes' : 'Net tax report PDF download');
  };

  const exportNetTaxReportToExcel = () => {
    if (!taxData) return;
    
    const wb = XLSX.utils.book_new();
    const dateLocale = language === 'fr' ? fr : enUS;
    
    // Net tax breakdown data
    const breakdownData = [
      [
        getReportTranslation('taxType', language),
        getReportTranslation('collected', language),
        getReportTranslation('credits', language),
        getReportTranslation('netPayableAmount', language)
      ],
      ...taxData.taxSummary.map(tax => [
        tax.name,
        tax.invoiceAmount,
        tax.expenseAmount,
        tax.netAmount
      ])
    ];
    
    const summaryWs = XLSX.utils.aoa_to_sheet([
      [getReportTranslation('netTaxReport', language)],
      [`${getReportTranslation('generatedOn', language)}: ${format(new Date(), 'dd/MM/yyyy', { locale: dateLocale })}`],
      taxSelectedCompany && taxSelectedCompany !== 'all' 
        ? [`${getReportTranslation('company', language)}: ${companies.find(c => c.id === taxSelectedCompany)?.name}`]
        : [getReportTranslation('allCompanies', language)],
      taxEffectiveStart && taxEffectiveEnd 
        ? [`${getReportTranslation('period', language)}: ${format(taxEffectiveStart, 'dd/MM/yyyy', { locale: dateLocale })} - ${format(taxEffectiveEnd, 'dd/MM/yyyy', { locale: dateLocale })}`]
        : [],
      [],
      [getReportTranslation('taxSummary', language)],
      [`${getReportTranslation('netPayable', language)}: ${taxData.totalTaxAmount}`],
      [getReportTranslation('netTaxExplanation', language)],
      [],
      [`${getReportTranslation('collectedTaxes', language)}: ${taxData.totalInvoiceTaxAmount}`],
      [`${getReportTranslation('taxCredits', language)}: ${taxData.totalExpenseTaxAmount}`],
      [],
      [],
      ...breakdownData
    ].filter(row => row.length > 0));
    
    applyWorksheetFormatting(summaryWs, { headerRowIndex: 13 });
    XLSX.utils.book_append_sheet(wb, summaryWs, getReportTranslation('summary', language));
    
    // Generate filename and save
    const companyFilter = taxSelectedCompany && taxSelectedCompany !== 'all' 
      ? `-${companies.find(c => c.id === taxSelectedCompany)?.name?.replace(/\s+/g, '-')}`
      : '';
    const filename = `${getReportTranslation('netTaxReportFile', language)}${companyFilter}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(wb, filename);
    logExport('net_tax_report', 'excel', language === 'fr' ? 'Export Excel rapport taxes nettes' : 'Net tax report Excel export');
  };

  // Export functions for products - Stock Status PDF
  const exportStockStatusToPDF = async () => {
    const productsToExport = filteredInventoryProducts || [];
    
    if (!productsToExport || productsToExport.length === 0) {
      setShowNoProductsDialog(true);
      return;
    }
    
    // Get company filter name
    let companyFilterName: string | undefined;
    if (productFilterType === 'company' && productSelectedCompanyId) {
      companyFilterName = companies?.find(c => c.id === productSelectedCompanyId)?.name;
    }
    
    // Prepare products for the PDF
    const stockProducts: StockProduct[] = productsToExport.map(p => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category,
      quantity: p.quantity || 0,
      minStock: 5, // Default minimum stock threshold
    }));
    
    await generateStockStatusPdf({
      products: stockProducts,
      companyName: companies?.[0]?.name,
      companyFilterName,
      language: language === 'fr' ? 'fr' : 'en',
      planType: planLimits?.plan_type || 'free',
      hideBranding: hidePdfBranding,
    });
    
    logExport('stock_status', 'pdf', language === 'fr' ? 'Téléchargement PDF rapport état des stocks' : 'Stock status PDF download');
  };
  
  // Export function for Stock Value PDF
  const exportStockValueToPDF = async () => {
    const productsToExport = filteredInventoryProducts || [];
    
    if (!productsToExport || productsToExport.length === 0) {
      setShowNoProductsDialog(true);
      return;
    }
    
    // Get company filter name
    let companyFilterName: string | undefined;
    if (productFilterType === 'company' && productSelectedCompanyId) {
      companyFilterName = companies?.find(c => c.id === productSelectedCompanyId)?.name;
    }
    
    // Prepare products for the PDF (only products with quantity > 0)
    const stockValueProducts: StockValueProduct[] = productsToExport
      .filter(p => (p.quantity || 0) > 0)
      .map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        quantity: p.quantity || 0,
        cost: p.cost || 0,
      }));
    
    await generateStockValuePdf({
      products: stockValueProducts,
      companyName: companies?.[0]?.name,
      companyFilterName,
      language: language === 'fr' ? 'fr' : 'en',
      planType: planLimits?.plan_type || 'free',
      hideBranding: hidePdfBranding,
    });
    
    logExport('stock_value', 'pdf', language === 'fr' ? 'Téléchargement PDF rapport valeur du stock' : 'Stock value PDF download');
  };
  
  // Export Stock Value to Excel
  const exportStockValueToExcel = () => {
    const productsToExport = filteredInventoryProducts || [];
    
    if (!productsToExport || productsToExport.length === 0) {
      setShowNoProductsDialog(true);
      return;
    }
    
    const wb = XLSX.utils.book_new();
    
    // Filter products with stock
    const stockedProducts = productsToExport.filter(p => (p.quantity || 0) > 0);
    
    // Calculate totals
    const totalQuantity = stockedProducts.reduce((sum, p) => sum + (p.quantity || 0), 0);
    const totalValue = stockedProducts.reduce((sum, p) => sum + ((p.quantity || 0) * (p.cost || 0)), 0);
    const averageCost = totalQuantity > 0 ? totalValue / totalQuantity : 0;
    
    // Summary sheet
    const summaryData = [
      [language === 'fr' ? 'Rapport Valeur du Stock' : 'Stock Value Report'],
      [''],
      [language === 'fr' ? 'Date du rapport:' : 'Report date:', format(new Date(), 'dd/MM/yyyy')],
      [language === 'fr' ? 'Valeur totale du stock:' : 'Total inventory value:', '$' + totalValue.toFixed(2)],
      [language === 'fr' ? 'Nombre de produits:' : 'Total products:', stockedProducts.length],
      [language === 'fr' ? 'Quantité totale:' : 'Total quantity:', totalQuantity],
      [language === 'fr' ? 'Coût moyen par unité:' : 'Average cost per unit:', '$' + averageCost.toFixed(2)],
    ];
    
    const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
    applyWorksheetFormatting(summaryWS, { skipAutoFilter: true });
    XLSX.utils.book_append_sheet(wb, summaryWS, language === 'fr' ? 'Résumé' : 'Summary');
    
    // Stock value details sheet with formatting
    const headers = language === 'fr' 
      ? ['Produit', 'SKU', 'Catégorie', 'Quantité', 'Coût unitaire', 'Valeur totale']
      : ['Product', 'SKU', 'Category', 'Quantity', 'Unit Cost', 'Total Value'];
    
    const detailsRows = stockedProducts
      .sort((a, b) => ((b.quantity || 0) * (b.cost || 0)) - ((a.quantity || 0) * (a.cost || 0)))
      .map(product => [
        product.name,
        product.sku || '-',
        product.category || '-',
        product.quantity || 0,
        product.cost || 0,
        (product.quantity || 0) * (product.cost || 0)
      ]);
    
    const totalRowData = [language === 'fr' ? 'TOTAL' : 'TOTAL', '', '', totalQuantity, '', totalValue];
    const detailsWS = createFormattedSheet(headers, detailsRows, totalRowData);
    XLSX.utils.book_append_sheet(wb, detailsWS, language === 'fr' ? 'Détails' : 'Details');
    
    const filename = language === 'fr' 
      ? `rapport-valeur-stock-${format(new Date(), 'yyyy-MM-dd')}.xlsx`
      : `stock-value-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    
    XLSX.writeFile(wb, filename);
    logExport('stock_value', 'excel', language === 'fr' ? 'Export Excel rapport valeur du stock' : 'Stock value report Excel export');
  };
  
  // Legacy export function (kept for backward compatibility with other parts)
  const exportProductsToPDF = async () => {
    await exportStockStatusToPDF();
  };

  const exportProductsToExcel = () => {
    console.log('exportProductsToExcel called', { 
      filteredInventoryProducts: filteredInventoryProducts?.length,
      productFilterType, 
      productSelectedCompanyId 
    });
    
    const productsToExport = filteredInventoryProducts || [];
    
    if (!productsToExport || productsToExport.length === 0) {
      console.warn('No products to export');
      setShowNoProductsDialog(true);
      return;
    }
    
    const wb = XLSX.utils.book_new();
    
    // Summary sheet
    const totalProducts = productsToExport.length;
    const activeProducts = productsToExport.filter(p => p.is_active).length;
    const lowStockProducts = productsToExport.filter(p => (p.quantity || 0) <= 5 && p.is_active).length;
    const totalInventoryValue = productsToExport.reduce((total, p) => total + ((p.quantity || 0) * (p.cost || 0)), 0);
    
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
    applyWorksheetFormatting(summaryWS, { skipAutoFilter: true });
    XLSX.utils.book_append_sheet(wb, summaryWS, 'Summary');
    
    // Products detail sheet with formatting
    const productHeaders = ['Name', 'SKU', 'Category', 'Quantity', 'Cost', 'Price', 'Margin (%)', 'Stock Value', 'Status'];
    const productRows = productsToExport.map(product => {
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
    });
    
    const productsWS = createFormattedSheet(productHeaders, productRows);
    XLSX.utils.book_append_sheet(wb, productsWS, 'Product Details');
    
    const filename = `${getReportTranslation('inventoryReportFile', language)}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(wb, filename);
    logExport('inventory', 'excel', language === 'fr' ? 'Export Excel rapport inventaire' : 'Inventory report Excel export');
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
    applyWorksheetFormatting(summaryWS, { skipAutoFilter: true });
    XLSX.utils.book_append_sheet(wb, summaryWS, 'Summary');
    
    // Revenue by period sheet with formatting
    const periodHeaders = ['Period', 'Revenue', 'Number of Invoices', 'Average Revenue per Invoice'];
    const periodRows = chartData.map(item => [
      item.period,
      item.revenue,
      item.invoiceCount,
      item.invoiceCount > 0 ? item.revenue / item.invoiceCount : 0
    ]);
    
    const revenueWS = createFormattedSheet(periodHeaders, periodRows);
    XLSX.utils.book_append_sheet(wb, revenueWS, 'Revenue by Period');
    
    // Invoices sheet with formatting
    if (filteredInvoices.length > 0) {
      const invoiceHeaders = ['Invoice Number', 'Client', 'Issue Date', 'Total Amount'];
      const invoiceRows = filteredInvoices.map(invoice => [
        invoice.invoice_number,
        (invoice as any).clients?.name || 'N/A',
        format(new Date(invoice.issue_date), 'MMM dd, yyyy'),
        Number(invoice.total)
      ]);
      
      const invoicesWS = createFormattedSheet(invoiceHeaders, invoiceRows);
      XLSX.utils.book_append_sheet(wb, invoicesWS, 'Invoices');
    }
    
    // Generate filename and save
    const filename = `${getReportTranslation('revenueReportFile', language)}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(wb, filename);
    logExport('revenue', 'excel', language === 'fr' ? 'Export Excel rapport revenus' : 'Revenue report Excel export');
  };

  // CSV Export - Revenue by Period (Premium+)
  const exportRevenueToCSV = () => {
    if (!realRevenueData || !chartData.length) return;
    
    const headers = [
      language === 'fr' ? 'Période' : 'Period',
      language === 'fr' ? 'Revenus' : 'Revenue',
      language === 'fr' ? 'Nombre de factures' : 'Number of Invoices',
      language === 'fr' ? 'Revenu moyen par facture' : 'Average Revenue per Invoice'
    ];
    
    const rows = chartData.map(item => [
      item.period,
      item.revenue.toFixed(2),
      item.invoiceCount,
      item.invoiceCount > 0 ? (item.revenue / item.invoiceCount).toFixed(2) : '0.00'
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${language === 'fr' ? 'revenus-par-periode' : 'revenue-by-period'}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    logExport('revenue', 'csv', language === 'fr' ? 'Export CSV rapport revenus' : 'Revenue report CSV export');
  };

  // CSV Export - Revenue by Client (Premium+)
  const exportRevenueByClientToCSV = () => {
    if (!clientRevenueData || clientRevenueData.clientData.length === 0) return;
    
    const headers = [
      language === 'fr' ? 'Client' : 'Client',
      language === 'fr' ? 'Facturé' : 'Invoiced',
      language === 'fr' ? 'Payé' : 'Paid',
      language === 'fr' ? 'Factures' : 'Invoices',
      language === 'fr' ? '% du Total' : '% of Total'
    ];
    
    const rows = clientRevenueData.clientData.map(client => [
      `"${client.clientName.replace(/"/g, '""')}"`,
      client.totalInvoiced.toFixed(2),
      client.totalPaid.toFixed(2),
      client.invoiceCount,
      client.percentageOfTotal.toFixed(1)
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const companyFilter = clientRevenueCompanyId && clientRevenueCompanyId !== 'all' 
      ? `-${companies.find(c => c.id === clientRevenueCompanyId)?.name?.replace(/\s+/g, '-')}`
      : '';
    link.download = `${language === 'fr' ? 'revenus-par-client' : 'revenue-by-client'}${companyFilter}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    logExport('revenue_by_client', 'csv', language === 'fr' ? 'Export CSV revenus par client' : 'Revenue by client CSV export');
  };

  // CSV Export - Revenue by Product (Premium+)
  const exportRevenueByProductToCSV = () => {
    if (!productRevenueData || productRevenueData.productData.length === 0) return;
    
    const headers = [
      language === 'fr' ? 'Produit/Service' : 'Product/Service',
      language === 'fr' ? 'Quantité vendue' : 'Quantity Sold',
      language === 'fr' ? 'Revenus' : 'Revenue',
      language === 'fr' ? 'Moyenne par vente' : 'Avg per Sale',
      language === 'fr' ? '% du Total' : '% of Total'
    ];
    
    const rows = productRevenueData.productData.map(product => [
      `"${product.productName.replace(/"/g, '""')}"`,
      product.quantitySold,
      product.totalRevenue.toFixed(2),
      product.averageRevenuePerSale.toFixed(2),
      product.percentageOfTotal.toFixed(1)
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const companyFilter = productRevenueCompanyId && productRevenueCompanyId !== 'all' 
      ? `-${companies.find(c => c.id === productRevenueCompanyId)?.name?.replace(/\s+/g, '-')}`
      : '';
    link.download = `${language === 'fr' ? 'revenus-par-produit' : 'revenue-by-product'}${companyFilter}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    logExport('revenue_by_product', 'csv', language === 'fr' ? 'Export CSV revenus par produit' : 'Revenue by product CSV export');
  };

  // CSV Export - Expenses by Period (Premium+)
  const exportExpensesByPeriodToCSV = () => {
    if (!expenseReportData) return;
    
    const headers = [
      language === 'fr' ? 'Date' : 'Date',
      language === 'fr' ? 'Description' : 'Description',
      language === 'fr' ? 'Catégorie' : 'Category',
      language === 'fr' ? 'Entreprise' : 'Company',
      language === 'fr' ? 'Fournisseur' : 'Vendor',
      language === 'fr' ? 'Montant' : 'Amount',
      language === 'fr' ? 'Taxes' : 'Taxes',
      language === 'fr' ? 'Total' : 'Total',
      language === 'fr' ? 'Déductible %' : 'Deductible %',
      language === 'fr' ? 'Montant déductible' : 'Deductible Amount',
      language === 'fr' ? 'Statut' : 'Status'
    ];
    
    const sortedExpenses = [...expenseReportData.expenseDetails].sort((a, b) => 
      new Date(a.expense_date).getTime() - new Date(b.expense_date).getTime()
    );
    
    const rows = sortedExpenses.map(expense => {
      const taxes = Array.isArray(expense.taxes) ? expense.taxes : [];
      const totalTaxAmount = taxes.reduce((sum: number, tax: any) => sum + (Number(tax.amount) || 0), 0);
      const grandTotal = Number(expense.amount) + totalTaxAmount;
      
      return [
        format(new Date(expense.expense_date), 'yyyy-MM-dd'),
        `"${(expense.description || '').replace(/"/g, '""')}"`,
        `"${(expense.category || '').replace(/"/g, '""')}"`,
        `"${(expense.company_name || '').replace(/"/g, '""')}"`,
        `"${(expense.vendor || '').replace(/"/g, '""')}"`,
        expense.amount.toFixed(2),
        totalTaxAmount.toFixed(2),
        grandTotal.toFixed(2),
        expense.deductible_percent.toFixed(1),
        expense.deductible_amount.toFixed(2),
        expense.status
      ];
    });
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    let filename = language === 'fr' ? 'depenses-par-periode' : 'expenses-by-period';
    if (expenseStartDate && expenseEndDate) {
      filename += `-${format(expenseStartDate, 'yyyy-MM-dd')}-${format(expenseEndDate, 'yyyy-MM-dd')}`;
    }
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    logExport('expenses-by-period', 'csv', language === 'fr' ? 'Export CSV dépenses par période' : 'Expenses by period CSV export');
  };

  // CSV Export - Expenses by Category (Premium+)
  const exportExpensesByCategoryToCSV = () => {
    if (!expenseReportData) return;
    
    const headers = [
      language === 'fr' ? 'Catégorie' : 'Category',
      language === 'fr' ? 'Nombre' : 'Count',
      language === 'fr' ? 'Montant total' : 'Total Amount',
      language === 'fr' ? 'Déductible %' : 'Deductible %',
      language === 'fr' ? 'Montant déductible' : 'Deductible Amount',
      language === 'fr' ? 'Montant moyen' : 'Average Amount',
      language === 'fr' ? '% du total' : '% of Total'
    ];
    
    const sortedCategories = [...expenseReportData.expensesByCategory].sort((a, b) => b.total_amount - a.total_amount);
    
    const rows = sortedCategories.map(cat => {
      const percentage = expenseReportData.totalExpenses > 0 
        ? ((cat.total_amount / expenseReportData.totalExpenses) * 100).toFixed(1)
        : '0.0';
      
      return [
        `"${(cat.category || '').replace(/"/g, '""')}"`,
        cat.count,
        cat.total_amount.toFixed(2),
        cat.avg_deductible_percent.toFixed(1),
        cat.total_deductible_amount.toFixed(2),
        (cat.total_amount / cat.count).toFixed(2),
        percentage
      ];
    });
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    let filename = language === 'fr' ? 'depenses-par-categorie' : 'expenses-by-category';
    if (expenseStartDate && expenseEndDate) {
      filename += `-${format(expenseStartDate, 'yyyy-MM-dd')}-${format(expenseEndDate, 'yyyy-MM-dd')}`;
    }
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    logExport('expenses-by-category', 'csv', language === 'fr' ? 'Export CSV dépenses par catégorie' : 'Expenses by category CSV export');
  };

  // CSV Export - All Expenses (Premium+)
  const exportAllExpensesToCSV = () => {
    if (!expenseReportData) return;
    
    const headers = [
      language === 'fr' ? 'Date' : 'Date',
      language === 'fr' ? 'Description' : 'Description',
      language === 'fr' ? 'Catégorie' : 'Category',
      language === 'fr' ? 'Entreprise' : 'Company',
      language === 'fr' ? 'Fournisseur' : 'Vendor',
      language === 'fr' ? 'Montant' : 'Amount',
      language === 'fr' ? 'Taxes' : 'Taxes',
      language === 'fr' ? 'Total' : 'Total',
      language === 'fr' ? 'Déductible %' : 'Deductible %',
      language === 'fr' ? 'Montant déductible' : 'Deductible Amount',
      language === 'fr' ? 'Statut' : 'Status'
    ];
    
    const sortedExpenses = [...expenseReportData.expenseDetails].sort((a, b) => 
      new Date(a.expense_date).getTime() - new Date(b.expense_date).getTime()
    );
    
    const rows = sortedExpenses.map(expense => {
      const taxes = Array.isArray(expense.taxes) ? expense.taxes : [];
      const totalTaxAmount = taxes.reduce((sum: number, tax: any) => sum + (Number(tax.amount) || 0), 0);
      const grandTotal = Number(expense.amount) + totalTaxAmount;
      
      return [
        format(new Date(expense.expense_date), 'yyyy-MM-dd'),
        `"${(expense.description || '').replace(/"/g, '""')}"`,
        `"${(expense.category || '').replace(/"/g, '""')}"`,
        `"${(expense.company_name || '').replace(/"/g, '""')}"`,
        `"${(expense.vendor || '').replace(/"/g, '""')}"`,
        expense.amount.toFixed(2),
        totalTaxAmount.toFixed(2),
        grandTotal.toFixed(2),
        expense.deductible_percent.toFixed(1),
        expense.deductible_amount.toFixed(2),
        expense.status
      ];
    });
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    let filename = language === 'fr' ? 'toutes-depenses' : 'all-expenses';
    if (expenseStartDate && expenseEndDate) {
      filename += `-${format(expenseStartDate, 'yyyy-MM-dd')}-${format(expenseEndDate, 'yyyy-MM-dd')}`;
    }
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    logExport('expenses-all', 'csv', language === 'fr' ? 'Export CSV toutes dépenses' : 'All expenses CSV export');
  };

  // Export functions for clients - GLOBAL COMPREHENSIVE REPORT
  const exportClientsToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const dateLocale = language === 'fr' ? fr : enUS;
    
    // Get main company name for header
    const mainCompanyName = companies.length === 1 
      ? companies[0].name 
      : (language === 'fr' ? 'Toutes les entreprises' : 'All Companies');
    
    // Helper function to get last invoice date
    const getLastInvoiceDateForClient = (clientId: string) => {
      const clientInvoices = invoices?.filter((inv: any) => inv.client_id === clientId) || [];
      if (clientInvoices.length === 0) return null;
      const sortedInvoices = clientInvoices.sort((a: any, b: any) => 
        new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime()
      );
      return sortedInvoices[0]?.issue_date;
    };
    
    // Sort clients and companies
    const sortedClients = [...filteredClientsByDate].sort((a, b) => 
      a.name.localeCompare(b.name, language === 'fr' ? 'fr' : 'en')
    );
    
    const sortedCompanies = [...companies].sort((a, b) => 
      a.name.localeCompare(b.name, language === 'fr' ? 'fr' : 'en')
    );
    
    const clientsWithoutCompany = filteredClientsByDate
      .filter(client => !client.company_id)
      .sort((a, b) => a.name.localeCompare(b.name, language === 'fr' ? 'fr' : 'en'));
    
    let yPosition = 15;
    
    // === SECTION 1: HEADER ===
    // Company name
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(mainCompanyName, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 8;
    
    // Report title
    doc.setFontSize(22);
    doc.setTextColor(0, 0, 0);
    doc.text(language === 'fr' ? "Rapport des clients" : "Clients Report", pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;
    
    // Date range filter (if applied)
    if (createdFromDate || createdToDate) {
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      let dateRangeText = language === 'fr' ? 'Période de création: ' : 'Creation period: ';
      if (createdFromDate && createdToDate) {
        dateRangeText += `${format(createdFromDate, 'dd/MM/yyyy')} - ${format(createdToDate, 'dd/MM/yyyy')}`;
      } else if (createdFromDate) {
        dateRangeText += `${language === 'fr' ? 'Depuis le' : 'From'} ${format(createdFromDate, 'dd/MM/yyyy')}`;
      } else if (createdToDate) {
        dateRangeText += `${language === 'fr' ? "Jusqu'au" : 'Until'} ${format(createdToDate, 'dd/MM/yyyy')}`;
      }
      doc.text(dateRangeText, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 6;
    }
    
    // Generated date
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `${language === 'fr' ? 'Généré le' : 'Generated on'}: ${format(new Date(), language === 'fr' ? 'dd MMMM yyyy, HH:mm' : 'MMMM dd, yyyy, HH:mm', { locale: dateLocale })}`,
      pageWidth / 2, 
      yPosition, 
      { align: 'center' }
    );
    yPosition += 15;
    
    // === SECTION 2: SUMMARY ===
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, yPosition - 5, pageWidth - 30, 30, 3, 3, 'F');
    
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(language === 'fr' ? 'Résumé' : 'Summary', 20, yPosition + 3);
    
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    const summaryY = yPosition + 12;
    doc.text(`${language === 'fr' ? 'Total clients' : 'Total clients'}: ${sortedClients.length}`, 20, summaryY);
    doc.text(`${language === 'fr' ? 'Entreprises' : 'Companies'}: ${companies.length}`, 80, summaryY);
    
    // Date range in summary
    let periodText = language === 'fr' ? 'Période: ' : 'Period: ';
    if (createdFromDate || createdToDate) {
      if (createdFromDate && createdToDate) {
        periodText += `${format(createdFromDate, 'dd/MM/yyyy')} - ${format(createdToDate, 'dd/MM/yyyy')}`;
      } else if (createdFromDate) {
        periodText += `${language === 'fr' ? 'Depuis' : 'From'} ${format(createdFromDate, 'dd/MM/yyyy')}`;
      } else {
        periodText += `${language === 'fr' ? "Jusqu'au" : 'Until'} ${format(createdToDate!, 'dd/MM/yyyy')}`;
      }
    } else {
      periodText += language === 'fr' ? 'Toutes les dates' : 'All dates';
    }
    doc.text(periodText, 140, summaryY);
    
    yPosition += 35;
    
    // === SECTION 3: COMPLETE CLIENTS LIST ===
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text(language === 'fr' ? 'Liste complète des clients' : 'Complete Clients List', 20, yPosition);
    yPosition += 8;
    
    const allClientsTableData = sortedClients.map(client => {
      const lastInvoiceDate = getLastInvoiceDateForClient(client.id);
      return [
        client.name,
        client.companies?.name || (language === 'fr' ? 'Aucune' : 'None'),
        client.email || '-',
        client.phone || '-',
        client.contact_person || '-',
        format(new Date(client.created_at), 'dd/MM/yyyy'),
        lastInvoiceDate ? format(new Date(lastInvoiceDate), 'dd/MM/yyyy') : (language === 'fr' ? 'Aucune' : 'None')
      ];
    });
    
    autoTable(doc, {
      head: [[
        language === 'fr' ? 'Nom du client' : 'Client Name',
        language === 'fr' ? 'Entreprise' : 'Company',
        'Email',
        language === 'fr' ? 'Téléphone' : 'Phone',
        'Contact',
        language === 'fr' ? 'Création' : 'Created',
        language === 'fr' ? 'Dern. facture' : 'Last Invoice'
      ]],
      body: allClientsTableData,
      startY: yPosition,
      theme: 'striped',
      headStyles: { 
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8
      },
      styles: { 
        fontSize: 7,
        cellPadding: 2,
        overflow: 'linebreak'
      },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 24 },
        2: { cellWidth: 38 },
        3: { cellWidth: 22 },
        4: { cellWidth: 22 },
        5: { cellWidth: 18 },
        6: { cellWidth: 18 }
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250]
      },
      margin: { left: 15, right: 15 }
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 15;
    
    // === SECTION 4: CLIENTS BY COMPANY ===
    // Add page break for company breakdown
    doc.addPage();
    yPosition = 20;
    
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text(language === 'fr' ? 'Clients par entreprise' : 'Clients by Company', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;
    
    // Process each company
    sortedCompanies.forEach((company) => {
      const companyClients = filteredClientsByDate
        .filter(client => client.company_id === company.id)
        .sort((a, b) => a.name.localeCompare(b.name, language === 'fr' ? 'fr' : 'en'));
      
      if (companyClients.length === 0) return;
      
      // Check if we need a new page
      if (yPosition > pageHeight - 70) {
        doc.addPage();
        yPosition = 20;
      }
      
      // Company header
      doc.setFillColor(59, 130, 246);
      doc.rect(15, yPosition - 5, pageWidth - 30, 10, 'F');
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text(company.name, 20, yPosition + 2);
      doc.setFontSize(9);
      doc.text(
        `${companyClients.length} ${companyClients.length > 1 ? 'clients' : 'client'}`,
        pageWidth - 20,
        yPosition + 2,
        { align: 'right' }
      );
      yPosition += 12;
      
      const companyTableData = companyClients.map(client => {
        const lastInvoiceDate = getLastInvoiceDateForClient(client.id);
        return [
          client.name,
          client.email || '-',
          format(new Date(client.created_at), 'dd/MM/yyyy'),
          lastInvoiceDate ? format(new Date(lastInvoiceDate), 'dd/MM/yyyy') : (language === 'fr' ? 'Aucune' : 'None')
        ];
      });
      
      autoTable(doc, {
        head: [[
          language === 'fr' ? 'Nom du client' : 'Client Name',
          'Email',
          language === 'fr' ? 'Création' : 'Created',
          language === 'fr' ? 'Dernière facture' : 'Last Invoice'
        ]],
        body: companyTableData,
        startY: yPosition,
        theme: 'striped',
        headStyles: { 
          fillColor: [100, 116, 139],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8
        },
        styles: { 
          fontSize: 8,
          cellPadding: 2
        },
        columnStyles: {
          0: { cellWidth: 45 },
          1: { cellWidth: 60 },
          2: { cellWidth: 30 },
          3: { cellWidth: 30 }
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250]
        },
        margin: { left: 15, right: 15 }
      });
      
      yPosition = (doc as any).lastAutoTable.finalY + 12;
    });
    
    // Clients without company
    if (clientsWithoutCompany.length > 0) {
      if (yPosition > pageHeight - 70) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFillColor(107, 114, 128);
      doc.rect(15, yPosition - 5, pageWidth - 30, 10, 'F');
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text(language === 'fr' ? 'Sans entreprise' : 'No Company', 20, yPosition + 2);
      doc.setFontSize(9);
      doc.text(
        `${clientsWithoutCompany.length} ${clientsWithoutCompany.length > 1 ? 'clients' : 'client'}`,
        pageWidth - 20,
        yPosition + 2,
        { align: 'right' }
      );
      yPosition += 12;
      
      const noCompanyTableData = clientsWithoutCompany.map(client => {
        const lastInvoiceDate = getLastInvoiceDateForClient(client.id);
        return [
          client.name,
          client.email || '-',
          format(new Date(client.created_at), 'dd/MM/yyyy'),
          lastInvoiceDate ? format(new Date(lastInvoiceDate), 'dd/MM/yyyy') : (language === 'fr' ? 'Aucune' : 'None')
        ];
      });
      
      autoTable(doc, {
        head: [[
          language === 'fr' ? 'Nom du client' : 'Client Name',
          'Email',
          language === 'fr' ? 'Création' : 'Created',
          language === 'fr' ? 'Dernière facture' : 'Last Invoice'
        ]],
        body: noCompanyTableData,
        startY: yPosition,
        theme: 'striped',
        headStyles: { 
          fillColor: [100, 116, 139],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8
        },
        styles: { 
          fontSize: 8,
          cellPadding: 2
        },
        columnStyles: {
          0: { cellWidth: 45 },
          1: { cellWidth: 60 },
          2: { cellWidth: 30 },
          3: { cellWidth: 30 }
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250]
        },
        margin: { left: 15, right: 15 }
      });
    }
    
    // === ADD FOOTERS TO ALL PAGES ===
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      
      // Page number - right
      doc.text(
        `${language === 'fr' ? 'Page' : 'Page'} ${i} / ${pageCount}`,
        pageWidth - 20,
        pageHeight - 10,
        { align: 'right' }
      );
      
      // Branding - left (only if branding not hidden)
      if (!hidePdfBranding) {
        doc.text(
          'Generated with GestionFlow',
          20,
          pageHeight - 10,
          { align: 'left' }
        );
      }
    }
    
    // Generate filename
    const filename = `${language === 'fr' ? 'rapport-clients' : 'clients-report'}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(filename);
    logExport('clients_report', 'pdf', language === 'fr' ? 'Téléchargement PDF rapport complet clients' : 'Complete clients report PDF download');
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
    logExport('clients', 'excel', language === 'fr' ? 'Export Excel rapport clients' : 'Clients report Excel export');
  };

  // Export all clients functions
  const exportAllClientsToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    // Get the first company for header (or use a generic name if multiple)
    const companyName = companies.length === 1 
      ? companies[0].name 
      : (language === 'fr' ? 'Toutes les entreprises' : 'All Companies');
    
    // Sort clients by name A-Z
    const sortedClients = [...filteredClientsByDate].sort((a, b) => 
      a.name.localeCompare(b.name, language === 'fr' ? 'fr' : 'en')
    );
    
    let yPosition = 15;
    
    // === HEADER ===
    // Company name
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(companyName, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;
    
    // Report title
    doc.setFontSize(20);
    doc.setTextColor(0, 0, 0);
    doc.text(language === 'fr' ? "Liste des clients" : "Clients List", pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;
    
    // Date range filter (if applied)
    if (createdFromDate || createdToDate) {
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      let dateRangeText = language === 'fr' ? 'Période de création: ' : 'Creation period: ';
      if (createdFromDate && createdToDate) {
        dateRangeText += `${format(createdFromDate, 'dd/MM/yyyy')} - ${format(createdToDate, 'dd/MM/yyyy')}`;
      } else if (createdFromDate) {
        dateRangeText += `${language === 'fr' ? 'Depuis le' : 'From'} ${format(createdFromDate, 'dd/MM/yyyy')}`;
      } else if (createdToDate) {
        dateRangeText += `${language === 'fr' ? "Jusqu'au" : 'Until'} ${format(createdToDate, 'dd/MM/yyyy')}`;
      }
      doc.text(dateRangeText, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 6;
    }
    
    // Generated date
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `${language === 'fr' ? 'Généré le' : 'Generated on'}: ${format(new Date(), language === 'fr' ? 'dd MMMM yyyy, HH:mm' : 'MMMM dd, yyyy, HH:mm', { locale: language === 'fr' ? fr : enUS })}`,
      pageWidth / 2, 
      yPosition, 
      { align: 'center' }
    );
    yPosition += 8;
    
    // Summary line
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(
      `${language === 'fr' ? 'Total' : 'Total'}: ${sortedClients.length} ${sortedClients.length > 1 ? (language === 'fr' ? 'clients' : 'clients') : (language === 'fr' ? 'client' : 'client')}`,
      pageWidth / 2, 
      yPosition, 
      { align: 'center' }
    );
    yPosition += 10;
    
    // === CLIENTS TABLE ===
    const getLastInvoiceDateForClient = (clientId: string) => {
      const clientInvoices = invoices?.filter((inv: any) => inv.client_id === clientId) || [];
      if (clientInvoices.length === 0) return null;
      const sortedInvoices = clientInvoices.sort((a: any, b: any) => 
        new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime()
      );
      return sortedInvoices[0]?.issue_date;
    };
    
    const tableData = sortedClients.map(client => {
      const lastInvoiceDate = getLastInvoiceDateForClient(client.id);
      return [
        client.name,
        client.companies?.name || (language === 'fr' ? 'Aucune' : 'None'),
        client.email || '-',
        client.phone || '-',
        client.contact_person || '-',
        format(new Date(client.created_at), 'dd/MM/yyyy'),
        lastInvoiceDate ? format(new Date(lastInvoiceDate), 'dd/MM/yyyy') : (language === 'fr' ? 'Aucune' : 'None')
      ];
    });
    
    autoTable(doc, {
      head: [[
        language === 'fr' ? 'Nom du client' : 'Client Name',
        language === 'fr' ? 'Entreprise' : 'Company',
        'Email',
        language === 'fr' ? 'Téléphone' : 'Phone',
        'Contact',
        language === 'fr' ? 'Date création' : 'Creation Date',
        language === 'fr' ? 'Dernière facture' : 'Last Invoice'
      ]],
      body: tableData,
      startY: yPosition,
      theme: 'striped',
      headStyles: { 
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8
      },
      styles: { 
        fontSize: 8,
        cellPadding: 3,
        overflow: 'linebreak'
      },
      columnStyles: {
        0: { cellWidth: 30 }, // Client Name
        1: { cellWidth: 25 }, // Company
        2: { cellWidth: 40 }, // Email
        3: { cellWidth: 25 }, // Phone
        4: { cellWidth: 25 }, // Contact
        5: { cellWidth: 22 }, // Creation Date
        6: { cellWidth: 22 }  // Last Invoice
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250]
      },
      didDrawPage: (data) => {
        // Footer on each page
        const pageNumber = doc.getNumberOfPages();
        const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;
        
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        
        // Page number - right
        doc.text(
          `${language === 'fr' ? 'Page' : 'Page'} ${currentPage} / ${pageNumber}`,
          pageWidth - 20,
          pageHeight - 10,
          { align: 'right' }
        );
        
        // Branding - left (only if branding not hidden)
        if (!hidePdfBranding) {
          doc.text(
            'Generated with GestionFlow',
            20,
            pageHeight - 10,
            { align: 'left' }
          );
        }
      }
    });
    
    const filename = `${language === 'fr' ? 'liste-clients' : 'clients-list'}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(filename);
    logExport('all_clients', 'pdf', language === 'fr' ? 'Téléchargement PDF liste des clients' : 'Clients list PDF download');
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
    logExport('all_clients', 'excel', language === 'fr' ? 'Export Excel tous les clients' : 'All clients Excel export');
  };

  // Export company-specific clients functions (grouped PDF for all companies)
  const exportCompanyClientsToPDF = (company: any) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    // Get the first company for header (or use a generic name if multiple)
    const mainCompanyName = companies.length === 1 
      ? companies[0].name 
      : (language === 'fr' ? 'Toutes les entreprises' : 'All Companies');
    
    // Helper function to get last invoice date
    const getLastInvoiceDateForClient = (clientId: string) => {
      const clientInvoices = invoices?.filter((inv: any) => inv.client_id === clientId) || [];
      if (clientInvoices.length === 0) return null;
      const sortedInvoices = clientInvoices.sort((a: any, b: any) => 
        new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime()
      );
      return sortedInvoices[0]?.issue_date;
    };
    
    // Sort companies alphabetically
    const sortedCompanies = [...companies].sort((a, b) => 
      a.name.localeCompare(b.name, language === 'fr' ? 'fr' : 'en')
    );
    
    // Get clients without company
    const clientsWithoutCompany = filteredClientsByDate
      .filter(client => !client.company_id)
      .sort((a, b) => a.name.localeCompare(b.name, language === 'fr' ? 'fr' : 'en'));
    
    let yPosition = 15;
    let isFirstPage = true;
    
    // Function to add header
    const addHeader = () => {
      yPosition = 15;
      
      // Company name
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(mainCompanyName, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;
      
      // Report title
      doc.setFontSize(20);
      doc.setTextColor(0, 0, 0);
      doc.text(language === 'fr' ? "Clients par entreprise" : "Clients by Company", pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;
      
      // Date range filter (if applied)
      if (createdFromDate || createdToDate) {
        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        let dateRangeText = language === 'fr' ? 'Période de création: ' : 'Creation period: ';
        if (createdFromDate && createdToDate) {
          dateRangeText += `${format(createdFromDate, 'dd/MM/yyyy')} - ${format(createdToDate, 'dd/MM/yyyy')}`;
        } else if (createdFromDate) {
          dateRangeText += `${language === 'fr' ? 'Depuis le' : 'From'} ${format(createdFromDate, 'dd/MM/yyyy')}`;
        } else if (createdToDate) {
          dateRangeText += `${language === 'fr' ? "Jusqu'au" : 'Until'} ${format(createdToDate, 'dd/MM/yyyy')}`;
        }
        doc.text(dateRangeText, pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 6;
      }
      
      // Generated date
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text(
        `${language === 'fr' ? 'Généré le' : 'Generated on'}: ${format(new Date(), language === 'fr' ? 'dd MMMM yyyy, HH:mm' : 'MMMM dd, yyyy, HH:mm', { locale: language === 'fr' ? fr : enUS })}`,
        pageWidth / 2, 
        yPosition, 
        { align: 'center' }
      );
      yPosition += 15;
    };
    
    // Function to add footer on all pages
    const addFooter = () => {
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        
        // Page number - right
        doc.text(
          `${language === 'fr' ? 'Page' : 'Page'} ${i} / ${pageCount}`,
          pageWidth - 20,
          pageHeight - 10,
          { align: 'right' }
        );
        
        // Branding - left (only if branding not hidden)
        if (!hidePdfBranding) {
          doc.text(
            'Generated with GestionFlow',
            20,
            pageHeight - 10,
            { align: 'left' }
          );
        }
      }
    };
    
    // Add first page header
    addHeader();
    
    // Process each company
    sortedCompanies.forEach((comp, companyIndex) => {
      const companyClients = filteredClientsByDate
        .filter(client => client.company_id === comp.id)
        .sort((a, b) => a.name.localeCompare(b.name, language === 'fr' ? 'fr' : 'en'));
      
      if (companyClients.length === 0) return;
      
      // Check if we need a new page (leave room for company header + at least one row)
      if (yPosition > pageHeight - 80 && !isFirstPage) {
        doc.addPage();
        yPosition = 20;
      }
      isFirstPage = false;
      
      // Company section header
      doc.setFillColor(59, 130, 246);
      doc.rect(15, yPosition - 5, pageWidth - 30, 10, 'F');
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.text(comp.name, 20, yPosition + 2);
      doc.setFontSize(10);
      doc.text(
        `${companyClients.length} ${companyClients.length > 1 ? 'clients' : 'client'}`,
        pageWidth - 20,
        yPosition + 2,
        { align: 'right' }
      );
      yPosition += 12;
      
      // Clients table for this company
      const tableData = companyClients.map(client => {
        const lastInvoiceDate = getLastInvoiceDateForClient(client.id);
        return [
          client.name,
          client.email || '-',
          client.phone || '-',
          client.contact_person || '-',
          format(new Date(client.created_at), 'dd/MM/yyyy'),
          lastInvoiceDate ? format(new Date(lastInvoiceDate), 'dd/MM/yyyy') : (language === 'fr' ? 'Aucune' : 'None')
        ];
      });
      
      autoTable(doc, {
        head: [[
          language === 'fr' ? 'Nom du client' : 'Client Name',
          'Email',
          language === 'fr' ? 'Téléphone' : 'Phone',
          'Contact',
          language === 'fr' ? 'Création' : 'Created',
          language === 'fr' ? 'Dern. facture' : 'Last Invoice'
        ]],
        body: tableData,
        startY: yPosition,
        theme: 'striped',
        headStyles: { 
          fillColor: [100, 116, 139],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8
        },
        styles: { 
          fontSize: 8,
          cellPadding: 2,
          overflow: 'linebreak'
        },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 40 },
          2: { cellWidth: 25 },
          3: { cellWidth: 25 },
          4: { cellWidth: 22 },
          5: { cellWidth: 22 }
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250]
        },
        margin: { left: 15, right: 15 }
      });
      
      yPosition = (doc as any).lastAutoTable.finalY + 15;
    });
    
    // Add clients without company section
    if (clientsWithoutCompany.length > 0) {
      // Check if we need a new page
      if (yPosition > pageHeight - 80) {
        doc.addPage();
        yPosition = 20;
      }
      
      // Section header
      doc.setFillColor(107, 114, 128);
      doc.rect(15, yPosition - 5, pageWidth - 30, 10, 'F');
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.text(language === 'fr' ? 'Sans entreprise' : 'No Company', 20, yPosition + 2);
      doc.setFontSize(10);
      doc.text(
        `${clientsWithoutCompany.length} ${clientsWithoutCompany.length > 1 ? 'clients' : 'client'}`,
        pageWidth - 20,
        yPosition + 2,
        { align: 'right' }
      );
      yPosition += 12;
      
      const tableData = clientsWithoutCompany.map(client => {
        const lastInvoiceDate = getLastInvoiceDateForClient(client.id);
        return [
          client.name,
          client.email || '-',
          client.phone || '-',
          client.contact_person || '-',
          format(new Date(client.created_at), 'dd/MM/yyyy'),
          lastInvoiceDate ? format(new Date(lastInvoiceDate), 'dd/MM/yyyy') : (language === 'fr' ? 'Aucune' : 'None')
        ];
      });
      
      autoTable(doc, {
        head: [[
          language === 'fr' ? 'Nom du client' : 'Client Name',
          'Email',
          language === 'fr' ? 'Téléphone' : 'Phone',
          'Contact',
          language === 'fr' ? 'Création' : 'Created',
          language === 'fr' ? 'Dern. facture' : 'Last Invoice'
        ]],
        body: tableData,
        startY: yPosition,
        theme: 'striped',
        headStyles: { 
          fillColor: [100, 116, 139],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8
        },
        styles: { 
          fontSize: 8,
          cellPadding: 2,
          overflow: 'linebreak'
        },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 40 },
          2: { cellWidth: 25 },
          3: { cellWidth: 25 },
          4: { cellWidth: 22 },
          5: { cellWidth: 22 }
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250]
        },
        margin: { left: 15, right: 15 }
      });
    }
    
    // Add footers to all pages
    addFooter();
    
    const filename = `${language === 'fr' ? 'clients-par-entreprise' : 'clients-by-company'}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(filename);
    logExport('clients_by_company', 'pdf', language === 'fr' ? 'Téléchargement PDF clients par entreprise' : 'Clients by company PDF download');
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
    logExport('company_clients', 'excel', language === 'fr' ? `Export Excel clients de ${company.name}` : `Company clients Excel export - ${company.name}`);
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
    logExport('clients_no_company', 'pdf', language === 'fr' ? 'Téléchargement PDF clients sans compagnie' : 'Clients without company PDF download');
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
    logExport('clients_no_company', 'excel', language === 'fr' ? 'Export Excel clients sans compagnie' : 'Clients without company Excel export');
  };

  // Export functions for expenses
  const exportExpensesToPDF = async () => {
    if (!expenseReportData) return;
    
    // Get filter names for the PDF
    let companyFilterName: string | undefined;
    let categoryFilterName: string | undefined;
    
    if (expenseFilterType === 'company' && expenseSelectedCompanyId) {
      companyFilterName = companies.find(c => c.id === expenseSelectedCompanyId)?.name;
    } else if (expenseFilterType === 'category' && expenseSelectedCategory) {
      categoryFilterName = expenseSelectedCategory;
    }
    
    await generateExpensesPeriodPdf({
      reportData: expenseReportData,
      startDate: expenseStartDate,
      endDate: expenseEndDate,
      companyName: companyFilterName,
      companyFilterName,
      categoryFilterName,
      language: language as 'fr' | 'en',
      planType: planLimits?.plan_type || 'free',
      hideBranding: hidePdfBranding,
      returnBlob: false
    });
    
    logExport('expenses_period', 'pdf', language === 'fr' ? 'Téléchargement PDF dépenses par période' : 'Expenses by period PDF download');
  };

  // Export expenses by category PDF
  const exportExpensesByCategoryToPDF = async () => {
    if (!expenseReportData) return;
    
    let companyFilterName: string | undefined;
    if (expenseFilterType === 'company' && expenseSelectedCompanyId) {
      companyFilterName = companies.find(c => c.id === expenseSelectedCompanyId)?.name;
    }
    
    await generateExpensesByCategoryPdf({
      reportData: expenseReportData,
      startDate: expenseStartDate,
      endDate: expenseEndDate,
      companyName: companyFilterName,
      companyFilterName,
      language: language as 'fr' | 'en',
      planType: planLimits?.plan_type || 'free',
      hideBranding: hidePdfBranding,
      returnBlob: false
    });
    
    logExport('expenses_category', 'pdf', language === 'fr' ? 'Téléchargement PDF dépenses par catégorie' : 'Expenses by category PDF download');
  };

  // Export all expenses PDF (no date filter)
  const exportAllExpensesToPDF = async () => {
    if (!expenseReportData) return;
    
    const companyFilterName = expenseFilterType === 'company' && expenseSelectedCompanyId
      ? companies.find(c => c.id === expenseSelectedCompanyId)?.name
      : undefined;
    
    await generateAllExpensesPdf({
      reportData: expenseReportData,
      companyName: companyFilterName,
      companyFilterName,
      language: language as 'fr' | 'en',
      planType: planLimits?.plan_type || 'free',
      hideBranding: hidePdfBranding,
      returnBlob: false
    });
    
    logExport('all_expenses', 'pdf', language === 'fr' ? 'Téléchargement PDF toutes les dépenses' : 'All expenses PDF download');
  };

  // Legacy export function kept for chart-based exports
  const exportExpensesLegacyPDF = async () => {
    if (!expenseReportData) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const dateLocale = language === 'fr' ? fr : enUS;
    
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
    logExport('expenses', 'pdf', language === 'fr' ? 'Téléchargement PDF rapport dépenses' : 'Expenses report PDF download');
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
    logExport('expenses_by_category', 'pdf', language === 'fr' ? 'Téléchargement PDF dépenses par catégorie' : 'Expenses by category PDF download');
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
    logExport('expenses_by_company', 'pdf', language === 'fr' ? 'Téléchargement PDF dépenses par compagnie' : 'Expenses by company PDF download');
  };

  // Excel export - By Period (detailed list)
  const exportExpensesByPeriodToExcel = () => {
    if (!expenseReportData) return;
    
    const wb = XLSX.utils.book_new();
    const dateLocale = language === 'fr' ? fr : enUS;
    
    // Get filter names
    const companyFilterName = expenseFilterType === 'company' && expenseSelectedCompanyId
      ? companies.find(c => c.id === expenseSelectedCompanyId)?.name || ''
      : '';
    
    // Header info
    const headerData: (string | number)[][] = [
      [language === 'fr' ? 'Dépenses par période' : 'Expenses by Period'],
      [''],
      [language === 'fr' ? 'Généré le' : 'Generated on', format(new Date(), 'dd/MM/yyyy HH:mm', { locale: dateLocale })],
    ];
    
    if (expenseStartDate && expenseEndDate) {
      headerData.push([language === 'fr' ? 'Période' : 'Period', `${format(expenseStartDate, 'dd/MM/yyyy', { locale: dateLocale })} - ${format(expenseEndDate, 'dd/MM/yyyy', { locale: dateLocale })}`]);
    }
    if (companyFilterName) {
      headerData.push([language === 'fr' ? 'Entreprise' : 'Company', companyFilterName]);
    }
    
    // Summary
    headerData.push(
      [''],
      [language === 'fr' ? 'RÉSUMÉ' : 'SUMMARY', ''],
      [language === 'fr' ? 'Total des dépenses' : 'Total Expenses', expenseReportData.totalExpenses],
      [language === 'fr' ? 'Dépenses déductibles' : 'Deductible Expenses', expenseReportData.totalDeductibleAmount],
      [language === 'fr' ? 'Dépenses payées' : 'Paid Expenses', expenseReportData.totalPaidExpenses],
      [language === 'fr' ? 'Dépenses impayées' : 'Unpaid Expenses', expenseReportData.totalUnpaidExpenses],
      ['']
    );
    
    // Detailed table headers
    headerData.push([
      language === 'fr' ? 'Date' : 'Date',
      language === 'fr' ? 'Description' : 'Description',
      language === 'fr' ? 'Catégorie' : 'Category',
      language === 'fr' ? 'Entreprise' : 'Company',
      language === 'fr' ? 'Fournisseur' : 'Vendor',
      language === 'fr' ? 'Montant' : 'Amount',
      language === 'fr' ? 'Taxes' : 'Taxes',
      language === 'fr' ? 'Total' : 'Total',
      language === 'fr' ? 'Déductible %' : 'Deductible %',
      language === 'fr' ? 'Montant déductible' : 'Deductible Amount',
      language === 'fr' ? 'Statut' : 'Status'
    ]);
    
    // Sort by date ascending
    const sortedExpenses = [...expenseReportData.expenseDetails].sort((a, b) => 
      new Date(a.expense_date).getTime() - new Date(b.expense_date).getTime()
    );
    
    let totalAmount = 0;
    let totalTaxes = 0;
    let grandTotal = 0;
    let totalDeductible = 0;
    
    sortedExpenses.forEach(expense => {
      const expenseTaxes = (expense.taxes || []).reduce((sum, tax) => sum + (tax.amount || 0), 0);
      const expenseTotal = expense.amount + expenseTaxes;
      
      totalAmount += expense.amount;
      totalTaxes += expenseTaxes;
      grandTotal += expenseTotal;
      totalDeductible += expense.deductible_amount;
      
      headerData.push([
        format(new Date(expense.expense_date), 'dd/MM/yyyy'),
        expense.description,
        expense.category,
        expense.company_name || '-',
        expense.vendor || '-',
        expense.amount,
        expenseTaxes,
        expenseTotal,
        expense.deductible_percent,
        expense.deductible_amount,
        expense.status === 'paid' ? (language === 'fr' ? 'Payée' : 'Paid') : (language === 'fr' ? 'Impayée' : 'Unpaid')
      ]);
    });
    
    // Totals row
    headerData.push([
      'TOTAL', '', '', '', '',
      totalAmount,
      totalTaxes,
      grandTotal,
      '',
      totalDeductible,
      ''
    ]);
    
    const ws = XLSX.utils.aoa_to_sheet(headerData);
    XLSX.utils.book_append_sheet(wb, ws, language === 'fr' ? 'Dépenses par période' : 'Expenses by Period');
    
    let filename = language === 'fr' ? 'depenses-par-periode' : 'expenses-by-period';
    if (expenseStartDate && expenseEndDate) {
      filename += `-${format(expenseStartDate, 'yyyy-MM-dd')}-${format(expenseEndDate, 'yyyy-MM-dd')}`;
    }
    filename += '.xlsx';
    
    XLSX.writeFile(wb, filename);
    logExport('expenses-by-period', 'excel', language === 'fr' ? 'Export Excel dépenses par période' : 'Expenses by period Excel export');
  };

  // Excel export - By Category
  const exportExpensesByCategoryToExcel = () => {
    if (!expenseReportData) return;
    
    const wb = XLSX.utils.book_new();
    const dateLocale = language === 'fr' ? fr : enUS;
    
    const companyFilterName = expenseFilterType === 'company' && expenseSelectedCompanyId
      ? companies.find(c => c.id === expenseSelectedCompanyId)?.name || ''
      : '';
    
    const headerData: (string | number)[][] = [
      [language === 'fr' ? 'Dépenses par catégorie' : 'Expenses by Category'],
      [''],
      [language === 'fr' ? 'Généré le' : 'Generated on', format(new Date(), 'dd/MM/yyyy HH:mm', { locale: dateLocale })],
    ];
    
    if (expenseStartDate && expenseEndDate) {
      headerData.push([language === 'fr' ? 'Période' : 'Period', `${format(expenseStartDate, 'dd/MM/yyyy', { locale: dateLocale })} - ${format(expenseEndDate, 'dd/MM/yyyy', { locale: dateLocale })}`]);
    }
    if (companyFilterName) {
      headerData.push([language === 'fr' ? 'Entreprise' : 'Company', companyFilterName]);
    }
    
    // Summary
    headerData.push(
      [''],
      [language === 'fr' ? 'RÉSUMÉ' : 'SUMMARY', ''],
      [language === 'fr' ? 'Total des dépenses' : 'Total Expenses', expenseReportData.totalExpenses],
      [language === 'fr' ? 'Dépenses déductibles' : 'Deductible Expenses', expenseReportData.totalDeductibleAmount],
      [language === 'fr' ? 'Nombre de catégories' : 'Number of Categories', expenseReportData.expensesByCategory.length],
      ['']
    );
    
    // Table headers
    headerData.push([
      language === 'fr' ? 'Catégorie' : 'Category',
      language === 'fr' ? 'Nombre' : 'Count',
      language === 'fr' ? 'Montant total' : 'Total Amount',
      language === 'fr' ? 'Déductible %' : 'Deductible %',
      language === 'fr' ? 'Montant déductible' : 'Deductible Amount',
      language === 'fr' ? 'Montant moyen' : 'Average Amount',
      language === 'fr' ? '% du total' : '% of Total'
    ]);
    
    // Sort by total amount descending
    const sortedCategories = [...expenseReportData.expensesByCategory].sort((a, b) => b.total_amount - a.total_amount);
    
    let totalCount = 0;
    let totalDeductible = 0;
    sortedCategories.forEach(cat => {
      const percentage = expenseReportData.totalExpenses > 0 
        ? ((cat.total_amount / expenseReportData.totalExpenses) * 100).toFixed(1) + '%'
        : '0%';
      totalCount += cat.count;
      totalDeductible += cat.total_deductible_amount;
      
      headerData.push([
        cat.category,
        cat.count,
        cat.total_amount,
        cat.avg_deductible_percent.toFixed(1) + '%',
        cat.total_deductible_amount,
        cat.total_amount / cat.count,
        percentage
      ]);
    });
    
    // Totals row
    headerData.push([
      'TOTAL',
      totalCount,
      expenseReportData.totalExpenses,
      '',
      totalDeductible,
      totalCount > 0 ? expenseReportData.totalExpenses / totalCount : 0,
      '100%'
    ]);
    
    const ws = XLSX.utils.aoa_to_sheet(headerData);
    XLSX.utils.book_append_sheet(wb, ws, language === 'fr' ? 'Par catégorie' : 'By Category');
    
    let filename = language === 'fr' ? 'depenses-par-categorie' : 'expenses-by-category';
    if (expenseStartDate && expenseEndDate) {
      filename += `-${format(expenseStartDate, 'yyyy-MM-dd')}-${format(expenseEndDate, 'yyyy-MM-dd')}`;
    }
    filename += '.xlsx';
    
    XLSX.writeFile(wb, filename);
    logExport('expenses-by-category', 'excel', language === 'fr' ? 'Export Excel dépenses par catégorie' : 'Expenses by category Excel export');
  };

  // Excel export - All Expenses Detail
  const exportAllExpensesToExcel = () => {
    if (!expenseReportData) return;
    
    const wb = XLSX.utils.book_new();
    const dateLocale = language === 'fr' ? fr : enUS;
    
    const companyFilterName = expenseFilterType === 'company' && expenseSelectedCompanyId
      ? companies.find(c => c.id === expenseSelectedCompanyId)?.name || ''
      : '';
    
    const headerData: (string | number)[][] = [
      [language === 'fr' ? 'Détail de toutes les dépenses' : 'All Expenses Detail'],
      [''],
      [language === 'fr' ? 'Généré le' : 'Generated on', format(new Date(), 'dd/MM/yyyy HH:mm', { locale: dateLocale })],
    ];
    
    if (expenseStartDate && expenseEndDate) {
      headerData.push([language === 'fr' ? 'Période' : 'Period', `${format(expenseStartDate, 'dd/MM/yyyy', { locale: dateLocale })} - ${format(expenseEndDate, 'dd/MM/yyyy', { locale: dateLocale })}`]);
    } else {
      headerData.push([language === 'fr' ? 'Période' : 'Period', language === 'fr' ? 'Toutes les périodes' : 'All periods']);
    }
    if (companyFilterName) {
      headerData.push([language === 'fr' ? 'Entreprise' : 'Company', companyFilterName]);
    }
    
    headerData.push(['']);
    
    // Table headers
    headerData.push([
      language === 'fr' ? 'Date' : 'Date',
      language === 'fr' ? 'Description' : 'Description',
      language === 'fr' ? 'Catégorie' : 'Category',
      language === 'fr' ? 'Entreprise' : 'Company',
      language === 'fr' ? 'Fournisseur' : 'Vendor',
      language === 'fr' ? 'Montant' : 'Amount',
      language === 'fr' ? 'Taxes' : 'Taxes',
      language === 'fr' ? 'Total' : 'Total',
      language === 'fr' ? 'Déductible %' : 'Deductible %',
      language === 'fr' ? 'Montant déductible' : 'Deductible Amount',
      language === 'fr' ? 'Statut' : 'Status'
    ]);
    
    // Sort by date ascending
    const sortedExpenses = [...expenseReportData.expenseDetails].sort((a, b) => 
      new Date(a.expense_date).getTime() - new Date(b.expense_date).getTime()
    );
    
    let totalAmount = 0;
    let totalTaxes = 0;
    let grandTotal = 0;
    let totalDeductible = 0;
    
    sortedExpenses.forEach(expense => {
      const expenseTaxes = (expense.taxes || []).reduce((sum, tax) => sum + (tax.amount || 0), 0);
      const expenseTotal = expense.amount + expenseTaxes;
      
      totalAmount += expense.amount;
      totalTaxes += expenseTaxes;
      grandTotal += expenseTotal;
      totalDeductible += expense.deductible_amount;
      
      headerData.push([
        format(new Date(expense.expense_date), 'dd/MM/yyyy'),
        expense.description,
        expense.category,
        expense.company_name || '-',
        expense.vendor || '-',
        expense.amount,
        expenseTaxes,
        expenseTotal,
        expense.deductible_percent,
        expense.deductible_amount,
        expense.status === 'paid' ? (language === 'fr' ? 'Payée' : 'Paid') : (language === 'fr' ? 'Impayée' : 'Unpaid')
      ]);
    });
    
    // Totals row
    headerData.push([
      'TOTAL', '', '', '', '',
      totalAmount,
      totalTaxes,
      grandTotal,
      '',
      totalDeductible,
      ''
    ]);
    
    const ws = XLSX.utils.aoa_to_sheet(headerData);
    XLSX.utils.book_append_sheet(wb, ws, language === 'fr' ? 'Toutes les dépenses' : 'All Expenses');
    
    let filename = language === 'fr' ? 'detail-toutes-depenses' : 'all-expenses-detail';
    if (expenseStartDate && expenseEndDate) {
      filename += `-${format(expenseStartDate, 'yyyy-MM-dd')}-${format(expenseEndDate, 'yyyy-MM-dd')}`;
    }
    filename += '.xlsx';
    
    XLSX.writeFile(wb, filename);
    logExport('all-expenses', 'excel', language === 'fr' ? 'Export Excel toutes les dépenses' : 'All expenses Excel export');
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
    logExport('product_profit', 'pdf', language === 'fr' ? 'Téléchargement PDF rapport profit produits' : 'Product profit report PDF download');
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
    logExport('product_profit', 'excel', language === 'fr' ? 'Export Excel rapport profit produits' : 'Product profit report Excel export');
  };

  // Export functions for sales report
  const exportSalesReportToPDF = async () => {
    if (!salesData) return;
    
    // Get company name if filtered
    let companyName: string | undefined;
    if (productFilterType === 'company' && productSelectedCompanyId) {
      const company = companies?.find(c => c.id === productSelectedCompanyId);
      companyName = company?.name;
    }
    
    await generateSalesReportPdf({
      salesData,
      companyName,
      startDate: productStartDate,
      endDate: productEndDate,
      chartRef: salesProductChartRef,
      planType: planLimits?.plan_type || 'free',
      hideBranding: hidePdfBranding,
      includedStatuses: selectedSalesStatuses,
      language: language as 'fr' | 'en',
    });
    logExport('sales', 'pdf', language === 'fr' ? 'Téléchargement PDF rapport ventes' : 'Sales report PDF download');
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
    logExport('sales', 'excel', language === 'fr' ? 'Export Excel rapport ventes' : 'Sales report Excel export');
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
    
    // Exclure les factures archivées
    let filtered = invoices.filter(inv => !inv.is_archived);
    
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
    logExport('invoices', 'pdf', language === 'fr' ? 'Téléchargement PDF rapport factures' : 'Invoices report PDF download');
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
    logExport('invoices', 'excel', language === 'fr' ? 'Export Excel rapport factures' : 'Invoices report Excel export');
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('reports')}</h1>
        <p className="text-sm md:text-base text-muted-foreground">
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
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-max md:w-auto">
            <TabsTrigger value="overview" className="text-xs md:text-sm">{t("reports.tabs.overview")}</TabsTrigger>
            <TabsTrigger value="revenue" className="text-xs md:text-sm">{t("reports.tabs.revenue")}</TabsTrigger>
            <TabsTrigger value="products" className="text-xs md:text-sm" disabled={!isTabAvailable('products')}>{t("reports.tabs.products")}</TabsTrigger>
            <TabsTrigger value="expenses" className="text-xs md:text-sm" disabled={!isTabAvailable('expenses')}>{t("reports.tabs.expenses")}</TabsTrigger>
            <TabsTrigger value="clients" className="text-xs md:text-sm" disabled={!isTabAvailable('clients')}>{t("reports.tabs.clients")}</TabsTrigger>
            <TabsTrigger value="taxes" className="text-xs md:text-sm" disabled={!isTabAvailable('taxes')}>{t("reports.tabs.taxes")}</TabsTrigger>
            <TabsTrigger value="invoices" className="text-xs md:text-sm" disabled={!isTabAvailable('invoices')}>{t("reports.tabs.invoices")}</TabsTrigger>
            <TabsTrigger value="reminders" className="text-xs md:text-sm" disabled={!isTabAvailable('reminders')}>
              {language === "fr" ? "Rappels" : "Reminders"}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-2 lg:grid-cols-4 md:gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
                <CardTitle className="text-xs md:text-sm font-medium">{t("reports.overview.totalRevenue")}</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                <div className="text-lg md:text-2xl font-bold">
                  {dashboardData ? `$${dashboardData.totalRevenue.toLocaleString('fr-FR')}` : '...'}
                </div>
                <p className="text-xs text-muted-foreground hidden md:block">
                  Revenus des factures payées
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
                <CardTitle className="text-xs md:text-sm font-medium">{t("reports.overview.pendingInvoices")}</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                <div className="text-lg md:text-2xl font-bold">
                  {dashboardData ? dashboardData.openInvoicesCount : '...'}
                </div>
                <p className="text-xs text-muted-foreground hidden md:block">
                  {dashboardData ? `$${dashboardData.openInvoicesTotal.toLocaleString('fr-FR')} en attente` : ''}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
                <CardTitle className="text-xs md:text-sm font-medium">{t("reports.overview.activeClients")}</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                <div className="text-lg md:text-2xl font-bold">
                  {dashboardData ? dashboardData.activeClients : '...'}
                </div>
                <p className="text-xs text-muted-foreground hidden md:block">
                  {dashboardData ? `${dashboardData.newClientsThisMonth} nouveaux ce mois` : ''}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
                <CardTitle className="text-xs md:text-sm font-medium">{t("reports.overview.activeProducts")}</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                <div className="text-lg md:text-2xl font-bold">
                  {dashboardData ? dashboardData.activeProducts : '...'}
                </div>
                <p className="text-xs text-muted-foreground hidden md:block">
                  Produits disponibles
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-1">
            <Card>
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="text-base md:text-lg">{t("reports.overview.recentActivity")}</CardTitle>
                <CardDescription className="text-xs md:text-sm">{t("reports.overview.recentActivityDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
                {dashboardData && dashboardData.recentActivity.length > 0 ? (
                  <div className="space-y-3 md:space-y-4">
                    {dashboardData.recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-center justify-between p-2 md:p-3 rounded-lg border">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs md:text-sm font-medium truncate">{activity.message}</p>
                          <p className="text-xs text-muted-foreground">{activity.timeAgo}</p>
                        </div>
                        {activity.amount && (
                          <div className={`text-xs md:text-sm font-semibold ml-2 shrink-0 ${activity.color === 'green' ? 'text-green-600' : activity.color === 'orange' ? 'text-orange-600' : 'text-blue-600'}`}>
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

            {/* Revenue Sub-tabs: By Period, By Client, By Product */}
            <Tabs value={revenueSubTab} onValueChange={(value) => setRevenueSubTab(value as 'period' | 'client' | 'product')} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="period">{language === 'fr' ? 'Par période' : 'By Period'}</TabsTrigger>
                <TabsTrigger value="client">{language === 'fr' ? 'Par client' : 'By Client'}</TabsTrigger>
                <TabsTrigger value="product">{language === 'fr' ? 'Par produit' : 'By Product'}</TabsTrigger>
              </TabsList>

              {/* By Period Tab - Existing functionality */}
              <TabsContent value="period" className="space-y-6">
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
                    <CardDescription>{language === 'fr' ? 'Sélectionnez une plage de dates spécifique pour analyser les revenus' : 'Select a specific date range for revenue analysis'}</CardDescription>
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
                            <SelectValue placeholder={getReportTranslation('selectFilter', language)} />
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
                    <CardDescription>{getReportTranslation('selectMonthToView', language)}</CardDescription>
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
                      language={language}
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
                            <SelectValue placeholder={getReportTranslation('selectFilter', language)} />
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
                    <CardDescription>{getReportTranslation('selectYearToView', language)}</CardDescription>
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
                          language={language}
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
                              language={language}
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
                              language={language}
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
                            <SelectValue placeholder={getReportTranslation('selectFilter', language)} />
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
                      {getReportTranslation('clearCustomRange', language)}
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
                      {getReportTranslation('clearMonth', language)}
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
                      {getReportTranslation('clearYearSelection', language)}
                    </Button>
                  </div>
                )}

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
                        PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={exportToExcel}
                        disabled={!realRevenueData || !chartData.length}
                        className="flex items-center gap-2"
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                        Excel
                      </Button>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={exportRevenueToCSV}
                              disabled={!realRevenueData || !chartData.length || planLimits?.plan_type === 'free'}
                              className="flex items-center gap-2"
                            >
                              <FileSpreadsheet className="h-4 w-4" />
                              CSV
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {planLimits?.plan_type === 'free' && (
                          <TooltipContent>
                            {language === 'fr' ? 'Disponible avec le plan Premium ou Pro' : 'Available with Premium or Pro plan'}
                          </TooltipContent>
                        )}
                      </Tooltip>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={downloadChartsAsPDF}
                        disabled={!realRevenueData || !chartData.length}
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        {language === 'fr' ? 'Graphiques PDF' : 'Charts PDF'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEmailDialogOpen('revenue')}
                        disabled={!realRevenueData || !chartData.length}
                        className="flex items-center gap-2"
                      >
                        <Mail className="h-4 w-4" />
                        {language === 'fr' ? 'Courriel' : 'Email'}
                      </Button>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid gap-4 md:grid-cols-3">
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">{t("reports.revenue.totalRevenue")}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {new Intl.NumberFormat(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' }).format(realRevenueData.totalRevenue)}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">
                            {viewMode === 'monthly' 
                              ? t("reports.revenue.numberOfMonths")
                              : t("reports.revenue.numberOfYears")}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {viewMode === 'monthly' ? realRevenueData.monthlyData.length : realRevenueData.yearlyData.length}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">{t("reports.revenue.averageRevenue")}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {new Intl.NumberFormat(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' }).format(
                              realRevenueData.totalRevenue / Math.max(1, viewMode === 'monthly' ? realRevenueData.monthlyData.length : realRevenueData.yearlyData.length)
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex justify-end gap-2">
                      <Button
                        variant={viewMode === 'monthly' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('monthly')}
                      >
                        {t("reports.revenue.monthly")}
                      </Button>
                      <Button
                        variant={viewMode === 'yearly' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('yearly')}
                      >
                        {t("reports.revenue.yearly")}
                      </Button>
                    </div>

                    {/* Charts */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <Card>
                        <CardHeader>
                          <CardTitle>
                            {t('reports.revenue.revenueEvolution')} {viewMode === 'monthly' ? t('reports.revenue.perMonth').toLowerCase() : t('reports.revenue.perYear').toLowerCase()}
                          </CardTitle>
                        </CardHeader>
                        <CardContent ref={barChartRef}>
                          <div className="w-full overflow-x-auto">
                            <BarChart width={400} height={300} data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="period" />
                              <YAxis />
                              <RechartsTooltip 
                                formatter={(value: number) => new Intl.NumberFormat(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' }).format(value)}
                                labelFormatter={(label) => `${getReportTranslation('period', language)}: ${label}`}
                              />
                              <Bar dataKey="revenue" fill="#3b82f6" />
                            </BarChart>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>{t('reports.revenue.revenueTrend')}</CardTitle>
                        </CardHeader>
                        <CardContent ref={lineChartRef}>
                          <div className="w-full overflow-x-auto">
                            <LineChart width={400} height={300} data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="period" />
                              <YAxis />
                              <RechartsTooltip 
                                formatter={(value: number) => new Intl.NumberFormat(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' }).format(value)}
                              />
                              <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} />
                            </LineChart>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Invoice List */}
                    <Card>
                      <CardHeader>
                        <CardTitle>{t("reports.revenue.invoicesList")}</CardTitle>
                        <CardDescription>{t("reports.revenue.invoicesListDescription")}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {invoices && invoices.filter((invoice: any) => {
                          if (invoice.status !== 'paid') return false;
                          if (!startDate && !endDate) return true;
                          const invoiceDate = new Date(invoice.issue_date);
                          if (startDate && invoiceDate < startDate) return false;
                          if (endDate && invoiceDate > endDate) return false;
                          if (filterType === 'company' && selectedCompanyId) {
                            return invoice.clients?.company_id === selectedCompanyId;
                          }
                          if (filterType === 'client' && selectedClientId) {
                            return invoice.client_id === selectedClientId;
                          }
                          return true;
                        }).length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>{t("reports.revenue.invoiceNumber")}</TableHead>
                                <TableHead>{t("reports.revenue.client")}</TableHead>
                                <TableHead>{t("reports.revenue.date")}</TableHead>
                                <TableHead className="text-right">{t("reports.revenue.totalAmount")}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {invoices.filter((invoice: any) => {
                                if (invoice.status !== 'paid') return false;
                                if (!startDate && !endDate) return true;
                                const invoiceDate = new Date(invoice.issue_date);
                                if (startDate && invoiceDate < startDate) return false;
                                if (endDate && invoiceDate > endDate) return false;
                                if (filterType === 'company' && selectedCompanyId) {
                                  return invoice.clients?.company_id === selectedCompanyId;
                                }
                                if (filterType === 'client' && selectedClientId) {
                                  return invoice.client_id === selectedClientId;
                                }
                                return true;
                              }).map((invoice: any) => (
                                <TableRow key={invoice.id}>
                                  <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                                  <TableCell>{invoice.clients?.name || '-'}</TableCell>
                                  <TableCell>{format(new Date(invoice.issue_date), 'dd/MM/yyyy')}</TableCell>
                                  <TableCell className="text-right">
                                    {new Intl.NumberFormat(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' }).format(invoice.total)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="text-center text-muted-foreground py-8">
                            {t("reports.revenue.noInvoices")}
                          </div>
                        )}
                      </CardContent>
                    </Card>
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

              {/* By Client Tab */}
              <TabsContent value="client" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>{language === 'fr' ? 'Filtres' : 'Filters'}</CardTitle>
                    <CardDescription>
                      {language === 'fr' 
                        ? 'Sélectionnez une période pour analyser les revenus par client'
                        : 'Select a period to analyze revenue by client'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <DateRangePicker
                      startDate={clientRevenueStartDate}
                      endDate={clientRevenueEndDate}
                      onStartDateChange={setClientRevenueStartDate}
                      onEndDateChange={setClientRevenueEndDate}
                      t={t}
                    />
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>{language === 'fr' ? 'Entreprise' : 'Company'}</Label>
                        <Select value={clientRevenueCompanyId} onValueChange={setClientRevenueCompanyId}>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder={language === 'fr' ? 'Toutes les entreprises' : 'All companies'} />
                          </SelectTrigger>
                          <SelectContent className="bg-background border border-border shadow-lg z-50">
                            <SelectItem value="all">{language === 'fr' ? 'Toutes les entreprises' : 'All companies'}</SelectItem>
                            {companies.map((company) => (
                              <SelectItem key={company.id} value={company.id}>
                                {company.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Export Buttons for Revenue by Client */}
                {clientRevenueData && clientRevenueData.clientData.length > 0 && (clientRevenueStartDate || clientRevenueEndDate) && (
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportRevenueByClientToPDF}
                      disabled={clientRevenueLoading}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportRevenueByClientToExcel}
                      disabled={clientRevenueLoading}
                      className="flex items-center gap-2"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      Excel
                    </Button>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={exportRevenueByClientToCSV}
                            disabled={clientRevenueLoading || planLimits?.plan_type === 'free'}
                            className="flex items-center gap-2"
                          >
                            <FileSpreadsheet className="h-4 w-4" />
                            CSV
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {planLimits?.plan_type === 'free' && (
                        <TooltipContent>
                          {language === 'fr' ? 'Disponible avec le plan Premium ou Pro' : 'Available with Premium or Pro plan'}
                        </TooltipContent>
                      )}
                    </Tooltip>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEmailDialogOpen('revenue_by_client')}
                      disabled={clientRevenueLoading}
                      className="flex items-center gap-2"
                    >
                      <Mail className="h-4 w-4" />
                      {language === 'fr' ? 'Courriel' : 'Email'}
                    </Button>
                  </div>
                )}

                <div ref={revenueByClientChartRef}>
                  <RevenueByClientReport
                    startDate={clientRevenueStartDate}
                    endDate={clientRevenueEndDate}
                    companyId={clientRevenueCompanyId && clientRevenueCompanyId !== 'all' ? clientRevenueCompanyId : undefined}
                  />
                </div>
              </TabsContent>

              {/* By Product Tab */}
              <TabsContent value="product" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>{language === 'fr' ? 'Filtres' : 'Filters'}</CardTitle>
                    <CardDescription>
                      {language === 'fr' 
                        ? 'Sélectionnez une période pour analyser les revenus par produit/service'
                        : 'Select a period to analyze revenue by product/service'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <DateRangePicker
                      startDate={productRevenueStartDate}
                      endDate={productRevenueEndDate}
                      onStartDateChange={setProductRevenueStartDate}
                      onEndDateChange={setProductRevenueEndDate}
                      t={t}
                    />
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>{language === 'fr' ? 'Entreprise' : 'Company'}</Label>
                        <Select value={productRevenueCompanyId} onValueChange={setProductRevenueCompanyId}>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder={language === 'fr' ? 'Toutes les entreprises' : 'All companies'} />
                          </SelectTrigger>
                          <SelectContent className="bg-background border border-border shadow-lg z-50">
                            <SelectItem value="all">{language === 'fr' ? 'Toutes les entreprises' : 'All companies'}</SelectItem>
                            {companies.map((company) => (
                              <SelectItem key={company.id} value={company.id}>
                                {company.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Export Buttons for Revenue by Product */}
                {(productRevenueStartDate || productRevenueEndDate) && (
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportRevenueByProductToPDF}
                      disabled={productRevenueLoading || !productRevenueData || productRevenueData.productData.length === 0}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportRevenueByProductToExcel}
                      disabled={productRevenueLoading || !productRevenueData || productRevenueData.productData.length === 0}
                      className="flex items-center gap-2"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      Excel
                    </Button>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={exportRevenueByProductToCSV}
                            disabled={productRevenueLoading || !productRevenueData || productRevenueData.productData.length === 0 || planLimits?.plan_type === 'free'}
                            className="flex items-center gap-2"
                          >
                            <FileSpreadsheet className="h-4 w-4" />
                            CSV
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {planLimits?.plan_type === 'free' && (
                        <TooltipContent>
                          {language === 'fr' ? 'Disponible avec le plan Premium ou Pro' : 'Available with Premium or Pro plan'}
                        </TooltipContent>
                      )}
                    </Tooltip>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEmailDialogOpen('revenue_by_product')}
                      disabled={productRevenueLoading || !productRevenueData || productRevenueData.productData.length === 0}
                      className="flex items-center gap-2"
                    >
                      <Mail className="h-4 w-4" />
                      {language === 'fr' ? 'Courriel' : 'Email'}
                    </Button>
                  </div>
                )}

                <RevenueByProductReport
                  startDate={productRevenueStartDate}
                  endDate={productRevenueEndDate}
                  companyId={productRevenueCompanyId && productRevenueCompanyId !== 'all' ? productRevenueCompanyId : undefined}
                />
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>


        <TabsContent value="products" className="space-y-6">
          {/* Date & Company Filters */}
          <Card>
            <CardHeader>
              <CardTitle>{language === 'fr' ? 'Filtres' : 'Filters'}</CardTitle>
              <CardDescription>
                {language === 'fr' 
                  ? 'Sélectionnez une période et une entreprise. Note: Seules les factures payées sont incluses dans les ventes.' 
                  : 'Select a period and company. Note: Only paid invoices are included in sales.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <DateRangePicker
                startDate={productStartDate}
                endDate={productEndDate}
                onStartDateChange={setProductStartDate}
                onEndDateChange={setProductEndDate}
                t={t}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{language === 'fr' ? 'Filtrer par' : 'Filter by'}</Label>
                  <Select value={productFilterType} onValueChange={(value: 'all' | 'company') => {
                    setProductFilterType(value);
                    setProductSelectedCompanyId('');
                  }}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder={language === 'fr' ? 'Sélectionner' : 'Select'} />
                    </SelectTrigger>
                    <SelectContent className="bg-background border border-border shadow-lg z-50">
                      <SelectItem value="all">{language === 'fr' ? 'Toutes les entreprises' : 'All companies'}</SelectItem>
                      <SelectItem value="company">{language === 'fr' ? 'Par entreprise' : 'By company'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {productFilterType === 'company' && (
                  <div className="space-y-2">
                    <Label>{language === 'fr' ? 'Entreprise' : 'Company'}</Label>
                    <Select value={productSelectedCompanyId} onValueChange={setProductSelectedCompanyId}>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder={language === 'fr' ? 'Sélectionner une entreprise' : 'Select a company'} />
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

          {/* ===== 1. RAPPORT VENTES PAR PRODUIT ===== */}
          <div className="space-y-4">
            <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
              <div>
                <h2 className="text-2xl font-bold">{language === 'fr' ? 'Ventes par produit' : 'Sales by Product'}</h2>
                <p className="text-muted-foreground">
                  {language === 'fr' 
                    ? 'Identifiez vos meilleurs et pires produits' 
                    : 'Identify your best and worst performing products'}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex space-x-2">
                  <Button onClick={exportSalesReportToPDF} variant="outline" size="sm" disabled={!salesData || salesData.products.length === 0}>
                    <Download className="w-4 h-4 mr-2" />
                    PDF
                  </Button>
                  <Button onClick={exportSalesReportToExcel} variant="outline" size="sm" disabled={!salesData || salesData.products.length === 0}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Excel
                  </Button>
                  <Button onClick={() => setEmailDialogOpen('sales')} variant="outline" size="sm" disabled={!salesData || salesData.products.length === 0}>
                    <Mail className="w-4 h-4 mr-2" />
                    {language === 'fr' ? 'Courriel' : 'Email'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Status Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="text-sm font-medium">
                    {language === 'fr' ? 'Inclure :' : 'Include:'}
                  </span>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="status-paid" 
                      checked={salesStatusFilters.paid} 
                      onCheckedChange={(checked) => setSalesStatusFilters(prev => ({...prev, paid: checked as boolean}))} 
                    />
                    <Label htmlFor="status-paid" className="text-sm cursor-pointer">
                      {language === 'fr' ? 'Payées' : 'Paid'}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="status-sent" 
                      checked={salesStatusFilters.sent} 
                      onCheckedChange={(checked) => setSalesStatusFilters(prev => ({...prev, sent: checked as boolean}))} 
                    />
                    <Label htmlFor="status-sent" className="text-sm cursor-pointer">
                      {language === 'fr' ? 'Envoyées' : 'Sent'}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="status-overdue" 
                      checked={salesStatusFilters.overdue} 
                      onCheckedChange={(checked) => setSalesStatusFilters(prev => ({...prev, overdue: checked as boolean}))} 
                    />
                    <Label htmlFor="status-overdue" className="text-sm cursor-pointer">
                      {language === 'fr' ? 'En retard' : 'Overdue'}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="status-draft" 
                      checked={salesStatusFilters.draft} 
                      onCheckedChange={(checked) => setSalesStatusFilters(prev => ({...prev, draft: checked as boolean}))} 
                    />
                    <Label htmlFor="status-draft" className="text-sm cursor-pointer">
                      {language === 'fr' ? 'Brouillons' : 'Drafts'}
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {salesLoading ? (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">{language === 'fr' ? 'Chargement...' : 'Loading...'}</div>
                </CardContent>
              </Card>
            ) : salesData && salesData.products.length > 0 ? (
              <div className="space-y-4">
                {/* Sales Summary Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{language === 'fr' ? 'Chiffre d\'affaires produits' : 'Product Revenue'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                          salesData.products.reduce((sum, p) => sum + p.total_revenue, 0)
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{language === 'fr' ? 'Quantité totale vendue' : 'Total Quantity Sold'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {salesData.products.reduce((sum, p) => sum + p.total_quantity_sold, 0).toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{language === 'fr' ? 'Nombre de factures' : 'Number of Invoices'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {salesData.products.reduce((sum, p) => sum + p.number_of_sales, 0).toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Sales by Product Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>{language === 'fr' ? 'Revenus par produit' : 'Revenue by Product'}</CardTitle>
                  </CardHeader>
                  <CardContent ref={salesProductChartRef}>
                    <BarChart width={700} height={400} data={salesData.products.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="product_name" 
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        interval={0}
                        fontSize={12}
                      />
                      <YAxis />
                      <RechartsTooltip 
                        formatter={(value: any) => [
                          new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value),
                          language === 'fr' ? 'Revenu' : 'Revenue'
                        ]}
                      />
                      <Bar dataKey="total_revenue" fill="#22c55e" name={language === 'fr' ? 'Revenu' : 'Revenue'} />
                    </BarChart>
                  </CardContent>
                </Card>

                {/* Sales Details Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>{language === 'fr' ? 'Détail des ventes par produit' : 'Sales Details by Product'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{language === 'fr' ? 'Produit' : 'Product'}</TableHead>
                          <TableHead className="text-right">{language === 'fr' ? 'Qté vendue' : 'Qty Sold'}</TableHead>
                          <TableHead className="text-right">{language === 'fr' ? 'Chiffre d\'affaires' : 'Revenue'}</TableHead>
                          <TableHead className="text-right">{language === 'fr' ? 'Nb factures' : 'Invoices'}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {salesData.products.map((product) => (
                          <TableRow key={product.product_id}>
                            <TableCell className="font-medium">{product.product_name}</TableCell>
                            <TableCell className="text-right">{product.total_quantity_sold}</TableCell>
                            <TableCell className="text-right">
                              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(product.total_revenue)}
                            </TableCell>
                            <TableCell className="text-right">{product.number_of_sales}</TableCell>
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
                    {language === 'fr' 
                      ? 'Aucune vente de produit trouvée pour cette période' 
                      : 'No product sales found for this period'}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ===== 2. RAPPORT ÉTAT DES STOCKS ===== */}
          <div className="space-y-4">
            <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
              <div>
                <h2 className="text-2xl font-bold">{language === 'fr' ? 'État des stocks' : 'Stock Status'}</h2>
                <p className="text-muted-foreground">
                  {language === 'fr' 
                    ? 'Repérez les produits épuisés et évitez les ruptures' 
                    : 'Identify out-of-stock products and avoid shortages'}
                </p>
              </div>
              <div className="flex space-x-2">
                <Button onClick={() => exportProductsToPDF()} variant="outline" size="sm" disabled={!filteredInventoryProducts || filteredInventoryProducts.length === 0}>
                  <Download className="w-4 h-4 mr-2" />
                  PDF
                </Button>
                <Button onClick={() => exportProductsToExcel()} variant="outline" size="sm" disabled={!filteredInventoryProducts || filteredInventoryProducts.length === 0}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Excel
                </Button>
                <Button onClick={() => setEmailDialogOpen('stock')} variant="outline" size="sm" disabled={!filteredInventoryProducts || filteredInventoryProducts.length === 0}>
                  <Mail className="w-4 h-4 mr-2" />
                  {language === 'fr' ? 'Courriel' : 'Email'}
                </Button>
              </div>
            </div>

            {/* Stock Status Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{language === 'fr' ? 'Produits totaux' : 'Total Products'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{filteredInventoryProducts?.length || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{language === 'fr' ? 'En stock' : 'In Stock'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {filteredInventoryProducts?.filter(p => (p.quantity || 0) > 5).length || 0}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{language === 'fr' ? 'Stock bas' : 'Low Stock'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-500">
                    {filteredInventoryProducts?.filter(p => (p.quantity || 0) > 0 && (p.quantity || 0) <= 5).length || 0}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{language === 'fr' ? 'Épuisé' : 'Out of Stock'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">
                    {filteredInventoryProducts?.filter(p => (p.quantity || 0) === 0).length || 0}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Stock Level Chart */}
            <Card>
              <CardHeader>
                <CardTitle>{language === 'fr' ? 'Niveaux de stock par produit' : 'Stock Levels by Product'}</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredInventoryProducts && filteredInventoryProducts.length > 0 ? (
                  <div className="w-full overflow-x-auto" ref={stockChartRef}>
                    <BarChart 
                      width={800} 
                      height={400}
                      data={filteredInventoryProducts.map(p => ({
                        name: p.name,
                        quantity: p.quantity || 0,
                        status: (p.quantity || 0) === 0 ? 'outOfStock' : (p.quantity || 0) <= 5 ? 'lowStock' : 'inStock'
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
                      <RechartsTooltip 
                        formatter={(value) => [`${value}`, language === 'fr' ? 'Quantité' : 'Quantity']}
                        labelFormatter={(label) => `${language === 'fr' ? 'Produit' : 'Product'}: ${label}`}
                      />
                      <Bar 
                        dataKey="quantity" 
                        fill="#22c55e"
                        name={language === 'fr' ? 'Quantité' : 'Quantity'}
                      />
                    </BarChart>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    {language === 'fr' ? 'Aucun produit trouvé' : 'No products found'}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stock Status Table */}
            <Card>
              <CardHeader>
                <CardTitle>{language === 'fr' ? 'Détail des stocks' : 'Stock Details'}</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredInventoryProducts && filteredInventoryProducts.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{language === 'fr' ? 'Produit' : 'Product'}</TableHead>
                        <TableHead className="text-right">{language === 'fr' ? 'Quantité' : 'Quantity'}</TableHead>
                        <TableHead>{language === 'fr' ? 'Statut' : 'Status'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInventoryProducts.map((product) => {
                        const qty = product.quantity || 0;
                        let status = language === 'fr' ? 'En stock' : 'In Stock';
                        let statusColor = 'bg-green-100 text-green-800';
                        
                        if (qty === 0) {
                          status = language === 'fr' ? 'Épuisé' : 'Out of Stock';
                          statusColor = 'bg-red-100 text-red-800';
                        } else if (qty <= 5) {
                          status = language === 'fr' ? 'Stock bas' : 'Low Stock';
                          statusColor = 'bg-orange-100 text-orange-800';
                        }
                        
                        return (
                          <TableRow key={product.id}>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell className="text-right">{qty}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs ${statusColor}`}>
                                {status}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    {language === 'fr' ? 'Aucun produit trouvé' : 'No products found'}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ===== 3. RAPPORT VALEUR DU STOCK ===== */}
          <div className="space-y-4">
            <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
              <div>
                <h2 className="text-2xl font-bold">{language === 'fr' ? 'Valeur du stock' : 'Stock Value'}</h2>
                <p className="text-muted-foreground">
                  {language === 'fr' 
                    ? 'Estimez la valeur de vos immobilisations' 
                    : 'Estimate the value of your inventory assets'}
                </p>
              </div>
              
              {/* Export Buttons */}
              <div className="flex space-x-2">
                <Button onClick={exportStockValueToPDF} variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  PDF
                </Button>
                <Button onClick={exportStockValueToExcel} variant="outline" size="sm">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Excel
                </Button>
                <Button onClick={() => setEmailDialogOpen('stock_value')} variant="outline" size="sm">
                  <Mail className="w-4 h-4 mr-2" />
                  {language === 'fr' ? 'Courriel' : 'Email'}
                </Button>
              </div>
            </div>

            {/* Stock Value Summary */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{language === 'fr' ? 'Valeur totale du stock' : 'Total Stock Value'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                      filteredInventoryProducts?.reduce((total, p) => total + ((p.quantity || 0) * (p.cost || 0)), 0) || 0
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {language === 'fr' ? 'Quantité × Coût unitaire' : 'Quantity × Unit Cost'}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{language === 'fr' ? 'Valeur potentielle de vente' : 'Potential Sales Value'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                      filteredInventoryProducts?.reduce((total, p) => total + ((p.quantity || 0) * (p.price || 0)), 0) || 0
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {language === 'fr' ? 'Quantité × Prix de vente' : 'Quantity × Sale Price'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Stock Value Table */}
            <Card>
              <CardHeader>
                <CardTitle>{language === 'fr' ? 'Valeur par produit' : 'Value by Product'}</CardTitle>
                <CardDescription>
                  {language === 'fr' 
                    ? 'Valeur du stock = Quantité × Coût unitaire' 
                    : 'Stock Value = Quantity × Unit Cost'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredInventoryProducts && filteredInventoryProducts.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{language === 'fr' ? 'Produit' : 'Product'}</TableHead>
                        <TableHead className="text-right">{language === 'fr' ? 'Stock' : 'Stock'}</TableHead>
                        <TableHead className="text-right">{language === 'fr' ? 'Coût unitaire' : 'Unit Cost'}</TableHead>
                        <TableHead className="text-right">{language === 'fr' ? 'Valeur' : 'Value'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInventoryProducts
                        .filter(p => (p.quantity || 0) > 0)
                        .sort((a, b) => ((b.quantity || 0) * (b.cost || 0)) - ((a.quantity || 0) * (a.cost || 0)))
                        .map((product) => {
                          const stockValue = (product.quantity || 0) * (product.cost || 0);
                          return (
                            <TableRow key={product.id}>
                              <TableCell className="font-medium">{product.name}</TableCell>
                              <TableCell className="text-right">{product.quantity || 0}</TableCell>
                              <TableCell className="text-right">
                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(product.cost || 0)}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(stockValue)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      {/* Total Row */}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell>{language === 'fr' ? 'TOTAL' : 'TOTAL'}</TableCell>
                        <TableCell className="text-right">
                          {filteredInventoryProducts.reduce((sum, p) => sum + (p.quantity || 0), 0)}
                        </TableCell>
                        <TableCell className="text-right">-</TableCell>
                        <TableCell className="text-right">
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                            filteredInventoryProducts.reduce((total, p) => total + ((p.quantity || 0) * (p.cost || 0)), 0)
                          )}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    {language === 'fr' ? 'Aucun produit trouvé' : 'No products found'}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">{t("reports.expenses.title")}</h2>
                <p className="text-muted-foreground">{t("reports.expenses.description")}</p>
              </div>
              
              <TooltipProvider>
              <div className="flex flex-col gap-3">
                {/* PDF Exports */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide min-w-[50px]">PDF</span>
                  <div className="h-4 w-px bg-border" />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={exportExpensesToPDF} variant="outline" size="sm" disabled={!expenseReportData}>
                        <Download className="w-4 h-4 mr-2" />
                        {language === 'fr' ? 'Par période' : 'By Period'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {language === 'fr' ? 'Exporter le rapport en PDF' : 'Export report as PDF'}
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={exportExpensesByCategoryToPDF} variant="outline" size="sm" disabled={!expenseReportData}>
                        <Download className="w-4 h-4 mr-2" />
                        {language === 'fr' ? 'Par catégorie' : 'By Category'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {language === 'fr' ? 'Exporter le rapport en PDF' : 'Export report as PDF'}
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={exportAllExpensesToPDF} variant="outline" size="sm" disabled={!expenseReportData}>
                        <Download className="w-4 h-4 mr-2" />
                        {language === 'fr' ? 'Toutes' : 'All'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {language === 'fr' ? 'Exporter le rapport en PDF' : 'Export report as PDF'}
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* Excel Exports */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide min-w-[50px]">Excel</span>
                  <div className="h-4 w-px bg-border" />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={exportExpensesByPeriodToExcel} variant="outline" size="sm" disabled={!expenseReportData}>
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        {language === 'fr' ? 'Par période' : 'By Period'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {language === 'fr' ? 'Exporter le rapport en Excel' : 'Export report as Excel'}
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={exportExpensesByCategoryToExcel} variant="outline" size="sm" disabled={!expenseReportData}>
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        {language === 'fr' ? 'Par catégorie' : 'By Category'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {language === 'fr' ? 'Exporter le rapport en Excel' : 'Export report as Excel'}
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={exportAllExpensesToExcel} variant="outline" size="sm" disabled={!expenseReportData}>
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        {language === 'fr' ? 'Toutes' : 'All'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {language === 'fr' ? 'Exporter le rapport en Excel' : 'Export report as Excel'}
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* CSV Exports (Premium+) */}
                {(planLimits?.plan_type === 'premium' || planLimits?.plan_type === 'pro') && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide min-w-[50px]">CSV</span>
                    <div className="h-4 w-px bg-border" />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button onClick={exportExpensesByPeriodToCSV} variant="outline" size="sm" disabled={!expenseReportData}>
                          <FileSpreadsheet className="w-4 h-4 mr-2" />
                          {language === 'fr' ? 'Par période' : 'By Period'}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {language === 'fr' ? 'Exporter le rapport en CSV' : 'Export report as CSV'}
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button onClick={exportExpensesByCategoryToCSV} variant="outline" size="sm" disabled={!expenseReportData}>
                          <FileSpreadsheet className="w-4 h-4 mr-2" />
                          {language === 'fr' ? 'Par catégorie' : 'By Category'}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {language === 'fr' ? 'Exporter le rapport en CSV' : 'Export report as CSV'}
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button onClick={exportAllExpensesToCSV} variant="outline" size="sm" disabled={!expenseReportData}>
                          <FileSpreadsheet className="w-4 h-4 mr-2" />
                          {language === 'fr' ? 'Toutes' : 'All'}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {language === 'fr' ? 'Exporter le rapport en CSV' : 'Export report as CSV'}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )}

                {/* Email Exports */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide min-w-[50px]">{language === 'fr' ? 'Courriel' : 'Email'}</span>
                  <div className="h-4 w-px bg-border" />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={() => setEmailDialogOpen('expenses-period')} variant="outline" size="sm" disabled={!expenseReportData}>
                        <Mail className="w-4 h-4 mr-2" />
                        {language === 'fr' ? 'Par période' : 'By Period'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {language === 'fr' ? 'Envoyer le rapport par courriel' : 'Send report by email'}
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={() => setEmailDialogOpen('expenses-category')} variant="outline" size="sm" disabled={!expenseReportData}>
                        <Mail className="w-4 h-4 mr-2" />
                        {language === 'fr' ? 'Par catégorie' : 'By Category'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {language === 'fr' ? 'Envoyer le rapport par courriel' : 'Send report by email'}
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={() => setEmailDialogOpen('expenses-all')} variant="outline" size="sm" disabled={!expenseReportData}>
                        <Mail className="w-4 h-4 mr-2" />
                        {language === 'fr' ? 'Toutes' : 'All'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {language === 'fr' ? 'Envoyer le rapport par courriel' : 'Send report by email'}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
              </TooltipProvider>
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
                        <SelectContent className="bg-background z-50">
                          {expenseCategories.map((category) => (
                            <SelectItem key={category.id} value={category.name}>
                              {language === "fr" ? (category.name_fr || category.name) : (category.name_en || category.name)}
                            </SelectItem>
                          ))}
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
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                      <CardTitle className="text-sm font-medium">{language === 'fr' ? 'Dépenses déductibles' : 'Deductible Expenses'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-primary">
                        {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'CAD' }).format(expenseReportData.totalDeductibleAmount)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {expenseReportData.totalExpenses > 0 
                          ? `${((expenseReportData.totalDeductibleAmount / expenseReportData.totalExpenses) * 100).toFixed(1)}% ${language === 'fr' ? 'du total' : 'of total'}`
                          : ''}
                      </p>
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
                        <RechartsTooltip 
                          formatter={(value: number, name: string) => [
                            new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'CAD' }).format(value),
                            name === 'total_deductible_amount' 
                              ? (language === 'fr' ? 'Déductible' : 'Deductible')
                              : (language === 'fr' ? 'Total' : 'Total')
                          ]}
                        />
                        <Bar dataKey="total_amount" fill="#ef4444" name={language === 'fr' ? 'Total' : 'Total'} />
                        <Bar dataKey="total_deductible_amount" fill="hsl(var(--primary))" name={language === 'fr' ? 'Déductible' : 'Deductible'} />
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
                        <RechartsTooltip 
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
                            <TableHead className="text-right">{language === 'fr' ? 'Déductible %' : 'Deductible %'}</TableHead>
                            <TableHead className="text-right">{language === 'fr' ? 'Montant déductible' : 'Deductible Amount'}</TableHead>
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
                                {category.avg_deductible_percent.toFixed(0)}%
                              </TableCell>
                              <TableCell className="text-right">
                                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'CAD' }).format(category.total_deductible_amount)}
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
              
              <TooltipProvider>
                <div className="flex space-x-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={exportClientsToPDF} variant="outline" size="sm" disabled={!clients || clients.length === 0}>
                        <Download className="w-4 h-4 mr-2" />
                        PDF
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {language === 'fr' ? 'Exporter tous les clients selon les filtres (PDF)' : 'Export all clients based on current filters (PDF)'}
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={exportClientsToExcel} variant="outline" size="sm" disabled={!clients || clients.length === 0}>
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Excel
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {language === 'fr' ? 'Exporter tous les clients selon les filtres (Excel)' : 'Export all clients based on current filters (Excel)'}
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={() => setEmailDialogOpen('clients')} variant="outline" size="sm" disabled={!clients || clients.length === 0}>
                        <Mail className="w-4 h-4 mr-2" />
                        {language === 'fr' ? 'Courriel' : 'Email'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {language === 'fr' ? 'Envoyer le rapport clients par courriel' : 'Send clients report by email'}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
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
                    <TooltipProvider>
                      <div className="flex space-x-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button onClick={exportAllClientsToPDF} variant="outline" size="sm">
                              <Download className="w-4 h-4 mr-2" />
                              PDF
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {language === 'fr' ? 'Exporter la liste complète des clients (PDF)' : 'Export complete clients list (PDF)'}
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button onClick={exportAllClientsToExcel} variant="outline" size="sm">
                              <FileSpreadsheet className="w-4 h-4 mr-2" />
                              Excel
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {language === 'fr' ? 'Exporter la liste complète des clients (Excel)' : 'Export complete clients list (Excel)'}
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button onClick={() => setEmailDialogOpen('clients_all')} variant="outline" size="sm" disabled={filteredClientsByDate.length === 0}>
                              <Mail className="w-4 h-4 mr-2" />
                              {language === 'fr' ? 'Courriel' : 'Email'}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {language === 'fr' ? 'Envoyer la liste des clients par courriel' : 'Send clients list by email'}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TooltipProvider>
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
                            <TooltipProvider>
                              <div className="flex space-x-2">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button onClick={() => exportCompanyClientsToPDF(company)} variant="outline" size="sm">
                                      <Download className="w-4 h-4 mr-2" />
                                      PDF
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {language === 'fr' ? 'Exporter les clients de cette entreprise (PDF)' : 'Export clients for this company (PDF)'}
                                  </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button onClick={() => exportCompanyClientsToExcel(company)} variant="outline" size="sm">
                                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                                      Excel
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {language === 'fr' ? 'Exporter les clients de cette entreprise (Excel)' : 'Export clients for this company (Excel)'}
                                  </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      onClick={() => {
                                        setSelectedCompanyForEmail(company);
                                        setEmailDialogOpen('clients_by_company');
                                      }} 
                                      variant="outline" 
                                      size="sm"
                                      disabled={companyClients.length === 0}
                                    >
                                      <Mail className="w-4 h-4 mr-2" />
                                      {language === 'fr' ? 'Courriel' : 'Email'}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {language === 'fr' ? 'Envoyer les clients par courriel' : 'Send clients by email'}
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </TooltipProvider>
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
                            <TooltipProvider>
                              <div className="flex space-x-2">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button onClick={exportClientsWithoutCompanyToPDF} variant="outline" size="sm">
                                      <Download className="w-4 h-4 mr-2" />
                                      PDF
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {language === 'fr' ? 'Exporter les clients sans entreprise (PDF)' : 'Export clients without company (PDF)'}
                                  </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button onClick={exportClientsWithoutCompanyToExcel} variant="outline" size="sm">
                                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                                      Excel
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {language === 'fr' ? 'Exporter les clients sans entreprise (Excel)' : 'Export clients without company (Excel)'}
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </TooltipProvider>
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

        <TabsContent value="taxes" className="space-y-3">
          {/* Filters */}
          <Card className="shadow-sm border-0 bg-card/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("reports.taxes.company")}</Label>
                  <Select value={taxSelectedCompany} onValueChange={setTaxSelectedCompany}>
                    <SelectTrigger className="h-9 text-sm bg-background">
                      <SelectValue placeholder={t("reports.taxes.allCompanies")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("reports.taxes.allCompanies")}</SelectItem>
                      {companies.map(company => (
                        <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("reports.taxes.periodType")}</Label>
                  <Select value={taxDateFilter} onValueChange={(value: 'custom' | 'month' | 'year') => setTaxDateFilter(value)}>
                    <SelectTrigger className="h-9 text-sm bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">{t("reports.taxes.customDates")}</SelectItem>
                      <SelectItem value="month">{t("reports.taxes.byMonth")}</SelectItem>
                      <SelectItem value="year">{t("reports.taxes.byYear")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("reports.taxes.display")}</Label>
                  <Select value={taxViewMode} onValueChange={(value: 'monthly' | 'yearly') => setTaxViewMode(value)}>
                    <SelectTrigger className="h-9 text-sm bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">{t("reports.taxes.monthly")}</SelectItem>
                      <SelectItem value="yearly">{t("reports.taxes.yearly")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Date Range Row */}
              <div className="mt-3">
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{language === 'fr' ? 'Période' : 'Date Range'}</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1.5">
                  {taxDateFilter === 'custom' && (
                    <>
                      <Popover open={taxStartOpen} onOpenChange={setTaxStartOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full h-9 justify-start text-left font-normal text-sm bg-background", !taxStartDate && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-3.5 w-3.5 opacity-50" />
                            {taxStartDate ? format(taxStartDate, "dd/MM/yyyy") : t("reports.taxes.startDate")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={taxStartDate} onSelect={(date) => { setTaxStartDate(date); setTaxStartOpen(false); }} initialFocus className="pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                      <Popover open={taxEndOpen} onOpenChange={setTaxEndOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full h-9 justify-start text-left font-normal text-sm bg-background", !taxEndDate && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-3.5 w-3.5 opacity-50" />
                            {taxEndDate ? format(taxEndDate, "dd/MM/yyyy") : t("reports.taxes.endDate")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={taxEndDate} onSelect={(date) => { setTaxEndDate(date); setTaxEndOpen(false); }} initialFocus className="pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                    </>
                  )}
                  {taxDateFilter === 'month' && (
                    <MonthYearPicker selectedDate={taxSelectedMonth} onDateChange={setTaxSelectedMonth} mode="month" t={t} language={language} />
                  )}
                  {taxDateFilter === 'year' && (
                    <MonthYearPicker selectedDate={taxSelectedYear} onDateChange={setTaxSelectedYear} mode="year" t={t} language={language} />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Applied Filter Summary */}
          {(taxSelectedCompany !== 'all' || taxEffectiveStart || taxEffectiveEnd) && (
            <div className="px-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{language === 'fr' ? 'Filtres appliqués' : 'Applied Filters'}</p>
              <p className="text-sm text-foreground/80">
                {[
                  taxSelectedCompany && taxSelectedCompany !== 'all'
                    ? `${language === 'fr' ? 'Entreprise' : 'Company'}: ${companies.find(c => c.id === taxSelectedCompany)?.name}`
                    : null,
                  taxEffectiveStart && taxEffectiveEnd
                    ? `${language === 'fr' ? 'Période' : 'Period'}: ${format(taxEffectiveStart, "d MMM yyyy", { locale: language === 'fr' ? fr : enUS })} – ${format(taxEffectiveEnd, "d MMM yyyy", { locale: language === 'fr' ? fr : enUS })}`
                    : taxEffectiveStart
                    ? `${language === 'fr' ? 'Depuis' : 'From'}: ${format(taxEffectiveStart, "d MMM yyyy", { locale: language === 'fr' ? fr : enUS })}`
                    : null,
                  `${language === 'fr' ? 'Affichage' : 'Display'}: ${taxViewMode === 'monthly' ? t("reports.taxes.monthly") : t("reports.taxes.yearly")}`
                ].filter(Boolean).join(' • ')}
              </p>
            </div>
          )}

          {/* KPI Summary Cards */}
          {taxData && (taxData.totalInvoiceTaxAmount > 0 || taxData.totalExpenseTaxAmount > 0) && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Net Amount Payable */}
                <Card className="shadow-sm border-0 bg-card relative overflow-hidden">
                  <div className="absolute inset-y-0 left-0 w-1 bg-primary" />
                  <CardContent className="p-4 pl-5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {language === 'fr' ? 'Montant net à remettre' : 'Net Amount Payable'}
                    </p>
                    <p className="text-3xl font-bold tracking-tight text-foreground mt-1.5">
                      {taxData.totalTaxAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'CAD' })}
                    </p>
                    <div className="mt-2 space-y-0.5">
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {taxData.totalInvoiceTaxAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'CAD' })} {language === 'fr' ? 'collectées' : 'collected'}
                      </p>
                      <p className="text-xs tabular-nums text-muted-foreground">
                        − {taxData.totalExpenseTaxAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'CAD' })} {language === 'fr' ? 'crédits' : 'credits'}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Collected Taxes */}
                <Card className="shadow-sm border-0 bg-card relative overflow-hidden">
                  <div className="absolute inset-y-0 left-0 w-1 bg-chart-2" />
                  <CardContent className="p-4 pl-5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {language === 'fr' ? 'Taxes collectées' : 'Collected Taxes'}
                    </p>
                    <p className="text-3xl font-bold tracking-tight text-foreground mt-1.5">
                      {taxData.totalInvoiceTaxAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'CAD' })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {language === 'fr' ? 'Sur factures payées' : 'From paid invoices'}
                    </p>
                  </CardContent>
                </Card>

                {/* Tax Credits */}
                <Card className="shadow-sm border-0 bg-card relative overflow-hidden">
                  <div className="absolute inset-y-0 left-0 w-1 bg-chart-3" />
                  <CardContent className="p-4 pl-5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {language === 'fr' ? 'Crédits de taxes' : 'Tax Credits'}
                    </p>
                    <p className="text-3xl font-bold tracking-tight text-foreground mt-1.5">
                      {taxData.totalExpenseTaxAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'CAD' })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {language === 'fr' ? 'Crédits récupérables sur dépenses' : 'Recoverable credits from expenses'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Tax Calculation Summary */}
              <Card className="shadow-sm border-0 bg-card/60">
                <CardContent className="p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    {language === 'fr' ? 'Calcul des taxes' : 'Tax Calculation'}
                  </p>
                  <div className="space-y-1.5 max-w-sm">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{language === 'fr' ? 'Taxes collectées' : 'Collected Taxes'}</span>
                      <span className="tabular-nums font-medium text-chart-2">
                        {taxData.totalInvoiceTaxAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'CAD' })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{language === 'fr' ? 'Crédits récupérables' : 'Recoverable Credits'}</span>
                      <span className="tabular-nums font-medium text-chart-3">
                        − {taxData.totalExpenseTaxAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'CAD' })}
                      </span>
                    </div>
                    <div className="border-t border-border my-1" />
                    <div className="flex items-center justify-between text-sm pt-0.5">
                      <span className="font-semibold">{language === 'fr' ? 'Montant net à remettre' : 'Net Amount Payable'}</span>
                      <span className="tabular-nums font-bold text-base">
                        {taxData.totalTaxAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'CAD' })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* No data message */}
          {taxData && taxData.totalInvoiceTaxAmount === 0 && taxData.totalExpenseTaxAmount === 0 && (
            <Card className="shadow-sm border-0">
              <CardContent className="flex justify-center items-center py-12">
                <div className="text-center">
                  <p className="text-sm font-medium">{t("reports.taxes.noData")}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t("reports.taxes.noDataDesc")}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tax Type Breakdown */}
          {taxData && taxData.taxSummary && taxData.taxSummary.length > 0 && (
            <Card className="shadow-sm border-0">
              <CardHeader className="pb-0 pt-3 px-4">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t("reports.taxes.totalByType")}</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 pt-2.5">
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="h-8 text-[11px] font-semibold uppercase tracking-wider">{t("reports.taxes.taxType")}</TableHead>
                        <TableHead className="h-8 text-[11px] font-semibold uppercase tracking-wider text-right">{language === 'fr' ? 'Collectées' : 'Collected'}</TableHead>
                        <TableHead className="h-8 text-[11px] font-semibold uppercase tracking-wider text-right">{language === 'fr' ? 'Crédits' : 'Credits'}</TableHead>
                        <TableHead className="h-8 text-[11px] font-semibold uppercase tracking-wider text-right">{language === 'fr' ? 'Net à remettre' : 'Net Payable'}</TableHead>
                        <TableHead className="h-8 text-[11px] font-semibold uppercase tracking-wider text-center">{language === 'fr' ? 'Fact.' : 'Inv.'}</TableHead>
                        <TableHead className="h-8 text-[11px] font-semibold uppercase tracking-wider text-center">{language === 'fr' ? 'Dép.' : 'Exp.'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {taxData.taxSummary.map((tax, index) => (
                        <TableRow key={index} className="hover:bg-muted/20">
                          <TableCell className="py-2.5 font-medium text-sm">{tax.name}</TableCell>
                          <TableCell className="py-2.5 text-right text-sm font-medium tabular-nums text-chart-2">
                            {tax.invoiceAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'CAD' })}
                          </TableCell>
                          <TableCell className="py-2.5 text-right text-sm font-medium tabular-nums text-chart-3">
                            {tax.expenseAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'CAD' })}
                          </TableCell>
                          <TableCell className="py-2.5 text-right text-sm font-semibold tabular-nums">
                            {tax.netAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'CAD' })}
                          </TableCell>
                          <TableCell className="py-2.5 text-center text-xs text-muted-foreground">{tax.invoiceCount || 0}</TableCell>
                          <TableCell className="py-2.5 text-center text-xs text-muted-foreground">{tax.expenseCount || 0}</TableCell>
                        </TableRow>
                      ))}
                      {/* Totals */}
                      <TableRow className="bg-muted/40 hover:bg-muted/50 border-t-2 border-border/60">
                        <TableCell className="py-3 font-bold text-sm">TOTAL</TableCell>
                        <TableCell className="py-3 text-right text-sm font-bold tabular-nums text-chart-2">
                          {taxData.totalInvoiceTaxAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'CAD' })}
                        </TableCell>
                        <TableCell className="py-3 text-right text-sm font-bold tabular-nums text-chart-3">
                          {taxData.totalExpenseTaxAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'CAD' })}
                        </TableCell>
                        <TableCell className="py-3 text-right text-sm font-bold tabular-nums">
                          {taxData.totalTaxAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'CAD' })}
                        </TableCell>
                        <TableCell className="py-3 text-center text-xs font-bold text-muted-foreground">
                          {taxData.taxSummary.reduce((s, t) => s + (t.invoiceCount || 0), 0)}
                        </TableCell>
                        <TableCell className="py-3 text-center text-xs font-bold text-muted-foreground">
                          {taxData.taxSummary.reduce((s, t) => s + (t.expenseCount || 0), 0)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Exports */}
          {taxData && (taxData.totalInvoiceTaxAmount > 0 || taxData.totalExpenseTaxAmount > 0) && (
            <Card className="shadow-sm border-0">
              <CardHeader className="pb-0 pt-3 px-4">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{language === 'fr' ? 'Exports' : 'Exports'}</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 pt-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Summary */}
                  <div className="flex items-center justify-between py-2 px-3 rounded-md border bg-muted/10 hover:bg-muted/20 transition-colors">
                    <div className="min-w-0 mr-3">
                      <p className="text-sm font-medium truncate">{t("reports.taxes.download")}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{t("reports.taxes.exportDesc")}</p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button onClick={exportTaxesToPDF} variant="outline" size="sm" className="h-7 px-2.5 text-xs" disabled={taxData.taxSummary.length === 0}>
                        <Download className="mr-1 h-3 w-3" />PDF
                      </Button>
                      <Button onClick={exportTaxesToExcel} variant="outline" size="sm" className="h-7 px-2.5 text-xs" disabled={taxData.taxSummary.length === 0}>
                        <FileSpreadsheet className="mr-1 h-3 w-3" />Excel
                      </Button>
                    </div>
                  </div>

                  {/* Taxes Collected */}
                  {taxData.totalInvoiceTaxAmount > 0 && (
                    <div className="flex items-center justify-between py-2 px-3 rounded-md border bg-muted/10 hover:bg-muted/20 transition-colors">
                      <div className="min-w-0 mr-3">
                        <p className="text-sm font-medium truncate">{getReportTranslation('taxesCollectedSales', language)}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{getReportTranslation('taxesCollectedSalesDesc', language)}</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <Button onClick={exportTaxesCollectedToPDF} variant="outline" size="sm" className="h-7 px-2.5 text-xs" disabled={taxData.totalInvoiceTaxAmount === 0}>
                          <Download className="mr-1 h-3 w-3" />PDF
                        </Button>
                        <Button onClick={exportTaxesCollectedToExcel} variant="outline" size="sm" className="h-7 px-2.5 text-xs" disabled={taxData.totalInvoiceTaxAmount === 0}>
                          <FileSpreadsheet className="mr-1 h-3 w-3" />Excel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Taxes Paid */}
                  <div className="flex items-center justify-between py-2 px-3 rounded-md border bg-muted/10 hover:bg-muted/20 transition-colors">
                    <div className="min-w-0 mr-3">
                      <p className="text-sm font-medium truncate">{getReportTranslation('taxesPaidExpenses', language)}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{getReportTranslation('taxesPaidExpensesDesc', language)}</p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button onClick={exportTaxesPaidToPDF} variant="outline" size="sm" className="h-7 px-2.5 text-xs" disabled={taxData.totalExpenseTaxAmount === 0}>
                        <Download className="mr-1 h-3 w-3" />PDF
                      </Button>
                      <Button onClick={exportTaxesPaidToExcel} variant="outline" size="sm" className="h-7 px-2.5 text-xs" disabled={taxData.totalExpenseTaxAmount === 0}>
                        <FileSpreadsheet className="mr-1 h-3 w-3" />Excel
                      </Button>
                    </div>
                  </div>

                  {/* Net Tax Report */}
                  <div className="flex items-center justify-between py-2 px-3 rounded-md border bg-muted/10 hover:bg-muted/20 transition-colors">
                    <div className="min-w-0 mr-3">
                      <p className="text-sm font-medium truncate">{getReportTranslation('netTaxReport', language)}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{getReportTranslation('netTaxReportDesc', language)}</p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button onClick={exportNetTaxReportToPDF} variant="outline" size="sm" className="h-7 px-2.5 text-xs" disabled={taxData.taxSummary.length === 0}>
                        <Download className="mr-1 h-3 w-3" />PDF
                      </Button>
                      <Button onClick={exportNetTaxReportToExcel} variant="outline" size="sm" className="h-7 px-2.5 text-xs" disabled={taxData.taxSummary.length === 0}>
                        <FileSpreadsheet className="mr-1 h-3 w-3" />Excel
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
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
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setEmailDialogOpen('invoices')}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Email
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
                  <Popover open={reminderStartOpen} onOpenChange={setReminderStartOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !reminderStartDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {reminderStartDate ? format(reminderStartDate, "PPP", { locale: language === "fr" ? fr : enUS }) : getReportTranslation('pickADate', language)}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={reminderStartDate}
                        onSelect={(date) => {
                          setReminderStartDate(date);
                          setReminderStartOpen(false);
                        }}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>{language === "fr" ? "Date de fin" : "End Date"}</Label>
                  <Popover open={reminderEndOpen} onOpenChange={setReminderEndOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !reminderEndDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {reminderEndDate ? format(reminderEndDate, "PPP", { locale: language === "fr" ? fr : enUS }) : getReportTranslation('pickADate', language)}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={reminderEndDate}
                        onSelect={(date) => {
                          setReminderEndDate(date);
                          setReminderEndOpen(false);
                        }}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
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
      
      {/* Dialog pour aucun produit à exporter */}
      <AlertDialog open={showNoProductsDialog} onOpenChange={setShowNoProductsDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'fr' ? "Aucun produit à exporter" : "No products to export"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'fr' 
                ? "Il n'y a aucun produit physique disponible pour ce rapport. Les services (comme les heures de consultation ou de design) sont exclus du rapport d'inventaire."
                : "There are no physical products available for this report. Services (such as consultation or design hours) are excluded from the inventory report."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Email Report Dialogs */}
      <EmailReportDialog
        open={emailDialogOpen === 'revenue'}
        onOpenChange={(open) => !open && setEmailDialogOpen(null)}
        reportType="revenue"
        reportTitle={language === 'fr' ? 'Rapport des revenus' : 'Revenue Report'}
        pdfBlob={null}
        companyName={companies?.[0]?.name}
        companyEmail={companies?.[0]?.email || undefined}
        companyId={companies?.[0]?.id}
        onGeneratePdf={async () => {
          if (!realRevenueData || !chartData.length) return null;
          const doc = new jsPDF();
          doc.setFontSize(20);
          doc.text(getReportTranslation('revenueReport', language), doc.internal.pageSize.width / 2, 20, { align: 'center' });
          const tableData = chartData.map(item => [item.period, `$${item.revenue.toFixed(2)}`, item.invoiceCount.toString()]);
          autoTable(doc, { head: [['Période', 'Revenus', 'Factures']], body: tableData, startY: 40 });
          return doc.output('blob');
        }}
      />

      <EmailReportDialog
        open={emailDialogOpen === 'invoices'}
        onOpenChange={(open) => !open && setEmailDialogOpen(null)}
        reportType="invoices"
        reportTitle={language === 'fr' ? 'Rapport des factures' : 'Invoices Report'}
        pdfBlob={null}
        companyName={companies?.[0]?.name}
        companyEmail={companies?.[0]?.email || undefined}
        companyId={companies?.[0]?.id}
        onGeneratePdf={async () => {
          if (!filteredInvoicesByStatus.length) return null;
          const doc = new jsPDF();
          const tr = (key: string) => getReportTranslation(key, language);
          
          doc.setFontSize(18);
          doc.text(tr('invoicesReport'), 14, 22);
          
          doc.setFontSize(11);
          doc.text(`${tr('reportDate')}: ${format(new Date(), 'dd/MM/yyyy', { locale: language === 'fr' ? fr : enUS })}`, 14, 32);
          
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
          
          return doc.output('blob');
        }}
      />

      <EmailReportDialog
        open={emailDialogOpen === 'sales'}
        onOpenChange={(open) => !open && setEmailDialogOpen(null)}
        reportType="sales"
        reportTitle={language === 'fr' ? 'Ventes par produit' : 'Sales by Product'}
        pdfBlob={null}
        companyName={companies?.[0]?.name}
        companyEmail={companies?.[0]?.email || undefined}
        companyId={companies?.[0]?.id}
        onGeneratePdf={async () => {
          if (!salesData) return null;
          const blob = await generateSalesReportPdf({
            salesData,
            companyName: companies[0]?.name,
            startDate: productStartDate,
            endDate: productEndDate,
            chartRef: salesProductChartRef,
            returnBlob: true,
            planType: planLimits?.plan_type || 'free',
            hideBranding: hidePdfBranding,
            includedStatuses: selectedSalesStatuses,
            language: language as 'fr' | 'en',
          });
          return blob as Blob;
        }}
      />

      <EmailReportDialog
        open={emailDialogOpen === 'stock'}
        onOpenChange={(open) => !open && setEmailDialogOpen(null)}
        reportType="stock"
        reportTitle={language === 'fr' ? 'État des stocks' : 'Stock Status'}
        pdfBlob={null}
        companyName={companies?.[0]?.name}
        companyEmail={companies?.[0]?.email || undefined}
        companyId={companies?.[0]?.id}
        onGeneratePdf={async () => {
          if (!filteredInventoryProducts || filteredInventoryProducts.length === 0) return null;
          
          // Get company filter name
          let companyFilterName: string | undefined;
          if (productFilterType === 'company' && productSelectedCompanyId) {
            companyFilterName = companies?.find(c => c.id === productSelectedCompanyId)?.name;
          }
          
          // Prepare products for the PDF
          const stockProducts: StockProduct[] = filteredInventoryProducts.map(p => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            category: p.category,
            quantity: p.quantity || 0,
            minStock: 5,
          }));
          
          const blob = await generateStockStatusPdf({
            products: stockProducts,
            companyName: companies?.[0]?.name,
            companyFilterName,
            language: language as 'fr' | 'en',
            planType: planLimits?.plan_type || 'free',
            hideBranding: hidePdfBranding,
            returnBlob: true
          });
          return blob as Blob;
        }}
      />

      <EmailReportDialog
        open={emailDialogOpen === 'stock_value'}
        onOpenChange={(open) => !open && setEmailDialogOpen(null)}
        reportType="stock_value"
        reportTitle={language === 'fr' ? 'Valeur du stock' : 'Stock Value'}
        pdfBlob={null}
        companyName={companies?.[0]?.name}
        companyEmail={companies?.[0]?.email || undefined}
        companyId={companies?.[0]?.id}
        onGeneratePdf={async () => {
          if (!filteredInventoryProducts || filteredInventoryProducts.length === 0) return null;
          
          // Get company filter name
          let companyFilterName: string | undefined;
          if (productFilterType === 'company' && productSelectedCompanyId) {
            companyFilterName = companies?.find(c => c.id === productSelectedCompanyId)?.name;
          }
          
          // Prepare products for the PDF (only products with quantity > 0)
          const stockValueProducts: StockValueProduct[] = filteredInventoryProducts
            .filter(p => (p.quantity || 0) > 0)
            .map(p => ({
              id: p.id,
              name: p.name,
              sku: p.sku,
              category: p.category,
              quantity: p.quantity || 0,
              cost: p.cost || 0,
            }));
          
          const blob = await generateStockValuePdf({
            products: stockValueProducts,
            companyName: companies?.[0]?.name,
            companyFilterName,
            language: language as 'fr' | 'en',
            planType: planLimits?.plan_type || 'free',
            hideBranding: hidePdfBranding,
            returnBlob: true
          });
          return blob as Blob;
        }}
      />

      <EmailReportDialog
        open={emailDialogOpen === 'expenses-period'}
        onOpenChange={(open) => !open && setEmailDialogOpen(null)}
        reportType="expenses-period"
        reportTitle={language === 'fr' ? 'Dépenses par période' : 'Expenses by Period'}
        pdfBlob={null}
        companyName={companies?.[0]?.name}
        companyEmail={companies?.[0]?.email || undefined}
        companyId={companies?.[0]?.id}
        onGeneratePdf={async () => {
          if (!expenseReportData) return null;
          
          let companyFilterName: string | undefined;
          let categoryFilterName: string | undefined;
          
          if (expenseFilterType === 'company' && expenseSelectedCompanyId) {
            companyFilterName = companies.find(c => c.id === expenseSelectedCompanyId)?.name;
          } else if (expenseFilterType === 'category' && expenseSelectedCategory) {
            categoryFilterName = expenseSelectedCategory;
          }
          
          const blob = await generateExpensesPeriodPdf({
            reportData: expenseReportData,
            startDate: expenseStartDate,
            endDate: expenseEndDate,
            companyName: companyFilterName,
            companyFilterName,
            categoryFilterName,
            language: language as 'fr' | 'en',
            planType: planLimits?.plan_type || 'free',
            hideBranding: hidePdfBranding,
            returnBlob: true
          });
          return blob as Blob;
        }}
      />

      <EmailReportDialog
        open={emailDialogOpen === 'expenses-category'}
        onOpenChange={(open) => !open && setEmailDialogOpen(null)}
        reportType="expenses-category"
        reportTitle={language === 'fr' ? 'Dépenses par catégorie' : 'Expenses by Category'}
        pdfBlob={null}
        companyName={companies?.[0]?.name}
        companyEmail={companies?.[0]?.email || undefined}
        companyId={companies?.[0]?.id}
        onGeneratePdf={async () => {
          if (!expenseReportData) return null;
          
          const companyFilterName = expenseFilterType === 'company' && expenseSelectedCompanyId
            ? companies.find(c => c.id === expenseSelectedCompanyId)?.name
            : undefined;
          
          const blob = await generateExpensesByCategoryPdf({
            reportData: expenseReportData,
            startDate: expenseStartDate,
            endDate: expenseEndDate,
            companyName: companyFilterName,
            companyFilterName,
            language: language as 'fr' | 'en',
            planType: planLimits?.plan_type || 'free',
            hideBranding: hidePdfBranding,
            returnBlob: true
          });
          return blob as Blob;
        }}
      />

      <EmailReportDialog
        open={emailDialogOpen === 'expenses-all'}
        onOpenChange={(open) => !open && setEmailDialogOpen(null)}
        reportType="expenses-all"
        reportTitle={language === 'fr' ? 'Détail de toutes les dépenses' : 'All Expenses Detail'}
        pdfBlob={null}
        companyName={companies?.[0]?.name}
        companyEmail={companies?.[0]?.email || undefined}
        companyId={companies?.[0]?.id}
        onGeneratePdf={async () => {
          if (!expenseReportData) return null;
          
          const companyFilterName = expenseFilterType === 'company' && expenseSelectedCompanyId
            ? companies.find(c => c.id === expenseSelectedCompanyId)?.name
            : undefined;
          
          const blob = await generateAllExpensesPdf({
            reportData: expenseReportData,
            startDate: expenseStartDate,
            endDate: expenseEndDate,
            companyName: companyFilterName,
            companyFilterName,
            language: language as 'fr' | 'en',
            planType: planLimits?.plan_type || 'free',
            hideBranding: hidePdfBranding,
            returnBlob: true
          });
          return blob as Blob;
        }}
      />

      <EmailReportDialog
        open={emailDialogOpen === 'clients'}
        onOpenChange={(open) => !open && setEmailDialogOpen(null)}
        reportType="clients_list"
        reportTitle={language === 'fr' ? 'Rapport Liste des clients' : 'Clients List Report'}
        pdfBlob={null}
        companyName={companies?.[0]?.name}
        companyEmail={companies?.[0]?.email || undefined}
        companyId={companies?.[0]?.id}
        onGeneratePdf={async () => {
          if (!clients || clients.length === 0) return null;
          
          const doc = new jsPDF();
          const pageWidth = doc.internal.pageSize.width;
          const pageHeight = doc.internal.pageSize.height;
          const dateLocale = language === 'fr' ? fr : enUS;
          
          // Get main company name for header
          const mainCompanyName = companies.length === 1 
            ? companies[0].name 
            : (language === 'fr' ? 'Toutes les entreprises' : 'All Companies');
          
          // Helper function to get last invoice date
          const getLastInvoiceDateForClient = (clientId: string) => {
            const clientInvoices = invoices?.filter((inv: any) => inv.client_id === clientId) || [];
            if (clientInvoices.length === 0) return null;
            const sortedInvoices = clientInvoices.sort((a: any, b: any) => 
              new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime()
            );
            return sortedInvoices[0]?.issue_date;
          };
          
          // Sort clients by name A-Z
          const sortedClients = [...filteredClientsByDate].sort((a, b) => 
            a.name.localeCompare(b.name, language === 'fr' ? 'fr' : 'en')
          );
          
          let yPosition = 15;
          
          // === HEADER ===
          // Company name
          doc.setFontSize(11);
          doc.setTextColor(100, 100, 100);
          doc.text(mainCompanyName, pageWidth / 2, yPosition, { align: 'center' });
          yPosition += 8;
          
          // Report title
          doc.setFontSize(20);
          doc.setTextColor(0, 0, 0);
          doc.text(language === 'fr' ? "Liste des clients" : "Clients List", pageWidth / 2, yPosition, { align: 'center' });
          yPosition += 10;
          
          // Date range filter (if applied)
          if (createdFromDate || createdToDate) {
            doc.setFontSize(10);
            doc.setTextColor(80, 80, 80);
            let dateRangeText = language === 'fr' ? 'Période de création: ' : 'Creation period: ';
            if (createdFromDate && createdToDate) {
              dateRangeText += `${format(createdFromDate, 'dd/MM/yyyy')} - ${format(createdToDate, 'dd/MM/yyyy')}`;
            } else if (createdFromDate) {
              dateRangeText += `${language === 'fr' ? 'Depuis le' : 'From'} ${format(createdFromDate, 'dd/MM/yyyy')}`;
            } else if (createdToDate) {
              dateRangeText += `${language === 'fr' ? "Jusqu'au" : 'Until'} ${format(createdToDate, 'dd/MM/yyyy')}`;
            }
            doc.text(dateRangeText, pageWidth / 2, yPosition, { align: 'center' });
            yPosition += 6;
          }
          
          // Generated date
          doc.setFontSize(9);
          doc.setTextColor(120, 120, 120);
          doc.text(
            `${language === 'fr' ? 'Généré le' : 'Generated on'}: ${format(new Date(), language === 'fr' ? 'dd MMMM yyyy, HH:mm' : 'MMMM dd, yyyy, HH:mm', { locale: dateLocale })}`,
            pageWidth / 2, 
            yPosition, 
            { align: 'center' }
          );
          yPosition += 8;
          
          // Summary line
          doc.setFontSize(10);
          doc.setTextColor(60, 60, 60);
          doc.text(
            `${language === 'fr' ? 'Total' : 'Total'}: ${sortedClients.length} ${sortedClients.length > 1 ? 'clients' : 'client'}`,
            pageWidth / 2, 
            yPosition, 
            { align: 'center' }
          );
          yPosition += 10;
          
          // === CLIENTS TABLE ===
          const tableData = sortedClients.map(client => {
            const lastInvoiceDate = getLastInvoiceDateForClient(client.id);
            return [
              client.name,
              client.companies?.name || (language === 'fr' ? 'Aucune' : 'None'),
              client.email || '-',
              client.phone || '-',
              client.contact_person || '-',
              format(new Date(client.created_at), 'dd/MM/yyyy'),
              lastInvoiceDate ? format(new Date(lastInvoiceDate), 'dd/MM/yyyy') : (language === 'fr' ? 'Aucune' : 'None')
            ];
          });
          
          autoTable(doc, {
            head: [[
              language === 'fr' ? 'Nom du client' : 'Client Name',
              language === 'fr' ? 'Entreprise' : 'Company',
              'Email',
              language === 'fr' ? 'Téléphone' : 'Phone',
              'Contact',
              language === 'fr' ? 'Date création' : 'Creation Date',
              language === 'fr' ? 'Dernière facture' : 'Last Invoice'
            ]],
            body: tableData,
            startY: yPosition,
            theme: 'striped',
            headStyles: { 
              fillColor: [59, 130, 246],
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              fontSize: 8
            },
            styles: { 
              fontSize: 8,
              cellPadding: 3,
              overflow: 'linebreak'
            },
            columnStyles: {
              0: { cellWidth: 30 },
              1: { cellWidth: 25 },
              2: { cellWidth: 40 },
              3: { cellWidth: 25 },
              4: { cellWidth: 25 },
              5: { cellWidth: 22 },
              6: { cellWidth: 22 }
            },
            alternateRowStyles: {
              fillColor: [245, 247, 250]
            }
          });
          
          // === ADD FOOTERS TO ALL PAGES ===
          const pageCount = doc.getNumberOfPages();
          for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            
            // Page number - right
            doc.text(
              `${language === 'fr' ? 'Page' : 'Page'} ${i} / ${pageCount}`,
              pageWidth - 20,
              pageHeight - 10,
              { align: 'right' }
            );
            
            // Branding - left (only if branding not hidden)
            if (!hidePdfBranding) {
              doc.text(
                'Generated with GestionFlow',
                20,
                pageHeight - 10,
                { align: 'left' }
              );
            }
          }
          
          return doc.output('blob');
        }}
      />

      <EmailReportDialog
        open={emailDialogOpen === 'revenue_by_client'}
        onOpenChange={(open) => !open && setEmailDialogOpen(null)}
        reportType="revenue_by_client"
        reportTitle={language === 'fr' ? 'Revenus par client' : 'Revenue by Client'}
        pdfBlob={null}
        companyName={companies?.[0]?.name}
        companyEmail={companies?.[0]?.email || undefined}
        companyId={companies?.[0]?.id}
        onGeneratePdf={async () => {
          if (!clientRevenueData || clientRevenueData.clientData.length === 0) return null;
          
          // Get invoice details for each client
          const clientInvoices = invoices
            .filter(inv => {
              if (clientRevenueStartDate || clientRevenueEndDate) {
                const invoiceDate = new Date(inv.issue_date);
                if (clientRevenueStartDate && invoiceDate < clientRevenueStartDate) return false;
                if (clientRevenueEndDate && invoiceDate > clientRevenueEndDate) return false;
              }
              if (clientRevenueCompanyId && clientRevenueCompanyId !== 'all') {
                const client = clients.find(c => c.id === inv.client_id);
                if (client?.company_id !== clientRevenueCompanyId) return false;
              }
              return ['sent', 'paid', 'overdue'].includes(inv.status);
            })
            .map(inv => ({
              invoice_number: inv.invoice_number,
              issue_date: inv.issue_date,
              total: Number(inv.total),
              status: inv.status,
              client_id: inv.client_id || ''
            }));

          const companyFilterName = clientRevenueCompanyId && clientRevenueCompanyId !== 'all'
            ? companies.find(c => c.id === clientRevenueCompanyId)?.name
            : undefined;

          const blob = await generateRevenueByClientPdf({
            clientRevenueData,
            startDate: clientRevenueStartDate,
            endDate: clientRevenueEndDate,
            companyFilterName,
            invoiceDetails: clientInvoices,
            language: language as 'fr' | 'en',
            planType: planLimits?.plan_type || 'free',
            hideBranding: hidePdfBranding,
            returnBlob: true
          });
          return blob as Blob;
        }}
      />

      <EmailReportDialog
        open={emailDialogOpen === 'revenue_by_product'}
        onOpenChange={(open) => !open && setEmailDialogOpen(null)}
        reportType="revenue_by_product"
        reportTitle={language === 'fr' ? 'Revenus par produit/service' : 'Revenue by Product/Service'}
        pdfBlob={null}
        companyName={companies?.[0]?.name}
        companyEmail={companies?.[0]?.email || undefined}
        onGeneratePdf={async () => {
          if (!productRevenueData || productRevenueData.productData.length === 0) return null;
          
          // Get invoice line details
          const invoiceLineDetails = invoices
            .filter(inv => {
              if (productRevenueStartDate || productRevenueEndDate) {
                const invoiceDate = new Date(inv.issue_date);
                if (productRevenueStartDate && invoiceDate < productRevenueStartDate) return false;
                if (productRevenueEndDate && invoiceDate > productRevenueEndDate) return false;
              }
              if (productRevenueCompanyId && productRevenueCompanyId !== 'all') {
                const client = clients.find(c => c.id === inv.client_id);
                if (client?.company_id !== productRevenueCompanyId) return false;
              }
              return inv.status === 'paid';
            })
            .flatMap(inv => {
              const items = (inv as any).invoice_items || [];
              return items.map((item: any) => ({
                invoice_number: inv.invoice_number,
                client_name: (inv as any).clients?.name || '-',
                issue_date: inv.issue_date,
                product_name: item.description || '-',
                quantity: Number(item.quantity) || 0,
                line_total: Number(item.total) || 0
              }));
            })
            .slice(0, 100);

          const companyFilterName = productRevenueCompanyId && productRevenueCompanyId !== 'all'
            ? companies.find(c => c.id === productRevenueCompanyId)?.name
            : undefined;

          const blob = await generateRevenueByProductPdf({
            productRevenueData,
            startDate: productRevenueStartDate,
            endDate: productRevenueEndDate,
            companyFilterName,
            invoiceLineDetails,
            language: language as 'fr' | 'en',
            planType: planLimits?.plan_type || 'free',
            hideBranding: hidePdfBranding,
            returnBlob: true
          });
          return blob as Blob;
        }}
      />

      {/* Email dialog for All Clients list (Global Clients Report) */}
      <EmailReportDialog
        open={emailDialogOpen === 'clients_all'}
        onOpenChange={(open) => !open && setEmailDialogOpen(null)}
        reportType="clients_all"
        reportTitle={language === 'fr' ? 'Rapport des clients' : 'Clients Report'}
        pdfBlob={null}
        companyName={companies?.[0]?.name}
        companyEmail={companies?.[0]?.email || undefined}
        defaultSubject={language === 'fr' ? 'Rapport des clients' : 'Clients Report'}
        defaultMessage={(() => {
          const companyName = companies.length === 1 
            ? companies[0].name 
            : (language === 'fr' ? 'Toutes les entreprises' : 'All Companies');
          
          let dateInfo = '';
          if (createdFromDate || createdToDate) {
            if (createdFromDate && createdToDate) {
              dateInfo = language === 'fr' 
                ? `\nPériode de création: ${format(createdFromDate, 'dd/MM/yyyy')} - ${format(createdToDate, 'dd/MM/yyyy')}`
                : `\nCreation date range: ${format(createdFromDate, 'dd/MM/yyyy')} - ${format(createdToDate, 'dd/MM/yyyy')}`;
            } else if (createdFromDate) {
              dateInfo = language === 'fr'
                ? `\nPériode de création: Depuis le ${format(createdFromDate, 'dd/MM/yyyy')}`
                : `\nCreation date range: From ${format(createdFromDate, 'dd/MM/yyyy')}`;
            } else if (createdToDate) {
              dateInfo = language === 'fr'
                ? `\nPériode de création: Jusqu'au ${format(createdToDate, 'dd/MM/yyyy')}`
                : `\nCreation date range: Until ${format(createdToDate, 'dd/MM/yyyy')}`;
            }
          }
          
          return language === 'fr'
            ? `Veuillez trouver ci-joint le rapport complet des clients généré depuis GestionFlow.\n\nEntreprise: ${companyName}${dateInfo}\n\nCe rapport inclut la liste complète des clients et les clients regroupés par entreprise.`
            : `Please find attached the complete Clients Report generated from GestionFlow.\n\nCompany: ${companyName}${dateInfo}\n\nThis report includes the full clients list and clients grouped by company.`;
        })()}
        onGeneratePdf={async () => {
          if (!clients || filteredClientsByDate.length === 0) return null;
          
          const doc = new jsPDF();
          const pageWidth = doc.internal.pageSize.width;
          const pageHeight = doc.internal.pageSize.height;
          
          // Get the first company for header (or use a generic name if multiple)
          const companyName = companies.length === 1 
            ? companies[0].name 
            : (language === 'fr' ? 'Toutes les entreprises' : 'All Companies');
          
          // Sort clients by name A-Z
          const sortedClients = [...filteredClientsByDate].sort((a, b) => 
            a.name.localeCompare(b.name, language === 'fr' ? 'fr' : 'en')
          );
          
          // Helper function to get last invoice date
          const getLastInvoiceDateForClient = (clientId: string) => {
            const clientInvoices = invoices?.filter((inv: any) => inv.client_id === clientId) || [];
            if (clientInvoices.length === 0) return null;
            const sortedInvoices = clientInvoices.sort((a: any, b: any) => 
              new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime()
            );
            return sortedInvoices[0]?.issue_date;
          };
          
          let yPosition = 15;
          
          // === HEADER ===
          doc.setFontSize(12);
          doc.setTextColor(100, 100, 100);
          doc.text(companyName, pageWidth / 2, yPosition, { align: 'center' });
          yPosition += 10;
          
          doc.setFontSize(20);
          doc.setTextColor(0, 0, 0);
          doc.text(language === 'fr' ? "Liste des clients" : "Clients List", pageWidth / 2, yPosition, { align: 'center' });
          yPosition += 10;
          
          // Date range filter (if applied)
          if (createdFromDate || createdToDate) {
            doc.setFontSize(10);
            doc.setTextColor(80, 80, 80);
            let dateRangeText = language === 'fr' ? 'Période de création: ' : 'Creation period: ';
            if (createdFromDate && createdToDate) {
              dateRangeText += `${format(createdFromDate, 'dd/MM/yyyy')} - ${format(createdToDate, 'dd/MM/yyyy')}`;
            } else if (createdFromDate) {
              dateRangeText += `${language === 'fr' ? 'Depuis le' : 'From'} ${format(createdFromDate, 'dd/MM/yyyy')}`;
            } else if (createdToDate) {
              dateRangeText += `${language === 'fr' ? "Jusqu'au" : 'Until'} ${format(createdToDate, 'dd/MM/yyyy')}`;
            }
            doc.text(dateRangeText, pageWidth / 2, yPosition, { align: 'center' });
            yPosition += 6;
          }
          
          // Generated date
          doc.setFontSize(9);
          doc.setTextColor(120, 120, 120);
          doc.text(
            `${language === 'fr' ? 'Généré le' : 'Generated on'}: ${format(new Date(), language === 'fr' ? 'dd MMMM yyyy, HH:mm' : 'MMMM dd, yyyy, HH:mm', { locale: language === 'fr' ? fr : enUS })}`,
            pageWidth / 2, 
            yPosition, 
            { align: 'center' }
          );
          yPosition += 8;
          
          // Summary line
          doc.setFontSize(10);
          doc.setTextColor(60, 60, 60);
          doc.text(
            `${language === 'fr' ? 'Total' : 'Total'}: ${sortedClients.length} ${sortedClients.length > 1 ? 'clients' : 'client'}`,
            pageWidth / 2, 
            yPosition, 
            { align: 'center' }
          );
          yPosition += 10;
          
          // === CLIENTS TABLE ===
          const tableData = sortedClients.map(client => {
            const lastInvoiceDate = getLastInvoiceDateForClient(client.id);
            return [
              client.name,
              client.companies?.name || (language === 'fr' ? 'Aucune' : 'None'),
              client.email || '-',
              client.phone || '-',
              client.contact_person || '-',
              format(new Date(client.created_at), 'dd/MM/yyyy'),
              lastInvoiceDate ? format(new Date(lastInvoiceDate), 'dd/MM/yyyy') : (language === 'fr' ? 'Aucune' : 'None')
            ];
          });
          
          autoTable(doc, {
            head: [[
              language === 'fr' ? 'Nom du client' : 'Client Name',
              language === 'fr' ? 'Entreprise' : 'Company',
              'Email',
              language === 'fr' ? 'Téléphone' : 'Phone',
              'Contact',
              language === 'fr' ? 'Date création' : 'Creation Date',
              language === 'fr' ? 'Dernière facture' : 'Last Invoice'
            ]],
            body: tableData,
            startY: yPosition,
            theme: 'striped',
            headStyles: { 
              fillColor: [59, 130, 246],
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              fontSize: 8
            },
            styles: { 
              fontSize: 8,
              cellPadding: 3,
              overflow: 'linebreak'
            },
            columnStyles: {
              0: { cellWidth: 30 },
              1: { cellWidth: 25 },
              2: { cellWidth: 40 },
              3: { cellWidth: 25 },
              4: { cellWidth: 25 },
              5: { cellWidth: 22 },
              6: { cellWidth: 22 }
            },
            alternateRowStyles: {
              fillColor: [245, 247, 250]
            }
          });
          
          // Add footers to all pages
          const pageCount = doc.getNumberOfPages();
          for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            
            doc.text(
              `${language === 'fr' ? 'Page' : 'Page'} ${i} / ${pageCount}`,
              pageWidth - 20,
              pageHeight - 10,
              { align: 'right' }
            );
            
            if (!hidePdfBranding) {
              doc.text(
                'Generated with GestionFlow',
                20,
                pageHeight - 10,
                { align: 'left' }
              );
            }
          }
          
          return doc.output('blob');
        }}
      />

      {/* Email dialog for Clients by Company report (single company) */}
      <EmailReportDialog
        open={emailDialogOpen === 'clients_by_company'}
        onOpenChange={(open) => {
          if (!open) {
            setEmailDialogOpen(null);
            setSelectedCompanyForEmail(null);
          }
        }}
        reportType="clients_by_company"
        reportTitle={selectedCompanyForEmail 
          ? `${language === 'fr' ? 'Clients de' : 'Clients for'} ${selectedCompanyForEmail.name}`
          : (language === 'fr' ? 'Clients par entreprise' : 'Clients by Company')
        }
        companyName={selectedCompanyForEmail?.name || companies?.[0]?.name}
        companyEmail={selectedCompanyForEmail?.email || companies?.[0]?.email || undefined}
        defaultSubject={language === 'fr'
          ? `Rapport Clients par entreprise${selectedCompanyForEmail ? ` - ${selectedCompanyForEmail.name}` : ''}`
          : `Clients by Company Report${selectedCompanyForEmail ? ` - ${selectedCompanyForEmail.name}` : ''}`
        }
        defaultMessage={(() => {
          let msg = language === 'fr'
            ? `Veuillez trouver ci-joint le rapport Clients par entreprise généré depuis GestionFlow.\n\nLes clients sont regroupés par leur entreprise associée.`
            : `Please find attached the Clients by Company report generated from GestionFlow.\n\nClients are grouped by their associated company.`;
          
          if (selectedCompanyForEmail) {
            msg = language === 'fr'
              ? `Veuillez trouver ci-joint la liste des clients de ${selectedCompanyForEmail.name} générée depuis GestionFlow.`
              : `Please find attached the clients list for ${selectedCompanyForEmail.name} generated from GestionFlow.`;
          }
          
          if (createdFromDate || createdToDate) {
            let dateRange = '';
            if (createdFromDate && createdToDate) {
              dateRange = `${format(createdFromDate, 'dd/MM/yyyy')} - ${format(createdToDate, 'dd/MM/yyyy')}`;
            } else if (createdFromDate) {
              dateRange = language === 'fr' ? `Depuis le ${format(createdFromDate, 'dd/MM/yyyy')}` : `From ${format(createdFromDate, 'dd/MM/yyyy')}`;
            } else if (createdToDate) {
              dateRange = language === 'fr' ? `Jusqu'au ${format(createdToDate, 'dd/MM/yyyy')}` : `Until ${format(createdToDate, 'dd/MM/yyyy')}`;
            }
            msg += `\n\n${language === 'fr' ? 'Période de création' : 'Creation period'}: ${dateRange}`;
          }
          
          return msg;
        })()}
        pdfBlob={null}
        onGeneratePdf={async () => {
          if (!selectedCompanyForEmail || !clients) return null;
          
          const companyClients = filteredClientsByDate
            .filter(client => client.company_id === selectedCompanyForEmail.id)
            .sort((a, b) => a.name.localeCompare(b.name, language === 'fr' ? 'fr' : 'en'));
          
          if (companyClients.length === 0) return null;
          
          const doc = new jsPDF();
          const pageWidth = doc.internal.pageSize.width;
          const pageHeight = doc.internal.pageSize.height;
          
          // Helper function to get last invoice date
          const getLastInvoiceDateForClient = (clientId: string) => {
            const clientInvoices = invoices?.filter((inv: any) => inv.client_id === clientId) || [];
            if (clientInvoices.length === 0) return null;
            const sortedInvoices = clientInvoices.sort((a: any, b: any) => 
              new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime()
            );
            return sortedInvoices[0]?.issue_date;
          };
          
          let yPosition = 15;
          
          // === HEADER ===
          doc.setFontSize(12);
          doc.setTextColor(100, 100, 100);
          doc.text(selectedCompanyForEmail.name, pageWidth / 2, yPosition, { align: 'center' });
          yPosition += 10;
          
          doc.setFontSize(20);
          doc.setTextColor(0, 0, 0);
          doc.text(language === 'fr' ? "Liste des clients" : "Clients List", pageWidth / 2, yPosition, { align: 'center' });
          yPosition += 10;
          
          // Date range filter (if applied)
          if (createdFromDate || createdToDate) {
            doc.setFontSize(10);
            doc.setTextColor(80, 80, 80);
            let dateRangeText = language === 'fr' ? 'Période de création: ' : 'Creation period: ';
            if (createdFromDate && createdToDate) {
              dateRangeText += `${format(createdFromDate, 'dd/MM/yyyy')} - ${format(createdToDate, 'dd/MM/yyyy')}`;
            } else if (createdFromDate) {
              dateRangeText += `${language === 'fr' ? 'Depuis le' : 'From'} ${format(createdFromDate, 'dd/MM/yyyy')}`;
            } else if (createdToDate) {
              dateRangeText += `${language === 'fr' ? "Jusqu'au" : 'Until'} ${format(createdToDate, 'dd/MM/yyyy')}`;
            }
            doc.text(dateRangeText, pageWidth / 2, yPosition, { align: 'center' });
            yPosition += 6;
          }
          
          // Generated date
          doc.setFontSize(9);
          doc.setTextColor(120, 120, 120);
          doc.text(
            `${language === 'fr' ? 'Généré le' : 'Generated on'}: ${format(new Date(), language === 'fr' ? 'dd MMMM yyyy, HH:mm' : 'MMMM dd, yyyy, HH:mm', { locale: language === 'fr' ? fr : enUS })}`,
            pageWidth / 2, 
            yPosition, 
            { align: 'center' }
          );
          yPosition += 8;
          
          // Summary line
          doc.setFontSize(10);
          doc.setTextColor(60, 60, 60);
          doc.text(
            `${language === 'fr' ? 'Total' : 'Total'}: ${companyClients.length} ${companyClients.length > 1 ? 'clients' : 'client'}`,
            pageWidth / 2, 
            yPosition, 
            { align: 'center' }
          );
          yPosition += 10;
          
          // === CLIENTS TABLE ===
          const tableData = companyClients.map(client => {
            const lastInvoiceDate = getLastInvoiceDateForClient(client.id);
            return [
              client.name,
              client.email || '-',
              client.phone || '-',
              client.contact_person || '-',
              format(new Date(client.created_at), 'dd/MM/yyyy'),
              lastInvoiceDate ? format(new Date(lastInvoiceDate), 'dd/MM/yyyy') : (language === 'fr' ? 'Aucune' : 'None')
            ];
          });
          
          autoTable(doc, {
            head: [[
              language === 'fr' ? 'Nom du client' : 'Client Name',
              'Email',
              language === 'fr' ? 'Téléphone' : 'Phone',
              'Contact',
              language === 'fr' ? 'Date création' : 'Creation Date',
              language === 'fr' ? 'Dernière facture' : 'Last Invoice'
            ]],
            body: tableData,
            startY: yPosition,
            theme: 'striped',
            headStyles: { 
              fillColor: [59, 130, 246],
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              fontSize: 8
            },
            styles: { 
              fontSize: 8,
              cellPadding: 3,
              overflow: 'linebreak'
            },
            columnStyles: {
              0: { cellWidth: 30 },
              1: { cellWidth: 40 },
              2: { cellWidth: 25 },
              3: { cellWidth: 25 },
              4: { cellWidth: 22 },
              5: { cellWidth: 22 }
            },
            alternateRowStyles: {
              fillColor: [245, 247, 250]
            }
          });
          
          // Add footers to all pages
          const pageCount = doc.getNumberOfPages();
          for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            
            doc.text(
              `${language === 'fr' ? 'Page' : 'Page'} ${i} / ${pageCount}`,
              pageWidth - 20,
              pageHeight - 10,
              { align: 'right' }
            );
            
            if (!hidePdfBranding) {
              doc.text(
                'Generated with GestionFlow',
                20,
                pageHeight - 10,
                { align: 'left' }
              );
            }
          }
          
          return doc.output('blob');
        }}
      />
    </div>
  );
};

export default Reports;
