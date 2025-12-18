import { useLanguage } from '@/hooks/useLanguage';
import { useRevenueByClient, ClientRevenueData } from '@/hooks/useRevenueByClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, DollarSign, FileText, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface RevenueByClientReportProps {
  startDate?: Date;
  endDate?: Date;
  companyId?: string;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const translations = {
  en: {
    title: 'Revenue by Client',
    totalRevenue: 'Total Revenue',
    totalPaid: 'Total Paid',
    totalInvoices: 'Total Invoices',
    topClients: 'Top Clients',
    clientName: 'Client Name',
    invoiced: 'Invoiced',
    paid: 'Paid',
    invoices: 'Invoices',
    percentage: '% of Total',
    noData: 'No data available for the selected period',
    selectPeriod: 'Select a date range to view client revenue data',
    distribution: 'Revenue Distribution'
  },
  fr: {
    title: 'Revenus par client',
    totalRevenue: 'Revenus totaux',
    totalPaid: 'Total payé',
    totalInvoices: 'Total factures',
    topClients: 'Meilleurs clients',
    clientName: 'Nom du client',
    invoiced: 'Facturé',
    paid: 'Payé',
    invoices: 'Factures',
    percentage: '% du total',
    noData: 'Aucune donnée disponible pour la période sélectionnée',
    selectPeriod: 'Sélectionnez une plage de dates pour voir les revenus par client',
    distribution: 'Distribution des revenus'
  }
};

export const RevenueByClientReport = ({ startDate, endDate, companyId }: RevenueByClientReportProps) => {
  const { language } = useLanguage();
  const t = translations[language as keyof typeof translations] || translations.en;
  const { clientRevenueData, loading, error } = useRevenueByClient(startDate, endDate, companyId);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(language === 'fr' ? 'fr-CA' : 'en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!startDate && !endDate) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">{t.selectPeriod}</p>
        </CardContent>
      </Card>
    );
  }

  if (!clientRevenueData || clientRevenueData.clientData.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">{t.noData}</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = clientRevenueData.clientData.slice(0, 5).map((client, index) => ({
    name: client.clientName,
    value: client.totalInvoiced,
    color: COLORS[index % COLORS.length]
  }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t.totalRevenue}</p>
                <p className="text-2xl font-bold">{formatCurrency(clientRevenueData.totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t.totalPaid}</p>
                <p className="text-2xl font-bold">{formatCurrency(clientRevenueData.totalPaid)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <FileText className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t.totalInvoices}</p>
                <p className="text-2xl font-bold">{clientRevenueData.totalInvoices}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t.distribution}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t.topClients}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.clientName}</TableHead>
                <TableHead className="text-right">{t.invoiced}</TableHead>
                <TableHead className="text-right">{t.paid}</TableHead>
                <TableHead className="text-right">{t.invoices}</TableHead>
                <TableHead className="text-right">{t.percentage}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientRevenueData.clientData.map((client) => (
                <TableRow key={client.clientId}>
                  <TableCell className="font-medium">{client.clientName}</TableCell>
                  <TableCell className="text-right">{formatCurrency(client.totalInvoiced)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(client.totalPaid)}</TableCell>
                  <TableCell className="text-right">{client.invoiceCount}</TableCell>
                  <TableCell className="text-right">{client.percentageOfTotal.toFixed(1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
