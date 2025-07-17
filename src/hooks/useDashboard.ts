import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useDashboard = () => {
  return useQuery({
    queryKey: ["dashboard-stats"],
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
        const timeAgo = formatTimeAgo(updatedAt);
        
        if (invoice.status === 'sent') {
          recentActivity.push({
            type: 'invoice_sent',
            message: `Invoice ${invoice.invoice_number} sent to ${invoice.clients?.name || 'client'}`,
            timeAgo,
            amount: `$${Number(invoice.total).toLocaleString()}`,
            color: 'blue'
          });
        } else if (invoice.status === 'paid') {
          recentActivity.push({
            type: 'payment_received',
            message: `Payment received for ${invoice.invoice_number}`,
            timeAgo,
            amount: `+$${Number(invoice.total).toLocaleString()}`,
            color: 'green'
          });
        } else if (invoice.status === 'overdue') {
          recentActivity.push({
            type: 'invoice_overdue',
            message: `Invoice ${invoice.invoice_number} is overdue`,
            timeAgo,
            amount: `$${Number(invoice.total).toLocaleString()}`,
            color: 'orange'
          });
        }
      });

      // Recent clients
      clients.slice(0, 3).forEach(client => {
        const createdAt = new Date(client.created_at);
        const timeAgo = formatTimeAgo(createdAt);
        recentActivity.push({
          type: 'client_added',
          message: `New client added: ${client.name}`,
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
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  return `${Math.floor(diffInSeconds / 604800)} weeks ago`;
}