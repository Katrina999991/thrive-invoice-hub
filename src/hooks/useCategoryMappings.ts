import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";

interface CategoryMapping {
  id: string;
  company_id: string;
  mapping_type: "vendor" | "keyword";
  key: string;
  category_id: string;
  usage_count: number;
  last_used_at: string;
  created_at: string;
}

export const useCategoryMappings = (companyId?: string) => {
  const [mappings, setMappings] = useState<CategoryMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();

  const fetchMappings = useCallback(async () => {
    if (!user || !companyId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("expense_category_mappings")
        .select("*")
        .eq("company_id", companyId)
        .eq("user_id", user.id)
        .order("last_used_at", { ascending: false });

      if (error) throw error;
      setMappings((data as CategoryMapping[]) || []);
    } catch (error) {
      console.error("Error fetching category mappings:", error);
    } finally {
      setLoading(false);
    }
  }, [user, companyId]);

  useEffect(() => {
    fetchMappings();
  }, [fetchMappings]);

  const saveMapping = async (
    key: string,
    categoryId: string,
    mappingType: "vendor" | "keyword"
  ) => {
    if (!user || !companyId) return;

    try {
      // Check if mapping already exists
      const { data: existing } = await supabase
        .from("expense_category_mappings")
        .select("id, usage_count")
        .eq("company_id", companyId)
        .eq("user_id", user.id)
        .eq("mapping_type", mappingType)
        .eq("key", key)
        .maybeSingle();

      if (existing) {
        // Update existing mapping
        await supabase
          .from("expense_category_mappings")
          .update({
            category_id: categoryId,
            usage_count: existing.usage_count + 1,
            last_used_at: new Date().toISOString()
          })
          .eq("id", existing.id);
      } else {
        // Create new mapping
        await supabase
          .from("expense_category_mappings")
          .insert({
            company_id: companyId,
            user_id: user.id,
            mapping_type: mappingType,
            key: key,
            category_id: categoryId
          });
      }

      await fetchMappings();
    } catch (error) {
      console.error("Error saving category mapping:", error);
    }
  };

  const saveMappingsFromScan = async (
    vendorNormalized: string,
    extractedKeywords: string[],
    categoryId: string,
    wasCategoryChanged: boolean
  ) => {
    if (!user || !companyId || !categoryId) return;

    // Only save if user changed the category (learning from corrections)
    if (!wasCategoryChanged) return;

    try {
      // Always save vendor mapping if vendor exists
      if (vendorNormalized) {
        await saveMapping(vendorNormalized, categoryId, "vendor");
      }

      // Save top keywords if no vendor or as additional mappings
      const keywordsToSave = extractedKeywords.slice(0, 3);
      for (const keyword of keywordsToSave) {
        if (keyword && keyword.length > 2) {
          await saveMapping(keyword, categoryId, "keyword");
        }
      }

      console.log("Saved category mappings for future use:", {
        vendor: vendorNormalized,
        keywords: keywordsToSave,
        categoryId
      });
    } catch (error) {
      console.error("Error saving mappings from scan:", error);
    }
  };

  const clearMappings = async () => {
    if (!user || !companyId) return;

    try {
      const { error } = await supabase
        .from("expense_category_mappings")
        .delete()
        .eq("company_id", companyId)
        .eq("user_id", user.id);

      if (error) throw error;

      setMappings([]);
      toast({
        title: language === "fr" ? "Succès" : "Success",
        description: language === "fr"
          ? "Les catégories apprises ont été effacées"
          : "Learned categories have been cleared"
      });
    } catch (error) {
      console.error("Error clearing category mappings:", error);
      toast({
        title: language === "fr" ? "Erreur" : "Error",
        description: language === "fr"
          ? "Impossible d'effacer les catégories"
          : "Could not clear categories",
        variant: "destructive"
      });
    }
  };

  const clearAllMappings = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("expense_category_mappings")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;

      setMappings([]);
      toast({
        title: language === "fr" ? "Succès" : "Success",
        description: language === "fr"
          ? "Toutes les catégories apprises ont été effacées"
          : "All learned categories have been cleared"
      });
    } catch (error) {
      console.error("Error clearing all category mappings:", error);
      toast({
        title: language === "fr" ? "Erreur" : "Error",
        description: language === "fr"
          ? "Impossible d'effacer les catégories"
          : "Could not clear categories",
        variant: "destructive"
      });
    }
  };

  return {
    mappings,
    loading,
    saveMapping,
    saveMappingsFromScan,
    clearMappings,
    clearAllMappings,
    refetch: fetchMappings
  };
};
