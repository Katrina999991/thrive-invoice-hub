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
          .select("id, total, status, created_at")
          .eq("user_id", userId),
        supabase
          .from("clients")
          .select("id, created_at")
          .eq("user_id", userId),
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

      return {
        totalRevenue,
        activeClients: clients.length,
        newClientsThisMonth,
        openInvoicesCount: openInvoices.length,
        openInvoicesTotal,
        activeProducts: products.length,
      };
    },
  });
};