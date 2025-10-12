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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useInvoices } from "@/hooks/useInvoices";
import { useClients } from "@/hooks/useClients";
import { useCompanies } from "@/hooks/useCompanies";
import { useProducts } from "@/hooks/useProducts";
import { useLanguage } from "@/hooks/useLanguage";
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
  product_taxes?: Array<{name: string, type?: 'percentage' | 'amount', value?: number, percentage?: number}>;
}

const Invoices = () => {
  const { toast } = useToast();
  const { t } = useLanguage();
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

    setNewInvoice({
      ...newInvoice,
      items: [...newInvoice.items, newItem]
    });

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
        issue_date: newInvoice.issue_date,
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
      issue_date: invoice.issue_date || new Date().toISOString().split('T')[0],
      due_date: invoice.due_date || "",
      terms: invoice.terms || "",
      notes: invoice.notes || "",
      items: invoice.invoice_items?.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
        product_id: item.product_id || "",
        notes: item.notes || "",
        product_taxes: item.product_taxes as Array<{name: string, percentage: number}> | undefined
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

  const downloadInvoicePDF = async (invoice: Invoice, emailType?: "new" | "overdue" | "payment_confirmation") => {
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
                // Calculate logo dimensions while maintaining aspect ratio
                const logoWidth = logoImg.width;
                const logoHeight = logoImg.height;
                const maxWidth = 40;
                const maxHeight = 30;
                
                let scaledWidth = maxWidth;
                let scaledHeight = maxHeight;
                
                const aspectRatio = logoWidth / logoHeight;
                
                if (aspectRatio > 1) {
                  // Landscape orientation
                  scaledHeight = maxWidth / aspectRatio;
                  if (scaledHeight > maxHeight) {
                    scaledHeight = maxHeight;
                    scaledWidth = maxHeight * aspectRatio;
                  }
                } else {
                  // Portrait or square orientation
                  scaledWidth = maxHeight * aspectRatio;
                  if (scaledWidth > maxWidth) {
                    scaledWidth = maxWidth;
                    scaledHeight = maxWidth / aspectRatio;
                  }
                }
                
                // Add logo with preserved aspect ratio
                doc.addImage(logoImg, 'JPEG', 20, 15, scaledWidth, scaledHeight);
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
      
      // Only show status for payment confirmations
      if (emailType === "payment_confirmation") {
        doc.text(`${translations.status}: ${invoice.status.toUpperCase()}`, 20, invoiceDetailsY + 30);
      }
      
      // Client information (adjust position based on logo presence and status display)
      const clientInfoY = company?.logo_url ? 
        (emailType === "payment_confirmation" ? 130 : 120) : 
        (emailType === "payment_confirmation" ? 120 : 110);
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
      
      // Items table (adjust position based on logo presence and status display)  
      const startY = company?.logo_url ? 
        (emailType === "payment_confirmation" ? 190 : 180) : 
        (emailType === "payment_confirmation" ? 170 : 160);
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
          
          // Add product taxes if they exist for this item
          if (item.product_taxes && Array.isArray(item.product_taxes) && item.product_taxes.length > 0) {
            item.product_taxes.forEach((tax: any) => {
              // Support both old format and new format
              const taxType = tax.type || 'percentage';
              const taxValue = tax.value !== undefined ? tax.value : tax.percentage;
              
              let taxAmount = 0;
              if (taxType === 'percentage') {
                taxAmount = item.total * (taxValue / 100);
              } else {
                taxAmount = taxValue * item.quantity;
              }
              
              const taxLabel = taxType === 'percentage' ? `${taxValue}%` : `$${taxValue}`;
              const taxDetails = `${tax.name} (${taxLabel})`;
              
              tableData.push([
                `  ${translations.tax}: ${taxDetails}`,
                '',
                '',
                `$${taxAmount.toFixed(2)}`
              ]);
            });
          }
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
      const isFrench = client?.language === 'french';

      // Default to new invoice template with language support
      let defaultSubject, defaultMessage;
      
      if (isFrench) {
        defaultSubject = 'Facture {invoice_number} de {company_name}';
        defaultMessage = `Cher/Chère {client_name},

Veuillez trouver ci-jointe votre facture {invoice_number} datée du {issue_date}.

Montant dû : {total}$
Date d'échéance : {due_date}

Merci pour votre confiance !

Meilleures salutations,
{company_name}`;
      } else {
        defaultSubject = company.invoice_email_subject || 'Invoice {invoice_number} from {company_name}';
        defaultMessage = company.invoice_email_message || `Dear {client_name},

Please find attached your invoice {invoice_number} dated {issue_date}.

Amount due: {total}
Due date: {due_date}

Thank you for your business!

Best regards,
{company_name}`;
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

      // Check client language
      const isFrench = client?.language === 'french';

      let subject, message;
      
      if (type === "overdue") {
        if (isFrench) {
          subject = 'Paiement en retard - Facture {invoice_number}';
          message = `Cher/Chère {client_name},

Ceci est un rappel amical que votre facture {invoice_number} datée du {issue_date} est maintenant en retard.

Montant original : {total}$
Date d'échéance : {due_date}
Jours de retard : {days_overdue}

Veuillez effectuer le paiement à votre plus tôt possible pour éviter des frais de retard.

Si vous avez déjà envoyé le paiement, veuillez ignorer cet avis.

Merci pour votre attention prompte à cette question.

Meilleures salutations,
{company_name}`;
        } else {
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
        }
      } else if (type === "payment_confirmation") {
        if (isFrench) {
          subject = 'Confirmation de paiement - Facture {invoice_number}';
          message = `Cher/Chère {client_name},

Nous avons reçu avec succès votre paiement pour la facture {invoice_number}.

Détails du paiement :
- Facture : {invoice_number}
- Montant : {total}$
- Date de paiement : ${new Date().toLocaleDateString('fr-CA')}

Merci pour votre paiement rapide et votre fidélité !

Meilleures salutations,
{company_name}`;
        } else {
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
        }
      } else {
        if (isFrench) {
          subject = 'Facture {invoice_number} de {company_name}';
          message = `Cher/Chère {client_name},

Veuillez trouver ci-jointe votre facture {invoice_number} datée du {issue_date}.

Montant dû : {total}$
Date d'échéance : {due_date}

Merci pour votre confiance !

Meilleures salutations,
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
    
    try {
      const { error } = await supabase.functions.invoke('send-invoice-email', {
        body: { 
          invoiceId: emailingInvoice.id,
          customSubject: emailForm.subject,
          customMessage: emailForm.message,
          emailType,
          selectedEmails,
          ccEmails: ccEmails.filter(email => email.trim() !== "")
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Invoice email sent to ${selectedEmails.length} recipient(s)`,
      });
      
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
    }
  };

  const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.total, 0);

  const paidAmount = invoices
    .filter(invoice => invoice.status === "paid")
    .reduce((sum, invoice) => sum + invoice.total, 0);

  if (loading) {
    return <div>{t("invoices.loading")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("invoices.title")}</h1>
          <p className="text-muted-foreground">
            {t("invoices.subtitle")}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t("invoices.createButton")}
            </Button>
          </DialogTrigger>
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
                  <Label htmlFor="company">{t("invoices.selectCompany")}</Label>
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
                  <Label htmlFor="client">{t("invoices.selectClient")}</Label>
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
                  <Label htmlFor="issue_date">{t("invoices.issueDate")}</Label>
                  <Input
                    id="issue_date"
                    type="date"
                    value={newInvoice.issue_date}
                    onChange={(e) => {
                      const issueDate = new Date(e.target.value);
                      const selectedCompany = companies.find(c => c.id === selectedCompanyId);
                      const dueDays = selectedCompany?.default_due_days || 7;
                      const dueDate = new Date(issueDate);
                      dueDate.setDate(dueDate.getDate() + dueDays);
                      
                      setNewInvoice({
                        ...newInvoice, 
                        issue_date: e.target.value,
                        due_date: dueDate.toISOString().split('T')[0]
                      });
                    }}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due_date">{t("invoices.dueDate")}</Label>
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
                <h3 className="text-lg font-medium">{t("invoices.addItems")}</h3>
                
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
                      type="number"
                      min="1"
                      value={currentItem.quantity}
                      onChange={(e) => setCurrentItem({...currentItem, quantity: parseInt(e.target.value) || 1})}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="unit_price">{t("invoices.unitPrice")}</Label>
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
                    <Label htmlFor="item_notes">{t("invoices.itemNotes")}</Label>
                    <Input
                      id="item_notes"
                      placeholder={t("invoices.itemNotesPlaceholder")}
                      value={currentItem.notes}
                      onChange={(e) => setCurrentItem({...currentItem, notes: e.target.value})}
                    />
                  </div>
                  <div className="col-span-2">
                    <Button type="button" onClick={addItem} className="w-full">
                      <Plus className="h-4 w-4 mr-1" />
                      {t("invoices.addItemButton")}
                    </Button>
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
                             <TableHead className="w-16"></TableHead>
                           </TableRow>
                         </TableHeader>
                         <TableBody>
                           {newInvoice.items.map((item, index) => (
                             <>
                               <TableRow key={`item-${index}`}>
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
                                {item.product_taxes && item.product_taxes.length > 0 && (
                                  <TableRow key={`tax-${index}`} className="bg-muted/20">
                                    <TableCell colSpan={4} className="text-sm text-muted-foreground pl-8">
                                      {t("companies.taxes")}: {item.product_taxes.map((tax: any) => {
                                        const taxType = tax.type || 'percentage';
                                        const taxValue = tax.value !== undefined ? tax.value : tax.percentage;
                                        return `${tax.name} ${taxType === 'percentage' ? `${taxValue}%` : `$${taxValue}`}`;
                                      }).join(', ')}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                      ${item.product_taxes.reduce((sum: number, tax: any) => {
                                        const taxType = tax.type || 'percentage';
                                        const taxValue = tax.value !== undefined ? tax.value : tax.percentage;
                                        return sum + (taxType === 'percentage' ? (item.total * taxValue / 100) : (taxValue * item.quantity));
                                      }, 0).toFixed(2)}
                                    </TableCell>
                                    <TableCell></TableCell>
                                  </TableRow>
                                )}
                             </>
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
                  setEditingInvoice(null);
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
                             <>
                               <TableRow key={`item-${item.id}`}>
                                 <TableCell className="font-medium">{item.description}</TableCell>
                                 <TableCell className="text-right">{item.quantity}</TableCell>
                                 <TableCell className="text-right">${item.unit_price.toFixed(2)}</TableCell>
                                 <TableCell className="text-right font-medium">${item.total.toFixed(2)}</TableCell>
                               </TableRow>
                                {item.product_taxes && Array.isArray(item.product_taxes) && item.product_taxes.length > 0 && (
                                  <TableRow key={`tax-${item.id}`} className="bg-muted/20">
                                    <TableCell colSpan={3} className="text-sm text-muted-foreground pl-8">
                                      {t("companies.taxes")}: {item.product_taxes.map((tax: any) => {
                                        const taxType = tax.type || 'percentage';
                                        const taxValue = tax.value !== undefined ? tax.value : tax.percentage;
                                        return `${tax.name} ${taxType === 'percentage' ? `${taxValue}%` : `$${taxValue}`}`;
                                      }).join(', ')}
                                    </TableCell>
                                    <TableCell className="text-right text-sm">
                                      ${(() => {
                                        const totalTax = item.product_taxes.reduce((sum: number, tax: any) => {
                                          const taxType = tax.type || 'percentage';
                                          const taxValue = tax.value !== undefined ? tax.value : tax.percentage;
                                          const itemTotal = typeof item.total === 'number' ? item.total : Number(item.total);
                                          const itemQty = typeof item.quantity === 'number' ? item.quantity : Number(item.quantity);
                                          return sum + (taxType === 'percentage' ? (itemTotal * taxValue / 100) : (taxValue * itemQty));
                                        }, 0) as number;
                                        return totalTax.toFixed(2);
                                      })()}
                                    </TableCell>
                                  </TableRow>
                                )}
                             </>
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
            <CardTitle className="text-sm font-medium">{t("invoices.totalInvoices")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("invoices.totalAmountLabel")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalAmount.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("invoices.paidAmount")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${paidAmount.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("invoices.outstanding")}</CardTitle>
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
            placeholder={t("invoices.searchPlaceholder")}
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
            <SelectValue placeholder={t("invoices.filterBy")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("invoices.allInvoices")}</SelectItem>
            <SelectItem value="client">{t("invoices.byClient")}</SelectItem>
            <SelectItem value="company">{t("invoices.byCompany")}</SelectItem>
          </SelectContent>
        </Select>
        {filterType === "client" && (
          <Select value={filterValue} onValueChange={setFilterValue}>
            <SelectTrigger className="w-48">
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
            <SelectTrigger className="w-48">
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("invoices.listTitle")}</CardTitle>
          <CardDescription>
            {t("invoices.listDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
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
                        <SelectItem value="draft">{t("invoices.statusDraft")}</SelectItem>
                        <SelectItem value="sent">{t("invoices.statusSent")}</SelectItem>
                        <SelectItem value="paid">{t("invoices.statusPaid")}</SelectItem>
                        <SelectItem value="overdue">{t("invoices.statusOverdue")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>{invoice.issue_date}</TableCell>
                  <TableCell>{invoice.due_date}</TableCell>
                  <TableCell>{(invoice as any).invoice_items?.length || 0}</TableCell>
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
                disabled={!emailForm.subject || !emailForm.message || selectedEmails.length === 0}
              >
                <Send className="h-4 w-4 mr-2" />
                {t("invoices.sendEmail")} {selectedEmails.length > 0 && `(${selectedEmails.length})`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Invoices;