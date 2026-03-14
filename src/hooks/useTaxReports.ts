import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from './useAuth';

export interface TaxBreakdown {
  name: string;
  amount: number;
  invoiceAmount: number;
  expenseAmount: number;
  netAmount: number;
  invoiceCount?: number;
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

type TaxEntry = { amount: number; invoiceAmount: number; expenseAmount: number; invoiceCount: number; expenseCount: number };
type PeriodEntry = { totalTax: number; taxBreakdown: Map<string, TaxEntry>; count: number; invoiceIds: Set<string>; expenseIds: Set<string> };

const newTaxEntry = (): TaxEntry => ({ amount: 0, invoiceAmount: 0, expenseAmount: 0, invoiceCount: 0, expenseCount: 0 });
const newPeriodEntry = (): PeriodEntry => ({ totalTax: 0, taxBreakdown: new Map(), count: 0, invoiceIds: new Set(), expenseIds: new Set() });

const ensurePeriod = (map: Map<string, PeriodEntry>, key: string): PeriodEntry => {
  if (!map.has(key)) map.set(key, newPeriodEntry());
  return map.get(key)!;
};

const addInvoiceTax = (
  taxName: string, amount: number, invoiceId: string,
  summaryMap: Map<string, TaxEntry>,
  monthData: PeriodEntry, yearData: PeriodEntry
) => {
  // Summary
  const s = summaryMap.get(taxName) || newTaxEntry();
  s.amount += amount; s.invoiceAmount += amount; s.invoiceCount++;
  summaryMap.set(taxName, s);

  // Monthly
  monthData.totalTax += amount;
  const mt = monthData.taxBreakdown.get(taxName) || newTaxEntry();
  mt.amount += amount; mt.invoiceAmount += amount; mt.invoiceCount++;
  monthData.taxBreakdown.set(taxName, mt);
  if (!monthData.invoiceIds.has(invoiceId)) { monthData.invoiceIds.add(invoiceId); monthData.count++; }

  // Yearly
  yearData.totalTax += amount;
  const yt = yearData.taxBreakdown.get(taxName) || newTaxEntry();
  yt.amount += amount; yt.invoiceAmount += amount; yt.invoiceCount++;
  yearData.taxBreakdown.set(taxName, yt);
  if (!yearData.invoiceIds.has(invoiceId)) { yearData.invoiceIds.add(invoiceId); yearData.count++; }
};

const addExpenseTax = (
  taxName: string, amount: number, expenseId: string,
  summaryMap: Map<string, TaxEntry>,
  monthData: PeriodEntry, yearData: PeriodEntry
) => {
  const s = summaryMap.get(taxName) || newTaxEntry();
  s.amount += amount; s.expenseAmount += amount; s.expenseCount++;
  summaryMap.set(taxName, s);

  monthData.totalTax += amount;
  const mt = monthData.taxBreakdown.get(taxName) || newTaxEntry();
  mt.amount += amount; mt.expenseAmount += amount; mt.expenseCount++;
  monthData.taxBreakdown.set(taxName, mt);
  if (!monthData.expenseIds.has(expenseId)) { monthData.expenseIds.add(expenseId); monthData.count++; }

  yearData.totalTax += amount;
  const yt = yearData.taxBreakdown.get(taxName) || newTaxEntry();
  yt.amount += amount; yt.expenseAmount += amount; yt.expenseCount++;
  yearData.taxBreakdown.set(taxName, yt);
  if (!yearData.expenseIds.has(expenseId)) { yearData.expenseIds.add(expenseId); yearData.count++; }
};

const convertPeriodMap = (map: Map<string, PeriodEntry>): TaxByPeriod[] =>
  Array.from(map.entries())
    .map(([period, data]) => ({
      period,
      totalTaxAmount: data.totalTax,
      taxBreakdown: Array.from(data.taxBreakdown.entries()).map(([name, e]) => ({
        name, amount: e.amount, invoiceAmount: e.invoiceAmount, expenseAmount: e.expenseAmount,
        netAmount: e.invoiceAmount - e.expenseAmount, invoiceCount: e.invoiceCount, expenseCount: e.expenseCount
      })),
      invoiceCount: data.count
    }))
    .sort((a, b) => a.period.localeCompare(b.period));

const emptyTaxData: TaxReportData = {
  totalTaxAmount: 0, totalInvoiceTaxAmount: 0, totalExpenseTaxAmount: 0,
  monthlyData: [], yearlyData: [], taxSummary: []
};

export const useTaxReports = (startDate?: Date, endDate?: Date, companyId?: string) => {
  const [taxData, setTaxData] = useState<TaxReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchTaxData = async () => {
    if (!user) return;

    if (!startDate && !endDate) {
      setTaxData(emptyTaxData);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch invoices
      let query = supabase
        .from('invoices')
        .select(`
          id, total, tax_amount, tax_rate, issue_date, status, client_id,
          clients!inner (
            company_id,
            companies ( id, name, taxes )
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'paid')
        .gt('tax_amount', 0);

      if (startDate) query = query.gte('issue_date', startDate.toISOString().split('T')[0]);
      if (endDate) query = query.lte('issue_date', endDate.toISOString().split('T')[0]);
      if (companyId) query = query.eq('clients.company_id', companyId);

      const { data: invoices, error: invoicesError } = await query;
      if (invoicesError) throw invoicesError;

      // Fetch expenses with taxes - now including tax_recoverable_percent
      let expensesQuery = supabase
        .from('expenses')
        .select(`
          id, amount, expense_date, status, taxes, tax_recoverable_percent,
          company_id, companies ( id, name, taxes )
        `)
        .eq('user_id', user.id)
        .eq('status', 'paid')
        .neq('taxes', '[]');

      if (startDate) expensesQuery = expensesQuery.gte('expense_date', startDate.toISOString().split('T')[0]);
      if (endDate) expensesQuery = expensesQuery.lte('expense_date', endDate.toISOString().split('T')[0]);
      if (companyId) expensesQuery = expensesQuery.eq('company_id', companyId);

      const { data: expenses, error: expensesError } = await expensesQuery;
      if (expensesError) throw expensesError;

      if (!invoices && !expenses) {
        setTaxData(emptyTaxData);
        return;
      }

      const monthlyMap = new Map<string, PeriodEntry>();
      const yearlyMap = new Map<string, PeriodEntry>();
      const taxSummaryMap = new Map<string, TaxEntry>();

      let totalInvoiceTax = 0;

      // Process invoices
      (invoices || []).forEach(invoice => {
        const date = new Date(invoice.issue_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const yearKey = String(date.getFullYear());
        const taxAmount = Number(invoice.tax_amount);
        const taxRate = Number(invoice.tax_rate);
        const invoiceId = invoice.id;

        totalInvoiceTax += taxAmount;

        const monthData = ensurePeriod(monthlyMap, monthKey);
        const yearData = ensurePeriod(yearlyMap, yearKey);

        const companyTaxes = invoice.clients?.companies?.taxes || [];

        if (Array.isArray(companyTaxes) && companyTaxes.length > 0) {
          const totalRate = (companyTaxes as any[]).reduce((sum: number, tax: any) => sum + (Number(tax?.percentage) || 0), 0);
          (companyTaxes as any[]).forEach((tax: any) => {
            const taxName = tax?.name || 'Taxe';
            const taxPercentage = Number(tax?.percentage) || 0;
            const proportionalAmount = Number(totalRate) > 0 ? (taxAmount * taxPercentage) / Number(totalRate) : 0;
            addInvoiceTax(taxName, proportionalAmount, invoiceId, taxSummaryMap, monthData, yearData);
          });
        } else {
          addInvoiceTax(`Taxe (${taxRate}%)`, taxAmount, invoiceId, taxSummaryMap, monthData, yearData);
        }
      });

      // Process expenses - applying tax_recoverable_percent
      let totalExpenseTax = 0;
      (expenses || []).forEach(expense => {
        const date = new Date(expense.expense_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const yearKey = String(date.getFullYear());
        const expenseId = expense.id;
        const expenseTaxes = expense.taxes as any[] || [];
        // Default to 100% if not set (backward compatibility)
        const recoverablePercent = expense.tax_recoverable_percent != null ? Number(expense.tax_recoverable_percent) : 100;

        if (Array.isArray(expenseTaxes) && expenseTaxes.length > 0) {
          const monthData = ensurePeriod(monthlyMap, monthKey);
          const yearData = ensurePeriod(yearlyMap, yearKey);

          expenseTaxes.forEach((tax: any) => {
            const taxName = tax?.name || 'Taxe';
            const rawTaxAmount = Number(tax?.amount) || 0;
            // Apply tax recoverable percent
            const recoverableTaxAmount = rawTaxAmount * (recoverablePercent / 100);
            totalExpenseTax += recoverableTaxAmount;
            addExpenseTax(taxName, recoverableTaxAmount, expenseId, taxSummaryMap, monthData, yearData);
          });
        }
      });

      const monthlyData = convertPeriodMap(monthlyMap);
      const yearlyData = convertPeriodMap(yearlyMap);

      const taxSummary: TaxBreakdown[] = Array.from(taxSummaryMap.entries())
        .map(([name, entry]) => ({
          name, amount: entry.amount, invoiceAmount: entry.invoiceAmount,
          expenseAmount: entry.expenseAmount, netAmount: entry.invoiceAmount - entry.expenseAmount,
          invoiceCount: entry.invoiceCount, expenseCount: entry.expenseCount
        }))
        .sort((a, b) => b.amount - a.amount);

      setTaxData({
        totalTaxAmount: totalInvoiceTax - totalExpenseTax,
        totalInvoiceTaxAmount: totalInvoiceTax,
        totalExpenseTaxAmount: totalExpenseTax,
        monthlyData, yearlyData, taxSummary
      });
    } catch (err) {
      console.error('Error fetching tax data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaxData();
  }, [user, startDate, endDate, companyId]);

  return { taxData, loading, error, refetch: fetchTaxData };
};
