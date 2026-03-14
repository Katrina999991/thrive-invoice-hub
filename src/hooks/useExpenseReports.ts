import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from './useAuth';

export interface ExpenseByCategory {
  category: string;
  total_amount: number;
  count: number;
  total_deductible_amount: number;
  avg_deductible_percent: number;
}

export interface ExpenseByCompany {
  company_name: string;
  company_id: string;
  total_amount: number;
  count: number;
}

export interface ExpenseDetail {
  id: string;
  description: string;
  amount: number;
  category: string;
  expense_date: string;
  status: string;
  company_name?: string;
  vendor?: string;
  taxes?: Array<{ name: string; percentage: number; amount?: number }>;
  deductible_percent: number;
  deductible_amount: number;
}

export interface ExpenseReportData {
  totalExpenses: number;
  totalPaidExpenses: number;
  totalUnpaidExpenses: number;
  totalDeductibleAmount: number;
  expensesByCategory: ExpenseByCategory[];
  expensesByCompany: ExpenseByCompany[];
  expenseDetails: ExpenseDetail[];
}

export const useExpenseReports = (startDate?: Date, endDate?: Date, filterType?: 'all' | 'company' | 'category', filterId?: string) => {
  const [reportData, setReportData] = useState<ExpenseReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchExpenseReportData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Build base query with date filters if specified
      let query: any = supabase
        .from('expenses')
        .select(`
          id,
          description,
          amount,
          category,
          expense_date,
          status,
          company_id,
          vendor,
          taxes,
          deductible_percent,
          companies (
            name
          )
        `)
        .eq('user_id', user.id);

      // Add date filters if specified
      if (startDate) {
        query = query.gte('expense_date', startDate.toISOString().split('T')[0]);
      }
      if (endDate) {
        query = query.lte('expense_date', endDate.toISOString().split('T')[0]);
      }

      // Add additional filters
      if (filterType === 'company' && filterId) {
        query = query.eq('company_id', filterId);
      }
      if (filterType === 'category' && filterId) {
        query = query.eq('category', filterId);
      }

      const { data: expenses, error: expensesError } = await query;

      if (expensesError) throw expensesError;

      if (!expenses) {
        setReportData({
          totalExpenses: 0,
          totalPaidExpenses: 0,
          totalUnpaidExpenses: 0,
          totalDeductibleAmount: 0,
          expensesByCategory: [],
          expensesByCompany: [],
          expenseDetails: []
        });
        return;
      }

      // Cast to any to handle typing issues until Supabase types regenerate
      const expensesData = expenses as any[];

      // Calculate totals
      const totalExpenses = expensesData.reduce((sum, expense) => sum + Number(expense.amount), 0);
      const totalPaidExpenses = expensesData
        .filter(expense => expense.status === 'paid')
        .reduce((sum, expense) => sum + Number(expense.amount), 0);
      const totalUnpaidExpenses = expensesData
        .filter(expense => expense.status === 'unpaid')
        .reduce((sum, expense) => sum + Number(expense.amount), 0);
      const totalDeductibleAmount = expensesData.reduce((sum, expense) => {
        const deductPct = expense.deductible_percent != null ? Number(expense.deductible_percent) : 100;
        return sum + (Number(expense.amount) * deductPct / 100);
      }, 0);

      // Group by category
      const categoryMap = new Map<string, { total_amount: number; count: number; total_deductible: number; deductible_pct_sum: number }>();
      expensesData.forEach(expense => {
        const category = expense.category || 'Uncategorized';
        const amount = Number(expense.amount);
        const deductPct = expense.deductible_percent != null ? Number(expense.deductible_percent) : 100;
        const deductAmt = amount * deductPct / 100;

        if (categoryMap.has(category)) {
          const existing = categoryMap.get(category)!;
          categoryMap.set(category, {
            total_amount: existing.total_amount + amount,
            count: existing.count + 1,
            total_deductible: existing.total_deductible + deductAmt,
            deductible_pct_sum: existing.deductible_pct_sum + deductPct
          });
        } else {
          categoryMap.set(category, { total_amount: amount, count: 1, total_deductible: deductAmt, deductible_pct_sum: deductPct });
        }
      });

      // Group by company
      const companyMap = new Map<string, { company_name: string; total_amount: number; count: number }>();
      expensesData.forEach(expense => {
        if (expense.companies && expense.company_id) {
          const companyId = expense.company_id;
          const companyName = expense.companies.name;
          const amount = Number(expense.amount);

          if (companyMap.has(companyId)) {
            const existing = companyMap.get(companyId)!;
            companyMap.set(companyId, {
              company_name: existing.company_name,
              total_amount: existing.total_amount + amount,
              count: existing.count + 1
            });
          } else {
            companyMap.set(companyId, {
              company_name: companyName,
              total_amount: amount,
              count: 1
            });
          }
        }
      });

      // Convert maps to arrays and sort
      const expensesByCategory: ExpenseByCategory[] = Array.from(categoryMap.entries())
        .map(([category, data]) => ({
          category,
          total_amount: data.total_amount,
          count: data.count,
          total_deductible_amount: data.total_deductible,
          avg_deductible_percent: data.deductible_pct_sum / data.count
        }))
        .sort((a, b) => b.total_amount - a.total_amount);

      const expensesByCompany: ExpenseByCompany[] = Array.from(companyMap.entries())
        .map(([company_id, data]) => ({
          company_id,
          company_name: data.company_name,
          total_amount: data.total_amount,
          count: data.count
        }))
        .sort((a, b) => b.total_amount - a.total_amount);

      // Prepare expense details
      const expenseDetails: ExpenseDetail[] = expensesData.map(expense => {
        const deductPct = expense.deductible_percent != null ? Number(expense.deductible_percent) : 100;
        return {
          id: expense.id,
          description: expense.description,
          amount: Number(expense.amount),
          category: expense.category || 'Uncategorized',
          expense_date: expense.expense_date,
          status: expense.status,
          company_name: expense.companies?.name,
          vendor: expense.vendor,
          taxes: expense.taxes || [],
          deductible_percent: deductPct,
          deductible_amount: Number(expense.amount) * deductPct / 100
        };
      });

      setReportData({
        totalExpenses,
        totalPaidExpenses,
        totalUnpaidExpenses,
        totalDeductibleAmount,
        expensesByCategory,
        expensesByCompany,
        expenseDetails
      });
    } catch (err) {
      console.error('Error fetching expense report data:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenseReportData();
  }, [user, startDate, endDate, filterType, filterId]);

  return {
    reportData,
    loading,
    error,
    refetch: fetchExpenseReportData
  };
};