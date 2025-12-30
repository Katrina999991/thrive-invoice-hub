import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useEncryption } from "@/hooks/useEncryption";

export interface Quote {
  id: string;
  user_id: string;
  client_id: string | null;
  quote_number: string;
  issue_date: string;
  expiry_date: string | null;
  status: 'draft' | 'sent' | 'accepted' | 'refused';
  subtotal: number;
  tax_amount: number;
  tax_rate: number;
  total: number;
  notes: string | null;
  terms: string | null;
  converted_to_invoice_id: string | null;
  converted_at: string | null;
  access_token?: string | null;
  responded_at?: string | null;
  client_response_note?: string | null;
  created_at: string;
  updated_at: string;
  clients?: {
    name: string;
    contact_person: string | null;
    email: string | null;
    company_id: string | null;
    address: string | null;
    notes: string | null;
  } | null;
  quote_items?: QuoteItem[];
}

export interface QuoteItem {
  id: string;
  quote_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  product_taxes: Array<{name: string, type?: 'percentage' | 'amount', value?: number, percentage?: number}> | null;
  notes: string | null;
  products?: {
    name: string;
  } | null;
}

export interface QuoteInsert {
  client_id?: string | null;
  quote_number: string;
  issue_date?: string;
  expiry_date?: string | null;
  status?: 'draft' | 'sent' | 'accepted' | 'refused';
  subtotal?: number;
  tax_amount?: number;
  tax_rate?: number;
  total?: number;
  notes?: string | null;
  terms?: string | null;
}

export interface QuoteItemInsert {
  quote_id?: string;
  product_id?: string | null;
  description: string;
  quantity?: number;
  unit_price?: number;
  total?: number;
  product_taxes?: Array<{name: string, type?: 'percentage' | 'amount', value?: number, percentage?: number}>;
  notes?: string | null;
}

export const useQuotes = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { decryptFields } = useEncryption();

  const fetchQuotes = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("quotes")
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
          quote_items (
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
      
      // Decrypt client email/phone fields for each quote
      const quotesWithDecryptedClients = await Promise.all(
        (data || []).map(async (quote: any) => {
          if (quote.clients) {
            const decryptedClient = await decryptFields('clients', quote.clients);
            return { ...quote, clients: decryptedClient };
          }
          return quote;
        })
      );
      
      // Cast the data to our Quote type
      setQuotes(quotesWithDecryptedClients as Quote[]);
    } catch (error) {
      console.error("Error fetching quotes:", error);
      toast({
        title: "Error",
        description: "Failed to fetch quotes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createQuote = async (quoteData: QuoteInsert, items: Omit<QuoteItemInsert, "quote_id">[]) => {
    if (!user) return null;

    try {
      const cleanedQuoteData = {
        ...quoteData,
        notes: quoteData.notes?.trim() || null,
        user_id: user.id
      };

      const { data: quote, error: quoteError } = await supabase
        .from("quotes")
        .insert(cleanedQuoteData)
        .select()
        .single();

      if (quoteError) throw quoteError;

      if (items.length > 0) {
        const { error: itemsError } = await supabase
          .from("quote_items")
          .insert(items.map(item => ({ ...item, quote_id: quote.id })));

        if (itemsError) throw itemsError;
      }

      await fetchQuotes();
      
      // Invalidate dashboard cache
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      
      toast({
        title: "Success",
        description: "Quote created successfully"
      });

      return quote;
    } catch (error) {
      console.error("Error creating quote:", error);
      toast({
        title: "Error",
        description: "Failed to create quote",
        variant: "destructive"
      });
      return null;
    }
  };

  const updateQuote = async (id: string, updates: Partial<QuoteInsert>) => {
    try {
      const { error } = await supabase
        .from("quotes")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      await fetchQuotes();
      
      // Invalidate dashboard cache
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      
      toast({
        title: "Success",
        description: "Quote updated successfully"
      });
    } catch (error) {
      console.error("Error updating quote:", error);
      toast({
        title: "Error",
        description: "Failed to update quote",
        variant: "destructive"
      });
    }
  };

  const deleteQuote = async (id: string) => {
    try {
      const { error } = await supabase
        .from("quotes")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await fetchQuotes();
      
      // Invalidate dashboard cache
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      
      toast({
        title: "Success",
        description: "Quote deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting quote:", error);
      toast({
        title: "Error",
        description: "Failed to delete quote",
        variant: "destructive"
      });
    }
  };

  const duplicateQuote = async (quote: Quote) => {
    if (!user) return null;

    try {
      // Generate new quote number
      const newNumber = `DEV-${String(quotes.length + 1).padStart(3, '0')}`;
      
      const newQuoteData: QuoteInsert = {
        client_id: quote.client_id,
        quote_number: newNumber,
        issue_date: new Date().toISOString().split('T')[0],
        expiry_date: quote.expiry_date,
        status: 'draft',
        subtotal: quote.subtotal,
        tax_amount: quote.tax_amount,
        tax_rate: quote.tax_rate,
        total: quote.total,
        notes: quote.notes,
        terms: quote.terms
      };

      const items = (quote.quote_items || []).map(item => ({
        product_id: item.product_id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
        product_taxes: item.product_taxes || [],
        notes: item.notes
      }));

      return await createQuote(newQuoteData, items);
    } catch (error) {
      console.error("Error duplicating quote:", error);
      toast({
        title: "Error",
        description: "Failed to duplicate quote",
        variant: "destructive"
      });
      return null;
    }
  };

  const convertToInvoice = async (quote: Quote, createInvoiceFn: (data: any, items: any[]) => Promise<any>) => {
    if (!user || quote.status !== 'accepted') {
      toast({
        title: "Error",
        description: "Only accepted quotes can be converted to invoices",
        variant: "destructive"
      });
      return null;
    }

    try {
      // Get client's company to generate invoice number
      const { data: client } = await supabase
        .from("clients")
        .select("company_id")
        .eq("id", quote.client_id)
        .single();

      if (!client?.company_id) {
        toast({
          title: "Error",
          description: "Client must have a company assigned",
          variant: "destructive"
        });
        return null;
      }

      // Generate invoice number
      const { data: invoiceNumber, error: numberError } = await supabase
        .rpc('generate_invoice_number', { company_id: client.company_id });

      if (numberError) throw numberError;

      // Calculate due date (30 days from now by default)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      // Create the invoice
      const invoiceData = {
        invoice_number: invoiceNumber,
        client_id: quote.client_id,
        issue_date: new Date().toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        subtotal: quote.subtotal,
        tax_amount: quote.tax_amount,
        total: quote.total,
        notes: quote.notes,
        terms: quote.terms
      };

      const invoiceItems = (quote.quote_items || []).map(item => ({
        product_id: item.product_id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
        product_taxes: item.product_taxes || [],
        notes: item.notes
      }));

      const invoice = await createInvoiceFn(invoiceData, invoiceItems);

      if (invoice) {
        // Update quote with conversion reference
        await supabase
          .from("quotes")
          .update({
            converted_to_invoice_id: invoice.id,
            converted_at: new Date().toISOString()
          })
          .eq("id", quote.id);

        await fetchQuotes();

        toast({
          title: "Success",
          description: `Quote converted to invoice ${invoiceNumber}`
        });
      }

      return invoice;
    } catch (error) {
      console.error("Error converting quote to invoice:", error);
      toast({
        title: "Error",
        description: "Failed to convert quote to invoice",
        variant: "destructive"
      });
      return null;
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, [user]);

  return {
    quotes,
    loading,
    createQuote,
    updateQuote,
    deleteQuote,
    duplicateQuote,
    convertToInvoice,
    refetch: fetchQuotes
  };
};
