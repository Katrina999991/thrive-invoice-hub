import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Plus, Eye, Edit, Download, Send, Trash2, Loader2, Copy, FileText, Lock, ArrowRight, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuotes, Quote, QuoteItemInsert } from "@/hooks/useQuotes";
import { useClients } from "@/hooks/useClients";
import { useCompanies } from "@/hooks/useCompanies";
import { useProducts } from "@/hooks/useProducts";
import { useInvoices } from "@/hooks/useInvoices";
import { useLanguage } from "@/hooks/useLanguage";
import { useSubscription } from "@/hooks/useSubscription";
import { useSelectedCompany } from "@/hooks/useSelectedCompany";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { 
  QuoteItemLocal, QuoteLineType, createEmptyItem, computeLineTotals, 
  computeQuoteTotals, dbItemToLocal, localItemToDb, formatLineDisplay 
} from "@/lib/quoteLineCalculations";

const Quotes = () => {
  const { toast } = useToast();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  
  const { quotes, loading, createQuote, updateQuote, deleteQuote, duplicateQuote, convertToInvoice } = useQuotes();
  const { clients } = useClients();
  const { companies } = useCompanies();
  const { products } = useProducts();
  const { createInvoice } = useInvoices();
  const { planLimits } = useSubscription();
  const { canCreate, canEdit, canDelete, hasPermission } = useSelectedCompany();
  
  const canCreateQuotes = canCreate("quotes");
  const canEditQuotes = canEdit("quotes");
  const canSendQuotes = hasPermission("quotes:send");
  const canDeleteQuotes = canDelete("quotes");

  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [viewingQuote, setViewingQuote] = useState<Quote | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Email dialog state
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailQuote, setEmailQuote] = useState<Quote | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [availableEmails, setAvailableEmails] = useState<string[]>([]);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const [newQuote, setNewQuote] = useState({
    client_id: "",
    issue_date: new Date().toISOString().split('T')[0],
    expiry_date: "",
    terms: "",
    notes: "",
    items: [] as QuoteItemLocal[]
  });

  const [currentItem, setCurrentItem] = useState<QuoteItemLocal>(createEmptyItem());

  const [quantityInput, setQuantityInput] = useState("1");
  const [unitPriceInput, setUnitPriceInput] = useState("0");
  const [estimatedHoursInput, setEstimatedHoursInput] = useState("0");
  const [hourlyRateInput, setHourlyRateInput] = useState("0");
  const [minUnitsInput, setMinUnitsInput] = useState("0");
  const [maxUnitsInput, setMaxUnitsInput] = useState("0");
  const [rateInput, setRateInput] = useState("0");
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  const t = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      fr: {
        "quotes.title": "Devis",
        "quotes.subtitle": "Créez et gérez vos devis professionnels",
        "quotes.createButton": "Créer un devis",
        "quotes.searchPlaceholder": "Rechercher des devis...",
        "quotes.filterByStatus": "Filtrer par statut",
        "quotes.statusAll": "Tous les statuts",
        "quotes.statusDraft": "Brouillon",
        "quotes.statusSent": "Envoyé",
        "quotes.statusAccepted": "Accepté",
        "quotes.statusRejected": "Refusé",
        "quotes.listTitle": "Liste des devis",
        "quotes.listDesc": "Gérez tous vos devis en un seul endroit",
        "quotes.quoteNumber": "N° Devis",
        "quotes.client": "Client",
        "quotes.amount": "Montant",
        "quotes.status": "Statut",
        "quotes.issueDate": "Date",
        "quotes.expiryDate": "Date d'expiration (optionnel)",
        "quotes.actions": "Actions",
        "quotes.view": "Voir",
        "quotes.edit": "Modifier",
        "quotes.download": "Télécharger PDF",
        "quotes.send": "Envoyer",
        "quotes.duplicate": "Dupliquer",
        "quotes.convert": "Convertir en facture",
        "quotes.delete": "Supprimer",
        "quotes.deleteConfirm": "Êtes-vous sûr de vouloir supprimer ce devis ?",
        "quotes.dialog.create": "Créer un nouveau devis",
        "quotes.dialog.edit": "Modifier le devis",
        "quotes.dialog.createDesc": "Créez un devis professionnel pour vos clients.",
        "quotes.dialog.editDesc": "Modifiez les informations du devis.",
        "quotes.selectCompany": "Sélectionner une entreprise",
        "quotes.selectClient": "Sélectionner un client",
        "quotes.terms": "Conditions",
        "quotes.notes": "Notes",
        "quotes.addItems": "Ajouter des articles",
        "quotes.selectProduct": "Sélectionner un produit/service",
        "quotes.description": "Description",
        "quotes.quantity": "Quantité",
        "quotes.unitPrice": "Prix unitaire",
        "quotes.addItem": "Ajouter l'article",
        "quotes.updateItem": "Mettre à jour",
        "quotes.items": "Articles",
        "quotes.total": "Total",
        "quotes.remove": "Supprimer",
        "quotes.subtotal": "Sous-total",
        "quotes.taxAmount": "Taxes",
        "quotes.totalAmount": "Total",
        "quotes.cancel": "Annuler",
        "quotes.save": "Enregistrer",
        "quotes.noQuotes": "Aucun devis trouvé",
        "quotes.convertSuccess": "Devis converti en facture avec succès",
        "quotes.onlyAccepted": "Seuls les devis acceptés peuvent être convertis",
        "quotes.featureNotAvailable": "Fonctionnalité non disponible",
        "quotes.upgradeRequired": "Les devis sont disponibles avec les plans Premium et Pro.",
        "quotes.viewPlans": "Voir les plans",
        "quotes.billTo": "Facturer à",
        "quotes.quoteDetails": "Détails du devis",
        "quotes.converted": "Converti",
        "quotes.sendEmail": "Envoyer par courriel",
        "quotes.emailSubject": "Objet",
        "quotes.emailMessage": "Message",
        "quotes.selectRecipients": "Sélectionner les destinataires",
        "quotes.sendingEmail": "Envoi en cours...",
        "quotes.emailSent": "Devis envoyé par courriel avec succès",
        "quotes.emailError": "Erreur lors de l'envoi du courriel"
      },
      en: {
        "quotes.title": "Quotes",
        "quotes.subtitle": "Create and manage your professional quotes",
        "quotes.createButton": "Create Quote",
        "quotes.searchPlaceholder": "Search quotes...",
        "quotes.filterByStatus": "Filter by Status",
        "quotes.statusAll": "All Statuses",
        "quotes.statusDraft": "Draft",
        "quotes.statusSent": "Sent",
        "quotes.statusAccepted": "Accepted",
        "quotes.statusRejected": "Rejected",
        "quotes.listTitle": "Quote List",
        "quotes.listDesc": "Manage all your quotes in one place",
        "quotes.quoteNumber": "Quote #",
        "quotes.client": "Client",
        "quotes.amount": "Amount",
        "quotes.status": "Status",
        "quotes.issueDate": "Date",
        "quotes.expiryDate": "Expiry Date (optional)",
        "quotes.actions": "Actions",
        "quotes.view": "View",
        "quotes.edit": "Edit",
        "quotes.download": "Download PDF",
        "quotes.send": "Send",
        "quotes.duplicate": "Duplicate",
        "quotes.convert": "Convert to Invoice",
        "quotes.delete": "Delete",
        "quotes.deleteConfirm": "Are you sure you want to delete this quote?",
        "quotes.dialog.create": "Create New Quote",
        "quotes.dialog.edit": "Edit Quote",
        "quotes.dialog.createDesc": "Create a professional quote for your clients.",
        "quotes.dialog.editDesc": "Update quote information.",
        "quotes.selectCompany": "Select Company",
        "quotes.selectClient": "Select Client",
        "quotes.terms": "Terms",
        "quotes.notes": "Notes",
        "quotes.addItems": "Add Items",
        "quotes.selectProduct": "Select Product/Service",
        "quotes.description": "Description",
        "quotes.quantity": "Quantity",
        "quotes.unitPrice": "Unit Price",
        "quotes.addItem": "Add Item",
        "quotes.updateItem": "Update Item",
        "quotes.items": "Items",
        "quotes.total": "Total",
        "quotes.remove": "Remove",
        "quotes.subtotal": "Subtotal",
        "quotes.taxAmount": "Tax Amount",
        "quotes.totalAmount": "Total Amount",
        "quotes.cancel": "Cancel",
        "quotes.save": "Save Quote",
        "quotes.noQuotes": "No quotes found",
        "quotes.convertSuccess": "Quote converted to invoice successfully",
        "quotes.onlyAccepted": "Only accepted quotes can be converted",
        "quotes.featureNotAvailable": "Feature Not Available",
        "quotes.upgradeRequired": "Quotes are available with Premium and Pro plans.",
        "quotes.viewPlans": "View Plans",
        "quotes.billTo": "Bill To",
        "quotes.quoteDetails": "Quote Details",
        "quotes.converted": "Converted",
        "quotes.sendEmail": "Send by Email",
        "quotes.emailSubject": "Subject",
        "quotes.emailMessage": "Message",
        "quotes.selectRecipients": "Select Recipients",
        "quotes.sendingEmail": "Sending...",
        "quotes.emailSent": "Quote sent by email successfully",
        "quotes.emailError": "Error sending email"
      }
    };
    return translations[language]?.[key] || key;
  };

  // Check if user has access to quotes
  const hasQuotesAccess = planLimits?.plan_type === 'premium' || planLimits?.plan_type === 'pro';

  const filteredClients = selectedCompanyId 
    ? clients.filter(client => client.company_id === selectedCompanyId)
    : clients;

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = 
      quote.quote_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.clients?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || quote.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'refused': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return t("quotes.statusDraft");
      case 'sent': return t("quotes.statusSent");
      case 'accepted': return t("quotes.statusAccepted");
      case 'refused': return t("quotes.statusRejected");
      default: return status;
    }
  };

  const addItem = () => {
    if (!currentItem.description) return;
    
    // Validate based on line type
    if (currentItem.lineType === 'fixed' && currentItem.unit_price <= 0) return;
    if (currentItem.lineType === 'hourly' && (currentItem.estimatedHours <= 0 || currentItem.hourlyRate <= 0)) return;
    if (currentItem.lineType === 'estimate' && (currentItem.minUnits <= 0 || currentItem.maxUnits <= 0 || currentItem.rate <= 0)) return;

    let productTaxes: Array<{name: string, type?: 'percentage' | 'amount', value?: number, percentage?: number}> = [];
    if (currentItem.product_id) {
      const selectedProduct = products.find(p => p.id === currentItem.product_id);
      if (selectedProduct?.taxes && Array.isArray(selectedProduct.taxes) && selectedProduct.taxes.length > 0) {
        productTaxes = selectedProduct.taxes as Array<{name: string, type?: 'percentage' | 'amount', value?: number, percentage?: number}>;
      }
    }

    const newItem: QuoteItemLocal = {
      ...currentItem,
      product_id: currentItem.product_id || undefined,
      notes: currentItem.notes || undefined,
      product_taxes: productTaxes.length > 0 ? productTaxes : currentItem.product_taxes
    };

    if (editingItemIndex !== null) {
      const updatedItems = [...newQuote.items];
      updatedItems[editingItemIndex] = newItem;
      setNewQuote({ ...newQuote, items: updatedItems });
      setEditingItemIndex(null);
    } else {
      setNewQuote({ ...newQuote, items: [...newQuote.items, newItem] });
    }

    resetCurrentItem();
  };

  const resetCurrentItem = () => {
    const selectedClient = clients.find(client => client.id === newQuote.client_id);
    const defaultRate = selectedClient?.hourly_rate || 0;
    const item = createEmptyItem();
    item.unit_price = defaultRate;
    item.hourlyRate = defaultRate;
    item.rate = defaultRate;
    setCurrentItem(item);
    setQuantityInput("1");
    setUnitPriceInput(defaultRate.toString());
    setEstimatedHoursInput("0");
    setHourlyRateInput(defaultRate.toString());
    setMinUnitsInput("0");
    setMaxUnitsInput("0");
    setRateInput(defaultRate.toString());
  };

  const removeItem = (index: number) => {
    setNewQuote({ ...newQuote, items: newQuote.items.filter((_, i) => i !== index) });
  };

  const getQuoteTotals = () => {
    const selectedCompany = companies.find(c => c.id === selectedCompanyId);
    const companyTaxes = (selectedCompany?.taxes && Array.isArray(selectedCompany.taxes)) 
      ? selectedCompany.taxes as Array<{ percentage: number }> 
      : null;
    return computeQuoteTotals(newQuote.items, companyTaxes);
  };

  const calculateSubtotal = () => getQuoteTotals().subtotal;
  const calculateTaxes = () => getQuoteTotals().taxAmount;
  const calculateTotal = () => getQuoteTotals().total;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newQuote.client_id) {
      toast({ title: language === 'fr' ? "Erreur" : "Error", description: language === 'fr' ? "Veuillez sélectionner un client" : "Please select a client", variant: "destructive" });
      return;
    }

    if (newQuote.items.length === 0) {
      toast({ title: language === 'fr' ? "Erreur" : "Error", description: language === 'fr' ? "Veuillez ajouter au moins un article" : "Please add at least one item", variant: "destructive" });
      return;
    }

    const subtotal = calculateSubtotal();
    const taxAmount = calculateTaxes();
    const total = calculateTotal();

    if (editingQuote) {
      // Delete old items and insert new ones
      await supabase.from("quote_items").delete().eq("quote_id", editingQuote.id);
      await supabase.from("quote_items").insert(newQuote.items.map(item => ({
        quote_id: editingQuote.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
        product_id: item.product_id || null,
        notes: item.notes || null,
        product_taxes: item.product_taxes || []
      })));
      
      await updateQuote(editingQuote.id, {
        client_id: newQuote.client_id,
        issue_date: newQuote.issue_date,
        expiry_date: newQuote.expiry_date || null,
        terms: newQuote.terms,
        notes: newQuote.notes,
        subtotal,
        tax_amount: taxAmount,
        total
      });
    } else {
      const quoteNumber = `DEV-${String(quotes.length + 1).padStart(3, '0')}`;
      await createQuote({
        quote_number: quoteNumber,
        client_id: newQuote.client_id,
        issue_date: newQuote.issue_date,
        expiry_date: newQuote.expiry_date || null,
        status: 'draft',
        terms: newQuote.terms,
        notes: newQuote.notes,
        subtotal,
        tax_amount: taxAmount,
        total
      }, newQuote.items);
    }

    resetForm();
    setIsDialogOpen(false);
  };

  const resetForm = () => {
    setNewQuote({
      client_id: "",
      issue_date: new Date().toISOString().split('T')[0],
      expiry_date: "",
      terms: "",
      notes: "",
      items: []
    });
    setCurrentItem({ description: "", quantity: 1, unit_price: 0, product_id: "", notes: "" });
    setQuantityInput("1");
    setUnitPriceInput("0");
    setEditingQuote(null);
    setSelectedCompanyId("");
  };

  const openEditDialog = (quote: Quote) => {
    const client = clients.find(c => c.id === quote.client_id);
    if (client?.company_id) {
      setSelectedCompanyId(client.company_id);
    }
    setEditingQuote(quote);
    setNewQuote({
      client_id: quote.client_id || "",
      issue_date: quote.issue_date,
      expiry_date: quote.expiry_date || "",
      terms: quote.terms || "",
      notes: quote.notes || "",
      items: (quote.quote_items || []).map(item => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
        product_id: item.product_id || undefined,
        notes: item.notes || undefined,
        product_taxes: item.product_taxes || undefined
      }))
    });
    setIsDialogOpen(true);
  };

  const handleConvertToInvoice = async (quote: Quote) => {
    if (quote.status !== 'accepted') {
      toast({ title: language === 'fr' ? "Erreur" : "Error", description: t("quotes.onlyAccepted"), variant: "destructive" });
      return;
    }
    await convertToInvoice(quote, createInvoice);
  };

  const generatePDF = async (quote: Quote) => {
    const { generateQuotePdf } = await import('@/lib/quotePdf');
    
    const client = clients.find(c => c.id === quote.client_id);
    // Get company from client's company_id, or fall back to first available company
    const company = client?.company_id 
      ? companies.find(c => c.id === client.company_id) 
      : companies[0] || null;
    const hidePdfBranding = localStorage.getItem('hidePdfBranding') === 'true' && planLimits?.plan_type === 'pro';

    console.log('Generating PDF with company:', company?.name, 'logo_url:', company?.logo_url);

    await generateQuotePdf({
      quote: {
        quote_number: quote.quote_number,
        issue_date: quote.issue_date,
        expiry_date: quote.expiry_date,
        subtotal: quote.subtotal,
        tax_amount: quote.tax_amount,
        total: quote.total,
        terms: quote.terms,
        notes: quote.notes,
        quote_items: (quote.quote_items || []).map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
          notes: item.notes,
          product_taxes: item.product_taxes as any
        }))
      },
      client: client ? {
        name: client.name,
        email: client.email,
        address: client.address,
        phone: client.phone,
        contact_person: client.contact_person,
        contact_title: (client as any).contact_title
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
        tax_id: company.tax_id
      } : null,
      language: language as 'fr' | 'en',
      hideBranding: hidePdfBranding
    });
  };

  // Email functions
  const openEmailDialog = (quote: Quote) => {
    const client = clients.find(c => c.id === quote.client_id);
    const company = client?.company_id ? companies.find(c => c.id === client.company_id) : null;
    
    // Get available emails from client
    const emails = client?.email?.split(",").map((e: string) => e.trim()).filter((e: string) => e !== "") || [];
    setAvailableEmails(emails);
    setSelectedEmails(emails);
    
    // Set default subject and message based on CLIENT's language, not UI language
    const isClientFrench = client?.language === 'french';
    const defaultSubject = isClientFrench 
      ? `Devis ${quote.quote_number} de ${company?.name || ''}`
      : `Quote ${quote.quote_number} from ${company?.name || ''}`;
    
    const defaultMessage = isClientFrench
      ? `Cher/Chère ${client?.name || ''},\n\nVeuillez trouver ci-joint votre devis ${quote.quote_number} daté du ${quote.issue_date}.\n\nTotal : $${quote.total.toFixed(2)}\nValide jusqu'au : ${quote.expiry_date || 'N/A'}\n\nMerci de considérer nos services !\n\nCordialement,\n${company?.name || ''}`
      : `Dear ${client?.name || ''},\n\nPlease find attached your quote ${quote.quote_number} dated ${quote.issue_date}.\n\nTotal: $${quote.total.toFixed(2)}\nValid until: ${quote.expiry_date || 'N/A'}\n\nThank you for considering our services!\n\nBest regards,\n${company?.name || ''}`;
    
    setEmailSubject(defaultSubject);
    setEmailMessage(defaultMessage);
    setEmailQuote(quote);
    setIsEmailDialogOpen(true);
  };

  const handleSendEmail = async () => {
    if (!emailQuote || selectedEmails.length === 0) return;
    
    setIsSendingEmail(true);
    try {
      const hideBranding = localStorage.getItem('hidePdfBranding') === 'true' && planLimits?.plan_type === 'pro';
      const template = localStorage.getItem('invoice-template') || 'classic';
      const colorPreset = localStorage.getItem('invoice-color') || 'blue';
      const customColor = colorPreset === 'custom' ? localStorage.getItem('invoice-custom-color') : null;
      
      const { data, error } = await supabase.functions.invoke('send-quote-email', {
        body: {
          quoteId: emailQuote.id,
          customSubject: emailSubject,
          customMessage: emailMessage,
          selectedEmails,
          hideBranding,
          template,
          colorPreset,
          customColor
        }
      });

      if (error) throw error;

      toast({
        title: language === 'fr' ? "Succès" : "Success",
        description: t("quotes.emailSent")
      });
      
      setIsEmailDialogOpen(false);
      setEmailQuote(null);
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast({
        title: language === 'fr' ? "Erreur" : "Error",
        description: t("quotes.emailError"),
        variant: "destructive"
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  if (!hasQuotesAccess && !loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t("quotes.title")}</h1>
          <p className="text-muted-foreground">{t("quotes.subtitle")}</p>
        </div>
        <Card className="max-w-lg mx-auto mt-12">
          <CardHeader className="text-center">
            <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle>{t("quotes.featureNotAvailable")}</CardTitle>
            <CardDescription>{t("quotes.upgradeRequired")}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate('/dashboard/pricing')}>
              {t("quotes.viewPlans")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("quotes.title")}</h1>
          <p className="text-muted-foreground text-sm sm:text-base">{t("quotes.subtitle")}</p>
        </div>
        {canCreateQuotes && (
          <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            {t("quotes.createButton")}
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("quotes.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder={t("quotes.filterByStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("quotes.statusAll")}</SelectItem>
            <SelectItem value="draft">{t("quotes.statusDraft")}</SelectItem>
            <SelectItem value="sent">{t("quotes.statusSent")}</SelectItem>
            <SelectItem value="accepted">{t("quotes.statusAccepted")}</SelectItem>
            <SelectItem value="refused">{t("quotes.statusRejected")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("quotes.listTitle")}</CardTitle>
          <CardDescription>{t("quotes.listDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredQuotes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t("quotes.noQuotes")}</p>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {filteredQuotes.map((quote) => (
                  <Card key={quote.id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{quote.quote_number}</p>
                          <p className="text-sm text-muted-foreground">{quote.clients?.name || '-'}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">${quote.total.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">{quote.issue_date}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(quote.status)}>{getStatusLabel(quote.status)}</Badge>
                        {quote.converted_to_invoice_id && (
                          <Badge variant="outline">{t("quotes.converted")}</Badge>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-1 pt-2 border-t">
                        <Button variant="ghost" size="sm" onClick={() => { setViewingQuote(quote); setIsViewDialogOpen(true); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canEditQuotes && (
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(quote)} disabled={!!quote.converted_to_invoice_id}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => generatePDF(quote)}>
                          <Download className="h-4 w-4" />
                        </Button>
                        {canSendQuotes && (
                          <Button variant="ghost" size="sm" onClick={() => openEmailDialog(quote)}>
                            <Mail className="h-4 w-4" />
                          </Button>
                        )}
                        {canCreateQuotes && (
                          <Button variant="ghost" size="sm" onClick={() => duplicateQuote(quote)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        )}
                        {canEditQuotes && quote.status === 'accepted' && !quote.converted_to_invoice_id && (
                          <Button variant="ghost" size="sm" onClick={() => handleConvertToInvoice(quote)}>
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        )}
                        {canDeleteQuotes && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive" disabled={!!quote.converted_to_invoice_id}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t("quotes.delete")}</AlertDialogTitle>
                                <AlertDialogDescription>{t("quotes.deleteConfirm")}</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t("quotes.cancel")}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteQuote(quote.id)}>
                                  {t("quotes.delete")}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("quotes.quoteNumber")}</TableHead>
                      <TableHead>{t("quotes.client")}</TableHead>
                      <TableHead>{t("quotes.amount")}</TableHead>
                      <TableHead>{t("quotes.status")}</TableHead>
                      <TableHead>{t("quotes.issueDate")}</TableHead>
                      <TableHead>{t("quotes.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQuotes.map((quote) => (
                      <TableRow key={quote.id}>
                        <TableCell className="font-medium">{quote.quote_number}</TableCell>
                        <TableCell>{quote.clients?.name || '-'}</TableCell>
                        <TableCell>${quote.total.toFixed(2)}</TableCell>
                        <TableCell>
                          {quote.converted_to_invoice_id ? (
                            <>
                              <Badge className={getStatusColor(quote.status)}>{getStatusLabel(quote.status)}</Badge>
                              <Badge variant="outline" className="ml-2">{t("quotes.converted")}</Badge>
                            </>
                          ) : canEditQuotes ? (
                            <Select value={quote.status} onValueChange={(value: 'draft' | 'sent' | 'accepted' | 'refused') => updateQuote(quote.id, { status: value })}>
                              <SelectTrigger className="w-[130px] h-8">
                                <Badge className={getStatusColor(quote.status)}>{getStatusLabel(quote.status)}</Badge>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="draft">{t("quotes.statusDraft")}</SelectItem>
                                <SelectItem value="sent">{t("quotes.statusSent")}</SelectItem>
                                <SelectItem value="accepted">{t("quotes.statusAccepted")}</SelectItem>
                                <SelectItem value="refused">{t("quotes.statusRejected")}</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge className={getStatusColor(quote.status)}>{getStatusLabel(quote.status)}</Badge>
                          )}
                        </TableCell>
                        <TableCell>{quote.issue_date}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => { setViewingQuote(quote); setIsViewDialogOpen(true); }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {canEditQuotes && (
                              <Button variant="ghost" size="icon" onClick={() => openEditDialog(quote)} disabled={!!quote.converted_to_invoice_id}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => generatePDF(quote)}>
                              <Download className="h-4 w-4" />
                            </Button>
                            {canSendQuotes && (
                              <Button variant="ghost" size="icon" onClick={() => openEmailDialog(quote)}>
                                <Mail className="h-4 w-4" />
                              </Button>
                            )}
                            {canCreateQuotes && (
                              <Button variant="ghost" size="icon" onClick={() => duplicateQuote(quote)}>
                                <Copy className="h-4 w-4" />
                              </Button>
                            )}
                            {canEditQuotes && quote.status === 'accepted' && !quote.converted_to_invoice_id && (
                              <Button variant="ghost" size="icon" onClick={() => handleConvertToInvoice(quote)}>
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                            )}
                            {canDeleteQuotes && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" disabled={!!quote.converted_to_invoice_id}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>{t("quotes.delete")}</AlertDialogTitle>
                                    <AlertDialogDescription>{t("quotes.deleteConfirm")}</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>{t("quotes.cancel")}</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteQuote(quote.id)}>
                                      {t("quotes.delete")}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingQuote ? t("quotes.dialog.edit") : t("quotes.dialog.create")}</DialogTitle>
            <DialogDescription>{editingQuote ? t("quotes.dialog.editDesc") : t("quotes.dialog.createDesc")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("quotes.selectCompany")}</Label>
                <Select value={selectedCompanyId} onValueChange={(value) => { setSelectedCompanyId(value); setNewQuote({ ...newQuote, client_id: "" }); }}>
                  <SelectTrigger><SelectValue placeholder={t("quotes.selectCompany")} /></SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("quotes.selectClient")}</Label>
                <Select value={newQuote.client_id} onValueChange={(value) => setNewQuote({ ...newQuote, client_id: value })} disabled={!selectedCompanyId}>
                  <SelectTrigger><SelectValue placeholder={t("quotes.selectClient")} /></SelectTrigger>
                  <SelectContent>
                    {filteredClients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("quotes.issueDate")}</Label>
                <Input type="date" value={newQuote.issue_date} onChange={(e) => setNewQuote({ ...newQuote, issue_date: e.target.value })} />
              </div>
              <div>
                <Label>{t("quotes.expiryDate")}</Label>
                <Input type="date" value={newQuote.expiry_date} onChange={(e) => setNewQuote({ ...newQuote, expiry_date: e.target.value })} />
              </div>
            </div>

            <div className="space-y-4">
              <Label>{t("quotes.addItems")}</Label>
              <div className="grid grid-cols-5 gap-2">
                <Select value={currentItem.product_id} onValueChange={(value) => {
                  const product = products.find(p => p.id === value);
                  if (product) {
                    setCurrentItem({ ...currentItem, product_id: value, description: product.name, unit_price: product.price });
                    setUnitPriceInput(product.price.toString());
                  }
                }}>
                  <SelectTrigger><SelectValue placeholder={t("quotes.selectProduct")} /></SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>{product.name} - ${product.price}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input placeholder={t("quotes.description")} value={currentItem.description} onChange={(e) => setCurrentItem({ ...currentItem, description: e.target.value })} />
                <Input type="number" placeholder={t("quotes.quantity")} value={quantityInput} onChange={(e) => { setQuantityInput(e.target.value); setCurrentItem({ ...currentItem, quantity: parseFloat(e.target.value) || 0 }); }} />
                <Input type="number" placeholder={t("quotes.unitPrice")} value={unitPriceInput} onChange={(e) => { setUnitPriceInput(e.target.value); setCurrentItem({ ...currentItem, unit_price: parseFloat(e.target.value) || 0 }); }} />
                <Button type="button" onClick={addItem}>{editingItemIndex !== null ? t("quotes.updateItem") : t("quotes.addItem")}</Button>
              </div>

              {newQuote.items.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("quotes.description")}</TableHead>
                      <TableHead>{t("quotes.quantity")}</TableHead>
                      <TableHead>{t("quotes.unitPrice")}</TableHead>
                      <TableHead>{t("quotes.total")}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {newQuote.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>${item.unit_price.toFixed(2)}</TableCell>
                        <TableCell>${item.total.toFixed(2)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => removeItem(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              <div className="text-right space-y-1">
                <p>{t("quotes.subtotal")}: ${calculateSubtotal().toFixed(2)}</p>
                <p>{t("quotes.taxAmount")}: ${calculateTaxes().toFixed(2)}</p>
                <p className="font-bold text-lg">{t("quotes.totalAmount")}: ${calculateTotal().toFixed(2)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("quotes.terms")}</Label>
                <Textarea value={newQuote.terms} onChange={(e) => setNewQuote({ ...newQuote, terms: e.target.value })} />
              </div>
              <div>
                <Label>{t("quotes.notes")}</Label>
                <Textarea value={newQuote.notes} onChange={(e) => setNewQuote({ ...newQuote, notes: e.target.value })} />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>{t("quotes.cancel")}</Button>
              <Button type="submit">{t("quotes.save")}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("quotes.quoteDetails")}</DialogTitle>
          </DialogHeader>
          {viewingQuote && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t("quotes.quoteNumber")}</p>
                  <p className="font-medium">{viewingQuote.quote_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("quotes.status")}</p>
                  <Badge className={getStatusColor(viewingQuote.status)}>{getStatusLabel(viewingQuote.status)}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("quotes.client")}</p>
                  <p className="font-medium">{viewingQuote.clients?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("quotes.issueDate")}</p>
                  <p className="font-medium">{viewingQuote.issue_date}</p>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("quotes.description")}</TableHead>
                    <TableHead>{t("quotes.quantity")}</TableHead>
                    <TableHead>{t("quotes.unitPrice")}</TableHead>
                    <TableHead>{t("quotes.total")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(viewingQuote.quote_items || []).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>${item.unit_price.toFixed(2)}</TableCell>
                      <TableCell>${item.total.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="text-right space-y-1">
                <p>{t("quotes.subtotal")}: ${viewingQuote.subtotal.toFixed(2)}</p>
                <p>{t("quotes.taxAmount")}: ${viewingQuote.tax_amount.toFixed(2)}</p>
                <p className="font-bold text-lg">{t("quotes.totalAmount")}: ${viewingQuote.total.toFixed(2)}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("quotes.sendEmail")}</DialogTitle>
            <DialogDescription>
              {emailQuote?.quote_number}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("quotes.selectRecipients")}</Label>
              <div className="space-y-2 mt-2">
                {availableEmails.map((email) => (
                  <div key={email} className="flex items-center gap-2">
                    <Checkbox
                      id={email}
                      checked={selectedEmails.includes(email)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedEmails([...selectedEmails, email]);
                        } else {
                          setSelectedEmails(selectedEmails.filter(e => e !== email));
                        }
                      }}
                    />
                    <Label htmlFor={email} className="font-normal">{email}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label>{t("quotes.emailSubject")}</Label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
            </div>
            <div>
              <Label>{t("quotes.emailMessage")}</Label>
              <Textarea
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                rows={8}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEmailDialogOpen(false)}>
                {t("quotes.cancel")}
              </Button>
              <Button onClick={handleSendEmail} disabled={isSendingEmail || selectedEmails.length === 0}>
                {isSendingEmail ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("quotes.sendingEmail")}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {t("quotes.send")}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Quotes;
