import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useLanguage } from "./useLanguage";
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
  profiles?: { display_name: string | null; username: string | null } | null;
  approved_by_profile?: { display_name: string | null; username: string | null } | null;
};
type TimeEntryInsert = Omit<TablesInsert<"time_entries">, "user_id"> & {
  duration_raw_minutes?: number | null;
  duration_billed_minutes?: number | null;
  source?: 'manual' | 'timer';
};
type TimeEntryUpdate = TablesUpdate<"time_entries">;

interface UseTimeEntriesOptions {
  // If true, only fetch entries owned by the current user
  filterOwnOnly?: boolean;
}

export const useTimeEntries = (options: UseTimeEntriesOptions = {}) => {
  const { filterOwnOnly = false } = options;
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { language } = useLanguage();

  const fetchTimeEntries = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // First get companies where user is a member
      const { data: memberCompanyIds, error: memberError } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", user.id)
        .eq("status", "active");

      if (memberError) throw memberError;

      const companyIds = memberCompanyIds?.map(m => m.company_id) || [];

      // We need to fetch entries from:
      // 1. Entries with company_id in user's companies
      // 2. User's own entries without company_id (legacy data)
      
      let allEntries: TimeEntry[] = [];

      // Fetch company entries
      if (companyIds.length > 0) {
        let query = supabase
          .from("time_entries")
          .select(`
            *,
            clients (name, hourly_rate),
            companies (name),
            time_entry_ranges (id, start_time, end_time)
          `)
          .in("company_id", companyIds)
          .order("date", { ascending: true })
          .order("created_at", { ascending: true });

        // If filterOwnOnly is true, only get entries created by the current user
        if (filterOwnOnly) {
          query = query.eq("user_id", user.id);
        }

        const { data: companyEntries, error } = await query;
        if (error) throw error;
        allEntries = (companyEntries || []) as TimeEntry[];
      }

      // Also fetch entries without company_id:
      // - If filterOwnOnly: only the current user's legacy entries
      // - If not filterOwnOnly (admin/owner): all team members' legacy entries
      if (!filterOwnOnly && companyIds.length > 0) {
        // Get all user_ids in the user's companies
        const { data: teamMembers, error: teamError } = await supabase
          .from("company_members")
          .select("user_id")
          .in("company_id", companyIds)
          .eq("status", "active");
        
        if (!teamError && teamMembers && teamMembers.length > 0) {
          const teamUserIds = [...new Set(teamMembers.map(m => m.user_id))];
          const { data: legacyEntries, error: legacyError } = await supabase
            .from("time_entries")
            .select(`
              *,
              clients (name, hourly_rate),
              companies (name),
              time_entry_ranges (id, start_time, end_time)
            `)
            .in("user_id", teamUserIds)
            .is("company_id", null)
            .order("date", { ascending: true })
            .order("created_at", { ascending: true });

          if (!legacyError) {
            const existingIds = new Set(allEntries.map(e => e.id));
            const newLegacy = ((legacyEntries || []) as TimeEntry[]).filter(e => !existingIds.has(e.id));
            allEntries = [...allEntries, ...newLegacy];
          }
        }
      } else {
        // Current user's own legacy entries only
        const { data: ownedEntries, error: ownedError } = await supabase
          .from("time_entries")
          .select(`
            *,
            clients (name, hourly_rate),
            companies (name),
            time_entry_ranges (id, start_time, end_time)
          `)
          .eq("user_id", user.id)
          .is("company_id", null)
          .order("date", { ascending: true })
          .order("created_at", { ascending: true });

        if (!ownedError) {
          const existingIds = new Set(allEntries.map(e => e.id));
          const legacyEntries = ((ownedEntries || []) as TimeEntry[]).filter(e => !existingIds.has(e.id));
          allEntries = [...allEntries, ...legacyEntries];
        }
      }
      
      // Sort by date and created_at
      allEntries.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.created_at.localeCompare(b.created_at);
      });

      // Fetch creator names and approver names for all entries
      const userIds = [...new Set(allEntries.map(e => e.user_id).filter(Boolean))];
      const approverIds = [...new Set(allEntries.map(e => (e as any).approved_by).filter(Boolean))];
      const allUserIds = [...new Set([...userIds, ...approverIds])];
      
      if (allUserIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .rpc("get_member_display_info", { _user_ids: allUserIds });

        console.log("Fetched profiles for time entries:", profiles, "for userIds:", allUserIds);
        
        if (!profilesError && profiles && profiles.length > 0) {
          const profileMap = new Map(profiles.map(p => [p.user_id, { display_name: p.display_name, username: p.username }]));
          allEntries = allEntries.map(entry => ({
            ...entry,
            profiles: profileMap.get(entry.user_id) || { display_name: null, username: null },
            approved_by_profile: (entry as any).approved_by ? profileMap.get((entry as any).approved_by) || null : null
          }));
        }
      }

      setTimeEntries(allEntries);
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

  const approveTimeEntry = async (entryId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from("time_entries")
        .update({ 
          approved_at: new Date().toISOString(),
          approved_by: user.id 
        })
        .eq("id", entryId);

      if (error) throw error;
      
      toast.success("Entrée approuvée");
      await fetchTimeEntries();
    } catch (error: any) {
      console.error("Error approving time entry:", error);
      toast.error("Erreur lors de l'approbation");
      throw error;
    }
  };

  const unapproveTimeEntry = async (entryId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from("time_entries")
        .update({ 
          approved_at: null,
          approved_by: null 
        })
        .eq("id", entryId);

      if (error) throw error;
      
      toast.success("Approbation annulée");
      await fetchTimeEntries();
    } catch (error: any) {
      console.error("Error unapproving time entry:", error);
      toast.error("Erreur lors de l'annulation de l'approbation");
      throw error;
    }
  };

  const archiveTimeEntry = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from("time_entries")
        .update({ is_archived: true })
        .eq("id", entryId);

      if (error) throw error;
      
      toast.success(language === "fr" ? "Entrée archivée" : "Entry archived");
      await fetchTimeEntries();
    } catch (error: any) {
      console.error("Error archiving time entry:", error);
      toast.error(language === "fr" ? "Erreur lors de l'archivage" : "Error archiving entry");
      throw error;
    }
  };

  const unarchiveTimeEntry = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from("time_entries")
        .update({ is_archived: false })
        .eq("id", entryId);

      if (error) throw error;
      
      toast.success(language === "fr" ? "Entrée désarchivée" : "Entry unarchived");
      await fetchTimeEntries();
    } catch (error: any) {
      console.error("Error unarchiving time entry:", error);
      toast.error(language === "fr" ? "Erreur lors du désarchivage" : "Error unarchiving entry");
      throw error;
    }
  };

  useEffect(() => {
    fetchTimeEntries();
  }, [user, filterOwnOnly]);

  return {
    timeEntries,
    loading,
    createTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    getUnbilledEntries,
    markAsBilled,
    markAsUnbilled,
    approveTimeEntry,
    unapproveTimeEntry,
    archiveTimeEntry,
    unarchiveTimeEntry,
    refetch: fetchTimeEntries,
  };
};
