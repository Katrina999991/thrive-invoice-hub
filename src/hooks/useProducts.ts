import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type Product = Tables<"products">;
type ProductInsert = TablesInsert<"products">;
type ProductUpdate = TablesUpdate<"products">;

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchProducts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          companies:company_id (
            id,
            name
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        title: "Error",
        description: "Failed to fetch products",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createProduct = async (productData: Omit<ProductInsert, "user_id">) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from("products")
        .insert({ ...productData, user_id: user.id })
        .select()
        .single();

      if (error) throw error;

      await fetchProducts();
      
      toast({
        title: "Success",
        description: "Product created successfully"
      });

      return data;
    } catch (error) {
      console.error("Error creating product:", error);
      toast({
        title: "Error",
        description: "Failed to create product",
        variant: "destructive"
      });
      return null;
    }
  };

  const updateProduct = async (id: string, updates: ProductUpdate) => {
    try {
      const { error } = await supabase
        .from("products")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      await fetchProducts();
      
      toast({
        title: "Success",
        description: "Product updated successfully"
      });
    } catch (error) {
      console.error("Error updating product:", error);
      toast({
        title: "Error",
        description: "Failed to update product",
        variant: "destructive"
      });
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await fetchProducts();
      
      toast({
        title: "Success",
        description: "Product deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting product:", error);
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [user]);

  return {
    products,
    loading,
    createProduct,
    updateProduct,
    deleteProduct,
    refetch: fetchProducts
  };
};