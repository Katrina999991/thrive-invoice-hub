
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { useReports } from "@/hooks/useReports";
import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const Reports = () => {
  const { revenueData: realRevenueData, loading, error } = useReports();
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');
  
  const revenueData = [
    { month: "Jan", revenue: 45000, expenses: 35000 },
    { month: "Feb", revenue: 52000, expenses: 38000 },
    { month: "Mar", revenue: 48000, expenses: 42000 },
    { month: "Apr", revenue: 61000, expenses: 45000 },
    { month: "May", revenue: 55000, expenses: 40000 },
    { month: "Jun", revenue: 67000, expenses: 48000 },
  ];

  // Formater les données pour les graphiques
  const formatRevenueDataForChart = () => {
    if (!realRevenueData) return [];
    
    const data = viewMode === 'monthly' ? realRevenueData.monthlyData : realRevenueData.yearlyData;
    
    return data.map(item => ({
      period: viewMode === 'monthly' 
        ? format(new Date(item.period + '-01'), 'MMM yyyy', { locale: fr })
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
          {/* Contrôles de vue */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Revenus par période</h2>
              <p className="text-muted-foreground">Analyse des revenus par mois ou par année</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'monthly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('monthly')}
              >
                Par mois
              </Button>
              <Button
                variant={viewMode === 'yearly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('yearly')}
              >
                Par année
              </Button>
            </div>
          </div>

          {loading && (
            <Card>
              <CardContent className="flex justify-center items-center h-96">
                <p>Chargement des données...</p>
              </CardContent>
            </Card>
          )}

          {error && (
            <Card>
              <CardContent className="flex justify-center items-center h-96">
                <p className="text-destructive">Erreur: {error}</p>
              </CardContent>
            </Card>
          )}

          {!loading && !error && realRevenueData && (
            <>
              {/* Cartes de statistiques */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Revenu total</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: 'EUR'
                      }).format(realRevenueData.totalRevenue)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Factures payées uniquement
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Nombre de {viewMode === 'monthly' ? 'mois' : 'années'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {viewMode === 'monthly' ? realRevenueData.monthlyData.length : realRevenueData.yearlyData.length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Avec des revenus
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Revenu moyen</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: 'EUR'
                      }).format(
                        realRevenueData.totalRevenue / 
                        Math.max(1, viewMode === 'monthly' ? realRevenueData.monthlyData.length : realRevenueData.yearlyData.length)
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Par {viewMode === 'monthly' ? 'mois' : 'année'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Graphique en barres */}
              <Card>
                <CardHeader>
                  <CardTitle>Évolution des revenus</CardTitle>
                  <CardDescription>
                    Revenus par {viewMode === 'monthly' ? 'mois' : 'année'}
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
                          new Intl.NumberFormat('fr-FR', {
                            style: 'currency',
                            currency: 'EUR',
                            notation: 'compact'
                          }).format(value)
                        }
                      />
                      <Tooltip 
                        formatter={(value: number, name: string) => [
                          name === 'revenue' 
                            ? new Intl.NumberFormat('fr-FR', {
                                style: 'currency',
                                currency: 'EUR'
                              }).format(value)
                            : value,
                          name === 'revenue' ? 'Revenus' : 'Factures'
                        ]}
                        labelFormatter={(label) => `Période: ${label}`}
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

              {/* Graphique en ligne */}
              <Card>
                <CardHeader>
                  <CardTitle>Tendance des revenus</CardTitle>
                  <CardDescription>
                    Évolution temporelle des revenus
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
                          new Intl.NumberFormat('fr-FR', {
                            style: 'currency',
                            currency: 'EUR',
                            notation: 'compact'
                          }).format(value)
                        }
                      />
                      <Tooltip 
                        formatter={(value: number) => [
                          new Intl.NumberFormat('fr-FR', {
                            style: 'currency',
                            currency: 'EUR'
                          }).format(value),
                          'Revenus'
                        ]}
                        labelFormatter={(label) => `Période: ${label}`}
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

              {/* Tableau détaillé */}
              {chartData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Détails par période</CardTitle>
                    <CardDescription>
                      Données détaillées par {viewMode === 'monthly' ? 'mois' : 'année'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">Période</th>
                            <th className="text-right py-2">Revenus</th>
                            <th className="text-right py-2">Nombre de factures</th>
                            <th className="text-right py-2">Revenu moyen par facture</th>
                          </tr>
                        </thead>
                        <tbody>
                          {chartData.map((item, index) => (
                            <tr key={index} className="border-b">
                              <td className="py-2">{item.period}</td>
                              <td className="text-right py-2 font-medium">
                                {new Intl.NumberFormat('fr-FR', {
                                  style: 'currency',
                                  currency: 'EUR'
                                }).format(item.revenue)}
                              </td>
                              <td className="text-right py-2">{item.invoiceCount}</td>
                              <td className="text-right py-2">
                                {new Intl.NumberFormat('fr-FR', {
                                  style: 'currency',
                                  currency: 'EUR'
                                }).format(item.revenue / item.invoiceCount)}
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
                      <p className="text-lg font-medium">Aucune donnée de revenus</p>
                      <p className="text-muted-foreground">
                        Créez et payez quelques factures pour voir les données apparaître ici.
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
