import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type Client = Tables<"clients"> & {
  companies?: {
    name: string;
  };
};
type ClientInsert = TablesInsert<"clients">;
type ClientUpdate = TablesUpdate<"clients">;

export const useClients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchClients = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("clients")
        .select(`
          *,
          companies (
            name
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast({
        title: "Error",
        description: "Failed to fetch clients",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createClient = async (clientData: Omit<ClientInsert, "user_id">) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from("clients")
        .insert({ ...clientData, user_id: user.id })
        .select()
        .single();

      if (error) throw error;

      await fetchClients();
      
      toast({
        title: "Success",
        description: "Client created successfully"
      });

      return data;
    } catch (error) {
      console.error("Error creating client:", error);
      toast({
        title: "Error",
        description: "Failed to create client",
        variant: "destructive"
      });
      return null;
    }
  };

  const updateClient = async (id: string, updates: ClientUpdate) => {
    try {
      const { error } = await supabase
        .from("clients")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      await fetchClients();
      
      toast({
        title: "Success",
        description: "Client updated successfully"
      });
    } catch (error) {
      console.error("Error updating client:", error);
      toast({
        title: "Error",
        description: "Failed to update client",
        variant: "destructive"
      });
    }
  };

  const deleteClient = async (id: string) => {
    try {
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await fetchClients();
      
      toast({
        title: "Success",
        description: "Client deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting client:", error);
      toast({
        title: "Error",
        description: "Failed to delete client",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchClients();
  }, [user]);

  return {
    clients,
    loading,
    createClient,
    updateClient,
    deleteClient,
    refetch: fetchClients
  };
};