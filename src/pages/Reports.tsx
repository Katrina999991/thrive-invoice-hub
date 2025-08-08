
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { useReports } from "@/hooks/useReports";
import { useInvoices } from "@/hooks/useInvoices";
import { useCompanies } from "@/hooks/useCompanies";
import { useClients } from "@/hooks/useClients";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { DateRangePicker } from "@/components/DateRangePicker";
import { MonthYearPicker } from "@/components/MonthYearPicker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Download, FileSpreadsheet } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const Reports = () => {
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');
  const [activeTab, setActiveTab] = useState('custom');
  
  // États séparés pour chaque onglet
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const [selectedMonth, setSelectedMonth] = useState<Date | undefined>();
  const [selectedYear, setSelectedYear] = useState<Date | undefined>();
  
  // États pour les filtres
  const [filterType, setFilterType] = useState<'all' | 'company' | 'client'>('all');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  
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
  
  const revenueData = [
    { month: "Jan", revenue: 45000, expenses: 35000 },
    { month: "Feb", revenue: 52000, expenses: 38000 },
    { month: "Mar", revenue: 48000, expenses: 42000 },
    { month: "Apr", revenue: 61000, expenses: 45000 },
    { month: "May", revenue: 55000, expenses: 40000 },
    { month: "Jun", revenue: 67000, expenses: 48000 },
  ];

  // Format data for charts
  const formatRevenueDataForChart = () => {
    if (!realRevenueData) return [];
    
    const data = viewMode === 'monthly' ? realRevenueData.monthlyData : realRevenueData.yearlyData;
    
    return data.map(item => ({
      period: viewMode === 'monthly' 
        ? format(new Date(item.period + '-01'), 'MMM yyyy')
        : item.period,
      revenue: item.revenue,
      invoiceCount: item.invoiceCount
    }));
  };

  const chartData = formatRevenueDataForChart();

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

  const clientData = [
    { name: "ABC Corporation", value: 35, color: "#8884d8" },
    { name: "XYZ Industries", value: 25, color: "#82ca9d" },
    { name: "Tech Startup Inc", value: 20, color: "#ffc658" },
    { name: "Design Studio LLC", value: 15, color: "#ff7300" },
    { name: "Others", value: 5, color: "#00ff88" },
  ];

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
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$328,000</div>
                <p className="text-xs text-muted-foreground">+20.1% from last period</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$80,000</div>
                <p className="text-xs text-muted-foreground">+15.3% from last period</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">245</div>
                <p className="text-xs text-muted-foreground">+12 new this month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Invoice Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">94%</div>
                <p className="text-xs text-muted-foreground">Payment success rate</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue vs Expenses</CardTitle>
                <CardDescription>Monthly comparison</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="revenue" fill="#8884d8" name="Revenue" />
                    <Bar dataKey="expenses" fill="#82ca9d" name="Expenses" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Client Distribution</CardTitle>
                <CardDescription>Revenue by client</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={clientData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}%`}
                    >
                      {clientData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
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
                    <CardDescription>Select a specific year to view revenue data</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <MonthYearPicker
                      selectedDate={selectedYear}
                      onDateChange={(date) => {
                        setSelectedYear(date);
                        setViewMode('yearly');
                      }}
                      mode="year"
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

            {activeTab === 'year' && selectedYear && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedYear(undefined);
                  }}
                >
                  Clear Year
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

            <div className="grid gap-6">
              {/* Section: Tous les clients */}
              <Card>
                <CardHeader>
                  <CardTitle>Tous les clients</CardTitle>
                  <CardDescription>Liste complète de tous les clients</CardDescription>
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clients.map((client) => (
                        <TableRow key={client.id}>
                          <TableCell className="font-medium">{client.name}</TableCell>
                          <TableCell>{client.companies?.name || 'Aucune compagnie'}</TableCell>
                          <TableCell>{client.email || 'N/A'}</TableCell>
                          <TableCell>{client.phone || 'N/A'}</TableCell>
                          <TableCell>{client.contact_person || 'N/A'}</TableCell>
                        </TableRow>
                      ))}
                      {clients.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            Aucun client trouvé
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
                      const companyClients = clients.filter(client => client.company_id === company.id);
                      
                      return (
                        <div key={company.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-lg">{company.name}</h3>
                            <span className="text-sm text-muted-foreground">
                              {companyClients.length} client{companyClients.length > 1 ? 's' : ''}
                            </span>
                          </div>
                          
                          {companyClients.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Nom du client</TableHead>
                                  <TableHead>Email</TableHead>
                                  <TableHead>Téléphone</TableHead>
                                  <TableHead>Personne de contact</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {companyClients.map((client) => (
                                  <TableRow key={client.id}>
                                    <TableCell className="font-medium">{client.name}</TableCell>
                                    <TableCell>{client.email || 'N/A'}</TableCell>
                                    <TableCell>{client.phone || 'N/A'}</TableCell>
                                    <TableCell>{client.contact_person || 'N/A'}</TableCell>
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
                      const clientsWithoutCompany = clients.filter(client => !client.company_id);
                      
                      return clientsWithoutCompany.length > 0 && (
                        <div className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-lg">Clients sans compagnie assignée</h3>
                            <span className="text-sm text-muted-foreground">
                              {clientsWithoutCompany.length} client{clientsWithoutCompany.length > 1 ? 's' : ''}
                            </span>
                          </div>
                          
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Nom du client</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Téléphone</TableHead>
                                <TableHead>Personne de contact</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {clientsWithoutCompany.map((client) => (
                                <TableRow key={client.id}>
                                  <TableCell className="font-medium">{client.name}</TableCell>
                                  <TableCell>{client.email || 'N/A'}</TableCell>
                                  <TableCell>{client.phone || 'N/A'}</TableCell>
                                  <TableCell>{client.contact_person || 'N/A'}</TableCell>
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
