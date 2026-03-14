import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface ReportRecipient {
  id: string;
  company_id: string;
  user_id: string;
  name: string;
  email: string;
  role_note: string | null;
  created_at: string;
  updated_at: string;
}

export function useReportRecipients(companyId: string | null) {
  const { user } = useAuth();
  const [recipients, setRecipients] = useState<ReportRecipient[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRecipients = useCallback(async () => {
    if (!companyId || !user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("report_recipients" as any)
        .select("*")
        .eq("company_id", companyId)
        .order("name");

      if (error) throw error;
      setRecipients((data as any[]) || []);
    } catch (err) {
      console.error("Error fetching report recipients:", err);
    } finally {
      setLoading(false);
    }
  }, [companyId, user]);

  useEffect(() => {
    fetchRecipients();
  }, [fetchRecipients]);

  const addRecipient = useCallback(
    async (name: string, email: string, roleNote?: string) => {
      if (!companyId || !user) return null;
      try {
        const { data, error } = await supabase
          .from("report_recipients" as any)
          .insert({
            company_id: companyId,
            user_id: user.id,
            name,
            email,
            role_note: roleNote || null,
          } as any)
          .select()
          .single();

        if (error) throw error;
        const newRecipient = data as unknown as ReportRecipient;
        setRecipients((prev) => [...prev, newRecipient].sort((a, b) => a.name.localeCompare(b.name)));
        return newRecipient;
      } catch (err) {
        console.error("Error adding report recipient:", err);
        throw err;
      }
    },
    [companyId, user]
  );

  const updateRecipient = useCallback(
    async (id: string, updates: { name?: string; email?: string; role_note?: string | null }) => {
      if (!user) return;
      try {
        const { error } = await supabase
          .from("report_recipients" as any)
          .update({ ...updates, updated_at: new Date().toISOString() } as any)
          .eq("id", id);

        if (error) throw error;
        setRecipients((prev) =>
          prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
        );
      } catch (err) {
        console.error("Error updating report recipient:", err);
        throw err;
      }
    },
    [user]
  );

  const deleteRecipient = useCallback(
    async (id: string) => {
      if (!user) return;
      try {
        const { error } = await supabase
          .from("report_recipients" as any)
          .delete()
          .eq("id", id);

        if (error) throw error;
        setRecipients((prev) => prev.filter((r) => r.id !== id));
      } catch (err) {
        console.error("Error deleting report recipient:", err);
        throw err;
      }
    },
    [user]
  );

  return {
    recipients,
    loading,
    addRecipient,
    updateRecipient,
    deleteRecipient,
    refetch: fetchRecipients,
  };
}
