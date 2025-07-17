import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Eye, Edit, Download, Send, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useInvoices } from "@/hooks/useInvoices";
import { useClients } from "@/hooks/useClients";
import { useCompanies } from "@/hooks/useCompanies";
import { useProducts } from "@/hooks/useProducts";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type Client = Tables<"clients">;
type Invoice = Tables<"invoices"> & {
  clients?: {
    name: string;
    contact_person: string;
    email: string;
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
}

const Invoices = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterValue, setFilterValue] = useState("");
  
  // Database hooks
  const { invoices, loading, createInvoice, updateInvoice, deleteInvoice, refetch: fetchInvoices } = useInvoices();
  const { clients } = useClients();
  const { companies } = useCompanies();
  const { products } = useProducts();

  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [newInvoice, setNewInvoice] = useState({
    client_id: "",
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

    const newItem: InvoiceItem = {
      description: currentItem.description,
      quantity: currentItem.quantity,
      unit_price: currentItem.unit_price,
      total: currentItem.quantity * currentItem.unit_price,
      product_id: currentItem.product_id || undefined,
      notes: currentItem.notes || undefined
    };

    setNewInvoice({
      ...newInvoice,
      items: [...newInvoice.items, newItem]
    });

    setCurrentItem({
      description: "",
      quantity: 1,
      unit_price: 0,
      product_id: "",
      notes: ""
    });
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
    const subtotal = calculateSubtotal();
    const selectedCompany = companies.find(c => c.id === selectedCompanyId);
    
    if (!selectedCompany?.taxes || !Array.isArray(selectedCompany.taxes) || selectedCompany.taxes.length === 0) {
      return { totalTax: 0, taxes: [] };
    }
    
    const taxes = selectedCompany.taxes.map((tax: any) => ({
      name: tax.name,
      percentage: tax.percentage,
      amount: subtotal * (tax.percentage / 100)
    }));
    
    const totalTax = taxes.reduce((sum, tax) => sum + tax.amount, 0);
    
    return { totalTax, taxes };
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const { totalTax } = calculateTaxes();
    return subtotal + totalTax;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newInvoice.items.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one item to the invoice.",
        variant: "destructive"
      });
      return;
    }

    const totalAmount = calculateTotal();
    const subtotal = calculateSubtotal();
    const { totalTax } = calculateTaxes();
    
    if (editingInvoice) {
      // Update existing invoice
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
      await createInvoice({
        invoice_number: invoiceNumber,
        client_id: newInvoice.client_id,
        due_date: newInvoice.due_date,
        terms: newInvoice.terms,
        notes: newInvoice.notes,
        subtotal: subtotal,
        tax_amount: totalTax,
        total: totalAmount
      }, newInvoice.items);
    }

    // Reset form
    setSelectedCompanyId("");
    setNewInvoice({
      client_id: "",
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
    setIsDialogOpen(false);
    setEditingInvoice(null);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    
    // Find the company ID for this invoice
    const client = clients.find(c => c.id === invoice.client_id);
    setSelectedCompanyId(client?.company_id || "");
    
    setNewInvoice({
      client_id: invoice.client_id || "",
      due_date: invoice.due_date || "",
      terms: invoice.terms || "",
      notes: invoice.notes || "",
      items: invoice.invoice_items?.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
        product_id: item.product_id || "",
        notes: item.notes || ""
      })) || []
    });
    setIsDialogOpen(true);
  };

  const filteredInvoices = invoices.filter(invoice => {
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
    }
    
    return matchesSearch;
  });

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
      // Find client and company information
      const client = clients.find(c => c.id === invoice.client_id);
      const company = companies.find(c => c.id === client?.company_id);
      
      // Create new PDF document
      const doc = new jsPDF();
      
      // Set font
      doc.setFont('helvetica');
      
      // Header with logo
      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      
      // Define translations based on client language
      const isClientFrench = client?.language === 'french';
      const translations = isClientFrench ? {
        invoice: 'FACTURE',
        billTo: 'Facturer à :',
        invoiceNumber: 'Numéro de facture',
        issueDate: 'Date d\'émission',
        dueDate: 'Date d\'échéance',
        status: 'Statut',
        description: 'Description',
        qty: 'Qté',
        unitPrice: 'Prix unitaire',
        total: 'Total',
        subtotal: 'Sous-total',
        tax: 'Taxe',
        notes: 'Notes',
        terms: 'Conditions',
        thankYou: 'Merci pour votre confiance !',
        phone: 'Téléphone',
        email: 'Courriel',
        website: 'Site web'
      } : {
        invoice: 'INVOICE',
        billTo: 'Bill To:',
        invoiceNumber: 'Invoice Number',
        issueDate: 'Issue Date',
        dueDate: 'Due Date',
        status: 'Status',
        description: 'Description',
        qty: 'Qty',
        unitPrice: 'Unit Price',
        total: 'Total',
        subtotal: 'Subtotal',
        tax: 'Tax',
        notes: 'Notes',
        terms: 'Terms',
        thankYou: 'Thank you for your business!',
        phone: 'Phone',
        email: 'Email',
        website: 'Website'
      };
      
      // Check if company has a logo
      if (company && company.logo_url) {
        try {
          // Load and add logo
          const logoImg = new Image();
          logoImg.crossOrigin = 'anonymous';
          
          // Create a promise to handle image loading
          await new Promise((resolve, reject) => {
            logoImg.onload = () => {
              try {
                // Add logo (positioned at top left)
                doc.addImage(logoImg, 'JPEG', 20, 15, 40, 30);
                // Add INVOICE text next to logo (translated)
                doc.text(translations.invoice, 70, 35);
                resolve(undefined);
              } catch (error) {
                console.error('Error adding logo to PDF:', error);
                // Fallback: just add text without logo
                doc.text(translations.invoice, 20, 30);
                resolve(undefined);
              }
            };
            logoImg.onerror = () => {
              console.error('Error loading logo image');
              // Fallback: just add text without logo
              doc.text(translations.invoice, 20, 30);
              resolve(undefined);
            };
            logoImg.src = company.logo_url;
          });
        } catch (error) {
          console.error('Error handling logo:', error);
          // Fallback: just add text without logo
          doc.text(translations.invoice, 20, 30);
        }
      } else {
        // No logo, just add INVOICE text (translated)
        doc.text(translations.invoice, 20, 30);
      }
      
      // Company information (top right)
      if (company) {
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        const companyLines = [
          company.name,
          ...(company.address ? [company.address] : []),
          ...(company.phone ? [`${translations.phone}: ${company.phone}`] : []),
          ...(company.email ? [`${translations.email}: ${company.email}`] : []),
          ...(company.website ? [`${translations.website}: ${company.website}`] : [])
        ];
        
        let yPos = company.logo_url ? 50 : 30; // Adjust position if logo is present
        companyLines.forEach(line => {
          const textWidth = doc.getTextWidth(line);
          doc.text(line, 210 - 20 - textWidth, yPos);
          yPos += 6;
        });
      }
      
      // Invoice details (adjust position based on logo presence)
      const invoiceDetailsY = company?.logo_url ? 70 : 60;
      doc.setFontSize(12);
      doc.setTextColor(40, 40, 40);
      doc.text(`${translations.invoiceNumber}: ${invoice.invoice_number}`, 20, invoiceDetailsY);
      doc.text(`${translations.issueDate}: ${invoice.issue_date}`, 20, invoiceDetailsY + 10);
      doc.text(`${translations.dueDate}: ${invoice.due_date || 'N/A'}`, 20, invoiceDetailsY + 20);
      doc.text(`${translations.status}: ${invoice.status.toUpperCase()}`, 20, invoiceDetailsY + 30);
      
      // Client information (adjust position based on logo presence)
      const clientInfoY = company?.logo_url ? 120 : 110;
      if (client) {
        doc.setFontSize(14);
        doc.setTextColor(40, 40, 40);
        doc.text(translations.billTo, 20, clientInfoY);
        
        doc.setFontSize(12);
        const clientLines = [
          client.name,
          ...(client.contact_person ? [client.contact_person] : []),
          ...(client.address ? [client.address] : []),
          ...(client.phone ? [`${translations.phone}: ${client.phone}`] : []),
          ...(client.email ? [`${translations.email}: ${client.email}`] : [])
        ];
        
        let yPos = clientInfoY + 10;
        clientLines.forEach(line => {
          doc.text(line, 20, yPos);
          yPos += 6;
        });
      }
      
      // Items table (adjust position based on logo presence)  
      const startY = company?.logo_url ? 180 : 160;
      const tableHeaders = [translations.description, translations.qty, translations.unitPrice, translations.total];
      const tableData: any[] = [];
      
      // Add invoice items (if available)
      if (invoice.invoice_items && invoice.invoice_items.length > 0) {
        invoice.invoice_items.forEach(item => {
          tableData.push([
            item.description,
            item.quantity.toString(),
            `$${item.unit_price.toFixed(2)}`,
            `$${item.total.toFixed(2)}`
          ]);
        });
      } else {
        // If no items available, show totals only
        tableData.push(['Invoice items not available', '', '', '']);
      }
      
      // Add subtotal, individual taxes, and total rows
      tableData.push(['', '', `${translations.subtotal}:`, `$${invoice.subtotal.toFixed(2)}`]);
      
      // Add individual taxes if company has multiple taxes
      if (company?.taxes && Array.isArray(company.taxes) && company.taxes.length > 0) {
        company.taxes.forEach((tax: any) => {
          const taxAmount = invoice.subtotal * (tax.percentage / 100);
          tableData.push(['', '', `${tax.name} (${tax.percentage}%):`, `$${taxAmount.toFixed(2)}`]);
        });
      } else if (invoice.tax_amount > 0) {
        // Fallback to generic tax if no specific taxes are configured
        tableData.push(['', '', `${translations.tax}:`, `$${invoice.tax_amount.toFixed(2)}`]);
      }
      
      tableData.push(['', '', `${translations.total}:`, `$${invoice.total.toFixed(2)}`]);
      
      // Use autoTable for better table formatting
      autoTable(doc, {
        head: [tableHeaders],
        body: tableData,
        startY: startY,
        theme: 'grid',
        styles: {
          fontSize: 10,
          cellPadding: 5,
        },
        headStyles: {
          fillColor: [40, 40, 40],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        columnStyles: {
          1: { halign: 'center' },
          2: { halign: 'right' },
          3: { halign: 'right' },
        },
        didDrawPage: function(data: any) {
          // Footer
          const pageSize = doc.internal.pageSize;
          const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.text(translations.thankYou, 20, pageHeight - 20);
        }
      });
      
      // Add notes if available
      if (invoice.notes) {
        const finalY = (doc as any).autoTable.previous.finalY + 20;
        doc.setFontSize(12);
        doc.setTextColor(40, 40, 40);
        doc.text(`${translations.notes}:`, 20, finalY);
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        const splitNotes = doc.splitTextToSize(invoice.notes, 170);
        doc.text(splitNotes, 20, finalY + 10);
      }
      
      // Add terms if available
      if (invoice.terms) {
        const finalY = (doc as any).autoTable.previous.finalY + (invoice.notes ? 40 : 20);
        doc.setFontSize(12);
        doc.setTextColor(40, 40, 40);
        doc.text(`${translations.terms}:`, 20, finalY);
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        const splitTerms = doc.splitTextToSize(invoice.terms, 170);
        doc.text(splitTerms, 20, finalY + 10);
      }
      
      // Save the PDF
      doc.save(`invoice-${invoice.invoice_number}.pdf`);
      
      toast({
        title: "Success",
        description: "Invoice PDF downloaded successfully!",
      });
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive"
      });
    }
  };

  const openEmailDialog = (invoice: Invoice) => {
    setEmailingInvoice(invoice);
    
    // Find client and company for template variables
    const client = clients.find(c => c.id === invoice.client_id);
    const company = companies.find(c => c.id === client?.company_id);
    
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

      // Default to new invoice template
      let defaultSubject = company.invoice_email_subject || 'Invoice {invoice_number} from {company_name}';
      let defaultMessage = company.invoice_email_message || `Dear {client_name},

Please find attached your invoice {invoice_number} dated {issue_date}.

Amount due: {total}
Due date: {due_date}

Thank you for your business!

Best regards,
{company_name}`;

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

  const handleEmailTypeChange = (type: "new" | "overdue" | "payment_confirmation") => {
    setEmailType(type);
    
    if (!emailingInvoice) return;
    
    const client = clients.find(c => c.id === emailingInvoice.client_id);
    const company = companies.find(c => c.id === client?.company_id);
    
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

      let subject, message;
      
      if (type === "overdue") {
        subject = company.overdue_email_subject || 'Payment Overdue - Invoice {invoice_number}';
        message = company.overdue_email_message || `Dear {client_name},

This is a friendly reminder that your invoice {invoice_number} dated {issue_date} is now overdue.

Original amount: {total}
Due date: {due_date}
Days overdue: {days_overdue}

Please remit payment at your earliest convenience to avoid any late fees.

If you have already sent payment, please disregard this notice.

Thank you for your prompt attention to this matter.

Best regards,
{company_name}`;
      } else if (type === "payment_confirmation") {
        subject = company.payment_confirmation_email_subject || 'Payment Confirmation - Invoice {invoice_number}';
        message = company.payment_confirmation_email_message || `Dear {client_name},

We have successfully received your payment for invoice {invoice_number}.

Payment details:
- Invoice: {invoice_number}
- Amount: {total}
- Date paid: ${new Date().toLocaleDateString()}

Thank you for your prompt payment and continued business!

Best regards,
{company_name}`;
      } else {
        subject = company.invoice_email_subject || 'Invoice {invoice_number} from {company_name}';
        message = company.invoice_email_message || `Dear {client_name},

Please find attached your invoice {invoice_number} dated {issue_date}.

Amount due: {total}
Due date: {due_date}

Thank you for your business!

Best regards,
{company_name}`;
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
    if (!emailingInvoice) return;
    
    try {
      const { error } = await supabase.functions.invoke('send-invoice-email', {
        body: { 
          invoiceId: emailingInvoice.id,
          customSubject: emailForm.subject,
          customMessage: emailForm.message,
          emailType
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Invoice email sent successfully!",
      });
      
      setIsEmailDialogOpen(false);
      setEmailingInvoice(null);
      
      // Refresh invoices to update status
      await fetchInvoices();
    } catch (error) {
      console.error('Error sending invoice email:', error);
      toast({
        title: "Error",
        description: "Failed to send invoice email. Please try again.",
        variant: "destructive"
      });
    }
  };

  const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.total, 0);

  const paidAmount = invoices
    .filter(invoice => invoice.status === "paid")
    .reduce((sum, invoice) => sum + invoice.total, 0);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">
            Create and manage your invoices
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingInvoice ? "Edit Invoice" : "Create New Invoice"}</DialogTitle>
              <DialogDescription>
                {editingInvoice ? "Update invoice information." : "Create a new invoice with multiple products or services."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company">Select Company</Label>
                  <Select 
                    value={selectedCompanyId} 
                    onValueChange={(value) => {
                      setSelectedCompanyId(value);
                      // Reset client selection when company changes
                      setNewInvoice({
                        ...newInvoice,
                        client_id: ""
                      });
                      
                      // Calculate due date based on company's default_due_days
                      const selectedCompany = companies.find(c => c.id === value);
                      if (selectedCompany?.default_due_days) {
                        const today = new Date();
                        const dueDate = new Date(today);
                        dueDate.setDate(today.getDate() + selectedCompany.default_due_days);
                        
                        setNewInvoice(prev => ({
                          ...prev,
                          client_id: "",
                          due_date: dueDate.toISOString().split('T')[0] // Format as YYYY-MM-DD
                        }));
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select company" />
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
                  <Label htmlFor="client">Select Client</Label>
                  <Select 
                    value={newInvoice.client_id} 
                    onValueChange={(value) => {
                      setNewInvoice({
                        ...newInvoice, 
                        client_id: value
                      });
                    }}
                    disabled={!selectedCompanyId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={selectedCompanyId ? "Select client" : "Select company first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredClients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{client.name}</span>
                            <span className="text-sm text-muted-foreground">{client.contact_person}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={newInvoice.due_date}
                    onChange={(e) => setNewInvoice({...newInvoice, due_date: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="terms">Terms</Label>
                  <Input
                    id="terms"
                    placeholder="Payment terms"
                    value={newInvoice.terms}
                    onChange={(e) => setNewInvoice({...newInvoice, terms: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    placeholder="Additional notes"
                    value={newInvoice.notes}
                    onChange={(e) => setNewInvoice({...newInvoice, notes: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Add Items</h3>
                
                {/* Product Selector */}
                <div className="space-y-2">
                  <Label htmlFor="product">Select Product/Service (optional)</Label>
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
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select existing product/service or enter custom" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">
                        <div className="flex items-center">
                          <Plus className="h-4 w-4 mr-2" />
                          Custom Item
                        </div>
                      </SelectItem>
                      <SelectItem value="new">
                        <div className="flex items-center">
                          <Plus className="h-4 w-4 mr-2" />
                          Add New Product/Service
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
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      placeholder="Item description"
                      value={currentItem.description}
                      onChange={(e) => setCurrentItem({...currentItem, description: e.target.value})}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={currentItem.quantity}
                      onChange={(e) => setCurrentItem({...currentItem, quantity: parseInt(e.target.value) || 1})}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="unit_price">Unit Price</Label>
                    <Input
                      id="unit_price"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={currentItem.unit_price}
                      onChange={(e) => setCurrentItem({...currentItem, unit_price: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div className="col-span-3">
                    <Label htmlFor="item_notes">Notes (optional)</Label>
                    <Input
                      id="item_notes"
                      placeholder="Item notes"
                      value={currentItem.notes}
                      onChange={(e) => setCurrentItem({...currentItem, notes: e.target.value})}
                    />
                  </div>
                  <div className="col-span-2">
                    <Button type="button" onClick={addItem} className="w-full">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Item
                    </Button>
                  </div>
                </div>

                {newInvoice.items.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium">Invoice Items</h4>
                    <div className="border rounded-lg">
                      <Table>
                         <TableHeader>
                           <TableRow>
                             <TableHead>Description</TableHead>
                             <TableHead>Notes</TableHead>
                             <TableHead>Qty</TableHead>
                             <TableHead>Unit Price</TableHead>
                             <TableHead>Total</TableHead>
                             <TableHead className="w-16"></TableHead>
                           </TableRow>
                         </TableHeader>
                        <TableBody>
                           {newInvoice.items.map((item, index) => (
                             <TableRow key={index}>
                               <TableCell className="font-medium">{item.description}</TableCell>
                               <TableCell className="text-sm text-muted-foreground">{item.notes || "-"}</TableCell>
                               <TableCell>{item.quantity}</TableCell>
                               <TableCell>${item.unit_price.toFixed(2)}</TableCell>
                               <TableCell>${item.total.toFixed(2)}</TableCell>
                               <TableCell>
                                 <Button
                                   type="button"
                                   variant="outline"
                                   size="sm"
                                   onClick={() => removeItem(index)}
                                 >
                                   <Trash2 className="h-4 w-4" />
                                 </Button>
                               </TableCell>
                             </TableRow>
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
                                   {tax.name} ({tax.percentage}%):
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
                  setEditingInvoice(null);
                  setIsDialogOpen(false);
                }} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={newInvoice.items.length === 0}>
                  {editingInvoice ? "Update Invoice" : "Create Invoice"}
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
                {false && (
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
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.description}</TableCell>
                              <TableCell className="text-right">{item.quantity}</TableCell>
                              <TableCell className="text-right">${item.unit_price.toFixed(2)}</TableCell>
                              <TableCell className="text-right font-medium">${item.total.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                           <TableRow className="bg-muted/30">
                             <TableCell colSpan={3} className="text-right font-medium">
                               Subtotal:
                             </TableCell>
                             <TableCell className="text-right font-medium">
                               ${viewingInvoice.subtotal.toFixed(2)}
                             </TableCell>
                           </TableRow>
                           <TableRow className="bg-muted/30">
                             <TableCell colSpan={3} className="text-right font-medium">
                               Tax:
                             </TableCell>
                             <TableCell className="text-right font-medium">
                               ${viewingInvoice.tax_amount.toFixed(2)}
                             </TableCell>
                           </TableRow>
                           <TableRow className="bg-muted/50 border-t-2">
                             <TableCell colSpan={3} className="text-right font-semibold">
                               Total Amount:
                             </TableCell>
                             <TableCell className="text-right font-bold text-lg">
                               ${viewingInvoice.total.toFixed(2)}
                             </TableCell>
                           </TableRow>
                        </TableBody>
                      </Table>
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

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalAmount.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${paidAmount.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">${(totalAmount - paidAmount).toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search invoices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={filterType} onValueChange={(value) => {
          setFilterType(value);
          setFilterValue("");
        }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Invoices</SelectItem>
            <SelectItem value="client">By Client</SelectItem>
            <SelectItem value="company">By Company</SelectItem>
          </SelectContent>
        </Select>
        {filterType === "client" && (
          <Select value={filterValue} onValueChange={setFilterValue}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
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
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select company" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice List</CardTitle>
          <CardDescription>
            Manage all your invoices in one place
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                  <TableCell>
                    {clients.find(c => c.id === invoice.client_id)?.name || 'Unknown Client'}
                  </TableCell>
                  <TableCell className="font-medium">${invoice.total.toFixed(2)}</TableCell>
                  <TableCell>
                    <Select value={invoice.status} onValueChange={(value) => updateInvoice(invoice.id, { status: value })}>
                      <SelectTrigger className="w-28 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>{invoice.issue_date}</TableCell>
                  <TableCell>{invoice.due_date}</TableCell>
                  <TableCell>0</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" size="sm" onClick={() => {
                        setViewingInvoice(invoice);
                        setIsViewDialogOpen(true);
                      }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleEditInvoice(invoice)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => downloadInvoicePDF(invoice)}>
                        <Download className="h-4 w-4" />
                      </Button>
                      {(invoice.status === "draft" || invoice.status === "sent" || invoice.status === "paid") && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => openEmailDialog(invoice)}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete invoice {invoice.invoice_number}? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deleteInvoice(invoice.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Email Dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Send Invoice Email</DialogTitle>
            <DialogDescription>
              Choose email type and customize the message before sending
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Email Type Selection */}
            <div className="space-y-2">
              <Label>Email Type</Label>
              <Select value={emailType} onValueChange={handleEmailTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New Invoice</SelectItem>
                  <SelectItem value="overdue">Overdue Payment Reminder</SelectItem>
                  <SelectItem value="payment_confirmation">Payment Confirmation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Client Email Info */}
            {emailingInvoice && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Sending to:</p>
                <p className="font-medium">
                  {clients.find(c => c.id === emailingInvoice.client_id)?.name} 
                  ({clients.find(c => c.id === emailingInvoice.client_id)?.email})
                </p>
                <p className="text-sm text-muted-foreground">
                  Invoice: {emailingInvoice.invoice_number} - ${emailingInvoice.total.toFixed(2)}
                </p>
              </div>
            )}

            {/* Email Subject */}
            <div className="space-y-2">
              <Label htmlFor="email-subject">Email Subject</Label>
              <Input
                id="email-subject"
                value={emailForm.subject}
                onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                placeholder="Email subject"
              />
            </div>

            {/* Email Message */}
            <div className="space-y-2">
              <Label htmlFor="email-message">Email Message</Label>
              <Textarea
                id="email-message"
                value={emailForm.message}
                onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
                placeholder="Email message"
                rows={8}
                className="min-h-[200px]"
              />
              <p className="text-xs text-muted-foreground">
                Available placeholders: {'{client_name}'}, {'{invoice_number}'}, {'{issue_date}'}, {'{due_date}'}, {'{total}'}, {'{company_name}'}, {'{days_overdue}'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsEmailDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={sendInvoiceEmail}
                className="flex-1"
                disabled={!emailForm.subject || !emailForm.message}
              >
                <Send className="h-4 w-4 mr-2" />
                Send Email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Invoices;