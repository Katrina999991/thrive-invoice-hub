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
        // Check if "Bureau à domicile" / "Home Office" category exists
        const hasHomeOffice = data.some(cat => 
          (cat.name_en === "Home Office" || cat.name_fr === "Bureau à domicile") &&
          cat.for_home_office === true
        );
        
        // If not, create it
        if (!hasHomeOffice) {
          await supabase
            .from("categories")
            .insert({
              user_id: user.id,
              name: "Home Office",
              name_en: "Home Office",
              name_fr: "Bureau à domicile",
              description: "Home office expenses for self-employed",
              description_en: "Home office expenses for self-employed",
              description_fr: "Dépenses de bureau à domicile pour travailleurs autonomes",
              color: "#f97316",
              for_products: false,
              for_services: false,
              for_expenses: true,
              for_home_office: true
            });
          
          // Fetch again after adding the category
          const { data: updatedData, error: updateError } = await supabase
            .from("categories")
            .select("*")
            .eq("user_id", user.id)
            .order("name", { ascending: true });
          
          if (updateError) throw updateError;
          setCategories(updatedData || []);
        } else {
          setCategories(data || []);
        }
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

    const defaultCategories = [
      { 
        name: "Web Development", name_en: "Web Development", name_fr: "Développement Web",
        description: "Web development services and products", description_en: "Web development services and products", description_fr: "Services et produits de développement web",
        color: "#3b82f6", for_products: true, for_services: true, for_expenses: false 
      },
      { 
        name: "Mobile Development", name_en: "Mobile Development", name_fr: "Développement Mobile",
        description: "Mobile app development", description_en: "Mobile app development", description_fr: "Développement d'applications mobiles",
        color: "#8b5cf6", for_products: true, for_services: true, for_expenses: false 
      },
      { 
        name: "Software", name_en: "Software", name_fr: "Logiciels",
        description: "Software products and licenses", description_en: "Software products and licenses", description_fr: "Produits logiciels et licences",
        color: "#10b981", for_products: true, for_services: false, for_expenses: true 
      },
      { 
        name: "Consulting", name_en: "Consulting", name_fr: "Consultation",
        description: "Consulting services", description_en: "Consulting services", description_fr: "Services de consultation",
        color: "#f59e0b", for_products: false, for_services: true, for_expenses: false 
      },
      { 
        name: "Design", name_en: "Design", name_fr: "Design",
        description: "Design services", description_en: "Design services", description_fr: "Services de design",
        color: "#ec4899", for_products: true, for_services: true, for_expenses: false 
      },
      { 
        name: "Marketing", name_en: "Marketing", name_fr: "Marketing",
        description: "Marketing and advertising", description_en: "Marketing and advertising", description_fr: "Marketing et publicité",
        color: "#ef4444", for_products: true, for_services: true, for_expenses: true 
      },
      { 
        name: "Training", name_en: "Training", name_fr: "Formation",
        description: "Training and education", description_en: "Training and education", description_fr: "Formation et éducation",
        color: "#6366f1", for_products: false, for_services: true, for_expenses: true 
      },
      { 
        name: "Support", name_en: "Support", name_fr: "Support",
        description: "Technical support", description_en: "Technical support", description_fr: "Support technique",
        color: "#06b6d4", for_products: false, for_services: true, for_expenses: false 
      },
      { 
        name: "Office", name_en: "Office", name_fr: "Bureau",
        description: "Office supplies and expenses", description_en: "Office supplies and expenses", description_fr: "Fournitures et dépenses de bureau",
        color: "#6b7280", for_products: true, for_services: false, for_expenses: true 
      },
      { 
        name: "Meals", name_en: "Meals", name_fr: "Repas",
        description: "Meals and entertainment", description_en: "Meals and entertainment", description_fr: "Repas et divertissement",
        color: "#f97316", for_products: false, for_services: false, for_expenses: true 
      },
      { 
        name: "Travel", name_en: "Travel", name_fr: "Voyage",
        description: "Travel expenses", description_en: "Travel expenses", description_fr: "Frais de voyage",
        color: "#14b8a6", for_products: false, for_services: false, for_expenses: true 
      },
      { 
        name: "Utilities", name_en: "Utilities", name_fr: "Services publics",
        description: "Utilities and services", description_en: "Utilities and services", description_fr: "Services publics et utilitaires",
        color: "#84cc16", for_products: false, for_services: false, for_expenses: true 
      },
      { 
        name: "Home Office", name_en: "Home Office", name_fr: "Bureau à domicile",
        description: "Home office expenses for self-employed", description_en: "Home office expenses for self-employed", description_fr: "Dépenses de bureau à domicile pour travailleurs autonomes",
        color: "#f97316", for_products: false, for_services: false, for_expenses: true, for_home_office: true 
      },
      { 
        name: "Other", name_en: "Other", name_fr: "Autre",
        description: "Other miscellaneous", description_en: "Other miscellaneous", description_fr: "Divers",
        color: "#a855f7", for_products: true, for_services: true, for_expenses: true 
      },
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
