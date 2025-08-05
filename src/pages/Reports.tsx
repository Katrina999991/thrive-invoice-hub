
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { useReports } from "@/hooks/useReports";
import { useState } from "react";
import { format } from "date-fns";
import { DateRangePicker } from "@/components/DateRangePicker";
import { MonthYearPicker } from "@/components/MonthYearPicker";

const Reports = () => {
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [selectedPeriod, setSelectedPeriod] = useState<Date | undefined>();
  
  const { revenueData: realRevenueData, loading, error } = useReports(startDate, endDate);
  
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

            <Tabs defaultValue="custom" className="w-full">
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
                  <CardContent>
                    <DateRangePicker
                      startDate={startDate}
                      endDate={endDate}
                      onStartDateChange={setStartDate}
                      onEndDateChange={setEndDate}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="month" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Revenue</CardTitle>
                    <CardDescription>Select a specific month to view revenue data</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <MonthYearPicker
                      selectedDate={selectedPeriod}
                      onDateChange={(date) => {
                        setSelectedPeriod(date);
                        setViewMode('monthly');
                        if (date) {
                          const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
                          const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
                          setStartDate(startOfMonth);
                          setEndDate(endOfMonth);
                        } else {
                          // Effacer les dates quand on efface la sélection
                          setStartDate(undefined);
                          setEndDate(undefined);
                        }
                      }}
                      mode="month"
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="year" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Yearly Revenue</CardTitle>
                    <CardDescription>Select a specific year to view revenue data</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <MonthYearPicker
                      selectedDate={selectedPeriod}
                      onDateChange={(date) => {
                        setSelectedPeriod(date);
                        setViewMode('yearly');
                        if (date) {
                          const startOfYear = new Date(date.getFullYear(), 0, 1);
                          const endOfYear = new Date(date.getFullYear(), 11, 31);
                          setStartDate(startOfYear);
                          setEndDate(endOfYear);
                        } else {
                          // Effacer les dates quand on efface la sélection
                          setStartDate(undefined);
                          setEndDate(undefined);
                        }
                      }}
                      mode="year"
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {(startDate || endDate || selectedPeriod) && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStartDate(undefined);
                    setEndDate(undefined);
                    setSelectedPeriod(undefined);
                  }}
                >
                  Reset All Filters
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

          {!loading && !error && realRevenueData && (
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

              {/* Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Evolution</CardTitle>
                  <CardDescription>
                    Revenue by {viewMode === 'monthly' ? 'month' : 'year'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="period" 
                        angle={viewMode === 'monthly' ? -45 : 0}
                        textAnchor={viewMode === 'monthly' ? 'end' : 'middle'}
                        height={viewMode === 'monthly' ? 80 : 60}
                      />
                      <YAxis 
                        tickFormatter={(value) => 
                          new Intl.NumberFormat('en-US', {
                            notation: 'compact'
                          }).format(value)
                        }
                      />
                      <Tooltip 
                        formatter={(value: number, name: string) => [
                          name === 'revenue' 
                            ? new Intl.NumberFormat('en-US').format(value)
                            : value,
                          name === 'revenue' ? 'Revenue' : 'Invoices'
                        ]}
                        labelFormatter={(label) => `Period: ${label}`}
                      />
                      <Bar 
                        dataKey="revenue" 
                        fill="hsl(var(--primary))" 
                        name="revenue"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Line Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Trend</CardTitle>
                  <CardDescription>
                    Revenue evolution over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="period"
                        angle={viewMode === 'monthly' ? -45 : 0}
                        textAnchor={viewMode === 'monthly' ? 'end' : 'middle'}
                        height={viewMode === 'monthly' ? 80 : 60}
                      />
                      <YAxis 
                        tickFormatter={(value) => 
                          new Intl.NumberFormat('en-US', {
                            notation: 'compact'
                          }).format(value)
                        }
                      />
                      <Tooltip 
                        formatter={(value: number) => [
                          new Intl.NumberFormat('en-US').format(value),
                          'Revenue'
                        ]}
                        labelFormatter={(label) => `Period: ${label}`}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={3}
                        dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 6 }}
                        activeDot={{ r: 8, stroke: "hsl(var(--primary))", strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

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
