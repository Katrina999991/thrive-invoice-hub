import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from './useAuth';

export interface TaxBreakdown {
  name: string;
  amount: number;
  invoiceCount: number;
  expenseCount?: number;
}

export interface TaxByPeriod {
  period: string;
  totalTaxAmount: number;
  taxBreakdown: TaxBreakdown[];
  invoiceCount: number;
}

export interface TaxReportData {
  totalTaxAmount: number;
  totalInvoiceTaxAmount: number;
  totalExpenseTaxAmount: number;
  monthlyData: TaxByPeriod[];
  yearlyData: TaxByPeriod[];
  taxSummary: TaxBreakdown[];
}

export const useTaxReports = (startDate?: Date, endDate?: Date, companyId?: string) => {
  const [taxData, setTaxData] = useState<TaxReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchTaxData = async () => {
    if (!user) return;

    if (!startDate && !endDate) {
      setTaxData({
        totalTaxAmount: 0,
        totalInvoiceTaxAmount: 0,
        totalExpenseTaxAmount: 0,
        monthlyData: [],
        yearlyData: [],
        taxSummary: []
      });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('invoices')
        .select(`
          id,
          total,
          tax_amount,
          tax_rate,
          issue_date,
          status,
          client_id,
          clients!inner (
            company_id,
            companies (
              id,
              name,
              taxes
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'paid')
        .gt('tax_amount', 0);

      if (startDate) {
        query = query.gte('issue_date', startDate.toISOString().split('T')[0]);
      }
      if (endDate) {
        query = query.lte('issue_date', endDate.toISOString().split('T')[0]);
      }
      if (companyId) {
        query = query.eq('clients.company_id', companyId);
      }

      const { data: invoices, error: invoicesError } = await query;

      if (invoicesError) throw invoicesError;

      console.log('Tax Reports - Invoices found:', invoices?.length || 0);
      console.log('Tax Reports - Sample invoice:', invoices?.[0]);

      // Fetch expenses with taxes
      let expensesQuery = supabase
        .from('expenses')
        .select(`
          id,
          amount,
          expense_date,
          status,
          taxes,
          company_id,
          companies (
            id,
            name,
            taxes
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'paid')
        .neq('taxes', '[]');

      if (startDate) {
        expensesQuery = expensesQuery.gte('expense_date', startDate.toISOString().split('T')[0]);
      }
      if (endDate) {
        expensesQuery = expensesQuery.lte('expense_date', endDate.toISOString().split('T')[0]);
      }
      if (companyId) {
        expensesQuery = expensesQuery.eq('company_id', companyId);
      }

      const { data: expenses, error: expensesError } = await expensesQuery;

      if (expensesError) throw expensesError;

      console.log('Tax Reports - Expenses found:', expenses?.length || 0);

      if (!invoices && !expenses) {
        setTaxData({
          totalTaxAmount: 0,
          totalInvoiceTaxAmount: 0,
          totalExpenseTaxAmount: 0,
          monthlyData: [],
          yearlyData: [],
          taxSummary: []
        });
        return;
      }

      const totalTaxAmount = (invoices || []).reduce((sum, invoice) => sum + Number(invoice.tax_amount), 0);
      console.log('Tax Reports - Total tax amount from invoices:', totalTaxAmount);
      
      const monthlyMap = new Map<string, { totalTax: number; taxBreakdown: Map<string, { amount: number; invoiceCount: number; expenseCount: number }>; count: number; invoiceIds: Set<string>; expenseIds: Set<string> }>();
      const yearlyMap = new Map<string, { totalTax: number; taxBreakdown: Map<string, { amount: number; invoiceCount: number; expenseCount: number }>; count: number; invoiceIds: Set<string>; expenseIds: Set<string> }>();
      const taxSummaryMap = new Map<string, { amount: number; invoiceCount: number; expenseCount: number }>();

      (invoices || []).forEach(invoice => {
        const date = new Date(invoice.issue_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const yearKey = String(date.getFullYear());
        const taxAmount = Number(invoice.tax_amount);
        const taxRate = Number(invoice.tax_rate);
        const invoiceId = invoice.id;

        // Récupérer les taxes de la compagnie
        const companyTaxes = invoice.clients?.companies?.taxes || [];
        
        // Si on a plusieurs taxes définies dans la compagnie, calculer proportionnellement
        if (Array.isArray(companyTaxes) && companyTaxes.length > 0) {
          const totalRate = companyTaxes.reduce((sum: number, tax: any) => sum + (Number(tax?.percentage) || 0), 0);
          
          companyTaxes.forEach((tax: any) => {
            const taxName = tax?.name || 'Taxe';
            const taxPercentage = Number(tax?.percentage) || 0;
            const proportionalAmount = Number(totalRate) > 0 ? (taxAmount * taxPercentage) / Number(totalRate) : 0;
            
            // Ajouter au résumé global
            const summaryEntry = taxSummaryMap.get(taxName) || { amount: 0, invoiceCount: 0, expenseCount: 0 };
            summaryEntry.amount += proportionalAmount;
            summaryEntry.invoiceCount++;
            taxSummaryMap.set(taxName, summaryEntry);
            
            // Données mensuelles
            if (!monthlyMap.has(monthKey)) {
              monthlyMap.set(monthKey, { totalTax: 0, taxBreakdown: new Map(), count: 0, invoiceIds: new Set(), expenseIds: new Set() });
            }
            const monthData = monthlyMap.get(monthKey)!;
            monthData.totalTax += proportionalAmount;
            const monthTaxEntry = monthData.taxBreakdown.get(taxName) || { amount: 0, invoiceCount: 0, expenseCount: 0 };
            monthTaxEntry.amount += proportionalAmount;
            monthTaxEntry.invoiceCount++;
            monthData.taxBreakdown.set(taxName, monthTaxEntry);
            
            // Compter chaque facture une seule fois
            if (!monthData.invoiceIds.has(invoiceId)) {
              monthData.invoiceIds.add(invoiceId);
              monthData.count++;
            }
            
            // Données annuelles
            if (!yearlyMap.has(yearKey)) {
              yearlyMap.set(yearKey, { totalTax: 0, taxBreakdown: new Map(), count: 0, invoiceIds: new Set(), expenseIds: new Set() });
            }
            const yearData = yearlyMap.get(yearKey)!;
            yearData.totalTax += proportionalAmount;
            const yearTaxEntry = yearData.taxBreakdown.get(taxName) || { amount: 0, invoiceCount: 0, expenseCount: 0 };
            yearTaxEntry.amount += proportionalAmount;
            yearTaxEntry.invoiceCount++;
            yearData.taxBreakdown.set(taxName, yearTaxEntry);
            
            // Compter chaque facture une seule fois
            if (!yearData.invoiceIds.has(invoiceId)) {
              yearData.invoiceIds.add(invoiceId);
              yearData.count++;
            }
          });
        } else {
          // Si pas de taxes spécifiques définies, utiliser une taxe générique
          const taxName = `Taxe (${taxRate}%)`;
          
          // Ajouter au résumé global
          const summaryEntry = taxSummaryMap.get(taxName) || { amount: 0, invoiceCount: 0, expenseCount: 0 };
          summaryEntry.amount += taxAmount;
          summaryEntry.invoiceCount++;
          taxSummaryMap.set(taxName, summaryEntry);
          
          // Données mensuelles
          if (!monthlyMap.has(monthKey)) {
            monthlyMap.set(monthKey, { totalTax: 0, taxBreakdown: new Map(), count: 0, invoiceIds: new Set(), expenseIds: new Set() });
          }
          const monthData = monthlyMap.get(monthKey)!;
          monthData.totalTax += taxAmount;
          const monthTaxEntry = monthData.taxBreakdown.get(taxName) || { amount: 0, invoiceCount: 0, expenseCount: 0 };
          monthTaxEntry.amount += taxAmount;
          monthTaxEntry.invoiceCount++;
          monthData.taxBreakdown.set(taxName, monthTaxEntry);
          
          // Compter chaque facture une seule fois
          if (!monthData.invoiceIds.has(invoiceId)) {
            monthData.invoiceIds.add(invoiceId);
            monthData.count++;
          }
          
          // Données annuelles
          if (!yearlyMap.has(yearKey)) {
            yearlyMap.set(yearKey, { totalTax: 0, taxBreakdown: new Map(), count: 0, invoiceIds: new Set(), expenseIds: new Set() });
          }
          const yearData = yearlyMap.get(yearKey)!;
          yearData.totalTax += taxAmount;
          const yearTaxEntry = yearData.taxBreakdown.get(taxName) || { amount: 0, invoiceCount: 0, expenseCount: 0 };
          yearTaxEntry.amount += taxAmount;
          yearTaxEntry.invoiceCount++;
          yearData.taxBreakdown.set(taxName, yearTaxEntry);
          
          // Compter chaque facture une seule fois
          if (!yearData.invoiceIds.has(invoiceId)) {
            yearData.invoiceIds.add(invoiceId);
            yearData.count++;
          }
        }
      });

      // Process expenses with taxes
      let expenseTaxTotal = 0;
      (expenses || []).forEach(expense => {
        const date = new Date(expense.expense_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const yearKey = String(date.getFullYear());
        const expenseId = expense.id;
        const expenseTaxes = expense.taxes as any[] || [];

        if (Array.isArray(expenseTaxes) && expenseTaxes.length > 0) {
          expenseTaxes.forEach((tax: any) => {
            const taxName = tax?.name || 'Taxe';
            const taxAmount = Number(tax?.amount) || 0;
            expenseTaxTotal += taxAmount;

            // Ajouter au résumé global
            const summaryEntry = taxSummaryMap.get(taxName) || { amount: 0, invoiceCount: 0, expenseCount: 0 };
            summaryEntry.amount += taxAmount;
            summaryEntry.expenseCount++;
            taxSummaryMap.set(taxName, summaryEntry);

            // Données mensuelles
            if (!monthlyMap.has(monthKey)) {
              monthlyMap.set(monthKey, { totalTax: 0, taxBreakdown: new Map(), count: 0, invoiceIds: new Set(), expenseIds: new Set() });
            }
            const monthData = monthlyMap.get(monthKey)!;
            monthData.totalTax += taxAmount;
            const monthTaxEntry = monthData.taxBreakdown.get(taxName) || { amount: 0, invoiceCount: 0, expenseCount: 0 };
            monthTaxEntry.amount += taxAmount;
            monthTaxEntry.expenseCount++;
            monthData.taxBreakdown.set(taxName, monthTaxEntry);

            // Compter chaque dépense une seule fois
            if (!monthData.expenseIds.has(expenseId)) {
              monthData.expenseIds.add(expenseId);
              monthData.count++;
            }

            // Données annuelles
            if (!yearlyMap.has(yearKey)) {
              yearlyMap.set(yearKey, { totalTax: 0, taxBreakdown: new Map(), count: 0, invoiceIds: new Set(), expenseIds: new Set() });
            }
            const yearData = yearlyMap.get(yearKey)!;
            yearData.totalTax += taxAmount;
            const yearTaxEntry = yearData.taxBreakdown.get(taxName) || { amount: 0, invoiceCount: 0, expenseCount: 0 };
            yearTaxEntry.amount += taxAmount;
            yearTaxEntry.expenseCount++;
            yearData.taxBreakdown.set(taxName, yearTaxEntry);

            // Compter chaque dépense une seule fois
            if (!yearData.expenseIds.has(expenseId)) {
              yearData.expenseIds.add(expenseId);
              yearData.count++;
            }
          });
        }
      });

      console.log('Tax Reports - Total tax amount from expenses:', expenseTaxTotal);

      // Convertir en tableaux
      const monthlyData: TaxByPeriod[] = Array.from(monthlyMap.entries())
        .map(([period, data]) => ({
          period,
          totalTaxAmount: data.totalTax,
          taxBreakdown: Array.from(data.taxBreakdown.entries()).map(([name, entry]) => ({
            name,
            amount: entry.amount,
            invoiceCount: entry.invoiceCount,
            expenseCount: entry.expenseCount
          })),
          invoiceCount: data.count
        }))
        .sort((a, b) => a.period.localeCompare(b.period));

      console.log('Tax Reports - Monthly data:', monthlyData);
      console.log('Tax Reports - Monthly data details:', JSON.stringify(monthlyData, null, 2));

      const yearlyData: TaxByPeriod[] = Array.from(yearlyMap.entries())
        .map(([period, data]) => ({
          period,
          totalTaxAmount: data.totalTax,
          taxBreakdown: Array.from(data.taxBreakdown.entries()).map(([name, entry]) => ({
            name,
            amount: entry.amount,
            invoiceCount: entry.invoiceCount,
            expenseCount: entry.expenseCount
          })),
          invoiceCount: data.count
        }))
        .sort((a, b) => a.period.localeCompare(b.period));

      console.log('Tax Reports - Yearly data:', yearlyData);

      const taxSummary: TaxBreakdown[] = Array.from(taxSummaryMap.entries())
        .map(([name, entry]) => ({
          name,
          amount: entry.amount,
          invoiceCount: entry.invoiceCount,
          expenseCount: entry.expenseCount
        }))
        .sort((a, b) => b.amount - a.amount);

      console.log('Tax Reports - Final data:', {
        totalTaxAmount,
        monthlyData: monthlyData.length,
        yearlyData: yearlyData.length,
        taxSummary: taxSummary.length
      });

      console.log('Setting tax data:', {
        totalTaxAmount,
        monthlyData: monthlyData.length,
        yearlyData: yearlyData.length,
        taxSummary: taxSummary.length,
        taxSummaryData: taxSummary
      });

      setTaxData({
        totalTaxAmount: totalTaxAmount + expenseTaxTotal,
        totalInvoiceTaxAmount: totalTaxAmount,
        totalExpenseTaxAmount: expenseTaxTotal,
        monthlyData,
        yearlyData,
        taxSummary
      });
    } catch (err) {
      console.error('Error fetching tax data:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaxData();
  }, [user, startDate, endDate, companyId]);

  return {
    taxData,
    loading,
    error,
    refetch: fetchTaxData
  };
};