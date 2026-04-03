import { useState, Fragment, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Eye, Edit, Download, Send, Trash2, Loader2, ExternalLink, Check, Copy, CreditCard, Archive, ArchiveRestore, X, CheckCircle, AlertTriangle, FileText, Crown, Lock, MoreHorizontal, DollarSign } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { emailTranslations, translateTemplate } from "@/lib/emailTranslations";
import { useInvoices } from "@/hooks/useInvoices";
import { useClients } from "@/hooks/useClients";
import { useCompanies } from "@/hooks/useCompanies";
import { useProducts } from "@/hooks/useProducts";
import { useLanguage } from "@/hooks/useLanguage";
import { useSubscription } from "@/hooks/useSubscription";
import { useStripeConnect } from "@/hooks/useStripeConnect";
import { useSelectedCompany } from "@/hooks/useSelectedCompany";
import { useAuthorization } from "@/hooks/useAuthorization";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { EmailReportDialog } from "@/components/EmailReportDialog";
import type { Tables } from "@/integrations/supabase/types";
import { FinalReminderDialog } from "@/components/FinalReminderDialog";
import { FormalNoticeEditorDialog } from "@/components/FormalNoticeEditorDialog";
import { useLateFees, type LateFeeRecord, resolveLateFeeSettings } from "@/hooks/useLateFees";
import type { CompanyLateFeeSettings, ClientLateFeeOverrides, ResolvedLateFeeSettings } from "@/lib/lateFeeService";

type Client = Tables<"clients">;
type Invoice = Tables<"invoices"> & {
  clients?: {
    name: string;
    contact_person: string;
    email: string;
    address?: string;
    notes?: string;
  };
  invoice_items?: Array<Tables<"invoice_items"> & {
    products?: {
      name: string;
    };
  }>;
};

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  product_id?: string;
  notes?: string;
  product_taxes?: Array<{name: string, type?: 'percentage' | 'amount', value?: number, percentage?: number}>;
}

const Invoices = () => {
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterValue, setFilterValue] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  
  // Database hooks
  const { invoices, loading, createInvoice, updateInvoice, deleteInvoice, archiveInvoice, sendFinalReminder, refetch: fetchInvoices } = useInvoices();
  const { clients } = useClients();
  const { companies } = useCompanies();
  const { products } = useProducts();
  const { isLimitReached, planLimits } = useSubscription();
  const { canCreate, canEdit, canDelete, hasPermission, selectedCompanyId: permCompanyId } = useSelectedCompany();
  const { 
    isLoading: isStripeLoading,
    stripeAccountId,
    onboardingComplete,
    loadStripeAccount,
    createPaymentLink
  } = useStripeConnect();

  // Permission checks
  const canCreateInvoices = canCreate("invoices");
  const canEditInvoices = canEdit("invoices");
  const canDeleteInvoices = canDelete("invoices");
  const canSendInvoices = hasPermission("invoices:send");
  const canArchiveInvoices = canEdit("invoices"); // Archive requires edit permission

  // Plan feature checks
  const { hasFeature, canManageBilling, planType } = useAuthorization(permCompanyId || null);
  const canUseFinalReminder = hasFeature("final_reminder_enabled");
  const canUseFormalNotice = hasFeature("formal_notice_enabled");

  // Late fees
  const { checkEligibility, applyLateFee, fetchLateFees, removeLateFee, getLateFeeTermsText, evaluateAndAutoApply, getResolvedSettings, fetchActiveLateFeeCount, applying: applyingLateFee } = useLateFees();
  const [lateFeeSettings, setLateFeeSettings] = useState<Record<string, LateFeeSettingsType>>({});
  const [lateFeeDialogInvoice, setLateFeeDialogInvoice] = useState<Invoice | null>(null);
  const [lateFeeRecords, setLateFeeRecords] = useState<LateFeeRecord[]>([]);
  const [loadingLateFees, setLoadingLateFees] = useState(false);

  // Load Stripe account info on mount
  useEffect(() => {
    loadStripeAccount();
  }, [loadStripeAccount]);

  // Load late fee settings from companies
  useEffect(() => {
    if (companies.length > 0) {
      const settingsMap: Record<string, any> = {};
      companies.forEach((c: any) => {
        settingsMap[c.id] = {
          late_fee_enabled: c.late_fee_enabled || false,
          late_fee_type: c.late_fee_type || 'none',
          late_fee_rate: c.late_fee_rate ?? null,
          late_fee_amount: c.late_fee_amount ?? null,
          late_fee_grace_days: c.late_fee_grace_days ?? 5,
          late_fee_terms_text: c.late_fee_terms_text ?? null,
          late_fee_auto_apply_enabled: c.late_fee_auto_apply_enabled || false,
          late_fee_auto_apply_mode: c.late_fee_auto_apply_mode || 'manual_only',
          late_fee_cap_amount: c.late_fee_cap_amount ?? null,
        };
      });
      setLateFeeSettings(settingsMap);
    }
  }, [companies]);

  const getLateFeeSettingsForInvoice = (invoice: any): LateFeeSettingsType | null => {
    const client = clients.find(c => c.id === invoice.client_id);
    if (!client?.company_id) return null;
    return lateFeeSettings[client.company_id] || null;
  };

  const getLateFeeEligibility = (invoice: any) => {
    const settings = getLateFeeSettingsForInvoice(invoice);
    if (!settings) return { eligible: false };
    return checkEligibility(invoice, settings);
  };

  const handleApplyLateFee = async (invoice: Invoice) => {
    const settings = getLateFeeSettingsForInvoice(invoice);
    if (!settings) return;
    const eligibility = checkEligibility(invoice, settings);
    if (!eligibility.eligible || !eligibility.calculatedAmount) return;

    const description = settings.late_fee_type === 'fixed_once'
      ? (language === 'fr' ? 'Frais de retard (fixe)' : 'Late fee (fixed)')
      : (language === 'fr' ? 'Frais de retard (mensuel)' : 'Late fee (monthly)');

    const success = await applyLateFee(invoice.id, eligibility.calculatedAmount, settings.late_fee_type, description);
    if (success) fetchInvoices();
  };

  const openLateFeeDetails = async (invoice: Invoice) => {
    setLateFeeDialogInvoice(invoice);
    setLoadingLateFees(true);
    const records = await fetchLateFees(invoice.id);
    setLateFeeRecords(records);
    setLoadingLateFees(false);
  };

  const handleDeleteLateFee = async (record: LateFeeRecord) => {
    if (!lateFeeDialogInvoice) return;
    const success = await removeLateFee(record.id, lateFeeDialogInvoice.id);
    if (success) {
      const records = await fetchLateFees(lateFeeDialogInvoice.id);
      setLateFeeRecords(records);
      fetchInvoices();
    }
  };

  // Limit dialog state
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [isReportEmailDialogOpen, setIsReportEmailDialogOpen] = useState(false);
  const [finalReminderInvoice, setFinalReminderInvoice] = useState<Invoice | null>(null);
  const [formalNoticeInvoice, setFormalNoticeInvoice] = useState<Invoice | null>(null);
  const [showFeatureUpsell, setShowFeatureUpsell] = useState<'final_reminder' | 'formal_notice' | null>(null);

  // Bulk selection state
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [bulkStatusDialogOpen, setBulkStatusDialogOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<string>("");

  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [newInvoice, setNewInvoice] = useState({
    client_id: "",
    issue_date: new Date().toISOString().split('T')[0], // Date d'aujourd'hui par défaut
    due_date: "",
    terms: "",
    notes: "",
    items: [] as InvoiceItem[]
  });

  const [currentItem, setCurrentItem] = useState({
    description: "",
    quantity: 1,
    unit_price: 0,
    product_id: "",
    notes: ""
  });

  // Raw input state to allow typing decimals like 0.5 without jumpy resets
  const [quantityInput, setQuantityInput] = useState<string>("1");
  const [unitPriceInput, setUnitPriceInput] = useState<string>("0");
  
  // Track if we're editing an existing item
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailingInvoice, setEmailingInvoice] = useState<Invoice | null>(null);
  const [emailType, setEmailType] = useState<"new" | "overdue" | "payment_confirmation">("new");
  const [emailForm, setEmailForm] = useState({
    subject: "",
    message: ""
  });
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Filter clients based on selected company
  const filteredClients = selectedCompanyId 
    ? clients.filter(client => client.company_id === selectedCompanyId)
    : clients;

  const generateInvoiceNumber = () => {
    const lastNumber = Math.max(...invoices.map(inv => parseInt(inv.invoice_number.split('-')[1]) || 0));
    return `INV-${String(lastNumber + 1).padStart(3, '0')}`;
  };

  const addItem = () => {
    if (!currentItem.description || currentItem.unit_price <= 0) return;

    // Get product taxes if a product is selected
    let productTaxes: Array<{name: string, type?: 'percentage' | 'amount', value?: number, percentage?: number}> = [];
    if (currentItem.product_id) {
      const selectedProduct = products.find(p => p.id === currentItem.product_id);
      if (selectedProduct?.taxes && Array.isArray(selectedProduct.taxes) && selectedProduct.taxes.length > 0) {
        productTaxes = selectedProduct.taxes as Array<{name: string, type?: 'percentage' | 'amount', value?: number, percentage?: number}>;
      }
    }

    const newItem: InvoiceItem = {
      description: currentItem.description,
      quantity: currentItem.quantity,
      unit_price: currentItem.unit_price,
      total: currentItem.quantity * currentItem.unit_price,
      product_id: currentItem.product_id || undefined,
      notes: currentItem.notes || undefined,
      product_taxes: productTaxes.length > 0 ? productTaxes : undefined
    };

    if (editingItemIndex !== null) {
      // Update existing item
      const updatedItems = [...newInvoice.items];
      updatedItems[editingItemIndex] = newItem;
      setNewInvoice({
        ...newInvoice,
        items: updatedItems
      });
      setEditingItemIndex(null);
    } else {
      // Add new item
      setNewInvoice({
        ...newInvoice,
        items: [...newInvoice.items, newItem]
      });
    }

    // Auto-populate unit price with client's hourly rate for next item
    const selectedClient = clients.find(client => client.id === newInvoice.client_id);
    const defaultUnitPrice = selectedClient?.hourly_rate || 0;

    setCurrentItem({
      description: "",
      quantity: 1,
      unit_price: defaultUnitPrice,
      product_id: "",
      notes: ""
    });
    setQuantityInput("1");
    setUnitPriceInput(defaultUnitPrice.toString());
  };

  const editItem = (index: number) => {
    const item = newInvoice.items[index];
    setCurrentItem({
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      product_id: item.product_id || "",
      notes: item.notes || ""
    });
    setQuantityInput(item.quantity.toString());
    setUnitPriceInput(item.unit_price.toString());
    setEditingItemIndex(index);
  };

  const cancelEditItem = () => {
    const selectedClient = clients.find(client => client.id === newInvoice.client_id);
    const defaultUnitPrice = selectedClient?.hourly_rate || 0;
    
    setCurrentItem({
      description: "",
      quantity: 1,
      unit_price: defaultUnitPrice,
      product_id: "",
      notes: ""
    });
    setQuantityInput("1");
    setUnitPriceInput(defaultUnitPrice.toString());
    setEditingItemIndex(null);
  };

  const removeItem = (index: number) => {
    setNewInvoice({
      ...newInvoice,
      items: newInvoice.items.filter((_, i) => i !== index)
    });
  };

  const calculateSubtotal = () => {
    return newInvoice.items.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateTaxes = () => {
    const selectedCompany = companies.find(c => c.id === selectedCompanyId);
    
    // Calculate taxes for each item
    let totalTax = 0;
    const taxBreakdown: Record<string, number> = {};
    
    newInvoice.items.forEach(item => {
      // First, apply company taxes (base taxes for all items)
      if (selectedCompany?.taxes && Array.isArray(selectedCompany.taxes) && selectedCompany.taxes.length > 0) {
        selectedCompany.taxes.forEach((tax: any) => {
          const taxAmount = item.total * (tax.percentage / 100);
          totalTax += taxAmount;
          taxBreakdown[tax.name] = (taxBreakdown[tax.name] || 0) + taxAmount;
        });
      }
      
      // Then, add product-specific taxes (additional taxes)
      if (item.product_taxes && item.product_taxes.length > 0) {
        item.product_taxes.forEach((tax: any) => {
          // Support both old format (percentage) and new format (type + value)
          const taxType = tax.type || 'percentage';
          const taxValue = tax.value !== undefined ? tax.value : tax.percentage;
          
          let taxAmount = 0;
          if (taxType === 'percentage') {
            taxAmount = item.total * (taxValue / 100);
          } else {
            taxAmount = taxValue * item.quantity;
          }
          
          totalTax += taxAmount;
          taxBreakdown[tax.name] = (taxBreakdown[tax.name] || 0) + taxAmount;
        });
      }
    });
    
    // Convert tax breakdown to array format
    const taxes = Object.entries(taxBreakdown).map(([name, amount]) => ({
      name,
      amount
    }));
    
    return { totalTax, taxes };
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const { totalTax } = calculateTaxes();
    return subtotal + totalTax;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCompanyId) {
      toast({
        title: "Erreur",
        description: "Vous devez sélectionner une entreprise",
        variant: "destructive"
      });
      return;
    }

    if (!newInvoice.client_id) {
      toast({
        title: "Erreur",
        description: "Vous devez sélectionner un client",
        variant: "destructive"
      });
      return;
    }

    if (!newInvoice.issue_date) {
      toast({
        title: "Erreur",
        description: "La date de facture est obligatoire",
        variant: "destructive"
      });
      return;
    }

    if (!newInvoice.due_date) {
      toast({
        title: "Erreur",
        description: "La date d'échéance est obligatoire",
        variant: "destructive"
      });
      return;
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(newInvoice.issue_date)) {
      toast({
        title: "Erreur",
        description: "Le format de la date de facture est invalide",
        variant: "destructive"
      });
      return;
    }

    if (!dateRegex.test(newInvoice.due_date)) {
      toast({
        title: "Erreur",
        description: "Le format de la date d'échéance est invalide",
        variant: "destructive"
      });
      return;
    }

    // Validate that dates are valid dates
    const issueDate = new Date(newInvoice.issue_date);
    const dueDate = new Date(newInvoice.due_date);

    if (isNaN(issueDate.getTime())) {
      toast({
        title: "Erreur",
        description: "La date de facture n'est pas valide",
        variant: "destructive"
      });
      return;
    }

    if (isNaN(dueDate.getTime())) {
      toast({
        title: "Erreur",
        description: "La date d'échéance n'est pas valide",
        variant: "destructive"
      });
      return;
    }

    // Validate that due date is not before issue date
    if (dueDate < issueDate) {
      toast({
        title: "Erreur",
        description: "La date d'échéance ne peut pas être antérieure à la date de facture",
        variant: "destructive"
      });
      return;
    }
    
    if (newInvoice.items.length === 0) {
      toast({
        title: "Erreur",
        description: "Vous devez ajouter au moins un article",
        variant: "destructive"
      });
      return;
    }

    const totalAmount = calculateTotal();
    const subtotal = calculateSubtotal();
    const { totalTax } = calculateTaxes();
    
    if (editingInvoice) {
      // Update existing invoice
      // First, delete all existing items
      const { error: deleteError } = await supabase
        .from("invoice_items")
        .delete()
        .eq("invoice_id", editingInvoice.id);
      
      if (deleteError) {
        console.error("Error deleting old items:", deleteError);
        toast({
          title: "Error",
          description: "Failed to update invoice items",
          variant: "destructive"
        });
        return;
      }
      
      // Then, insert new items
      const { error: itemsError } = await supabase
        .from("invoice_items")
        .insert(newInvoice.items.map(item => ({
          invoice_id: editingInvoice.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
          product_id: item.product_id || null,
          notes: item.notes || null,
          product_taxes: item.product_taxes || []
        })));
      
      if (itemsError) {
        console.error("Error inserting new items:", itemsError);
        toast({
          title: "Error",
          description: "Failed to update invoice items",
          variant: "destructive"
        });
        return;
      }
      
      // Finally, update the invoice itself
      await updateInvoice(editingInvoice.id, {
        client_id: newInvoice.client_id,
        due_date: newInvoice.due_date,
        terms: newInvoice.terms,
        notes: newInvoice.notes,
        subtotal: subtotal,
        tax_amount: totalTax,
        total: totalAmount
      });
    } else {
      // Retry logic for creating invoice with unique number
      let invoiceCreated = false;
      let retryCount = 0;
      const maxRetries = 3;

      while (!invoiceCreated && retryCount < maxRetries) {
        try {
          // Generate invoice number using the company's settings
          const { data: invoiceNumber, error: numberError } = await supabase
            .rpc('generate_invoice_number', { company_id: selectedCompanyId });

          if (numberError) {
            console.error('Error generating invoice number:', numberError);
            toast({
              title: "Error",
              description: "Failed to generate invoice number",
              variant: "destructive"
            });
            return;
          }

          // Create new invoice
          const result = await createInvoice({
            invoice_number: invoiceNumber,
            client_id: newInvoice.client_id,
            issue_date: newInvoice.issue_date,
            due_date: newInvoice.due_date,
            terms: newInvoice.terms,
            notes: newInvoice.notes,
            subtotal: subtotal,
            tax_amount: totalTax,
            total: totalAmount
          }, newInvoice.items);

          if (result) {
            invoiceCreated = true;
          } else {
            throw new Error('Failed to create invoice');
          }
        } catch (error: any) {
          if (error?.code === 'DUPLICATE_INVOICE_NUMBER' && retryCount < maxRetries - 1) {
            retryCount++;
            console.log(`Duplicate invoice number detected, retrying... (${retryCount}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 300));
          } else {
            console.error('Error creating invoice:', error);
            return;
          }
        }
      }

      if (!invoiceCreated) {
        toast({
          title: "Error",
          description: "Failed to create invoice with unique number after multiple attempts",
          variant: "destructive"
        });
        return;
      }
    }

    // Reset form
    setSelectedCompanyId("");
    setNewInvoice({
      client_id: "",
      issue_date: new Date().toISOString().split('T')[0],
      due_date: "",
      terms: "",
      notes: "",
      items: []
    });
    setCurrentItem({
      description: "",
      quantity: 1,
      unit_price: 0,
      product_id: "",
      notes: ""
    });
    setQuantityInput("1");
    setIsDialogOpen(false);
    setEditingInvoice(null);
    setEditingItemIndex(null);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    console.log('Editing invoice - issue_date:', invoice.issue_date, 'due_date:', invoice.due_date);
    setEditingInvoice(invoice);
    
    // Find the company ID for this invoice
    const client = clients.find(c => c.id === invoice.client_id);
    setSelectedCompanyId(client?.company_id || "");
    
    const issueDate = invoice.issue_date || new Date().toISOString().split('T')[0];
    const dueDate = invoice.due_date || "";
    
    console.log('Setting invoice state - issue_date:', issueDate, 'due_date:', dueDate);
    
    setNewInvoice({
      client_id: invoice.client_id || "",
      issue_date: issueDate,
      due_date: dueDate,
      terms: invoice.terms || "",
      notes: invoice.notes || "",
      items: invoice.invoice_items?.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
        product_id: item.product_id || "",
        notes: item.notes || "",
        // Normalize legacy and new product tax formats so fixed (amount) taxes appear in edit mode
        product_taxes: Array.isArray(item.product_taxes)
          ? (item.product_taxes as any[]).map((tax: any) => {
              const name = tax.name;
              const type: 'percentage' | 'amount' = tax.type ?? (tax.amount !== undefined ? 'amount' : 'percentage');
              const normalized: { name: string; type: 'percentage' | 'amount'; value?: number; percentage?: number } = { name, type };
              if (type === 'amount') {
                normalized.value = Number(tax.value ?? tax.amount ?? 0);
              } else {
                normalized.percentage = Number(tax.percentage ?? tax.value ?? 0);
              }
              return normalized;
            })
          : undefined
      })) || []
    });
    setIsDialogOpen(true);
    setEditingItemIndex(null);
  };

  // Bulk selection handlers
  const toggleInvoiceSelection = (invoiceId: string) => {
    setSelectedInvoices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(invoiceId)) {
        newSet.delete(invoiceId);
      } else {
        newSet.add(invoiceId);
      }
      return newSet;
    });
  };

  const toggleSelectAllInvoices = () => {
    if (selectedInvoices.size === filteredInvoices.length) {
      setSelectedInvoices(new Set());
    } else {
      setSelectedInvoices(new Set(filteredInvoices.map(inv => inv.id)));
    }
  };

  const handleBulkStatusChange = async () => {
    if (selectedInvoices.size === 0 || !bulkStatus) return;
    
    for (const invoiceId of selectedInvoices) {
      const updates: any = { status: bulkStatus };
      const invoice = invoices.find(inv => inv.id === invoiceId);
      if (invoice?.status === "paid" && bulkStatus !== "paid") {
        updates.paid_at = null;
      }
      await updateInvoice(invoiceId, updates);
    }
    
    toast({
      title: language === "fr" ? "Succès" : "Success",
      description: language === "fr" 
        ? `${selectedInvoices.size} facture(s) mise(s) à jour` 
        : `${selectedInvoices.size} invoice(s) updated`
    });
    
    setSelectedInvoices(new Set());
    setBulkStatusDialogOpen(false);
    setBulkStatus("");
  };

  const handleBulkArchive = async () => {
    if (selectedInvoices.size === 0) return;
    
    for (const invoiceId of selectedInvoices) {
      await archiveInvoice(invoiceId, !showArchived);
    }
    
    toast({
      title: language === "fr" ? "Succès" : "Success",
      description: language === "fr" 
        ? `${selectedInvoices.size} facture(s) ${showArchived ? "désarchivée(s)" : "archivée(s)"}` 
        : `${selectedInvoices.size} invoice(s) ${showArchived ? "unarchived" : "archived"}`
    });
    
    setSelectedInvoices(new Set());
  };

  const filteredInvoices = invoices.filter(invoice => {
    // Filter archived invoices
    if (!showArchived && (invoice as any).is_archived) {
      return false;
    }
    if (showArchived && !(invoice as any).is_archived) {
      return false;
    }

    // Filter by search term
    const clientName = clients.find(c => c.id === invoice.client_id)?.name || "";
    const matchesSearch = invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clientName.toLowerCase().includes(searchTerm.toLowerCase());

    // Filter by type
    if (filterType === "all") {
      return matchesSearch;
    } else if (filterType === "client") {
      return matchesSearch && (!filterValue || filterValue === "all" || invoice.client_id === filterValue);
    } else if (filterType === "company") {
      const client = clients.find(c => c.id === invoice.client_id);
      return matchesSearch && (!filterValue || filterValue === "all" || client?.company_id === filterValue);
    } else if (filterType === "status") {
      return matchesSearch && (!filterValue || filterValue === "all" || invoice.status === filterValue);
    }
    
    return matchesSearch;
  });

  // Calculate stats based on filtered invoices
  const totalAmount = filteredInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const paidAmount = filteredInvoices
    .filter(invoice => invoice.status === "paid")
    .reduce((sum, invoice) => sum + invoice.total, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "default";
      case "sent": return "outline";
      case "overdue": return "destructive";
      case "draft": return "secondary";
      default: return "secondary";
    }
  };

  const downloadInvoicePDF = async (invoice: Invoice) => {
    try {
      const { generateDocumentPdf, COLOR_PRESETS } = await import('@/lib/documentPdf');
      
      // Get template and color settings from localStorage
      const template = (localStorage.getItem("invoice-template") || "classic") as 'classic' | 'modern' | 'professional' | 'creative';
      const colorPreset = localStorage.getItem("invoice-color") || "blue";
      const customColorHex = localStorage.getItem("invoice-custom-color") || "#2563eb";
      const hideBranding = localStorage.getItem("hide-pdf-branding") === "true" && planLimits?.plan_type === 'pro';
      
      // Find client and company information
      const client = clients.find(c => c.id === invoice.client_id);
      const company = companies.find(c => c.id === client?.company_id);
      
      // Prepare custom color if needed
      let customColor: { primary: [number, number, number]; light: [number, number, number] } | undefined;
      if (colorPreset === "custom") {
        const hexToRgb = (hex: string): [number, number, number] => {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [37, 99, 235];
        };
        const primary = hexToRgb(customColorHex);
        customColor = {
          primary,
          light: [
            Math.min(255, Math.floor(primary[0] + (255 - primary[0]) * 0.85)),
            Math.min(255, Math.floor(primary[1] + (255 - primary[1]) * 0.85)),
            Math.min(255, Math.floor(primary[2] + (255 - primary[2]) * 0.85))
          ]
        };
      }
      
      // Convert invoice items to document items
      const items = (invoice.invoice_items || []).map(item => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
        notes: item.notes,
        product_taxes: item.product_taxes as any
      }));
      
      // Get late fee terms text if applicable
      const lateFeSettings = company ? lateFeeSettings[company.id] : null;
      const lateTermsText = lateFeSettings ? getLateFeeTermsText(lateFeSettings, language) : null;

      // Generate PDF using unified system
      await generateDocumentPdf({
        documentType: 'invoice',
        document: {
          document_number: invoice.invoice_number,
          issue_date: invoice.issue_date,
          due_date: invoice.due_date,
          subtotal: invoice.subtotal,
          tax_amount: invoice.tax_amount,
          total: invoice.total,
          terms: invoice.terms,
          notes: invoice.notes,
          status: invoice.status,
          items,
          late_fee_applied_total: (invoice as any).late_fee_applied_total || 0,
          late_fee_terms_text: lateTermsText,
        },
        client: client ? {
          name: client.name,
          email: client.email,
          address: client.address,
          phone: client.phone,
          contact_person: client.contact_person,
          contact_title: (client as any).contact_title,
          notes: client.notes,
          language: client.language
        } : null,
        company: company ? {
          name: company.name,
          logo_url: company.logo_url,
          email: company.email,
          phone: company.phone,
          street_address: company.street_address,
          city: company.city,
          province_state: company.province_state,
          postal_code: company.postal_code,
          tax_id: company.tax_id,
          taxes: company.taxes as any,
          invoice_body_message_en: (company as any).invoice_body_message_en,
          invoice_body_message_fr: (company as any).invoice_body_message_fr,
          invoice_footer_message: company.invoice_footer_message,
          invoice_footer_message_en: (company as any).invoice_footer_message_en,
          invoice_footer_message_fr: (company as any).invoice_footer_message_fr
        } : null,
        language: language as 'fr' | 'en',
        template,
        colorPreset: customColor ? undefined : colorPreset,
        customColor,
        hideBranding
      });
      
      toast({
        title: language === 'fr' ? "Succès" : "Success",
        description: language === 'fr' ? "PDF de la facture téléchargé avec succès !" : "Invoice PDF downloaded successfully!"
      });
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: language === 'fr' ? "Erreur" : "Error",
        description: language === 'fr' ? "Impossible de générer le PDF. Veuillez réessayer." : "Failed to generate PDF. Please try again.",
        variant: "destructive"
      });
    }
  };

  const downloadInvoiceReportPDF = async () => {
    try {
      const { generateInvoiceReportPdf } = await import('@/lib/invoiceReportPdf');
      
      const hideBranding = localStorage.getItem("hide-pdf-branding") === "true" && planLimits?.plan_type === 'pro';
      
      // Prepare invoice data for the report
      const reportData = filteredInvoices.map(invoice => ({
        invoice_number: invoice.invoice_number,
        client_name: clients.find(c => c.id === invoice.client_id)?.name || 'Unknown',
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        total: invoice.total,
        status: invoice.status
      }));

      // Get filter names for the report header
      let companyName: string | undefined;
      let clientName: string | undefined;
      let statusFilter: string | undefined;

      if (filterType === 'company' && filterValue && filterValue !== 'all') {
        companyName = companies.find(c => c.id === filterValue)?.name;
      }
      if (filterType === 'client' && filterValue && filterValue !== 'all') {
        clientName = clients.find(c => c.id === filterValue)?.name;
      }
      if (filterType === 'status' && filterValue && filterValue !== 'all') {
        statusFilter = filterValue;
      }

      await generateInvoiceReportPdf({
        invoices: reportData,
        grandTotal: totalAmount,
        companyName,
        clientName,
        statusFilter,
        language: language as 'fr' | 'en',
        hideBranding
      });

      toast({
        title: language === 'fr' ? "Succès" : "Success",
        description: language === 'fr' ? "Rapport des factures téléchargé avec succès !" : "Invoice report downloaded successfully!"
      });
    } catch (error) {
      console.error('Error generating report PDF:', error);
      toast({
        title: language === 'fr' ? "Erreur" : "Error",
        description: language === 'fr' ? "Impossible de générer le rapport. Veuillez réessayer." : "Failed to generate report. Please try again.",
        variant: "destructive"
      });
    }
  };

  const downloadInvoiceReportExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      
      // Get filter names for the report header
      let companyName = language === 'fr' ? 'Toutes les entreprises' : 'All Companies';
      let clientName = '';
      let statusFilter = '';

      if (filterType === 'company' && filterValue && filterValue !== 'all') {
        companyName = companies.find(c => c.id === filterValue)?.name || companyName;
      }
      if (filterType === 'client' && filterValue && filterValue !== 'all') {
        clientName = clients.find(c => c.id === filterValue)?.name || '';
      }
      if (filterType === 'status' && filterValue && filterValue !== 'all') {
        const statusLabels: Record<string, Record<string, string>> = {
          fr: { draft: 'Brouillon', sent: 'Envoyé', paid: 'Payé', overdue: 'En retard' },
          en: { draft: 'Draft', sent: 'Sent', paid: 'Paid', overdue: 'Overdue' }
        };
        statusFilter = statusLabels[language]?.[filterValue] || filterValue;
      }

      // Build header rows
      const headerRows: (string | number)[][] = [
        [language === 'fr' ? 'Rapport des Factures' : 'Invoice Report'],
        [`${language === 'fr' ? 'Entreprise' : 'Company'}: ${companyName}`],
      ];

      if (clientName) {
        headerRows.push([`${language === 'fr' ? 'Client' : 'Client'}: ${clientName}`]);
      }
      if (statusFilter) {
        headerRows.push([`${language === 'fr' ? 'Statut' : 'Status'}: ${statusFilter}`]);
      }

      const generatedDate = new Date().toLocaleDateString(language === 'fr' ? 'fr-CA' : 'en-CA');
      headerRows.push([`${language === 'fr' ? 'Généré le' : 'Generated on'}: ${generatedDate}`]);
      headerRows.push([]); // Empty row before table

      // Column headers
      const columnHeaders = language === 'fr' 
        ? ['N° Facture', 'Client', 'Date d\'émission', 'Date d\'échéance', 'Montant', 'Statut']
        : ['Invoice #', 'Client', 'Issue Date', 'Due Date', 'Amount', 'Status'];

      // Data rows
      const statusLabels: Record<string, Record<string, string>> = {
        fr: { draft: 'Brouillon', sent: 'Envoyé', paid: 'Payé', overdue: 'En retard' },
        en: { draft: 'Draft', sent: 'Sent', paid: 'Paid', overdue: 'Overdue' }
      };

      const dataRows = filteredInvoices.map(invoice => [
        invoice.invoice_number,
        clients.find(c => c.id === invoice.client_id)?.name || 'Unknown',
        invoice.issue_date,
        invoice.due_date || (language === 'fr' ? 'N/A' : 'N/A'),
        invoice.total,
        statusLabels[language]?.[invoice.status] || invoice.status
      ]);

      // Grand total row
      const grandTotalRow = [
        '',
        '',
        '',
        language === 'fr' ? 'Total Général' : 'Grand Total',
        totalAmount,
        ''
      ];

      // Combine all rows
      const allRows = [
        ...headerRows,
        columnHeaders,
        ...dataRows,
        grandTotalRow
      ];

      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(allRows);

      // Calculate auto column widths based on content
      const calculateWidth = (colIndex: number): number => {
        let maxWidth = columnHeaders[colIndex]?.length || 10;
        dataRows.forEach(row => {
          const cellValue = row[colIndex];
          if (cellValue !== null && cellValue !== undefined) {
            maxWidth = Math.max(maxWidth, String(cellValue).length);
          }
        });
        return Math.min(maxWidth + 3, 40);
      };

      ws['!cols'] = columnHeaders.map((_, idx) => ({ wch: calculateWidth(idx) }));

      // Add autofilter to column headers row
      const headerRowIndex = headerRows.length + 1;
      const lastCol = String.fromCharCode(65 + columnHeaders.length - 1);
      const lastRow = allRows.length;
      ws['!autofilter'] = { ref: `A${headerRowIndex}:${lastCol}${lastRow}` };

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, language === 'fr' ? 'Factures' : 'Invoices');

      // Download
      XLSX.writeFile(wb, 'Invoice Report.xlsx');

      toast({
        title: language === 'fr' ? "Succès" : "Success",
        description: language === 'fr' ? "Rapport Excel téléchargé avec succès !" : "Excel report downloaded successfully!"
      });
    } catch (error) {
      console.error('Error generating Excel:', error);
      toast({
        title: language === 'fr' ? "Erreur" : "Error",
        description: language === 'fr' ? "Impossible de générer le fichier Excel." : "Failed to generate Excel file.",
        variant: "destructive"
      });
    }
  };

  const generateInvoiceReportPdfBlob = async (): Promise<Blob | null> => {
    try {
      const { generateInvoiceReportPdf } = await import('@/lib/invoiceReportPdf');
      
      const hideBranding = localStorage.getItem("hide-pdf-branding") === "true" && planLimits?.plan_type === 'pro';
      
      const reportData = filteredInvoices.map(invoice => ({
        invoice_number: invoice.invoice_number,
        client_name: clients.find(c => c.id === invoice.client_id)?.name || 'Unknown',
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        total: invoice.total,
        status: invoice.status
      }));

      let companyName: string | undefined;
      if (filterType === 'company' && filterValue && filterValue !== 'all') {
        companyName = companies.find(c => c.id === filterValue)?.name;
      }

      let clientName: string | undefined;
      if (filterType === 'client' && filterValue && filterValue !== 'all') {
        clientName = clients.find(c => c.id === filterValue)?.name;
      }

      let statusFilter: string | undefined;
      if (filterType === 'status' && filterValue && filterValue !== 'all') {
        statusFilter = filterValue;
      }

      const blob = await generateInvoiceReportPdf({
        invoices: reportData,
        grandTotal: totalAmount,
        companyName,
        clientName,
        statusFilter,
        language: language as 'fr' | 'en',
        hideBranding,
        returnBlob: true
      });

      return blob || null;
    } catch (error) {
      console.error('Error generating report PDF blob:', error);
      return null;
    }
  };

  const openEmailDialog = async (invoice: Invoice) => {
    setEmailingInvoice(invoice);
    
    // Find client
    const client = clients.find(c => c.id === invoice.client_id);
    
    // Fetch fresh company data from database to get latest email templates
    let company = null;
    if (client?.company_id) {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', client.company_id)
        .single();
      
      if (!error && data) {
        company = data;
      }
    }
    
    // Parse and pre-select all client emails
    if (client?.email) {
      const emailsArray = client.email.split(",").map((e: string) => e.trim()).filter((e: string) => e !== "");
      setSelectedEmails(emailsArray);
    } else {
      setSelectedEmails([]);
    }
    
    // Pre-fill CC with company email
    if (company?.email) {
      setCcEmails([company.email]);
    } else {
      setCcEmails([""]);
    }
    
    if (company) {
      // Calculate template variables
      const dueDate = new Date(invoice.due_date || '');
      const today = new Date();
      const timeDiff = dueDate.getTime() - today.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
      const daysOverdue = Math.max(0, -daysDiff);
      
      const templateVars = {
        '{client_name}': client?.name || '',
        '{invoice_number}': invoice.invoice_number,
        '{issue_date}': invoice.issue_date,
        '{due_date}': invoice.due_date || 'N/A',
        '{total}': invoice.total.toFixed(2),
        '{subtotal}': invoice.subtotal.toFixed(2),
        '{tax_amount}': invoice.tax_amount.toFixed(2),
        '{company_name}': company.name,
        '{days_until_due}': daysDiff.toString(),
        '{days_overdue}': daysOverdue.toString(),
      };

      // Check client language
      const isFrench = (client?.language || '').toLowerCase().startsWith('fr');

      // Get templates based on client language
      let defaultSubject: string, defaultMessage: string;
      if (isFrench) {
        defaultSubject = (company as any).invoice_email_subject_fr || emailTranslations.fr.newInvoice.subject;
        defaultMessage = (company as any).invoice_email_message_fr || emailTranslations.fr.newInvoice.body;
      } else {
        defaultSubject = (company as any).invoice_email_subject_en || emailTranslations.en.newInvoice.subject;
        defaultMessage = (company as any).invoice_email_message_en || emailTranslations.en.newInvoice.body;
      }

      // Replace template variables
      Object.entries(templateVars).forEach(([placeholder, value]) => {
        defaultSubject = defaultSubject.replace(new RegExp(placeholder, 'g'), value);
        defaultMessage = defaultMessage.replace(new RegExp(placeholder, 'g'), value);
      });

      setEmailForm({
        subject: defaultSubject,
        message: defaultMessage
      });
    }
    
    setEmailType("new");
    setIsEmailDialogOpen(true);
  };

  const handleEmailTypeChange = async (type: "new" | "overdue" | "payment_confirmation") => {
    setEmailType(type);
    
    if (!emailingInvoice) return;
    
    const client = clients.find(c => c.id === emailingInvoice.client_id);
    
    // Fetch fresh company data from database to get latest email templates
    let company = null;
    if (client?.company_id) {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', client.company_id)
        .single();
      
      if (!error && data) {
        company = data;
      }
    }
    
    if (company) {
      const dueDate = new Date(emailingInvoice.due_date || '');
      const today = new Date();
      const timeDiff = dueDate.getTime() - today.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
      const daysOverdue = Math.max(0, -daysDiff);
      
      const templateVars = {
        '{client_name}': client?.name || '',
        '{invoice_number}': emailingInvoice.invoice_number,
        '{issue_date}': emailingInvoice.issue_date,
        '{due_date}': emailingInvoice.due_date || 'N/A',
        '{total}': emailingInvoice.total.toFixed(2),
        '{subtotal}': emailingInvoice.subtotal.toFixed(2),
        '{tax_amount}': emailingInvoice.tax_amount.toFixed(2),
        '{company_name}': company.name,
        '{days_until_due}': daysDiff.toString(),
        '{days_overdue}': daysOverdue.toString(),
      };

      // Check client language
      const isFrench = (client?.language || '').toLowerCase().startsWith('fr');

      // Default English templates
      const defaultEnglishTemplates = {
        overdue: {
          subject: 'Payment Overdue - Invoice {invoice_number}',
          message: `Dear {client_name},

This is a friendly reminder that your invoice {invoice_number} dated {issue_date} is now overdue.

Original amount: {total}
Due date: {due_date}
Days overdue: {days_overdue}

Please remit payment at your earliest convenience to avoid any late fees.

If you have already sent payment, please disregard this notice.

Thank you for your prompt attention to this matter.

Best regards,
{company_name}`
        },
        payment: {
          subject: 'Payment Confirmation - Invoice {invoice_number}',
          message: `Dear {client_name},

We have successfully received your payment for invoice {invoice_number}.

Payment details:
- Invoice: {invoice_number}
- Amount: {total}
- Date paid: ${new Date().toLocaleDateString()}

Thank you for your prompt payment and continued business!

Best regards,
{company_name}`
        },
        new: {
          subject: 'Invoice {invoice_number} from {company_name}',
          message: `Dear {client_name},

Please find attached your invoice {invoice_number} dated {issue_date}.

Amount due: {total}
Due date: {due_date}

Thank you for your business!

Best regards,
{company_name}`
        }
      };

      let subject: string, message: string;
      
      // Get templates based on client language
      if (type === "overdue") {
        if (isFrench) {
          subject = (company as any).overdue_email_subject_fr || emailTranslations.fr.overdue.subject;
          message = (company as any).overdue_email_message_fr || emailTranslations.fr.overdue.body;
        } else {
          subject = (company as any).overdue_email_subject_en || emailTranslations.en.overdue.subject;
          message = (company as any).overdue_email_message_en || emailTranslations.en.overdue.body;
        }
      } else if (type === "payment_confirmation") {
        if (isFrench) {
          subject = (company as any).payment_confirmation_email_subject_fr || emailTranslations.fr.paymentConfirmation.subject;
          message = (company as any).payment_confirmation_email_message_fr || emailTranslations.fr.paymentConfirmation.body;
        } else {
          subject = (company as any).payment_confirmation_email_subject_en || emailTranslations.en.paymentConfirmation.subject;
          message = (company as any).payment_confirmation_email_message_en || emailTranslations.en.paymentConfirmation.body;
        }
      } else {
        if (isFrench) {
          subject = (company as any).invoice_email_subject_fr || emailTranslations.fr.newInvoice.subject;
          message = (company as any).invoice_email_message_fr || emailTranslations.fr.newInvoice.body;
        } else {
          subject = (company as any).invoice_email_subject_en || emailTranslations.en.newInvoice.subject;
          message = (company as any).invoice_email_message_en || emailTranslations.en.newInvoice.body;
        }
      }

      // Replace template variables
      Object.entries(templateVars).forEach(([placeholder, value]) => {
        subject = subject.replace(new RegExp(placeholder, 'g'), value);
        message = message.replace(new RegExp(placeholder, 'g'), value);
      });

      setEmailForm({
        subject,
        message
      });
    }
  };

  const sendInvoiceEmail = async () => {
    if (!emailingInvoice || selectedEmails.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one email address",
        variant: "destructive"
      });
      return;
    }
    
    setIsSendingEmail(true);
    
    try {
      // Get template and color settings from localStorage
      const invoiceTemplate = localStorage.getItem("invoice-template") || "classic";
      const invoiceColor = localStorage.getItem("invoice-color") || "blue";
      const hidePdfBranding = localStorage.getItem("hide-pdf-branding") === "true";
      
      const { error } = await supabase.functions.invoke('send-invoice-email', {
        body: { 
          invoiceId: emailingInvoice.id,
          customSubject: emailForm.subject,
          customMessage: emailForm.message,
          emailType,
          selectedEmails,
          ccEmails: ccEmails.filter(email => email.trim() !== ""),
          invoiceTemplate,
          invoiceColor,
          hidePdfBranding
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Invoice email sent to ${selectedEmails.length} recipient(s)`,
      });
      
      // Update invoice status to sent
      await updateInvoice(emailingInvoice.id, { status: 'sent' });
      
      setIsEmailDialogOpen(false);
      setEmailingInvoice(null);
      setSelectedEmails([]);
      setCcEmails([]);
      
      // Refresh invoices to update status
      await fetchInvoices();
    } catch (error) {
      console.error('Error sending invoice email:', error);
      toast({
        title: "Error",
        description: "Failed to send invoice email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleGeneratePaymentLink = async (invoice: Invoice) => {
    // In test mode, we allow payment links as long as a Stripe account exists
    if (!stripeAccountId) {
      toast({
        title: language === "fr" ? "Stripe non configuré" : "Stripe not configured",
        description: language === "fr" 
          ? "Veuillez d'abord connecter votre compte Stripe dans les paramètres" 
          : "Please connect your Stripe account in settings first",
        variant: "destructive",
      });
      return;
    }

    const paymentLink = await createPaymentLink(invoice.id);
    if (paymentLink) {
      await fetchInvoices(); // Refresh to get updated invoice with payment link
    }
  };

  const copyPaymentLink = (link: string, invoiceNumber: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(invoiceNumber);
    toast({
      title: language === "fr" ? "Lien copié" : "Link copied",
      description: language === "fr" 
        ? "Le lien de paiement a été copié dans le presse-papiers" 
        : "Payment link has been copied to clipboard",
    });
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleCreateInvoiceClick = () => {
    if (isLimitReached('invoices')) {
      setShowLimitDialog(true);
    } else {
      setEditingItemIndex(null);
      setIsDialogOpen(true);
    }
  };

  if (loading) {
    return <div>{t("invoices.loading")}</div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t("invoices.title")}</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {t("invoices.subtitle")}
          </p>
        </div>
        {canCreateInvoices && (
          <Button onClick={handleCreateInvoiceClick} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            {t("invoices.createButton")}
          </Button>
        )}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingInvoice ? t("invoices.dialog.edit") : t("invoices.dialog.create")}</DialogTitle>
              <DialogDescription>
                {editingInvoice ? t("invoices.dialog.editDesc") : t("invoices.dialog.createDesc")}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company">{t("invoices.selectCompany")} <span className="text-destructive">*</span></Label>
                  <Select
                    value={selectedCompanyId} 
                    onValueChange={(value) => {
                      setSelectedCompanyId(value);
                      
                      // Calculate due date based on company's default_due_days
                      const selectedCompany = companies.find(c => c.id === value);
                      let updates: any = {
                        client_id: "" // Reset client selection when company changes
                      };
                      
                      if (selectedCompany?.default_due_days && newInvoice.issue_date) {
                        const issueDate = new Date(newInvoice.issue_date);
                        const dueDate = new Date(issueDate);
                        dueDate.setDate(issueDate.getDate() + selectedCompany.default_due_days);
                        updates.due_date = dueDate.toISOString().split('T')[0];
                      }
                      
                      setNewInvoice({
                        ...newInvoice,
                        ...updates
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("invoices.companyPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{company.name}</span>
                            {company.contact_person && (
                              <span className="text-sm text-muted-foreground">{company.contact_person}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client">{t("invoices.selectClient")} <span className="text-destructive">*</span></Label>
                  <Select
                    value={newInvoice.client_id} 
                    onValueChange={(value) => {
                      setNewInvoice({
                        ...newInvoice, 
                        client_id: value
                      });
                      
                      // Auto-populate unit price with client's hourly rate
                      const selectedClient = clients.find(client => client.id === value);
                      const defaultUnitPrice = selectedClient?.hourly_rate || 0;
                      
                      setCurrentItem({
                        ...currentItem,
                        unit_price: defaultUnitPrice
                      });
                    }}
                    disabled={!selectedCompanyId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={selectedCompanyId ? t("invoices.clientPlaceholder") : t("invoices.clientPlaceholderNoCompany")} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredClients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{client.name}</span>
                            <span className="text-sm text-muted-foreground">{(client as any).contact_title ? `${(client as any).contact_title} ${client.contact_person}` : client.contact_person}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="issue_date">{t("invoices.issueDate")} <span className="text-destructive">*</span></Label>
                  <Input
                    id="issue_date"
                    type="date"
                    value={newInvoice.issue_date}
                    onChange={(e) => {
                      console.log('Issue date changed:', e.target.value);
                      const issueDate = new Date(e.target.value);
                      
                      // Validate date is valid
                      if (isNaN(issueDate.getTime())) {
                        console.error('Invalid issue date:', e.target.value);
                        return;
                      }
                      
                      const selectedCompany = companies.find(c => c.id === selectedCompanyId);
                      const dueDays = selectedCompany?.default_due_days || 7;
                      const dueDate = new Date(issueDate);
                      dueDate.setDate(dueDate.getDate() + dueDays);
                      
                      const newDueDate = dueDate.toISOString().split('T')[0];
                      console.log('Calculated due date:', newDueDate);
                      
                      setNewInvoice({
                        ...newInvoice, 
                        issue_date: e.target.value,
                        due_date: newDueDate
                      });
                    }}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due_date">{t("invoices.dueDate")} <span className="text-destructive">*</span></Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={newInvoice.due_date}
                    onChange={(e) => {
                      console.log('Due date changed:', e.target.value);
                      setNewInvoice({...newInvoice, due_date: e.target.value});
                    }}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="terms">{t("invoices.terms")}</Label>
                  <Input
                    id="terms"
                    placeholder={t("invoices.termsPlaceholder")}
                    value={newInvoice.terms}
                    onChange={(e) => setNewInvoice({...newInvoice, terms: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">{t("invoices.notes")}</Label>
                  <Input
                    id="notes"
                    placeholder={t("invoices.notesPlaceholder")}
                    value={newInvoice.notes}
                    onChange={(e) => setNewInvoice({...newInvoice, notes: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">{t("invoices.addItems")} <span className="text-destructive">*</span></h3>
                
                {/* Product Selector */}
                <div className="space-y-2">
                  <Label htmlFor="product">{t("invoices.selectProduct")}</Label>
                  <Select 
                    value={currentItem.product_id} 
                    onValueChange={(value) => {
                      if (value === "new") {
                        // Open products page or show add product form
                        toast({
                          title: "Add New Product",
                          description: "Please go to Products page to add new products/services first."
                        });
                        return;
                      }
                      
                      if (value === "custom") {
                        // Reset to custom entry
                        setCurrentItem({
                          ...currentItem,
                          product_id: "",
                          description: "",
                          unit_price: 0
                        });
                        setUnitPriceInput("0");
                        return;
                      }

                      // Auto-fill from selected product
                      const selectedProduct = products.find(p => p.id === value);
                      if (selectedProduct) {
                        setCurrentItem({
                          ...currentItem,
                          product_id: value,
                          description: selectedProduct.name,
                          unit_price: selectedProduct.price
                        });
                        setUnitPriceInput(selectedProduct.price.toString());
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("invoices.productPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">
                        <div className="flex items-center">
                          <Plus className="h-4 w-4 mr-2" />
                          {t("invoices.customItem")}
                        </div>
                      </SelectItem>
                      <SelectItem value="new">
                        <div className="flex items-center">
                          <Plus className="h-4 w-4 mr-2" />
                          {t("invoices.addNewProduct")}
                        </div>
                      </SelectItem>
                      {products.filter(p => p.is_active).map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{product.name}</span>
                            <span className="text-sm text-muted-foreground">
                              ${product.price.toFixed(2)} {product.unit && `per ${product.unit}`}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-3">
                    <Label htmlFor="description">{t("invoices.description")}</Label>
                    <Input
                      id="description"
                      placeholder={t("invoices.descPlaceholder")}
                      value={currentItem.description}
                      onChange={(e) => setCurrentItem({...currentItem, description: e.target.value})}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="quantity">{t("invoices.quantity")}</Label>
                    <Input
                      id="quantity"
                      type="text"
                      inputMode="decimal"
                      value={quantityInput}
                      onChange={(e) => {
                        // Allow free typing of numbers, dots, and commas
                        setQuantityInput(e.target.value);
                      }}
                      onBlur={() => {
                        const normalized = quantityInput.replace(',', '.').trim();
                        const parsed = parseFloat(normalized);
                        const safe = !isNaN(parsed) && parsed > 0 ? parsed : 1;
                        const clamped = safe < 0.01 ? 0.01 : safe;
                        setCurrentItem({ ...currentItem, quantity: clamped });
                        setQuantityInput(clamped.toString());
                      }}
                      placeholder="1"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="unit_price">{t("invoices.unitPrice")}</Label>
                    <Input
                      id="unit_price"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={unitPriceInput}
                      onChange={(e) => setUnitPriceInput(e.target.value)}
                      onBlur={() => {
                        const normalized = unitPriceInput.replace(',', '.').trim();
                        const parsed = parseFloat(normalized);
                        const safe = !isNaN(parsed) && parsed >= 0 ? parsed : 0;
                        const fixed = Number.isFinite(safe) ? parseFloat(safe.toFixed(2)) : 0;
                        setCurrentItem({ ...currentItem, unit_price: fixed });
                        setUnitPriceInput(fixed.toFixed(2));
                      }}
                    />
                  </div>
                  <div className="col-span-3">
                    <Label htmlFor="item_notes">{t("invoices.itemNotes")}</Label>
                    <Input
                      id="item_notes"
                      placeholder={t("invoices.itemNotesPlaceholder")}
                      value={currentItem.notes}
                      onChange={(e) => setCurrentItem({...currentItem, notes: e.target.value})}
                    />
                  </div>
                  <div className="col-span-2 flex gap-2">
                    <Button type="button" onClick={addItem} className="flex-1">
                      {editingItemIndex !== null ? (
                        <>
                          <Edit className="h-4 w-4 mr-1" />
                          {t("invoices.updateItem")}
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-1" />
                          {t("invoices.addItemButton")}
                        </>
                      )}
                    </Button>
                    {editingItemIndex !== null && (
                      <Button type="button" variant="outline" onClick={cancelEditItem}>
                        {t("invoices.cancel")}
                      </Button>
                    )}
                  </div>
                </div>

                {newInvoice.items.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium">{t("invoices.invoiceItems")}</h4>
                    <div className="border rounded-lg">
                      <Table>
                         <TableHeader>
                           <TableRow>
                              <TableHead>Description</TableHead>
                              <TableHead>Notes</TableHead>
                              <TableHead>Qty</TableHead>
                              <TableHead>Unit Price</TableHead>
                              <TableHead>Total</TableHead>
                              <TableHead className="w-24"></TableHead>
                           </TableRow>
                         </TableHeader>
                         <TableBody>
                           {newInvoice.items.map((item, index) => (
                             <Fragment key={`item-block-${index}`}>
                               <TableRow key={`item-${index}`}>
                                 <TableCell className="font-medium">{item.description}</TableCell>
                                 <TableCell className="text-sm text-muted-foreground">{item.notes || "-"}</TableCell>
                                 <TableCell>{item.quantity}</TableCell>
                                 <TableCell>${item.unit_price.toFixed(2)}</TableCell>
                                 <TableCell>${item.total.toFixed(2)}</TableCell>
                                  <TableCell>
                                    <div className="flex gap-1">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => editItem(index)}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => removeItem(index)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                               </TableRow>
                             </Fragment>
                           ))}
                           <TableRow>
                             <TableCell colSpan={4} className="text-right font-medium">
                               Subtotal:
                             </TableCell>
                             <TableCell className="font-medium">
                               ${calculateSubtotal().toFixed(2)}
                             </TableCell>
                             <TableCell></TableCell>
                           </TableRow>
                           {(() => {
                             const { taxes } = calculateTaxes();
                             if (taxes.length === 0) {
                               return (
                                 <TableRow>
                                   <TableCell colSpan={4} className="text-right font-medium">
                                     Tax:
                                   </TableCell>
                                   <TableCell className="font-medium">
                                     $0.00
                                   </TableCell>
                                   <TableCell></TableCell>
                                 </TableRow>
                               );
                             }
                             
                              return taxes.map((tax, index) => (
                                <TableRow key={index}>
                                  <TableCell colSpan={4} className="text-right font-medium">
                                    {tax.name}:
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    ${tax.amount.toFixed(2)}
                                  </TableCell>
                                  <TableCell></TableCell>
                                </TableRow>
                              ));
                           })()}
                           <TableRow className="border-t-2">
                             <TableCell colSpan={4} className="text-right font-bold">
                               Total Amount:
                             </TableCell>
                             <TableCell className="font-bold text-lg">
                               ${calculateTotal().toFixed(2)}
                             </TableCell>
                             <TableCell></TableCell>
                           </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => {
                  setSelectedCompanyId("");
                  setNewInvoice({
                    client_id: "",
                    issue_date: new Date().toISOString().split('T')[0],
                    due_date: "",
                    terms: "",
                    notes: "",
                    items: []
                  });
                  setCurrentItem({
                    description: "",
                    quantity: 1,
                    unit_price: 0,
                    product_id: "",
                    notes: ""
                  });
                  setQuantityInput("1");
                  setEditingInvoice(null);
                  setEditingItemIndex(null);
                  setIsDialogOpen(false);
                }} className="flex-1">
                  {t("invoices.cancel")}
                </Button>
                <Button type="submit" className="flex-1" disabled={newInvoice.items.length === 0}>
                  {editingInvoice ? t("invoices.updateInvoice") : t("invoices.createButton")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* View Invoice Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Invoice Details</DialogTitle>
              <DialogDescription>
                View invoice information
              </DialogDescription>
            </DialogHeader>
            {viewingInvoice && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Invoice Number</Label>
                    <p className="text-lg font-semibold">{viewingInvoice.invoice_number}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                    <div className="mt-1">
                      <Badge variant={getStatusColor(viewingInvoice.status) as any}>
                        {viewingInvoice.status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Client</Label>
                    <p className="text-lg">
                      {clients.find(c => c.id === viewingInvoice.client_id)?.name || 'Unknown Client'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Amount</Label>
                    <p className="text-lg font-semibold">${viewingInvoice.total.toFixed(2)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Issue Date</Label>
                    <p>{viewingInvoice.issue_date}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Due Date</Label>
                    <p>{viewingInvoice.due_date}</p>
                  </div>
                </div>

                {/* Invoice Items Table */}
                {viewingInvoice.invoice_items && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-muted-foreground">Invoice Items</Label>
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Unit Price</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                         <TableBody>
                           {viewingInvoice.invoice_items.map((item) => (
                             <Fragment key={`item-block-${item.id}`}>
                               <TableRow key={`item-${item.id}`}>
                                 <TableCell className="font-medium">{item.description}</TableCell>
                                 <TableCell className="text-right">{item.quantity}</TableCell>
                                 <TableCell className="text-right">${item.unit_price.toFixed(2)}</TableCell>
                                 <TableCell className="text-right font-medium">${item.total.toFixed(2)}</TableCell>
                               </TableRow>
                               {item.notes && (
                                  <TableRow key={`notes-${item.id}`} className="bg-muted/10">
                                    <TableCell colSpan={4} className="text-sm text-muted-foreground pl-8">
                                      {t("invoices.itemNotes")}: {item.notes}
                                    </TableCell>
                                  </TableRow>
                                )}
                             </Fragment>
                           ))}
                            <TableRow className="bg-muted/30">
                              <TableCell colSpan={3} className="text-right font-medium">
                                Subtotal:
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                ${viewingInvoice.subtotal.toFixed(2)}
                              </TableCell>
                            </TableRow>
                            {(() => {
                              // Get company for this invoice
                              const client = clients.find(c => c.id === viewingInvoice.client_id);
                              const company = companies.find(c => c.id === client?.company_id);
                              
                              // If company has taxes, display them separately
                              if (company?.taxes && Array.isArray(company.taxes) && company.taxes.length > 0) {
                                return company.taxes.map((tax: any, index: number) => {
                                  const taxAmount = viewingInvoice.subtotal * (tax.percentage / 100);
                                  return (
                                    <TableRow key={`company-tax-${index}`} className="bg-muted/30">
                                      <TableCell colSpan={3} className="text-right font-medium">
                                        {tax.name} ({tax.percentage}%):
                                      </TableCell>
                                      <TableCell className="text-right font-medium">
                                        ${taxAmount.toFixed(2)}
                                      </TableCell>
                                    </TableRow>
                                  );
                                });
                              } else if (viewingInvoice.tax_amount > 0) {
                                // Fallback to generic tax display
                                return (
                                  <TableRow className="bg-muted/30">
                                    <TableCell colSpan={3} className="text-right font-medium">
                                      Tax:
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                      ${viewingInvoice.tax_amount.toFixed(2)}
                                    </TableCell>
                                  </TableRow>
                                );
                              }
                              return null;
                            })()}
                            <TableRow className="bg-muted/50 border-t-2">
                              <TableCell colSpan={3} className="text-right font-semibold">
                                Total Amount:
                              </TableCell>
                              <TableCell className="text-right font-bold text-lg">
                                ${viewingInvoice.total.toFixed(2)}
                              </TableCell>
                            </TableRow>
                            {(viewingInvoice as any).late_fee_applied_total > 0 && (
                              <>
                                <TableRow className="bg-amber-50 dark:bg-amber-950/20">
                                  <TableCell colSpan={3} className="text-right font-medium text-amber-700 dark:text-amber-400">
                                    {language === 'fr' ? 'Frais de retard :' : 'Late fee:'}
                                  </TableCell>
                                  <TableCell className="text-right font-medium text-amber-700 dark:text-amber-400">
                                    ${((viewingInvoice as any).late_fee_applied_total).toFixed(2)}
                                  </TableCell>
                                </TableRow>
                                <TableRow className="bg-amber-50 dark:bg-amber-950/20 border-t">
                                  <TableCell colSpan={3} className="text-right font-bold">
                                    {language === 'fr' ? 'Solde dû :' : 'Balance due:'}
                                  </TableCell>
                                  <TableCell className="text-right font-bold text-lg">
                                    ${(viewingInvoice.total + (viewingInvoice as any).late_fee_applied_total).toFixed(2)}
                                  </TableCell>
                                </TableRow>
                              </>
                            )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* Final Reminder Info in View Dialog */}
                {viewingInvoice && (viewingInvoice as any).final_reminder_sent && (
                  <div className="p-4 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <span className="font-medium text-amber-800 dark:text-amber-300">{t("invoices.finalReminderSent")}</span>
                    </div>
                    <div className="text-sm text-amber-700 dark:text-amber-400 space-y-1">
                      <p>{t("invoices.finalReminderSentOn")}: {new Date((viewingInvoice as any).final_reminder_sent_at).toLocaleDateString(language === "fr" ? "fr-CA" : "en-CA")}</p>
                      {(viewingInvoice as any).final_reminder_response_due_at && (
                        <p>{t("invoices.responseExpectedBefore")}: {new Date((viewingInvoice as any).final_reminder_response_due_at).toLocaleDateString(language === "fr" ? "fr-CA" : "en-CA")}</p>
                      )}
                      {(viewingInvoice as any).final_reminder_recipient && (
                        <p>{language === "fr" ? "Envoyé à" : "Sent to"}: {(viewingInvoice as any).final_reminder_recipient}</p>
                      )}
                      {(viewingInvoice as any).final_reminder_email_subject && (
                        <p>{language === "fr" ? "Objet" : "Subject"}: {(viewingInvoice as any).final_reminder_email_subject}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Late Fee Info in View Dialog */}
                {viewingInvoice && (viewingInvoice as any).late_fee_applied_total > 0 && (
                  <div className="p-4 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-4 w-4 text-amber-600" />
                      <span className="font-medium text-amber-800 dark:text-amber-300">
                        {language === 'fr' ? 'Frais de retard' : 'Late Fees'}
                      </span>
                    </div>
                    <div className="text-sm text-amber-700 dark:text-amber-400 space-y-1">
                      <p>{language === 'fr' ? 'Total des frais' : 'Total fees'}: ${((viewingInvoice as any).late_fee_applied_total).toFixed(2)}</p>
                      <p className="font-semibold">{language === 'fr' ? 'Total avec frais' : 'Total with fees'}: ${(viewingInvoice.total + (viewingInvoice as any).late_fee_applied_total).toFixed(2)}</p>
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button onClick={() => setIsViewDialogOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">{t("invoices.totalInvoices")}</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-lg md:text-2xl font-bold">{filteredInvoices.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">{t("invoices.totalAmountLabel")}</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-lg md:text-2xl font-bold">${totalAmount.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">{t("invoices.paidAmount")}</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-lg md:text-2xl font-bold text-green-600">${paidAmount.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">{t("invoices.outstanding")}</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-lg md:text-2xl font-bold text-orange-600">${(totalAmount - paidAmount).toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder={t("invoices.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 md:flex md:gap-4">
          <Select value={filterType} onValueChange={(value) => {
            setFilterType(value);
            setFilterValue("");
          }}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder={t("invoices.filterBy")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("invoices.allInvoices")}</SelectItem>
              <SelectItem value="client">{t("invoices.byClient")}</SelectItem>
              <SelectItem value="company">{t("invoices.byCompany")}</SelectItem>
              <SelectItem value="status">Par statut</SelectItem>
            </SelectContent>
          </Select>
          {filterType === "client" && (
            <Select value={filterValue} onValueChange={setFilterValue}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder={t("invoices.clientPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("invoices.clientAll")}</SelectItem>
                {clients && clients.length > 0 ? clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name || 'Unnamed Client'}
                  </SelectItem>
                )) : (
                  <SelectItem value="" disabled>No clients available</SelectItem>
                )}
              </SelectContent>
            </Select>
          )}
          {filterType === "company" && (
            <Select value={filterValue} onValueChange={setFilterValue}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder={t("invoices.companyPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("invoices.companyAll")}</SelectItem>
                {companies && companies.length > 0 ? companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name || 'Unnamed Company'}
                  </SelectItem>
                )) : (
                  <SelectItem value="" disabled>No companies available</SelectItem>
                )}
              </SelectContent>
            </Select>
          )}
          {filterType === "status" && (
            <Select value={filterValue} onValueChange={setFilterValue}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Sélectionner un statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="draft">Brouillon</SelectItem>
                <SelectItem value="sent">Envoyé</SelectItem>
                <SelectItem value="paid">Payé</SelectItem>
                <SelectItem value="overdue">En retard</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Button
            variant={showArchived ? "default" : "outline"}
            onClick={() => setShowArchived(!showArchived)}
            className="col-span-1"
          >
            {showArchived ? <ArchiveRestore className="h-4 w-4 mr-2" /> : <Archive className="h-4 w-4 mr-2" />}
            <span className="hidden sm:inline">{showArchived ? (language === "fr" ? "Actives" : "Active") : (language === "fr" ? "Archivées" : "Archived")}</span>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base md:text-lg">{t("invoices.listTitle")}</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                {t("invoices.listDesc")}
              </CardDescription>
            </div>
            {selectedInvoices.size > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">
                  {selectedInvoices.size} {language === "fr" ? "sélectionné(s)" : "selected"}
                </span>
                {canEditInvoices && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setBulkStatusDialogOpen(true)}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {language === "fr" ? "Statut" : "Status"}
                  </Button>
                )}
                {canArchiveInvoices && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleBulkArchive}
                  >
                    {showArchived ? <ArchiveRestore className="h-4 w-4 mr-2" /> : <Archive className="h-4 w-4 mr-2" />}
                    {showArchived 
                      ? (language === "fr" ? "Désarchiver" : "Unarchive")
                      : (language === "fr" ? "Archiver" : "Archive")}
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedInvoices(new Set())}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {filteredInvoices.map((invoice) => {
              const isOverdueOrSent = invoice.status !== 'paid' && invoice.status !== 'draft';
              const hasPaymentLink = !!invoice.payment_link;
              
              return (
              <Card key={invoice.id} className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="font-medium">{invoice.invoice_number}</div>
                    <div className="text-sm text-muted-foreground truncate">
                      {clients.find(c => c.id === invoice.client_id)?.name || 'Unknown'}
                    </div>
                  </div>
                  <Badge variant={getStatusColor(invoice.status) as any} className="shrink-0">
                    {invoice.status === 'draft' && t("invoices.statusDraft")}
                    {invoice.status === 'sent' && t("invoices.statusSent")}
                    {invoice.status === 'paid' && t("invoices.statusPaid")}
                    {invoice.status === 'overdue' && t("invoices.statusOverdue")}
                  </Badge>
                  {(invoice as any).final_reminder_sent && (
                    <Badge variant="outline" className="shrink-0 border-amber-500 text-amber-700 dark:text-amber-400 text-[10px]">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {t("invoices.finalReminderSent")}
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div>
                    <span className="text-muted-foreground">{language === 'fr' ? 'Montant:' : 'Amount:'}</span>
                    <span className="ml-1 font-medium">${invoice.total.toFixed(2)}</span>
                    {(invoice as any).late_fee_applied_total > 0 && (
                      <span className="block text-xs text-amber-600">
                        +${((invoice as any).late_fee_applied_total).toFixed(2)} {language === 'fr' ? 'frais de retard' : 'late fees'}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{language === 'fr' ? 'Échéance:' : 'Due:'}</span>
                    <span className="ml-1">{invoice.due_date}</span>
                  </div>
                </div>
                {(invoice as any).final_reminder_sent && (
                  <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded p-2 mb-3 space-y-0.5">
                    <p>{t("invoices.finalReminderSentOn")}: {new Date((invoice as any).final_reminder_sent_at).toLocaleDateString(language === "fr" ? "fr-CA" : "en-CA")}</p>
                    {(invoice as any).final_reminder_response_due_at && (
                      <p>{t("invoices.responseExpectedBefore")}: {new Date((invoice as any).final_reminder_response_due_at).toLocaleDateString(language === "fr" ? "fr-CA" : "en-CA")}</p>
                    )}
                    {(invoice as any).final_reminder_recipient && (
                      <p>{language === "fr" ? "Envoyé à" : "Sent to"}: {(invoice as any).final_reminder_recipient}</p>
                    )}
                  </div>
                )}
                <div className="flex gap-2 items-center">
                  {/* Primary actions visible directly */}
                  <Button variant="outline" size="sm" onClick={() => {
                    setViewingInvoice(invoice);
                    setIsViewDialogOpen(true);
                  }}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  {canEditInvoices && (
                    <Button variant="outline" size="sm" onClick={() => handleEditInvoice(invoice)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => downloadInvoicePDF(invoice)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  {canSendInvoices && (
                    <Button variant="outline" size="sm" onClick={() => openEmailDialog(invoice)}>
                      <Send className="h-4 w-4" />
                    </Button>
                  )}

                  {/* More actions dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      {/* Final Reminder */}
                      {isOverdueOrSent && canSendInvoices && (
                        <DropdownMenuItem
                          className={canUseFinalReminder 
                            ? "text-amber-700 dark:text-amber-400" 
                            : "text-muted-foreground opacity-60"}
                          onClick={() => canUseFinalReminder ? setFinalReminderInvoice(invoice) : setShowFeatureUpsell('final_reminder')}
                        >
                          {canUseFinalReminder ? <AlertTriangle className="h-4 w-4 mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                          {canUseFinalReminder 
                            ? ((invoice as any).final_reminder_sent ? t("invoices.resendFinalReminder") : t("invoices.sendFinalReminder"))
                            : (language === 'fr' ? 'Dernier rappel (Premium)' : 'Final reminder (Premium)')
                          }
                        </DropdownMenuItem>
                      )}

                      {/* Formal Notice */}
                      {isOverdueOrSent && canSendInvoices && (
                        <DropdownMenuItem
                          className={canUseFormalNotice 
                            ? "text-destructive" 
                            : "text-muted-foreground opacity-60"}
                          onClick={() => canUseFormalNotice ? setFormalNoticeInvoice(invoice) : setShowFeatureUpsell('formal_notice')}
                        >
                          {canUseFormalNotice ? <FileText className="h-4 w-4 mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                          {canUseFormalNotice 
                            ? (language === 'fr' ? 'Mise en demeure' : 'Formal notice')
                            : (language === 'fr' ? 'Mise en demeure (Pro)' : 'Formal notice (Pro)')
                          }
                        </DropdownMenuItem>
                      )}

                      {/* Payment Link - Copy */}
                      {stripeAccountId && invoice.status !== "paid" && hasPaymentLink && (
                        <DropdownMenuItem onClick={() => copyPaymentLink(invoice.payment_link!, invoice.invoice_number)}>
                          {copiedLink === invoice.invoice_number ? (
                            <Check className="h-4 w-4 mr-2 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4 mr-2" />
                          )}
                          {language === "fr" ? "Copier le lien de paiement" : "Copy payment link"}
                        </DropdownMenuItem>
                      )}

                      {/* Payment Link - Generate/Regenerate */}
                      {stripeAccountId && invoice.status !== "paid" && (
                        <DropdownMenuItem 
                          onClick={() => handleGeneratePaymentLink(invoice)}
                          disabled={isStripeLoading}
                        >
                          {isStripeLoading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <CreditCard className="h-4 w-4 mr-2" />
                          )}
                          {hasPaymentLink
                            ? (language === "fr" ? "Régénérer le lien de paiement" : "Regenerate payment link")
                            : (language === "fr" ? "Générer un lien de paiement" : "Generate payment link")
                          }
                        </DropdownMenuItem>
                      )}

                      {/* Archive/Unarchive */}
                      {canArchiveInvoices && (
                        <DropdownMenuItem onClick={() => archiveInvoice(invoice.id, !(invoice as any).is_archived)}>
                          {(invoice as any).is_archived ? (
                            <ArchiveRestore className="h-4 w-4 mr-2" />
                          ) : (
                            <Archive className="h-4 w-4 mr-2" />
                          )}
                          {(invoice as any).is_archived 
                            ? (language === "fr" ? "Désarchiver" : "Unarchive")
                            : (language === "fr" ? "Archiver" : "Archive")
                          }
                        </DropdownMenuItem>
                      )}

                      {/* Delete */}
                      {canDeleteInvoices && (
                        <>
                          <DropdownMenuSeparator />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive"
                                onSelect={(e) => e.preventDefault()}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {language === 'fr' ? 'Supprimer' : 'Delete'}
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t("invoices.delete")}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t("invoices.deleteConfirm").replace("{number}", invoice.invoice_number)}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t("invoices.cancel")}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteInvoice(invoice.id)} className="bg-destructive text-destructive-foreground">
                                  {t("invoices.deleteButton")}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedInvoices.size === filteredInvoices.length && filteredInvoices.length > 0}
                      onCheckedChange={toggleSelectAllInvoices}
                    />
                  </TableHead>
                  <TableHead>{t("invoices.tableInvoiceNumber")}</TableHead>
                  <TableHead>{t("invoices.tableClient")}</TableHead>
                  <TableHead>{t("invoices.tableAmount")}</TableHead>
                  <TableHead>{t("invoices.tableStatus")}</TableHead>
                  <TableHead>{t("invoices.tableIssueDate")}</TableHead>
                  <TableHead>{t("invoices.tableDueDate")}</TableHead>
                  <TableHead>{t("invoices.tableItems")}</TableHead>
                  <TableHead className="text-right">{t("invoices.tableActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedInvoices.has(invoice.id)}
                        onCheckedChange={() => toggleInvoiceSelection(invoice.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>
                      {clients.find(c => c.id === invoice.client_id)?.name || 'Unknown Client'}
                    </TableCell>
                    <TableCell className="font-medium">
                      ${invoice.total.toFixed(2)}
                      {(invoice as any).late_fee_applied_total > 0 && (
                        <span className="block text-xs text-amber-600">
                          +${((invoice as any).late_fee_applied_total).toFixed(2)} {language === 'fr' ? 'frais' : 'fees'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {canEditInvoices ? (
                          <Select 
                            value={invoice.status} 
                            onValueChange={(value) => {
                              const updates: any = { status: value };
                              if (invoice.status === "paid" && value !== "paid") {
                                updates.paid_at = null;
                              }
                              updateInvoice(invoice.id, updates);
                            }}
                          >
                            <SelectTrigger className={`w-28 h-8 ${invoice.status === "paid" ? "bg-green-600 text-white hover:bg-green-700" : ""}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">{t("invoices.statusDraft")}</SelectItem>
                              <SelectItem value="sent">{t("invoices.statusSent")}</SelectItem>
                              <SelectItem value="paid">{t("invoices.statusPaid")}</SelectItem>
                              <SelectItem value="overdue">{t("invoices.statusOverdue")}</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge 
                            variant={invoice.status === "paid" ? "default" : "secondary"}
                            className={invoice.status === "paid" ? "bg-green-600 text-white" : ""}
                          >
                            {invoice.status === "draft" ? t("invoices.statusDraft") :
                             invoice.status === "sent" ? t("invoices.statusSent") :
                             invoice.status === "paid" ? t("invoices.statusPaid") :
                             invoice.status === "overdue" ? t("invoices.statusOverdue") : invoice.status}
                          </Badge>
                        )}
                        {(invoice as any).final_reminder_sent && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-400 cursor-help px-1.5 py-0.5">
                                  <AlertTriangle className="h-3 w-3" />
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <div className="space-y-1 text-xs">
                                  <p className="font-medium">{t("invoices.finalReminderSent")}</p>
                                  <p>{t("invoices.finalReminderSentOn")}: {new Date((invoice as any).final_reminder_sent_at).toLocaleDateString(language === "fr" ? "fr-CA" : "en-CA")}</p>
                                  {(invoice as any).final_reminder_response_due_at && (
                                    <p>{t("invoices.responseExpectedBefore")}: {new Date((invoice as any).final_reminder_response_due_at).toLocaleDateString(language === "fr" ? "fr-CA" : "en-CA")}</p>
                                  )}
                                  {(invoice as any).final_reminder_recipient && (
                                    <p>{language === "fr" ? "Envoyé à" : "Sent to"}: {(invoice as any).final_reminder_recipient}</p>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {(() => {
                          const eligibility = getLateFeeEligibility(invoice);
                          if ((invoice as any).late_fee_status === 'applied') {
                            return (
                              <Badge variant="outline" className="border-amber-600 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 text-[10px]">
                                <DollarSign className="h-3 w-3 mr-0.5" />
                                {language === 'fr' ? 'Frais de retard appliqués' : 'Late fee applied'}
                              </Badge>
                            );
                          }
                          if (eligibility.eligible) {
                            return (
                              <Badge variant="outline" className="border-orange-400 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 text-[10px]">
                                <DollarSign className="h-3 w-3 mr-0.5" />
                                {language === 'fr' ? 'Frais de retard éligible' : 'Late fee eligible'}
                              </Badge>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </TableCell>
                    <TableCell>{invoice.issue_date}</TableCell>
                    <TableCell>{invoice.due_date}</TableCell>
                    <TableCell>{(invoice as any).invoice_items?.length || 0}</TableCell>
                    <TableCell className="text-right">
                      <TooltipProvider>
                        <div className="flex justify-end space-x-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => {
                                setViewingInvoice(invoice);
                                setIsViewDialogOpen(true);
                              }}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{language === 'fr' ? 'Voir la facture' : 'View invoice'}</p>
                            </TooltipContent>
                          </Tooltip>

                          {canEditInvoices && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="outline" size="sm" onClick={() => handleEditInvoice(invoice)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{language === 'fr' ? 'Modifier la facture' : 'Edit invoice'}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => downloadInvoicePDF(invoice)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{language === 'fr' ? 'Télécharger en PDF' : 'Download PDF'}</p>
                            </TooltipContent>
                          </Tooltip>

                          {canSendInvoices && (invoice.status === "draft" || invoice.status === "sent" || invoice.status === "paid" || invoice.status === "overdue") && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => openEmailDialog(invoice)}
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{language === 'fr' ? 'Envoyer par email' : 'Send email'}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {invoice.status !== 'paid' && invoice.status !== 'draft' && canSendInvoices && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className={canUseFinalReminder 
                                    ? "border-amber-500 text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30" 
                                    : "border-muted text-muted-foreground opacity-60"}
                                  onClick={() => canUseFinalReminder ? setFinalReminderInvoice(invoice) : setShowFeatureUpsell('final_reminder')}
                                >
                                  {canUseFinalReminder ? <AlertTriangle className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{canUseFinalReminder 
                                  ? ((invoice as any).final_reminder_sent ? t("invoices.resendFinalReminder") : t("invoices.sendFinalReminder"))
                                  : (language === 'fr' ? 'Disponible avec le plan Premium ou Pro' : 'Available with Premium or Pro plan')
                                }</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {invoice.status !== 'paid' && invoice.status !== 'draft' && canSendInvoices && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className={canUseFormalNotice 
                                    ? "border-destructive text-destructive hover:bg-destructive/10" 
                                    : "border-muted text-muted-foreground opacity-60"}
                                  onClick={() => canUseFormalNotice ? setFormalNoticeInvoice(invoice) : setShowFeatureUpsell('formal_notice')}
                                >
                                  {canUseFormalNotice ? <FileText className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{canUseFormalNotice 
                                  ? (language === 'fr' ? 'Mise en demeure' : 'Formal notice')
                                  : (language === 'fr' ? 'Disponible avec le plan Pro' : 'Available with Pro plan')
                                }</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {/* Late Fee Button */}
                          {(() => {
                            const eligibility = getLateFeeEligibility(invoice);
                            if (eligibility.eligible) {
                              return (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="border-amber-500 text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
                                      onClick={() => handleApplyLateFee(invoice)}
                                      disabled={applyingLateFee}
                                    >
                                      {applyingLateFee ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
                                     </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{language === 'fr' ? `Appliquer le frais de retard ($${eligibility.calculatedAmount?.toFixed(2)})` : `Apply late fee ($${eligibility.calculatedAmount?.toFixed(2)})`}</p>
                                  </TooltipContent>
                                </Tooltip>
                              );
                            }
                            if ((invoice as any).late_fee_applied_total > 0) {
                              return (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="border-amber-600 text-amber-700 dark:text-amber-400"
                                      onClick={() => openLateFeeDetails(invoice)}
                                    >
                                      <DollarSign className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{language === 'fr' ? 'Voir les frais de retard' : 'View late fees'}</p>
                                  </TooltipContent>
                                </Tooltip>
                              );
                            }
                            return null;
                          })()}
                          {stripeAccountId && invoice.status !== "paid" && (
                            invoice.payment_link ? (
                              <>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={() => copyPaymentLink(invoice.payment_link!, invoice.invoice_number)}
                                    >
                                      {copiedLink === invoice.invoice_number ? (
                                        <Check className="h-4 w-4 text-green-600" />
                                      ) : (
                                        <Copy className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{language === "fr" ? "Copier le lien de paiement" : "Copy payment link"}</p>
                                  </TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={() => handleGeneratePaymentLink(invoice)}
                                      disabled={isStripeLoading}
                                    >
                                      {isStripeLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <CreditCard className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{language === "fr" ? "Régénérer le lien de paiement" : "Regenerate payment link"}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleGeneratePaymentLink(invoice)}
                                    disabled={isStripeLoading}
                                  >
                                    {isStripeLoading ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <CreditCard className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{language === "fr" ? "Générer un lien de paiement Stripe" : "Generate Stripe payment link"}</p>
                                </TooltipContent>
                              </Tooltip>
                              )
                            )}
                          {canArchiveInvoices && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => archiveInvoice(invoice.id, !(invoice as any).is_archived)}
                                >
                                  {(invoice as any).is_archived ? (
                                    <ArchiveRestore className="h-4 w-4" />
                                  ) : (
                                    <Archive className="h-4 w-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  {(invoice as any).is_archived 
                                    ? (language === "fr" ? "Désarchiver la facture" : "Unarchive invoice")
                                    : (language === "fr" ? "Archiver la facture" : "Archive invoice")
                                  }
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {canDeleteInvoices && (
                            <AlertDialog>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertDialogTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{language === 'fr' ? 'Supprimer la facture' : 'Delete invoice'}</p>
                                </TooltipContent>
                              </Tooltip>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t("invoices.delete")}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t("invoices.deleteConfirm").replace("{number}", invoice.invoice_number)}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t("invoices.cancel")}</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => deleteInvoice(invoice.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    {t("invoices.deleteButton")}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Email Dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("invoices.emailDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("invoices.emailDialog.desc")}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Email Type Selection */}
            <div className="space-y-2">
              <Label>{t("invoices.emailType")}</Label>
              <Select value={emailType} onValueChange={handleEmailTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">{t("invoices.emailTypeNew")}</SelectItem>
                  <SelectItem value="overdue">{t("invoices.emailTypeOverdue")}</SelectItem>
                  <SelectItem value="payment_confirmation">{t("invoices.emailTypeConfirmation")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Client Email Info */}
            {emailingInvoice && (
              <div className="space-y-3">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">{t("invoices.emailClient")}</p>
                  <p className="font-medium mb-1">
                    {clients.find(c => c.id === emailingInvoice.client_id)?.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("invoices.emailInvoice")} {emailingInvoice.invoice_number} - ${emailingInvoice.total.toFixed(2)}
                  </p>
                </div>
                
                {/* Email Selection */}
                <div className="space-y-2">
                  <Label>{t("invoices.emailRecipients")}</Label>
                  <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                    {(() => {
                      const client = clients.find(c => c.id === emailingInvoice.client_id);
                      const emailsArray = client?.email 
                        ? client.email.split(",").map((e: string) => e.trim()).filter((e: string) => e !== "")
                        : [];
                      
                      return emailsArray.length > 0 ? (
                        emailsArray.map((email, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <Checkbox
                              id={`email-${index}`}
                              checked={selectedEmails.includes(email)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedEmails([...selectedEmails, email]);
                                } else {
                                  setSelectedEmails(selectedEmails.filter(e => e !== email));
                                }
                              }}
                            />
                            <label htmlFor={`email-${index}`} className="text-sm cursor-pointer">
                              {email}
                            </label>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">{t("invoices.emailNoEmails")}</p>
                      );
                    })()}
                  </div>
                </div>
                
                {/* CC Emails */}
                <div className="space-y-2">
                  <Label>{t("invoices.emailCC")}</Label>
                  <div className="space-y-2">
                    {ccEmails.map((email, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          type="email"
                          placeholder={t("invoices.emailCCPlaceholder")}
                          value={email}
                          onChange={(e) => {
                            const newCcEmails = [...ccEmails];
                            newCcEmails[index] = e.target.value;
                            setCcEmails(newCcEmails);
                          }}
                        />
                        {ccEmails.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setCcEmails(ccEmails.filter((_, i) => i !== index));
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCcEmails([...ccEmails, ""])}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t("invoices.emailAddCC")}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Email Subject */}
            <div className="space-y-2">
              <Label htmlFor="email-subject">{t("invoices.emailSubject")}</Label>
              <Input
                id="email-subject"
                value={emailForm.subject}
                onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                placeholder={t("invoices.emailSubjectPlaceholder")}
              />
            </div>

            {/* Email Message */}
            <div className="space-y-2">
              <Label htmlFor="email-message">{t("invoices.emailMessage")}</Label>
              <Textarea
                id="email-message"
                value={emailForm.message}
                onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
                placeholder={t("invoices.emailMessagePlaceholder")}
                rows={8}
                className="min-h-[200px]"
              />
              <p className="text-xs text-muted-foreground">
                {t("invoices.emailPlaceholders")}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsEmailDialogOpen(false)}
                className="flex-1"
              >
                {t("invoices.cancel")}
              </Button>
              <Button 
                onClick={sendInvoiceEmail}
                className="flex-1"
                disabled={!emailForm.subject || !emailForm.message || selectedEmails.length === 0 || isSendingEmail}
              >
                {isSendingEmail && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Send className="h-4 w-4 mr-2" />
                {isSendingEmail ? t("invoices.sending") : t("invoices.sendEmail")} {selectedEmails.length > 0 && !isSendingEmail && `(${selectedEmails.length})`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Limit Reached Dialog */}
      <AlertDialog open={showLimitDialog} onOpenChange={setShowLimitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === "fr" ? "Limite atteinte" : "Limit Reached"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === "fr" 
                ? `Vous avez atteint la limite de ${planLimits?.max_invoices_per_month || 5} factures par mois pour votre plan gratuit. Passez à un plan supérieur pour créer plus de factures.`
                : `You have reached the limit of ${planLimits?.max_invoices_per_month || 5} invoices per month for your free plan. Upgrade to a higher plan to create more invoices.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === "fr" ? "Annuler" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate("/dashboard/pricing")}>
              {language === "fr" ? "Voir les plans" : "View Plans"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invoice Report Email Dialog */}
      <EmailReportDialog
        open={isReportEmailDialogOpen}
        onOpenChange={setIsReportEmailDialogOpen}
        reportType="invoice-report"
        reportTitle={language === "fr" ? "Rapport des Factures" : "Invoice Report"}
        pdfBlob={null}
        onGeneratePdf={generateInvoiceReportPdfBlob}
        defaultSubject={language === "fr" ? "Rapport des Factures" : "Invoice Report"}
        companyId={companies?.[0]?.id}
      />

      {/* Bulk Status Change Dialog */}
      <Dialog open={bulkStatusDialogOpen} onOpenChange={setBulkStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {language === "fr" ? "Modifier le statut" : "Change Status"}
            </DialogTitle>
            <DialogDescription>
              {language === "fr" 
                ? `Modifier le statut pour ${selectedInvoices.size} facture(s) sélectionnée(s)`
                : `Change status for ${selectedInvoices.size} selected invoice(s)`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{language === "fr" ? "Statut" : "Status"}</Label>
              <Select value={bulkStatus} onValueChange={setBulkStatus}>
                <SelectTrigger>
                  <SelectValue placeholder={language === "fr" ? "Sélectionner un statut" : "Select a status"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">{t("invoices.statusDraft")}</SelectItem>
                  <SelectItem value="sent">{t("invoices.statusSent")}</SelectItem>
                  <SelectItem value="paid">{t("invoices.statusPaid")}</SelectItem>
                  <SelectItem value="overdue">{t("invoices.statusOverdue")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setBulkStatusDialogOpen(false)}>
              {language === "fr" ? "Annuler" : "Cancel"}
            </Button>
            <Button onClick={handleBulkStatusChange} disabled={!bulkStatus}>
              {language === "fr" ? "Appliquer" : "Apply"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Final Reminder Dialog */}
      {finalReminderInvoice && (
        <FinalReminderDialog
          open={!!finalReminderInvoice}
          onOpenChange={(open) => !open && setFinalReminderInvoice(null)}
          invoice={finalReminderInvoice as any}
          companyName={companies.find(c => c.id === clients.find(cl => cl.id === finalReminderInvoice.client_id)?.company_id)?.name || ''}
          onSend={async (invoiceId, data) => {
            await sendFinalReminder(invoiceId, data);
          }}
        />
      )}

      {/* Formal Notice Dialog */}
      {formalNoticeInvoice && (
        <FormalNoticeEditorDialog
          open={!!formalNoticeInvoice}
          onOpenChange={(open) => !open && setFormalNoticeInvoice(null)}
          invoice={formalNoticeInvoice as any}
          company={companies.find(c => c.id === clients.find(cl => cl.id === formalNoticeInvoice.client_id)?.company_id) as any}
        />
      )}

      {/* Feature Upsell Dialog */}
      <AlertDialog open={!!showFeatureUpsell} onOpenChange={(open) => !open && setShowFeatureUpsell(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              {showFeatureUpsell === 'final_reminder'
                ? (language === 'fr' ? 'Dernier rappel de paiement' : 'Final Payment Reminder')
                : (language === 'fr' ? 'Mise en demeure' : 'Formal Notice')
              }
            </AlertDialogTitle>
            <AlertDialogDescription>
              {showFeatureUpsell === 'final_reminder'
                ? (language === 'fr' 
                    ? 'Le dernier rappel de paiement permet d\'envoyer un avis formel avant de prendre des mesures légales. Cette fonctionnalité est disponible avec le plan Premium ou Pro.'
                    : 'The final payment reminder allows you to send a formal notice before taking legal action. This feature is available with the Premium or Pro plan.')
                : (language === 'fr'
                    ? 'La mise en demeure est un document légal formel exigeant le paiement d\'une facture impayée. Cette fonctionnalité est disponible uniquement avec le plan Pro.'
                    : 'The formal notice is a formal legal document demanding payment for an unpaid invoice. This feature is available only with the Pro plan.')
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{language === 'fr' ? 'Fermer' : 'Close'}</AlertDialogCancel>
            {canManageBilling && (
              <AlertDialogAction onClick={() => { setShowFeatureUpsell(null); navigate("/dashboard/pricing"); }}>
                <Crown className="h-4 w-4 mr-2" />
                {language === 'fr' ? 'Voir les plans' : 'View plans'}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Late Fee Details Dialog */}
      <Dialog open={!!lateFeeDialogInvoice} onOpenChange={(open) => !open && setLateFeeDialogInvoice(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {language === 'fr' ? 'Frais de retard' : 'Late Fees'}
            </DialogTitle>
            <DialogDescription>
              {lateFeeDialogInvoice && `${language === 'fr' ? 'Facture' : 'Invoice'} ${lateFeeDialogInvoice.invoice_number}`}
            </DialogDescription>
          </DialogHeader>
          {loadingLateFees ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <div className="space-y-4">
              {lateFeeRecords.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {language === 'fr' ? 'Aucun frais de retard' : 'No late fees'}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'fr' ? 'Description' : 'Description'}</TableHead>
                      <TableHead>{language === 'fr' ? 'Montant' : 'Amount'}</TableHead>
                      <TableHead>{language === 'fr' ? 'Date' : 'Date'}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lateFeeRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="text-sm">{record.description}</TableCell>
                        <TableCell className="font-medium">${record.amount.toFixed(2)}</TableCell>
                        <TableCell className="text-sm">{new Date(record.applied_at).toLocaleDateString(language === 'fr' ? 'fr-CA' : 'en-CA')}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleDeleteLateFee(record)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {lateFeeDialogInvoice && (
                <div className="pt-2 border-t">
                  <p className="text-sm font-medium">
                    {language === 'fr' ? 'Total des frais' : 'Total fees'}: ${((lateFeeDialogInvoice as any).late_fee_applied_total || 0).toFixed(2)}
                  </p>
                  <p className="text-sm font-bold">
                    {language === 'fr' ? 'Total avec frais' : 'Total with fees'}: ${(lateFeeDialogInvoice.total + ((lateFeeDialogInvoice as any).late_fee_applied_total || 0)).toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Invoices;