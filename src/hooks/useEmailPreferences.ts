import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface EmailPreferences {
  id: string;
  user_id: string;
  product_updates: boolean;
  platform_changes: boolean;
  maintenance_notifications: boolean;
  weekly_summary: boolean;
  monthly_summary: boolean;
  created_at: string;
  updated_at: string;
}

export const useEmailPreferences = () => {
  const [preferences, setPreferences] = useState<EmailPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchPreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("email_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // Create default preferences if they don't exist
        const { data: newData, error: insertError } = await supabase
          .from("email_preferences")
          .insert({ user_id: user.id })
          .select()
          .single();

        if (insertError) throw insertError;
        setPreferences(newData);
      } else {
        setPreferences(data);
      }
    } catch (error) {
      console.error("Error fetching email preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (key: keyof Omit<EmailPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>, value: boolean) => {
    if (!user || !preferences) return;

    try {
      const { error } = await supabase
        .from("email_preferences")
        .update({ [key]: value })
        .eq("user_id", user.id);

      if (error) throw error;

      setPreferences(prev => prev ? { ...prev, [key]: value } : null);
    } catch (error) {
      console.error("Error updating email preference:", error);
      toast({
        title: "Error",
        description: "Failed to update preference",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, [user]);

  return {
    preferences,
    loading,
    updatePreference,
    refetch: fetchPreferences
  };
};
