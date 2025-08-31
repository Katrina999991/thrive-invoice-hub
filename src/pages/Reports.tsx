import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useReports } from "@/hooks/useReports";
import { useTaxReports } from "@/hooks/useTaxReports";
import { useProductProfit } from "@/hooks/useProductProfit";
import { useExpenseReports } from "@/hooks/useExpenseReports";
import { useInvoices } from "@/hooks/useInvoices";
import { useCompanies } from "@/hooks/useCompanies";
import { useClients } from "@/hooks/useClients";
import { useDashboard } from "@/hooks/useDashboard";
import { useProducts } from "@/hooks/useProducts";
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
import { Download, FileSpreadsheet, CalendarIcon, Package, CheckCircle, AlertTriangle, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";

const Reports = () => {
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');
  const [activeTab, setActiveTab] = useState('overview');
  
  // États séparés pour chaque onglet
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const [selectedMonth, setSelectedMonth] = useState<Date | undefined>();
  const [selectedYear, setSelectedYear] = useState<Date | undefined>();
  
  // États pour la plage d'années dans la vue annuelle
  const [yearRangeStart, setYearRangeStart] = useState<Date | undefined>();
  const [yearRangeEnd, setYearRangeEnd] = useState<Date | undefined>();
  
  // États pour les filtres de revenus
  const [filterType, setFilterType] = useState<'all' | 'company' | 'client'>('all');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  
  // États pour les produits
  const [productFilterType, setProductFilterType] = useState<'all' | 'company'>('all');
  const [productSelectedCompanyId, setProductSelectedCompanyId] = useState<string>('');
  
  // États pour la plage de dates des clients
  const [createdFromDate, setCreatedFromDate] = useState<Date | undefined>();
  const [createdToDate, setCreatedToDate] = useState<Date | undefined>();

  const { invoices } = useInvoices();
  const { companies } = useCompanies();
  const { clients } = useClients();
  const { data: dashboardData } = useDashboard();
  const { products: allProducts } = useProducts();
  const { profitData, loading: profitLoading } = useProductProfit(customStartDate, customEndDate);

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
          <TabsTrigger value="profits">Profits</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="taxes">Taxes</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$45,231.89</div>
                <p className="text-xs text-muted-foreground">
                  +20.1% from last month
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Revenue reports coming soon...</p>
          </div>
        </TabsContent>

        <TabsContent value="profits" className="space-y-4">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Profit reports coming soon...</p>
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Inventory reports coming soon...</p>
          </div>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Expense reports coming soon...</p>
          </div>
        </TabsContent>

        <TabsContent value="clients" className="space-y-4">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Client reports coming soon...</p>
          </div>
        </TabsContent>

        <TabsContent value="taxes" className="space-y-4">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Tax reports coming soon...</p>
          </div>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Invoice reports coming soon...</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;