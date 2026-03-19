import { useLanguage } from '@/hooks/useLanguage';
import { useRevenueByClient } from '@/hooks/useRevenueByClient';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, DollarSign, FileText, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface RevenueByClientReportProps {
  startDate?: Date;
  endDate?: Date;
  companyId?: string;
}

const COLORS = ['#3b82f6', '#22c55e', '#f97316', '#8b5cf6', '#ec4899'];

const translations = {
  en: {
    title: 'Revenue by Client',
    totalRevenue: 'Total Invoiced',
    totalRevenueHelp: 'Total amount from all invoices (paid + unpaid)',
    totalPaid: 'Total Paid',
    totalPaidHelp: 'Amount actually received from clients',
    totalInvoices: 'Total Invoices',
    topClients: 'Top Clients',
    clientName: 'Client Name',
    invoiced: 'Invoiced',
    paid: 'Paid',
    invoices: 'Invoices',
    percentage: '% of Total',
    noData: 'No data available for the selected period',
    selectPeriod: 'Select a date range to view client revenue data',
    distribution: 'Revenue Distribution',
    distributionDesc: 'Top 5 clients by invoiced amount'
  },
  fr: {
    title: 'Revenus par client',
    totalRevenue: 'Total facturé',
    totalRevenueHelp: 'Montant total de toutes les factures (payées + impayées)',
    totalPaid: 'Total encaissé',
    totalPaidHelp: 'Montant réellement reçu des clients',
    totalInvoices: 'Total factures',
    topClients: 'Meilleurs clients',
    clientName: 'Nom du client',
    invoiced: 'Facturé',
    paid: 'Payé',
    invoices: 'Factures',
    percentage: '% du total',
    noData: 'Aucune donnée disponible pour la période sélectionnée',
    selectPeriod: 'Sélectionnez une plage de dates pour voir les revenus par client',
    distribution: 'Distribution des revenus',
    distributionDesc: 'Top 5 clients par montant facturé'
  }
};

export const RevenueByClientReport = ({ startDate, endDate, companyId }: RevenueByClientReportProps) => {
  const { language } = useLanguage();
  const isMobile = useIsMobile();
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
    <div className="space-y-6 max-w-full overflow-x-hidden">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 min-w-0">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{t.totalRevenue}</p>
                <p className="text-2xl font-bold break-words">{formatCurrency(clientRevenueData.totalRevenue)}</p>
                <p className="text-xs text-muted-foreground mt-1">{t.totalRevenueHelp}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 min-w-0">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{t.totalPaid}</p>
                <p className="text-2xl font-bold break-words">{formatCurrency(clientRevenueData.totalPaid)}</p>
                <p className="text-xs text-muted-foreground mt-1">{t.totalPaidHelp}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 min-w-0">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{t.totalInvoices}</p>
                <p className="text-2xl font-bold">{clientRevenueData.totalInvoices}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t.distribution}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{t.distributionDesc}</p>
          </CardHeader>
          <CardContent>
            <div className="h-[320px] w-full max-w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy={isMobile ? "40%" : "44%"}
                    labelLine={false}
                    outerRadius={isMobile ? 72 : 100}
                    fill="hsl(var(--primary))"
                    dataKey="value"
                    label={isMobile ? ({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%` : ({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: 16 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

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
