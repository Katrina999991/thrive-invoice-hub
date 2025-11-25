import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type ReminderLog = {
  id: string;
  invoice_id: string;
  user_id: string;
  client_id: string | null;
  reminder_type: "manual" | "automatic";
  sent_at: string;
  status: "sent" | "failed";
  error_message: string | null;
  created_at: string;
  invoices?: {
    invoice_number: string;
    total: number;
    clients?: {
      name: string;
    };
  };
};

export const useReminderLogs = (
  startDate?: Date,
  endDate?: Date,
  clientId?: string,
  reminderType?: "manual" | "automatic" | "all"
) => {
  const [logs, setLogs] = useState<ReminderLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchLogs();
  }, [user, startDate, endDate, clientId, reminderType]);

  const fetchLogs = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from("invoice_reminder_logs")
        .select(`
          *,
          invoices!inner (
            invoice_number,
            total,
            clients (
              name
            )
          )
        `)
        .eq("user_id", user!.id)
        .order("sent_at", { ascending: false });

      // Filter by date range
      if (startDate) {
        query = query.gte("sent_at", startDate.toISOString());
      }
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte("sent_at", endOfDay.toISOString());
      }

      // Filter by client
      if (clientId && clientId !== "all") {
        query = query.eq("client_id", clientId);
      }

      // Filter by reminder type
      if (reminderType && reminderType !== "all") {
        query = query.eq("reminder_type", reminderType);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching reminder logs:", error);
        throw error;
      }

      setLogs((data as ReminderLog[]) || []);
    } catch (error) {
      console.error("Error in fetchLogs:", error);
    } finally {
      setLoading(false);
    }
  };

  return { logs, loading, refetch: fetchLogs };
};
