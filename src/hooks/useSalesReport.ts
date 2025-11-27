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
  uniqueServicesSold: number;
  products: SalesReportData[];
  services: SalesReportData[];
}

export const useSalesReport = (startDate?: Date, endDate?: Date, companyId?: string) => {
  const [salesData, setSalesData] = useState<SalesReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchSalesData = async () => {
    if (!user) return;

    console.log('SalesReport - fetchSalesData called', { 
      startDate: startDate ? startDate.toISOString() : 'undefined', 
      endDate: endDate ? endDate.toISOString() : 'undefined',
      user: user.id 
    });

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
            name,
            company_id
          )
        `)
        .eq('invoices.user_id', user.id)
        .eq('invoices.status', 'paid');

      // Add company filter if specified
      if (companyId) {
        query = query.eq('products.company_id', companyId);
      }

      // Add date filters if specified
      if (startDate) {
        query = query.gte('invoices.issue_date', startDate.toISOString().split('T')[0]);
      }
      if (endDate) {
        query = query.lte('invoices.issue_date', endDate.toISOString().split('T')[0]);
      }

      const { data: invoiceItems, error: invoiceItemsError } = await query;

      console.log('SalesReport - Query result:', { 
        invoiceItems: invoiceItems?.length || 0, 
        error: invoiceItemsError,
        sampleItem: invoiceItems?.[0] 
      });

      if (invoiceItemsError) throw invoiceItemsError;

      if (!invoiceItems || invoiceItems.length === 0) {
        setSalesData({
          totalRevenue: 0,
          totalQuantitySold: 0,
          totalNumberOfSales: 0,
          uniqueProductsSold: 0,
          uniqueServicesSold: 0,
          products: [],
          services: []
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
        is_service: boolean;
      }>();

      // Get all products to determine if they are services
      const { data: allProducts } = await supabase
        .from('products')
        .select('id, name, category, unit')
        .eq('user_id', user.id);

      // Create a map for quick lookup of product type
      const productTypeMap = new Map<string, boolean>();
      allProducts?.forEach(product => {
        // Determine if it's a service based on category and unit
        const isService = 
          product.category?.toLowerCase().includes('design') ||
          product.category?.toLowerCase().includes('service') ||
          product.category?.toLowerCase().includes('consultation') ||
          product.category?.toLowerCase().includes('formation') ||
          product.unit?.toLowerCase().includes('heure') ||
          product.unit?.toLowerCase().includes('hour') ||
          product.unit?.toLowerCase().includes('session');
        
        productTypeMap.set(product.id, isService);
      });

      invoiceItems.forEach(item => {
        const productId = item.product_id;
        const productName = (item.products as any)?.name || 'Unknown Product';
        const quantity = Number(item.quantity) || 0;
        const revenue = Number(item.total) || 0;
        const saleDate = (item.invoices as any)?.issue_date;
        const isService = productTypeMap.get(productId) || false;

        if (productSalesMap.has(productId)) {
          const existing = productSalesMap.get(productId)!;
          productSalesMap.set(productId, {
            product_name: existing.product_name,
            total_quantity_sold: existing.total_quantity_sold + quantity,
            total_revenue: existing.total_revenue + revenue,
            number_of_sales: existing.number_of_sales + 1,
            sale_dates: [...existing.sale_dates, saleDate],
            is_service: isService
          });
        } else {
          productSalesMap.set(productId, {
            product_name: productName,
            total_quantity_sold: quantity,
            total_revenue: revenue,
            number_of_sales: 1,
            sale_dates: [saleDate],
            is_service: isService
          });
        }
      });

      // Convert to final format and separate products from services
      const allItems: (SalesReportData & { is_service: boolean })[] = Array.from(productSalesMap.entries()).map(([productId, data]) => {
        const sortedDates = data.sale_dates.sort();
        return {
          product_id: productId,
          product_name: data.product_name,
          total_quantity_sold: data.total_quantity_sold,
          total_revenue: data.total_revenue,
          number_of_sales: data.number_of_sales,
          average_sale_price: data.total_revenue / data.total_quantity_sold,
          first_sale_date: sortedDates[0],
          last_sale_date: sortedDates[sortedDates.length - 1],
          is_service: data.is_service
        };
      });

      // Separate products and services
      const products = allItems.filter(item => !item.is_service).sort((a, b) => b.total_revenue - a.total_revenue);
      const services = allItems.filter(item => item.is_service).sort((a, b) => b.total_revenue - a.total_revenue);

      // Calculate summary
      const totalRevenue = allItems.reduce((sum, item) => sum + item.total_revenue, 0);
      const totalQuantitySold = allItems.reduce((sum, item) => sum + item.total_quantity_sold, 0);
      const totalNumberOfSales = allItems.reduce((sum, item) => sum + item.number_of_sales, 0);

      console.log('SalesReport - Final sales data:', {
        totalRevenue,
        totalQuantitySold,
        totalNumberOfSales,
        uniqueProductsSold: products.length,
        uniqueServicesSold: services.length,
        productsCount: products.length,
        servicesCount: services.length
      });

      setSalesData({
        totalRevenue,
        totalQuantitySold,
        totalNumberOfSales,
        uniqueProductsSold: products.length,
        uniqueServicesSold: services.length,
        products: products,
        services: services
      });

    } catch (err) {
      console.error('SalesReport - Error fetching sales data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesData();
  }, [user, startDate, endDate, companyId]);

  return {
    salesData,
    loading,
    error,
    refetch: fetchSalesData
  };
};