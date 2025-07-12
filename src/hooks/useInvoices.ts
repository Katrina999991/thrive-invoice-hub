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
            email
          ),
          invoice_items (
            id,
            description,
            quantity,
            unit_price,
            total,
            product_id,
            products (
              name
            )
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
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