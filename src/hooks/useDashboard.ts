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

      // Fetch all data in parallel
      const [invoicesResult, clientsResult, productsResult] = await Promise.all([
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