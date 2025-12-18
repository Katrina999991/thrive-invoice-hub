import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from './useAuth';

export interface ProductRevenueData {
  productId: string | null;
  productName: string;
  quantitySold: number;
  totalRevenue: number;
  averageRevenuePerSale: number;
  percentageOfTotal: number;
}

export interface ProductRevenueSummary {
  totalRevenue: number;
  totalQuantity: number;
  uniqueProducts: number;
  productData: ProductRevenueData[];
}

export const useRevenueByProduct = (startDate?: Date, endDate?: Date, companyId?: string) => {
  const [productRevenueData, setProductRevenueData] = useState<ProductRevenueSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchProductRevenueData = async () => {
    if (!user) return;

    if (!startDate && !endDate) {
      setProductRevenueData({
        totalRevenue: 0,
        totalQuantity: 0,
        uniqueProducts: 0,
        productData: []
      });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // First get paid invoices within date range
      let invoiceQuery = supabase
        .from('invoices')
        .select(`
          id,
          issue_date,
          status,
          client_id,
          clients (
            company_id
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'paid');

      if (startDate) {
        invoiceQuery = invoiceQuery.gte('issue_date', startDate.toISOString().split('T')[0]);
      }
      if (endDate) {
        invoiceQuery = invoiceQuery.lte('issue_date', endDate.toISOString().split('T')[0]);
      }

      const { data: invoices, error: invoicesError } = await invoiceQuery;

      if (invoicesError) throw invoicesError;

      if (!invoices || invoices.length === 0) {
        setProductRevenueData({
          totalRevenue: 0,
          totalQuantity: 0,
          uniqueProducts: 0,
          productData: []
        });
        return;
      }

      // Filter by company if specified
      const filteredInvoices = companyId 
        ? invoices.filter(inv => {
            const client = inv.clients as { company_id: string | null } | null;
            return client?.company_id === companyId;
          })
        : invoices;

      if (filteredInvoices.length === 0) {
        setProductRevenueData({
          totalRevenue: 0,
          totalQuantity: 0,
          uniqueProducts: 0,
          productData: []
        });
        return;
      }

      const invoiceIds = filteredInvoices.map(inv => inv.id);

      // Get invoice items for these invoices
      const { data: invoiceItems, error: itemsError } = await supabase
        .from('invoice_items')
        .select(`
          id,
          description,
          quantity,
          unit_price,
          total,
          product_id,
          products (
            id,
            name
          )
        `)
        .in('invoice_id', invoiceIds);

      if (itemsError) throw itemsError;

      if (!invoiceItems || invoiceItems.length === 0) {
        setProductRevenueData({
          totalRevenue: 0,
          totalQuantity: 0,
          uniqueProducts: 0,
          productData: []
        });
        return;
      }

      // Group by product
      const productMap = new Map<string, {
        productName: string;
        quantitySold: number;
        totalRevenue: number;
        salesCount: number;
      }>();

      let grandTotal = 0;
      let grandQuantity = 0;

      invoiceItems.forEach(item => {
        const product = item.products as { id: string; name: string } | null;
        const productId = item.product_id || 'custom-' + item.description;
        const productName = product?.name || item.description;
        const quantity = Number(item.quantity);
        const total = Number(item.total);

        grandTotal += total;
        grandQuantity += quantity;

        if (productMap.has(productId)) {
          const existing = productMap.get(productId)!;
          productMap.set(productId, {
            productName,
            quantitySold: existing.quantitySold + quantity,
            totalRevenue: existing.totalRevenue + total,
            salesCount: existing.salesCount + 1
          });
        } else {
          productMap.set(productId, {
            productName,
            quantitySold: quantity,
            totalRevenue: total,
            salesCount: 1
          });
        }
      });

      // Convert to array with calculated fields
      const productData: ProductRevenueData[] = Array.from(productMap.entries())
        .map(([productId, data]) => ({
          productId: productId.startsWith('custom-') ? null : productId,
          productName: data.productName,
          quantitySold: data.quantitySold,
          totalRevenue: data.totalRevenue,
          averageRevenuePerSale: data.salesCount > 0 ? data.totalRevenue / data.salesCount : 0,
          percentageOfTotal: grandTotal > 0 ? (data.totalRevenue / grandTotal) * 100 : 0
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue);

      setProductRevenueData({
        totalRevenue: grandTotal,
        totalQuantity: grandQuantity,
        uniqueProducts: productMap.size,
        productData
      });
    } catch (err) {
      console.error('Error fetching product revenue data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductRevenueData();
  }, [user, startDate, endDate, companyId]);

  return {
    productRevenueData,
    loading,
    error,
    refetch: fetchProductRevenueData
  };
};
