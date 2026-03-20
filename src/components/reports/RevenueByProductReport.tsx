import { useLanguage } from '@/hooks/useLanguage';
import { useRevenueByProduct } from '@/hooks/useRevenueByProduct';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, DollarSign, Hash, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts';

interface RevenueByProductReportProps {
  startDate?: Date;
  endDate?: Date;
  companyId?: string;
}

const COLORS = ['#3b82f6', '#22c55e', '#f97316', '#8b5cf6', '#ec4899'];

const translations = {
  en: {
    title: 'Revenue by Product/Service',
    totalRevenue: 'Total Revenue',
    totalRevenueHelp: 'Total amount from all invoices containing products/services',
    totalQuantity: 'Total Quantity Sold',
    uniqueProducts: 'Unique Products',
    topProducts: 'Top Products/Services',
    productName: 'Product/Service',
    quantity: 'Qty Sold',
    revenue: 'Revenue',
    avgRevenue: 'Avg/Sale',
    percentage: '% of Total',
    noData: 'No data available for the selected period',
    selectPeriod: 'Select a date range to view product revenue data',
    distribution: 'Revenue by Product',
    distributionDesc: 'Top 10 products/services by revenue'
  },
  fr: {
    title: 'Revenus par produit/service',
    totalRevenue: 'Revenus totaux',
    totalRevenueHelp: 'Montant total des factures contenant des produits/services',
    totalQuantity: 'Quantité totale vendue',
    uniqueProducts: 'Produits uniques',
    topProducts: 'Meilleurs produits/services',
    productName: 'Produit/Service',
    quantity: 'Qté vendue',
    revenue: 'Revenus',
    avgRevenue: 'Moy/Vente',
    percentage: '% du total',
    noData: 'Aucune donnée disponible pour la période sélectionnée',
    selectPeriod: 'Sélectionnez une plage de dates pour voir les revenus par produit',
    distribution: 'Revenus par produit',
    distributionDesc: 'Top 10 produits/services par revenu'
  }
};

export const RevenueByProductReport = ({ startDate, endDate, companyId }: RevenueByProductReportProps) => {
  const { language } = useLanguage();
  const isMobile = useIsMobile();
  const t = translations[language as keyof typeof translations] || translations.en;
  const { productRevenueData, loading, error } = useRevenueByProduct(startDate, endDate, companyId);

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

  if (!productRevenueData || productRevenueData.productData.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">{t.noData}</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = productRevenueData.productData.slice(0, 10).map((product, index) => ({
    name: product.productName.length > 20 ? product.productName.slice(0, 20) + '...' : product.productName,
    fullName: product.productName,
    value: product.totalRevenue,
    color: COLORS[index % COLORS.length]
  }));

  return (
    <div className="space-y-6 max-w-full min-w-0">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 min-w-0">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{t.totalRevenue}</p>
                <p className="text-2xl font-bold break-words">{formatCurrency(productRevenueData.totalRevenue)}</p>
                <p className="text-xs text-muted-foreground mt-1">{t.totalRevenueHelp}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 min-w-0">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <Hash className="h-6 w-6 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{t.totalQuantity}</p>
                <p className="text-2xl font-bold">{productRevenueData.totalQuantity.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 min-w-0">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{t.uniqueProducts}</p>
                <p className="text-2xl font-bold">{productRevenueData.uniqueProducts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {t.distribution}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{t.distributionDesc}</p>
          </CardHeader>
          <CardContent>
            <div className="w-full overflow-x-auto">
              <div className="h-[360px] w-full min-w-[640px] md:min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 8, top: 16, bottom: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                    <YAxis type="category" dataKey="name" width={isMobile ? 88 : 150} tick={{ fontSize: isMobile ? 11 : 12 }} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t.topProducts}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.productName}</TableHead>
                <TableHead className="text-right">{t.quantity}</TableHead>
                <TableHead className="text-right">{t.revenue}</TableHead>
                <TableHead className="text-right">{t.avgRevenue}</TableHead>
                <TableHead className="text-right">{t.percentage}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productRevenueData.productData.map((product, index) => (
                <TableRow key={product.productId || `custom-${index}`}>
                  <TableCell className="font-medium">{product.productName}</TableCell>
                  <TableCell className="text-right">{product.quantitySold}</TableCell>
                  <TableCell className="text-right">{formatCurrency(product.totalRevenue)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(product.averageRevenuePerSale)}</TableCell>
                  <TableCell className="text-right">{product.percentageOfTotal.toFixed(1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
