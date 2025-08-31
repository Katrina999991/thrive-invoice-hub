import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from './useAuth';

export interface ExpenseByCategory {
  category: string;
  total_amount: number;
  count: number;
}

export interface ExpenseByCompany {
  company_name: string;
  company_id: string;
  total_amount: number;
  count: number;
}

export interface ExpenseReportData {
  totalExpenses: number;
  totalPaidExpenses: number;
  totalUnpaidExpenses: number;
  expensesByCategory: ExpenseByCategory[];
  expensesByCompany: ExpenseByCompany[];
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
      let query = supabase
        .from('expenses')
        .select(`
          amount,
          category,
          expense_date,
          status,
          client_id,
          clients!inner (
            name,
            company_id,
            companies!inner (
              name
            )
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
        query = query.eq('clients.company_id', filterId);
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
          expensesByCategory: [],
          expensesByCompany: []
        });
        return;
      }

      // Calculate totals
      const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
      const totalPaidExpenses = expenses
        .filter(expense => expense.status === 'paid')
        .reduce((sum, expense) => sum + Number(expense.amount), 0);
      const totalUnpaidExpenses = expenses
        .filter(expense => expense.status === 'unpaid')
        .reduce((sum, expense) => sum + Number(expense.amount), 0);

      // Group by category
      const categoryMap = new Map<string, { total_amount: number; count: number }>();
      expenses.forEach(expense => {
        const category = expense.category || 'Uncategorized';
        const amount = Number(expense.amount);

        if (categoryMap.has(category)) {
          const existing = categoryMap.get(category)!;
          categoryMap.set(category, {
            total_amount: existing.total_amount + amount,
            count: existing.count + 1
          });
        } else {
          categoryMap.set(category, { total_amount: amount, count: 1 });
        }
      });

      // Group by company
      const companyMap = new Map<string, { company_name: string; total_amount: number; count: number }>();
      expenses.forEach(expense => {
        if (expense.clients?.companies) {
          const companyId = expense.clients.company_id;
          const companyName = expense.clients.companies.name;
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
          count: data.count
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

      setReportData({
        totalExpenses,
        totalPaidExpenses,
        totalUnpaidExpenses,
        expensesByCategory,
        expensesByCompany
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