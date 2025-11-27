import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type TimeEntryRange = {
  id: string;
  start_time: string;
  end_time: string;
};

type TimeEntry = Tables<"time_entries"> & {
  clients?: { name: string; hourly_rate: number | null } | null;
  companies?: { name: string } | null;
  time_entry_ranges?: TimeEntryRange[];
};
type TimeEntryInsert = Omit<TablesInsert<"time_entries">, "user_id">;
type TimeEntryUpdate = TablesUpdate<"time_entries">;

export const useTimeEntries = () => {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchTimeEntries = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("time_entries")
        .select(`
          *,
          clients (name, hourly_rate),
          companies (name),
          time_entry_ranges (id, start_time, end_time)
        `)
        .eq("user_id", user.id)
        .order("date", { ascending: true });

      if (error) throw error;
      setTimeEntries(data || []);
    } catch (error: any) {
      console.error("Error fetching time entries:", error);
      toast.error("Erreur lors du chargement des heures");
    } finally {
      setLoading(false);
    }
  };

  const createTimeEntry = async (
    timeEntryData: TimeEntryInsert,
    ranges?: { start_time: string; end_time: string }[]
  ) => {
    if (!user) {
      toast.error("Vous devez être connecté");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("time_entries")
        .insert({
          ...timeEntryData,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Insérer les plages horaires si fournies
      if (ranges && ranges.length > 0 && data) {
        const rangeInserts = ranges
          .filter(r => r.start_time && r.end_time)
          .map(range => ({
            time_entry_id: data.id,
            start_time: range.start_time,
            end_time: range.end_time,
          }));

        if (rangeInserts.length > 0) {
          const { error: rangeError } = await supabase
            .from("time_entry_ranges")
            .insert(rangeInserts);

          if (rangeError) throw rangeError;
        }
      }

      toast.success("Heures enregistrées avec succès");
      await fetchTimeEntries();
      return data;
    } catch (error: any) {
      console.error("Error creating time entry:", error);
      toast.error("Erreur lors de l'enregistrement");
      return null;
    }
  };

  const updateTimeEntry = async (
    id: string,
    updates: TimeEntryUpdate,
    ranges?: { id?: string; start_time: string; end_time: string }[]
  ) => {
    try {
      const { error } = await supabase
        .from("time_entries")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      // Gérer les plages horaires si fournies
      if (ranges) {
        // Supprimer toutes les plages existantes
        const { error: deleteError } = await supabase
          .from("time_entry_ranges")
          .delete()
          .eq("time_entry_id", id);

        if (deleteError) throw deleteError;

        // Insérer les nouvelles plages
        const rangeInserts = ranges
          .filter(r => r.start_time && r.end_time)
          .map(range => ({
            time_entry_id: id,
            start_time: range.start_time,
            end_time: range.end_time,
          }));

        if (rangeInserts.length > 0) {
          const { error: insertError } = await supabase
            .from("time_entry_ranges")
            .insert(rangeInserts);

          if (insertError) throw insertError;
        }
      }

      toast.success("Heures modifiées avec succès");
      await fetchTimeEntries();
    } catch (error: any) {
      console.error("Error updating time entry:", error);
      toast.error("Erreur lors de la modification");
    }
  };

  const deleteTimeEntry = async (id: string) => {
    try {
      const { error } = await supabase
        .from("time_entries")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Heures supprimées avec succès");
      await fetchTimeEntries();
    } catch (error: any) {
      console.error("Error deleting time entry:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const getUnbilledEntries = (clientId?: string) => {
    return timeEntries.filter(
      (entry) =>
        !entry.is_billed && (!clientId || entry.client_id === clientId)
    );
  };

  const markAsBilled = async (entryIds: string[], invoiceId: string) => {
    try {
      const { error } = await supabase
        .from("time_entries")
        .update({ is_billed: true, invoice_id: invoiceId })
        .in("id", entryIds);

      if (error) throw error;
      await fetchTimeEntries();
    } catch (error: any) {
      console.error("Error marking as billed:", error);
      throw error;
    }
  };

  const markAsUnbilled = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from("time_entries")
        .update({ is_billed: false, invoice_id: null })
        .eq("id", entryId);

      if (error) throw error;
      
      toast.success("Entrée marquée comme non facturée");
      await fetchTimeEntries();
    } catch (error: any) {
      console.error("Error marking as unbilled:", error);
      toast.error("Erreur lors de la modification du statut");
      throw error;
    }
  };

  useEffect(() => {
    fetchTimeEntries();
  }, [user]);

  return {
    timeEntries,
    loading,
    createTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    getUnbilledEntries,
    markAsBilled,
    markAsUnbilled,
    refetch: fetchTimeEntries,
  };
};
