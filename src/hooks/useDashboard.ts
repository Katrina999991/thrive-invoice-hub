import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type TranslationFunction = (key: string, replacements?: Record<string, string | number>) => string;

export const useDashboard = (t?: TranslationFunction) => {
  return useQuery({
    queryKey: ["dashboard-stats", t ? "translated" : "default"],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const userId = user.user.id;

      // First get companies where user is a member
      const { data: memberCompanyIds, error: memberError } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", userId)
        .eq("status", "active");

      if (memberError) throw memberError;

      const companyIds = memberCompanyIds?.map(m => m.company_id) || [];

      // Fetch all data in parallel
      let invoicesResult, clientsResult, productsResult;

      if (companyIds.length > 0) {
        // First get client IDs from companies user is a member of
        const { data: clientsFromCompanies, error: clientsError } = await supabase
          .from("clients")
          .select("id")
          .in("company_id", companyIds);

        if (clientsError) throw clientsError;

        const clientIds = clientsFromCompanies?.map(c => c.id) || [];

        // Get data from companies user is a member of
        [invoicesResult, clientsResult, productsResult] = await Promise.all([
          clientIds.length > 0
            ? supabase
                .from("invoices")
                .select("id, total, status, created_at, updated_at, invoice_number, clients(name)")
                .in("client_id", clientIds)
                .eq("is_archived", false)
                .order("updated_at", { ascending: false })
            : { data: [], error: null },
          supabase
            .from("clients")
            .select("id, name, created_at")
            .in("company_id", companyIds)
            .order("created_at", { ascending: false }),
          supabase
            .from("products")
            .select("id, is_active")
            .in("company_id", companyIds)
            .eq("is_active", true),
        ]) as any;
      } else {
        // Fallback: get data owned by user (for backward compatibility)
        [invoicesResult, clientsResult, productsResult] = await Promise.all([
          supabase
            .from("invoices")
            .select("id, total, status, created_at, updated_at, invoice_number, clients(name)")
            .eq("user_id", userId)
            .eq("is_archived", false)
            .order("updated_at", { ascending: false }),
          supabase
            .from("clients")
            .select("id, name, created_at")
            .eq("user_id", userId)
            .order("created_at", { ascending: false }),
          supabase
            .from("products")
            .select("id, is_active")
            .eq("user_id", userId)
            .eq("is_active", true),
        ]);
      }

      if (invoicesResult.error) throw invoicesResult.error;
      if (clientsResult.error) throw clientsResult.error;
      if (productsResult.error) throw productsResult.error;

      const invoices = invoicesResult.data || [];
      const clients = clientsResult.data || [];
      const products = productsResult.data || [];

      // Calculate statistics
      const totalRevenue = invoices
        .filter(inv => inv.status === "paid")
        .reduce((sum, inv) => sum + Number(inv.total), 0);

      const openInvoices = invoices.filter(inv => inv.status === "sent" || inv.status === "overdue");
      const openInvoicesTotal = openInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);

      const monthFormatter = new Intl.DateTimeFormat("fr-CA", { month: "short" });
      const monthlyRevenue = Array.from({ length: 6 }, (_, index) => {
        const date = new Date();
        date.setDate(1);
        date.setMonth(date.getMonth() - (5 - index));
        return {
          key: date.getFullYear() + "-" + date.getMonth(),
          month: monthFormatter.format(date).replace(".", ""),
          revenue: 0,
        };
      });

      invoices
        .filter(invoice => invoice.status === "paid")
        .forEach(invoice => {
          const paidDate = new Date(invoice.updated_at);
          const month = monthlyRevenue.find(item =>
            item.key === paidDate.getFullYear() + "-" + paidDate.getMonth()
          );
          if (month) month.revenue += Number(invoice.total);
        });

      const invoiceStatusCounts = ["draft", "sent", "paid", "overdue"].map(status => ({
        status,
        count: invoices.filter(invoice => invoice.status === status).length,
      }));

      console.log("[Dashboard charts] data prepared", {
        invoiceCount: invoices.length,
        monthlyRevenue,
        invoiceStatusCounts,
      });

      // Calculate new clients this month
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const newClientsThisMonth = clients.filter(client => {
        const createdDate = new Date(client.created_at);
        return createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear;
      }).length;

      // Get recent activity (last 10 items)
      const recentActivity = [];
      
      // Recent invoice updates
      invoices.slice(0, 5).forEach(invoice => {
        const updatedAt = new Date(invoice.updated_at);
        const timeAgo = formatTimeAgo(updatedAt, t);
        
        if (invoice.status === 'sent') {
          const message = t 
            ? t("reports.activity.invoiceSentTo", { number: invoice.invoice_number, client: invoice.clients?.name || 'client' })
            : `Invoice ${invoice.invoice_number} sent to ${invoice.clients?.name || 'client'}`;
          
          recentActivity.push({
            type: 'invoice_sent',
            message,
            timeAgo,
            amount: `$${Number(invoice.total).toLocaleString()}`,
            color: 'blue'
          });
        } else if (invoice.status === 'paid') {
          const message = t
            ? t("reports.activity.paymentReceived", { number: invoice.invoice_number })
            : `Payment received for ${invoice.invoice_number}`;
          
          recentActivity.push({
            type: 'payment_received',
            message,
            timeAgo,
            amount: `+$${Number(invoice.total).toLocaleString()}`,
            color: 'green'
          });
        } else if (invoice.status === 'overdue') {
          const message = t
            ? t("reports.activity.invoiceOverdue", { number: invoice.invoice_number })
            : `Invoice ${invoice.invoice_number} is overdue`;
          
          recentActivity.push({
            type: 'invoice_overdue',
            message,
            timeAgo,
            amount: `$${Number(invoice.total).toLocaleString()}`,
            color: 'orange'
          });
        }
      });

      // Recent clients
      clients.slice(0, 3).forEach(client => {
        const createdAt = new Date(client.created_at);
        const timeAgo = formatTimeAgo(createdAt, t);
        const message = t
          ? t("reports.activity.newClientAdded", { name: client.name })
          : `New client added: ${client.name}`;
        
        recentActivity.push({
          type: 'client_added',
          message,
          timeAgo,
          amount: null,
          color: 'blue'
        });
      });

      // Sort by most recent and take top 5
      recentActivity.sort((a, b) => new Date(b.timeAgo).getTime() - new Date(a.timeAgo).getTime());

      return {
        totalRevenue,
        activeClients: clients.length,
        newClientsThisMonth,
        openInvoicesCount: openInvoices.length,
        openInvoicesTotal,
        activeProducts: products.length,
        monthlyRevenue,
        invoiceStatusCounts,
        recentActivity: recentActivity.slice(0, 5),
      };
    },
  });
};

// Helper function to format time ago
function formatTimeAgo(date: Date, t?: TranslationFunction): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return t ? t("reports.activity.justNow") : 'Just now';
  }
  if (diffInSeconds < 3600) {
    const count = Math.floor(diffInSeconds / 60);
    return t ? t("reports.activity.minutesAgo", { count }) : `${count} minutes ago`;
  }
  if (diffInSeconds < 86400) {
    const count = Math.floor(diffInSeconds / 3600);
    return t ? t("reports.activity.hoursAgo", { count }) : `${count} hours ago`;
  }
  if (diffInSeconds < 604800) {
    const count = Math.floor(diffInSeconds / 86400);
    return t ? t("reports.activity.daysAgo", { count }) : `${count} days ago`;
  }
  const count = Math.floor(diffInSeconds / 604800);
  return t ? t("reports.activity.weeksAgo", { count }) : `${count} weeks ago`;
}
