import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { logAuditEvent } from "@/lib/auditLogger";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type Invoice = Tables<"invoices">;
type InvoiceInsert = TablesInsert<"invoices">;
type InvoiceUpdate = TablesUpdate<"invoices">;
type InvoiceItem = Tables<"invoice_items">;
type InvoiceItemInsert = TablesInsert<"invoice_items">;

export const useInvoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, username } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const fetchInvoices = async () => {
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
        // First get client IDs from companies user is a member of
        const { data: clientsFromCompanies, error: clientsError } = await supabase
          .from("clients")
          .select("id")
          .in("company_id", companyIds);

        if (clientsError) throw clientsError;

        const clientIds = clientsFromCompanies?.map(c => c.id) || [];

        if (clientIds.length > 0) {
          // Get invoices for these clients
          const { data: invoicesData, error } = await supabase
            .from("invoices")
            .select(`
              *,
              clients (
                name,
                contact_person,
                email,
                company_id,
                address,
                notes
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
            .in("client_id", clientIds)
            .order("created_at", { ascending: false });

          if (error) throw error;
          data = invoicesData;
        } else {
          data = [];
        }
      } else {
        // Fallback: get invoices owned by user
        const { data: ownedInvoices, error } = await supabase
          .from("invoices")
          .select(`
            *,
            clients (
              name,
              contact_person,
              email,
              company_id,
              address,
              notes
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
        data = ownedInvoices;
      }

      // Check for overdue invoices and update status
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const invoicesToUpdate: string[] = [];
      
      if (data) {
        for (const invoice of data) {
          // If invoice is not paid, not draft, and has a due date that has passed
          if (invoice.status !== 'paid' && invoice.status !== 'overdue' && invoice.status !== 'draft' && invoice.due_date) {
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

  const createInvoice = async (invoiceData: Omit<InvoiceInsert, "user_id">, items: Omit<InvoiceItemInsert, "invoice_id">[], skipLimitCheck = false) => {
    if (!user) return null;

    // Check invoice limit if not skipping
    if (!skipLimitCheck) {
      const { data: limits, error: limitsError } = await supabase
        .rpc('get_user_plan_limits', { user_uuid: user.id })
        .single();

      if (limitsError) {
        console.error("Error checking limits:", limitsError);
      } else if (limits) {
        const { max_invoices_per_month, invoices_used } = limits;
        if (max_invoices_per_month !== null && invoices_used >= max_invoices_per_month) {
          const error: any = new Error('Monthly invoice limit reached');
          error.code = 'LIMIT_REACHED';
          throw error;
        }
      }
    }

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
        // If duplicate invoice number, return specific error code
        if (invoiceError.code === '23505' && invoiceError.message?.includes('invoices_user_id_invoice_number_key')) {
          const error: any = new Error('An invoice with this number already exists.');
          error.code = 'DUPLICATE_INVOICE_NUMBER';
          throw error;
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
      
      // Invalidate dashboard and plan limits cache
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["planLimits", user.id] });
      
      // Log audit event
      logAuditEvent({
        userId: user.id,
        userName: username || user.email?.split('@')[0] || 'User',
        category: 'sales',
        eventType: 'invoice_created',
        description: `Facture ${invoice.invoice_number} créée (${invoice.total}$)`,
        relatedEntityType: 'invoice',
        relatedEntityId: invoice.id,
        metadata: { invoice_number: invoice.invoice_number, total: invoice.total }
      });
      
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
    if (!user) return;
    
    try {
      // Get the current invoice for logging
      const currentInvoice = invoices.find(inv => inv.id === id);
      
      const { error } = await supabase
        .from("invoices")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      await fetchInvoices();
      
      // Invalidate dashboard cache
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      
      // Log audit event - check if marking as paid
      if (updates.status === 'paid' && currentInvoice?.status !== 'paid') {
        logAuditEvent({
          userId: user.id,
          userName: username || user.email?.split('@')[0] || 'User',
          category: 'sales',
          eventType: 'invoice_marked_paid',
          description: `Facture ${currentInvoice?.invoice_number} marquée comme payée`,
          relatedEntityType: 'invoice',
          relatedEntityId: id,
          metadata: { invoice_number: currentInvoice?.invoice_number, total: currentInvoice?.total }
        });
      } else {
        logAuditEvent({
          userId: user.id,
          userName: username || user.email?.split('@')[0] || 'User',
          category: 'sales',
          eventType: 'invoice_updated',
          description: `Facture ${currentInvoice?.invoice_number} modifiée`,
          relatedEntityType: 'invoice',
          relatedEntityId: id,
          metadata: { invoice_number: currentInvoice?.invoice_number, changes: Object.keys(updates) }
        });
      }
      
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
    if (!user) return;

    // Get the invoice for logging before deletion
    const invoiceToDelete = invoices.find(inv => inv.id === id);

    try {
      const { error } = await supabase
        .from("invoices")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // Decrement the invoice counter for this month
      const { data: subscription } = await supabase
        .from("user_subscriptions")
        .select("invoices_this_month")
        .eq("user_id", user.id)
        .single();

      if (subscription && subscription.invoices_this_month > 0) {
        const { error: updateError } = await supabase
          .from("user_subscriptions")
          .update({
            invoices_this_month: subscription.invoices_this_month - 1
          })
          .eq("user_id", user.id);

        if (updateError) {
          console.error("Error updating invoice counter:", updateError);
        }
      }

      await fetchInvoices();
      
      // Invalidate dashboard and plan limits cache
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["planLimits", user.id] });
      
      // Log audit event
      logAuditEvent({
        userId: user.id,
        userName: username || user.email?.split('@')[0] || 'User',
        category: 'sales',
        eventType: 'invoice_deleted',
        description: `Facture ${invoiceToDelete?.invoice_number} supprimée`,
        relatedEntityType: 'invoice',
        relatedEntityId: id,
        metadata: { invoice_number: invoiceToDelete?.invoice_number, total: invoiceToDelete?.total }
      });
      
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

  const archiveInvoice = async (id: string, isArchived: boolean) => {
    try {
      const { error } = await supabase
        .from("invoices")
        .update({ is_archived: isArchived })
        .eq("id", id);

      if (error) throw error;

      await fetchInvoices();
      
      toast({
        title: "Success",
        description: isArchived ? "Invoice archived successfully" : "Invoice unarchived successfully"
      });
    } catch (error) {
      console.error("Error archiving invoice:", error);
      toast({
        title: "Error",
        description: "Failed to archive invoice",
        variant: "destructive"
      });
    }
  };

  const sendFinalReminder = async (invoiceId: string, responseDueDate: string) => {
    if (!user) return;

    try {
      const invoice = invoices.find(inv => inv.id === invoiceId);
      const now = new Date().toISOString();

      // Update invoice with final reminder fields
      const { error } = await supabase
        .from("invoices")
        .update({
          final_reminder_sent: true,
          final_reminder_sent_at: now,
          final_reminder_response_due_at: responseDueDate
        } as any)
        .eq("id", invoiceId);

      if (error) throw error;

      // Send the email via the existing edge function with emailType "overdue"
      const invoiceTemplate = localStorage.getItem("invoice-template") || "classic";
      const invoiceColor = localStorage.getItem("invoice-color") || "blue";
      const hidePdfBranding = localStorage.getItem("hide-pdf-branding") === "true";

      await supabase.functions.invoke('send-invoice-email', {
        body: {
          invoiceId,
          emailType: 'overdue',
          invoiceTemplate,
          invoiceColor,
          hidePdfBranding,
          isFinalReminder: true,
          responseDueDate
        }
      });

      await fetchInvoices();

      // Invalidate dashboard cache
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });

      // Log audit event
      logAuditEvent({
        userId: user.id,
        userName: username || user.email?.split('@')[0] || 'User',
        category: 'sales',
        eventType: 'final_reminder_sent',
        description: `Dernier rappel de paiement envoyé pour la facture ${invoice?.invoice_number}. Date limite de réponse : ${responseDueDate}`,
        relatedEntityType: 'invoice',
        relatedEntityId: invoiceId,
        metadata: {
          invoice_number: invoice?.invoice_number,
          total: invoice?.total,
          response_due_date: responseDueDate,
          sent_at: now
        }
      });

      toast({
        title: "Success",
        description: "Final payment reminder sent successfully"
      });
    } catch (error) {
      console.error("Error sending final reminder:", error);
      toast({
        title: "Error",
        description: "Failed to send final reminder",
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
    archiveInvoice,
    sendFinalReminder,
    refetch: fetchInvoices
  };
};
