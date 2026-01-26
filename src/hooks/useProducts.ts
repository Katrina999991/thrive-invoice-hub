import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { logAuditEvent } from "@/lib/auditLogger";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type Product = Tables<"products">;
type ProductInsert = TablesInsert<"products">;
type ProductUpdate = TablesUpdate<"products">;

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, username } = useAuth();
  const { toast } = useToast();

  const fetchProducts = async () => {
    if (!user) return;

    try {
      // First get companies where user is a member
      const { data: memberCompanyIds, error: memberError } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", user.id)
        .eq("status", "active");

      if (memberError) throw memberError;

      const companyIds = memberCompanyIds?.map(m => m.company_id) || [];

      let data;
      if (companyIds.length > 0) {
        // Get products from companies user is a member of
        const { data: productsData, error } = await supabase
          .from("products")
          .select(`
            *,
            companies:company_id (
              id,
              name
            ),
            clients:client_id (
              id,
              name
            )
          `)
          .in("company_id", companyIds)
          .order("created_at", { ascending: false });

        if (error) throw error;
        data = productsData;
      } else {
        // Fallback: get products owned by user
        const { data: ownedProducts, error } = await supabase
          .from("products")
          .select(`
            *,
            companies:company_id (
              id,
              name
            ),
            clients:client_id (
              id,
              name
            )
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        data = ownedProducts;
      }
      
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
      
      // Log audit event
      logAuditEvent({
        userId: user.id,
        userName: username || user.email?.split('@')[0] || 'User',
        category: 'products',
        eventType: 'product_created',
        description: `Produit créé: ${productData.name} (${productData.price}$)`,
        relatedEntityType: 'product',
        relatedEntityId: data.id,
        metadata: { name: productData.name, price: productData.price, sku: productData.sku }
      });
      
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

  const updateProduct = async (id: string, updates: ProductUpdate, skipAuditLog = false) => {
    if (!user) return;
    
    // Get current product for logging
    const currentProduct = products.find(p => p.id === id);
    const isStockAdjustment = updates.quantity !== undefined && Object.keys(updates).length === 1;
    
    try {
      const { error } = await supabase
        .from("products")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      await fetchProducts();
      
      // Log audit event (unless skipAuditLog is true - for internal operations)
      if (!skipAuditLog) {
        if (isStockAdjustment) {
          const oldQty = currentProduct?.quantity || 0;
          const newQty = updates.quantity || 0;
          const diff = newQty - oldQty;
          logAuditEvent({
            userId: user.id,
            userName: username || user.email?.split('@')[0] || 'User',
            category: 'products',
            eventType: 'stock_adjusted',
            description: `Stock ajusté: ${currentProduct?.name} (${diff > 0 ? '+' : ''}${diff})`,
            relatedEntityType: 'product',
            relatedEntityId: id,
            metadata: { name: currentProduct?.name, old_quantity: oldQty, new_quantity: newQty, difference: diff }
          });
        } else {
          logAuditEvent({
            userId: user.id,
            userName: username || user.email?.split('@')[0] || 'User',
            category: 'products',
            eventType: 'product_updated',
            description: `Produit modifié: ${currentProduct?.name}`,
            relatedEntityType: 'product',
            relatedEntityId: id,
            metadata: { name: currentProduct?.name, changes: Object.keys(updates) }
          });
        }
      }
      
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
    if (!user) return;
    
    // Get product for logging before deletion
    const productToDelete = products.find(p => p.id === id);
    
    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await fetchProducts();
      
      // Log audit event
      logAuditEvent({
        userId: user.id,
        userName: username || user.email?.split('@')[0] || 'User',
        category: 'products',
        eventType: 'product_deleted',
        description: `Produit supprimé: ${productToDelete?.name}`,
        relatedEntityType: 'product',
        relatedEntityId: id,
        metadata: { name: productToDelete?.name, sku: productToDelete?.sku }
      });
      
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
