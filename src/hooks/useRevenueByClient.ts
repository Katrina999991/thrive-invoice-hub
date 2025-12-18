import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from './useAuth';

export interface ClientRevenueData {
  clientId: string;
  clientName: string;
  totalInvoiced: number;
  totalPaid: number;
  invoiceCount: number;
  percentageOfTotal: number;
}

export interface ClientRevenueSummary {
  totalRevenue: number;
  totalPaid: number;
  totalInvoices: number;
  clientData: ClientRevenueData[];
}

export const useRevenueByClient = (startDate?: Date, endDate?: Date, companyId?: string) => {
  const [clientRevenueData, setClientRevenueData] = useState<ClientRevenueSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchClientRevenueData = async () => {
    if (!user) return;

    if (!startDate && !endDate) {
      setClientRevenueData({
        totalRevenue: 0,
        totalPaid: 0,
        totalInvoices: 0,
        clientData: []
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
          status,
          issue_date,
          client_id,
          clients!inner (
            id,
            name,
            company_id
          )
        `)
        .eq('user_id', user.id)
        .in('status', ['sent', 'paid', 'overdue']);

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

      if (!invoices || invoices.length === 0) {
        setClientRevenueData({
          totalRevenue: 0,
          totalPaid: 0,
          totalInvoices: 0,
          clientData: []
        });
        return;
      }

      // Group by client
      const clientMap = new Map<string, {
        clientName: string;
        totalInvoiced: number;
        totalPaid: number;
        invoiceCount: number;
      }>();

      let grandTotalInvoiced = 0;
      let grandTotalPaid = 0;

      invoices.forEach(invoice => {
        const client = invoice.clients as { id: string; name: string; company_id: string | null };
        if (!client) return;

        const clientId = client.id;
        const clientName = client.name;
        const total = Number(invoice.total);
        const isPaid = invoice.status === 'paid';

        grandTotalInvoiced += total;
        if (isPaid) grandTotalPaid += total;

        if (clientMap.has(clientId)) {
          const existing = clientMap.get(clientId)!;
          clientMap.set(clientId, {
            clientName,
            totalInvoiced: existing.totalInvoiced + total,
            totalPaid: existing.totalPaid + (isPaid ? total : 0),
            invoiceCount: existing.invoiceCount + 1
          });
        } else {
          clientMap.set(clientId, {
            clientName,
            totalInvoiced: total,
            totalPaid: isPaid ? total : 0,
            invoiceCount: 1
          });
        }
      });

      // Convert to array with percentages
      const clientData: ClientRevenueData[] = Array.from(clientMap.entries())
        .map(([clientId, data]) => ({
          clientId,
          clientName: data.clientName,
          totalInvoiced: data.totalInvoiced,
          totalPaid: data.totalPaid,
          invoiceCount: data.invoiceCount,
          percentageOfTotal: grandTotalInvoiced > 0 
            ? (data.totalInvoiced / grandTotalInvoiced) * 100 
            : 0
        }))
        .sort((a, b) => b.totalInvoiced - a.totalInvoiced);

      setClientRevenueData({
        totalRevenue: grandTotalInvoiced,
        totalPaid: grandTotalPaid,
        totalInvoices: invoices.length,
        clientData
      });
    } catch (err) {
      console.error('Error fetching client revenue data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientRevenueData();
  }, [user, startDate, endDate, companyId]);

  return {
    clientRevenueData,
    loading,
    error,
    refetch: fetchClientRevenueData
  };
};
