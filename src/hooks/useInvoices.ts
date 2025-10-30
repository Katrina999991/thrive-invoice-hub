import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type Invoice = Tables<"invoices">;
type InvoiceInsert = TablesInsert<"invoices">;
type InvoiceUpdate = TablesUpdate<"invoices">;
type InvoiceItem = Tables<"invoice_items">;
type InvoiceItemInsert = TablesInsert<"invoice_items">;

export const useInvoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchInvoices = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          clients (
            name,
            contact_person,
            email,
            company_id
          ),
          invoice_items (
            id,
            description,
            notes,
            quantity,
            unit_price,
            total,
            product_id,
            product_taxes,
            products (
              name
            )
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Check for overdue invoices and update status
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const invoicesToUpdate: string[] = [];
      
      if (data) {
        for (const invoice of data) {
          // If invoice is not paid and has a due date that has passed
          if (invoice.status !== 'paid' && invoice.status !== 'overdue' && invoice.due_date) {
            const dueDate = new Date(invoice.due_date);
            dueDate.setHours(0, 0, 0, 0);
            
            if (dueDate < today) {
              invoicesToUpdate.push(invoice.id);
            }
          }
        }
        
        // Update overdue invoices in batch
        if (invoicesToUpdate.length > 0) {
          const { error: updateError } = await supabase
            .from("invoices")
            .update({ status: 'overdue' })
            .in('id', invoicesToUpdate);
          
          if (updateError) {
            console.error("Error updating overdue invoices:", updateError);
          } else {
            // Update local state to reflect changes
            data.forEach(invoice => {
              if (invoicesToUpdate.includes(invoice.id)) {
                invoice.status = 'overdue';
              }
            });
          }
        }
      }
      
      setInvoices(data || []);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast({
        title: "Error",
        description: "Failed to fetch invoices",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createInvoice = async (invoiceData: Omit<InvoiceInsert, "user_id">, items: Omit<InvoiceItemInsert, "invoice_id">[]) => {
    if (!user) return null;

    try {
      // Ensure notes is null if empty string
      const cleanedInvoiceData = {
        ...invoiceData,
        notes: invoiceData.notes?.trim() || null,
        user_id: user.id
      };

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert(cleanedInvoiceData)
        .select()
        .single();

      if (invoiceError) {
        // If duplicate invoice number, show more specific error
        if (invoiceError.code === '23505' && invoiceError.message?.includes('invoices_user_id_invoice_number_key')) {
          throw new Error('An invoice with this number already exists. Please try again.');
        }
        throw invoiceError;
      }

      // Create invoice items
      if (items.length > 0) {
        const { error: itemsError } = await supabase
          .from("invoice_items")
          .insert(items.map(item => ({ ...item, invoice_id: invoice.id })));

        if (itemsError) throw itemsError;

        // Update product quantities for items with product_id
        for (const item of items) {
          if (item.product_id && item.quantity) {
            // Get current product quantity
            const { data: product, error: productError } = await supabase
              .from("products")
              .select("quantity")
              .eq("id", item.product_id)
              .single();

            if (productError) {
              console.error("Error fetching product:", productError);
              continue;
            }

            // Only update if product has quantity tracking (not null)
            if (product?.quantity !== null) {
              const newQuantity = Math.max(0, (product.quantity || 0) - Number(item.quantity));
              
              const { error: updateError } = await supabase
                .from("products")
                .update({ quantity: newQuantity })
                .eq("id", item.product_id);

              if (updateError) {
                console.error("Error updating product quantity:", updateError);
              }
            }
          }
        }
      }

      await fetchInvoices();
      
      toast({
        title: "Success",
        description: "Invoice created successfully"
      });

      return invoice;
    } catch (error) {
      console.error("Error creating invoice:", error);
      toast({
        title: "Error",
        description: "Failed to create invoice",
        variant: "destructive"
      });
      return null;
    }
  };

  const updateInvoice = async (id: string, updates: InvoiceUpdate) => {
    try {
      const { error } = await supabase
        .from("invoices")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      await fetchInvoices();
      
      toast({
        title: "Success",
        description: "Invoice updated successfully"
      });
    } catch (error) {
      console.error("Error updating invoice:", error);
      toast({
        title: "Error",
        description: "Failed to update invoice",
        variant: "destructive"
      });
    }
  };

  const deleteInvoice = async (id: string) => {
    try {
      const { error } = await supabase
        .from("invoices")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await fetchInvoices();
      
      toast({
        title: "Success",
        description: "Invoice deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast({
        title: "Error",
        description: "Failed to delete invoice",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [user]);

  return {
    invoices,
    loading,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    refetch: fetchInvoices
  };
};