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

export const useCategoryMappings = () => {
  const [mappings, setMappings] = useState<CategoryMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();

  const fetchMappings = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("expense_category_mappings")
        .select("*")
        .eq("user_id", user.id)
        .order("last_used_at", { ascending: false });

      if (error) throw error;
      setMappings((data as CategoryMapping[]) || []);
    } catch (error) {
      console.error("Error fetching category mappings:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMappings();
  }, [fetchMappings]);

  const saveMapping = async (
    key: string,
    categoryId: string,
    mappingType: "vendor" | "keyword",
    companyId?: string
  ) => {
    if (!user) return;

    try {
      // Check if mapping already exists (user-level, not company-level)
      const { data: existing } = await supabase
        .from("expense_category_mappings")
        .select("id, usage_count")
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
        // Create new mapping - company_id is required by schema but mappings are user-level
        await supabase
          .from("expense_category_mappings")
          .insert({
            company_id: companyId || "00000000-0000-0000-0000-000000000000",
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
    wasCategoryChanged: boolean,
    companyId?: string
  ) => {
    if (!user || !categoryId) return;

    // Only save if user changed the category (learning from corrections)
    if (!wasCategoryChanged) return;

    try {
      // Always save vendor mapping if vendor exists
      if (vendorNormalized) {
        await saveMapping(vendorNormalized, categoryId, "vendor", companyId);
      }

      // Save top keywords if no vendor or as additional mappings
      const keywordsToSave = extractedKeywords.slice(0, 3);
      for (const keyword of keywordsToSave) {
        if (keyword && keyword.length > 2) {
          await saveMapping(keyword, categoryId, "keyword", companyId);
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

  // Find suggested category based on vendor or keywords from description
  const findSuggestedCategory = (vendor?: string, description?: string): string | null => {
    if (mappings.length === 0) return null;

    // Normalize vendor for comparison
    const normalizedVendor = vendor?.toLowerCase().trim();
    
    // 1. First try to match by vendor (highest priority)
    if (normalizedVendor) {
      const vendorMapping = mappings.find(
        m => m.mapping_type === "vendor" && m.key === normalizedVendor
      );
      if (vendorMapping) {
        console.log("Found category from vendor mapping:", vendorMapping.category_id);
        return vendorMapping.category_id;
      }
    }

    // 2. Try to match by keywords from description
    if (description) {
      const keywords = description
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length >= 3);

      // Sort keyword mappings by usage count (descending) to prioritize frequently used ones
      const sortedKeywordMappings = mappings
        .filter(m => m.mapping_type === "keyword")
        .sort((a, b) => b.usage_count - a.usage_count);

      for (const keyword of keywords) {
        const keywordMapping = sortedKeywordMappings.find(m => m.key === keyword);
        if (keywordMapping) {
          console.log("Found category from keyword mapping:", keyword, keywordMapping.category_id);
          return keywordMapping.category_id;
        }
      }
    }

    return null;
  };

  const clearMappings = async () => {
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
    findSuggestedCategory,
    clearMappings,
    clearAllMappings,
    refetch: fetchMappings
  };
};
