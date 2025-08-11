import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from './useAuth';

export interface ProductProfitData {
  product_id: string;
  product_name: string;
  total_quantity_sold: number;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
  profit_margin: number;
  average_sale_price: number;
  average_cost_price: number;
}

export interface ProductProfitSummary {
  totalProfit: number;
  totalRevenue: number;
  totalCost: number;
  overallMargin: number;
  products: ProductProfitData[];
}

export const useProductProfit = (startDate?: Date, endDate?: Date) => {
  const [profitData, setProfitData] = useState<ProductProfitSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchProductProfitData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      
      console.log('ProductProfit - fetchProductProfitData called', {
        startDate,
        endDate,
        user: user?.id
      });

      // Query pour récupérer les données des produits vendus
      let query = supabase
        .from('invoice_items')
        .select(`
          product_id,
          quantity,
          unit_price,
          total,
          products!inner (
            name,
            cost
          ),
          invoices!inner (
            status,
            issue_date,
            user_id
          )
        `)
        .eq('invoices.user_id', user.id)
        .eq('invoices.status', 'paid')
        .not('product_id', 'is', null);

      // Ajouter filtres de date si spécifiés
      if (startDate) {
        query = query.gte('invoices.issue_date', startDate.toISOString().split('T')[0]);
      }
      if (endDate) {
        query = query.lte('invoices.issue_date', endDate.toISOString().split('T')[0]);
      }

      const { data: invoiceItems, error: itemsError } = await query;
      
      console.log('ProductProfit - Query result:', {
        invoiceItems: invoiceItems?.length || 0,
        error: itemsError,
        sampleItem: invoiceItems?.[0]
      });

      if (itemsError) throw itemsError;

      if (!invoiceItems || invoiceItems.length === 0) {
        console.log('ProductProfit - No invoice items found');
        setProfitData({
          totalProfit: 0,
          totalRevenue: 0,
          totalCost: 0,
          overallMargin: 0,
          products: []
        });
        return;
      }

      // Grouper par produit et calculer les métriques
      const productMap = new Map<string, {
        name: string;
        totalQuantity: number;
        totalRevenue: number;
        totalCost: number;
        costPrice: number;
      }>();

      invoiceItems.forEach(item => {
        if (!item.product_id || !item.products) return;

        const productId = item.product_id;
        const productName = (item.products as any).name;
        const costPrice = Number((item.products as any).cost) || 0;
        const quantity = Number(item.quantity);
        const revenue = Number(item.total);
        const cost = costPrice * quantity;

        if (productMap.has(productId)) {
          const existing = productMap.get(productId)!;
          productMap.set(productId, {
            name: existing.name,
            totalQuantity: existing.totalQuantity + quantity,
            totalRevenue: existing.totalRevenue + revenue,
            totalCost: existing.totalCost + cost,
            costPrice: costPrice
          });
        } else {
          productMap.set(productId, {
            name: productName,
            totalQuantity: quantity,
            totalRevenue: revenue,
            totalCost: cost,
            costPrice: costPrice
          });
        }
      });

      // Convertir en tableau et calculer les métriques
      const products: ProductProfitData[] = Array.from(productMap.entries())
        .map(([productId, data]) => {
          const profit = data.totalRevenue - data.totalCost;
          const profitMargin = data.totalRevenue > 0 ? (profit / data.totalRevenue) * 100 : 0;
          const avgSalePrice = data.totalQuantity > 0 ? data.totalRevenue / data.totalQuantity : 0;

          console.log('ProductProfit - Product calculation:', {
            productId,
            name: data.name,
            totalRevenue: data.totalRevenue,
            totalCost: data.totalCost,
            profit,
            costPrice: data.costPrice
          });

          return {
            product_id: productId,
            product_name: data.name,
            total_quantity_sold: data.totalQuantity,
            total_revenue: data.totalRevenue,
            total_cost: data.totalCost,
            total_profit: profit,
            profit_margin: profitMargin,
            average_sale_price: avgSalePrice,
            average_cost_price: data.costPrice
          };
        })
        .sort((a, b) => b.total_profit - a.total_profit);

      console.log('ProductProfit - Final products array:', products);

      // Calculer les totaux
      const totalRevenue = products.reduce((sum, p) => sum + p.total_revenue, 0);
      const totalCost = products.reduce((sum, p) => sum + p.total_cost, 0);
      const totalProfit = totalRevenue - totalCost;
      const overallMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

      setProfitData({
        totalProfit,
        totalRevenue,
        totalCost,
        overallMargin,
        products
      });
    } catch (err) {
      console.error('Error fetching product profit data:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductProfitData();
  }, [user, startDate, endDate]);

  return {
    profitData,
    loading,
    error,
    refetch: fetchProductProfitData
  };
};