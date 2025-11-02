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
      setCategories(data || []);
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
