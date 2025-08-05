import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from './useAuth';

export interface RevenueByPeriod {
  period: string;
  revenue: number;
  invoiceCount: number;
}

export interface RevenueData {
  totalRevenue: number;
  monthlyData: RevenueByPeriod[];
  yearlyData: RevenueByPeriod[];
}

export const useReports = () => {
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchRevenueData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Récupérer toutes les factures payées
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('total, issue_date, status')
        .eq('user_id', user.id)
        .eq('status', 'paid');

      if (invoicesError) throw invoicesError;

      if (!invoices) {
        setRevenueData({
          totalRevenue: 0,
          monthlyData: [],
          yearlyData: []
        });
        return;
      }

      // Calculer le revenu total
      const totalRevenue = invoices.reduce((sum, invoice) => sum + Number(invoice.total), 0);

      // Grouper par mois
      const monthlyMap = new Map<string, { revenue: number; count: number }>();
      const yearlyMap = new Map<string, { revenue: number; count: number }>();

      invoices.forEach(invoice => {
        const date = new Date(invoice.issue_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const yearKey = String(date.getFullYear());
        const revenue = Number(invoice.total);

        // Données mensuelles
        if (monthlyMap.has(monthKey)) {
          const existing = monthlyMap.get(monthKey)!;
          monthlyMap.set(monthKey, {
            revenue: existing.revenue + revenue,
            count: existing.count + 1
          });
        } else {
          monthlyMap.set(monthKey, { revenue, count: 1 });
        }

        // Données annuelles
        if (yearlyMap.has(yearKey)) {
          const existing = yearlyMap.get(yearKey)!;
          yearlyMap.set(yearKey, {
            revenue: existing.revenue + revenue,
            count: existing.count + 1
          });
        } else {
          yearlyMap.set(yearKey, { revenue, count: 1 });
        }
      });

      // Convertir en tableaux triés
      const monthlyData: RevenueByPeriod[] = Array.from(monthlyMap.entries())
        .map(([period, data]) => ({
          period,
          revenue: data.revenue,
          invoiceCount: data.count
        }))
        .sort((a, b) => a.period.localeCompare(b.period));

      const yearlyData: RevenueByPeriod[] = Array.from(yearlyMap.entries())
        .map(([period, data]) => ({
          period,
          revenue: data.revenue,
          invoiceCount: data.count
        }))
        .sort((a, b) => a.period.localeCompare(b.period));

      setRevenueData({
        totalRevenue,
        monthlyData,
        yearlyData
      });
    } catch (err) {
      console.error('Error fetching revenue data:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenueData();
  }, [user]);

  return {
    revenueData,
    loading,
    error,
    refetch: fetchRevenueData
  };
};