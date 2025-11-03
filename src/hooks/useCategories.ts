import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type Category = Tables<"categories">;
type CategoryInsert = TablesInsert<"categories">;
type CategoryUpdate = TablesUpdate<"categories">;

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchCategories = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (error) throw error;
      
      // If no categories exist, create default ones
      if (!data || data.length === 0) {
        await createDefaultCategories();
        // Fetch again after creating defaults
        const { data: newData, error: newError } = await supabase
          .from("categories")
          .select("*")
          .eq("user_id", user.id)
          .order("name", { ascending: true });
        
        if (newError) throw newError;
        setCategories(newData || []);
      } else {
        setCategories(data || []);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast({
        title: "Error",
        description: "Failed to fetch categories",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createDefaultCategories = async () => {
    if (!user) return;

    // Get current language from localStorage
    const language = localStorage.getItem("app-language") || "en";

    const defaultCategories = language === "fr" ? [
      { name: "Développement Web", description: "Services et produits de développement web", color: "#3b82f6", for_products: true, for_services: true, for_expenses: false },
      { name: "Développement Mobile", description: "Développement d'applications mobiles", color: "#8b5cf6", for_products: true, for_services: true, for_expenses: false },
      { name: "Logiciels", description: "Produits logiciels et licences", color: "#10b981", for_products: true, for_services: false, for_expenses: true },
      { name: "Consultation", description: "Services de consultation", color: "#f59e0b", for_products: false, for_services: true, for_expenses: false },
      { name: "Design", description: "Services de design", color: "#ec4899", for_products: true, for_services: true, for_expenses: false },
      { name: "Marketing", description: "Marketing et publicité", color: "#ef4444", for_products: true, for_services: true, for_expenses: true },
      { name: "Formation", description: "Formation et éducation", color: "#6366f1", for_products: false, for_services: true, for_expenses: true },
      { name: "Support", description: "Support technique", color: "#06b6d4", for_products: false, for_services: true, for_expenses: false },
      { name: "Bureau", description: "Fournitures et dépenses de bureau", color: "#6b7280", for_products: true, for_services: false, for_expenses: true },
      { name: "Repas", description: "Repas et divertissement", color: "#f97316", for_products: false, for_services: false, for_expenses: true },
      { name: "Voyage", description: "Frais de voyage", color: "#14b8a6", for_products: false, for_services: false, for_expenses: true },
      { name: "Services publics", description: "Services publics et utilitaires", color: "#84cc16", for_products: false, for_services: false, for_expenses: true },
      { name: "Autre", description: "Divers", color: "#a855f7", for_products: true, for_services: true, for_expenses: true },
    ] : [
      { name: "Web Development", description: "Web development services and products", color: "#3b82f6", for_products: true, for_services: true, for_expenses: false },
      { name: "Mobile Development", description: "Mobile app development", color: "#8b5cf6", for_products: true, for_services: true, for_expenses: false },
      { name: "Software", description: "Software products and licenses", color: "#10b981", for_products: true, for_services: false, for_expenses: true },
      { name: "Consulting", description: "Consulting services", color: "#f59e0b", for_products: false, for_services: true, for_expenses: false },
      { name: "Design", description: "Design services", color: "#ec4899", for_products: true, for_services: true, for_expenses: false },
      { name: "Marketing", description: "Marketing and advertising", color: "#ef4444", for_products: true, for_services: true, for_expenses: true },
      { name: "Training", description: "Training and education", color: "#6366f1", for_products: false, for_services: true, for_expenses: true },
      { name: "Support", description: "Technical support", color: "#06b6d4", for_products: false, for_services: true, for_expenses: false },
      { name: "Office", description: "Office supplies and expenses", color: "#6b7280", for_products: true, for_services: false, for_expenses: true },
      { name: "Meals", description: "Meals and entertainment", color: "#f97316", for_products: false, for_services: false, for_expenses: true },
      { name: "Travel", description: "Travel expenses", color: "#14b8a6", for_products: false, for_services: false, for_expenses: true },
      { name: "Utilities", description: "Utilities and services", color: "#84cc16", for_products: false, for_services: false, for_expenses: true },
      { name: "Other", description: "Other miscellaneous", color: "#a855f7", for_products: true, for_services: true, for_expenses: true },
    ];

    try {
      const categoriesWithUserId = defaultCategories.map(cat => ({
        ...cat,
        user_id: user.id
      }));

      const { error } = await supabase
        .from("categories")
        .insert(categoriesWithUserId);

      if (error) throw error;
    } catch (error) {
      console.error("Error creating default categories:", error);
    }
  };

  const createCategory = async (categoryData: Omit<CategoryInsert, "user_id">) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from("categories")
        .insert({ ...categoryData, user_id: user.id })
        .select()
        .single();

      if (error) throw error;

      await fetchCategories();
      
      toast({
        title: "Success",
        description: "Category created successfully"
      });

      return data;
    } catch (error) {
      console.error("Error creating category:", error);
      toast({
        title: "Error",
        description: "Failed to create category",
        variant: "destructive"
      });
      return null;
    }
  };

  const updateCategory = async (id: string, updates: CategoryUpdate) => {
    try {
      const { error } = await supabase
        .from("categories")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      await fetchCategories();
      
      toast({
        title: "Success",
        description: "Category updated successfully"
      });
    } catch (error) {
      console.error("Error updating category:", error);
      toast({
        title: "Error",
        description: "Failed to update category",
        variant: "destructive"
      });
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await fetchCategories();
      
      toast({
        title: "Success",
        description: "Category deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting category:", error);
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [user]);

  return {
    categories,
    loading,
    createCategory,
    updateCategory,
    deleteCategory,
    refetch: fetchCategories
  };
};
