import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from './useAuth';

export interface SalesReportData {
  product_id: string;
  product_name: string;
  total_quantity_sold: number;
  total_revenue: number;
  number_of_sales: number;
  average_sale_price: number;
  first_sale_date: string;
  last_sale_date: string;
}

export interface SalesReportSummary {
  totalRevenue: number;
  totalQuantitySold: number;
  totalNumberOfSales: number;
  uniqueProductsSold: number;
  products: SalesReportData[];
}

export const useSalesReport = (startDate?: Date, endDate?: Date) => {
  const [salesData, setSalesData] = useState<SalesReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchSalesData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Build the query for paid invoices with date filters
      let query = supabase
        .from('invoice_items')
        .select(`
          product_id,
          quantity,
          unit_price,
          total,
          invoices!inner (
            status,
            user_id,
            issue_date
          ),
          products!inner (
            name
          )
        `)
        .eq('invoices.user_id', user.id)
        .eq('invoices.status', 'paid');

      // Add date filters if specified
      if (startDate) {
        query = query.gte('invoices.issue_date', startDate.toISOString().split('T')[0]);
      }
      if (endDate) {
        query = query.lte('invoices.issue_date', endDate.toISOString().split('T')[0]);
      }

      const { data: invoiceItems, error: invoiceItemsError } = await query;

      if (invoiceItemsError) throw invoiceItemsError;

      if (!invoiceItems || invoiceItems.length === 0) {
        setSalesData({
          totalRevenue: 0,
          totalQuantitySold: 0,
          totalNumberOfSales: 0,
          uniqueProductsSold: 0,
          products: []
        });
        return;
      }

      // Group sales data by product
      const productSalesMap = new Map<string, {
        product_name: string;
        total_quantity_sold: number;
        total_revenue: number;
        number_of_sales: number;
        sale_dates: string[];
      }>();

      invoiceItems.forEach(item => {
        const productId = item.product_id;
        const productName = (item.products as any)?.name || 'Unknown Product';
        const quantity = Number(item.quantity) || 0;
        const revenue = Number(item.total) || 0;
        const saleDate = (item.invoices as any)?.issue_date;

        if (productSalesMap.has(productId)) {
          const existing = productSalesMap.get(productId)!;
          productSalesMap.set(productId, {
            product_name: existing.product_name,
            total_quantity_sold: existing.total_quantity_sold + quantity,
            total_revenue: existing.total_revenue + revenue,
            number_of_sales: existing.number_of_sales + 1,
            sale_dates: [...existing.sale_dates, saleDate]
          });
        } else {
          productSalesMap.set(productId, {
            product_name: productName,
            total_quantity_sold: quantity,
            total_revenue: revenue,
            number_of_sales: 1,
            sale_dates: [saleDate]
          });
        }
      });

      // Convert to final format
      const products: SalesReportData[] = Array.from(productSalesMap.entries()).map(([productId, data]) => {
        const sortedDates = data.sale_dates.sort();
        return {
          product_id: productId,
          product_name: data.product_name,
          total_quantity_sold: data.total_quantity_sold,
          total_revenue: data.total_revenue,
          number_of_sales: data.number_of_sales,
          average_sale_price: data.total_revenue / data.total_quantity_sold,
          first_sale_date: sortedDates[0],
          last_sale_date: sortedDates[sortedDates.length - 1]
        };
      });

      // Calculate summary
      const totalRevenue = products.reduce((sum, product) => sum + product.total_revenue, 0);
      const totalQuantitySold = products.reduce((sum, product) => sum + product.total_quantity_sold, 0);
      const totalNumberOfSales = products.reduce((sum, product) => sum + product.number_of_sales, 0);

      setSalesData({
        totalRevenue,
        totalQuantitySold,
        totalNumberOfSales,
        uniqueProductsSold: products.length,
        products: products.sort((a, b) => b.total_revenue - a.total_revenue)
      });

    } catch (err) {
      console.error('Error fetching sales data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesData();
  }, [user, startDate, endDate]);

  return {
    salesData,
    loading,
    error,
    refetch: fetchSalesData
  };
};