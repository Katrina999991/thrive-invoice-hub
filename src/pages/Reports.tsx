
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
  
  const { revenueData: realRevenueData, loading, error } = useReports(startDate, endDate);
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
          <Card>
            <CardHeader>
              <CardTitle>Client Revenue Distribution</CardTitle>
              <CardDescription>Revenue breakdown by client</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={clientData}
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
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
