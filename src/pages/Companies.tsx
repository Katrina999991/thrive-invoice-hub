import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Building2, Plus, Edit, Trash2, MapPin, Phone, Mail, X, Percent, User, Send, Upload, Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCompanies } from "@/hooks/useCompanies";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useLanguage } from "@/hooks/useLanguage";
import { z } from "zod";

type Company = Tables<"companies">;

// Listes de pays et provinces/états
const COUNTRIES = [
  { value: "Canada", label: "Canada" },
  { value: "United States", label: "United States" },
  { value: "France", label: "France" },
  { value: "United Kingdom", label: "United Kingdom" },
  { value: "Germany", label: "Germany" },
  { value: "Spain", label: "Spain" },
  { value: "Italy", label: "Italy" },
  { value: "Mexico", label: "Mexico" },
  { value: "Brazil", label: "Brazil" },
  { value: "Other", label: "Other" }
];

const CANADA_PROVINCES = [
  { value: "AB", label: "Alberta" },
  { value: "BC", label: "British Columbia" },
  { value: "MB", label: "Manitoba" },
  { value: "NB", label: "New Brunswick" },
  { value: "NL", label: "Newfoundland and Labrador" },
  { value: "NS", label: "Nova Scotia" },
  { value: "ON", label: "Ontario" },
  { value: "PE", label: "Prince Edward Island" },
  { value: "QC", label: "Quebec" },
  { value: "SK", label: "Saskatchewan" },
  { value: "NT", label: "Northwest Territories" },
  { value: "NU", label: "Nunavut" },
  { value: "YT", label: "Yukon" }
];

const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" }
];

const Companies = () => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const { companies, loading, createCompany, updateCompany, deleteCompany } = useCompanies();

  // Helper function to format complete address
  const formatAddress = (company: Company) => {
    const parts = [];
    
    if ((company as any).street_address) {
      parts.push((company as any).street_address);
    }
    
    const cityProvince = [];
    if ((company as any).city) {
      cityProvince.push((company as any).city);
    }
    if ((company as any).province_state) {
      cityProvince.push((company as any).province_state);
    }
    if (cityProvince.length > 0) {
      parts.push(cityProvince.join(', '));
    }
    
    if ((company as any).postal_code) {
      parts.push((company as any).postal_code);
    }
    
    if ((company as any).country && (company as any).country !== 'Canada') {
      parts.push((company as any).country);
    }
    
    // Fallback to legacy address field if new fields are empty
    if (parts.length === 0 && company.address) {
      return company.address;
    }
    
    return parts.join(', ');
  };

  const [newCompany, setNewCompany] = useState({
    name: "",
    address: "",
    street_address: "",
    city: "",
    province_state: "",
    postal_code: "",
    country: "Canada",
    phone: "",
    email: "",
    website: "",
    tax_id: "",
    contact_person: "",
    logo_url: "",
    default_due_days: 7,
    invoice_prefix: "INV",
    invoice_digits: 3,
    invoice_start_number: 1,
    invoice_email_subject: "Invoice {invoice_number} from {company_name}",
    invoice_email_message: `Dear {client_name},

Please find attached your invoice {invoice_number} dated {issue_date}.

Amount due: ${"{total}"}
Due date: {due_date}

Thank you for your business!

Best regards,
{company_name}`,
    overdue_email_subject: "Payment Overdue - Invoice {invoice_number}",
    overdue_email_message: `Dear {client_name},

This is a friendly reminder that your invoice {invoice_number} dated {issue_date} is now overdue.

Original amount: ${"{total}"}
Due date: {due_date}
Days overdue: {days_overdue}

Please remit payment at your earliest convenience to avoid any late fees.

If you have already sent payment, please disregard this notice.

Thank you for your prompt attention to this matter.

Best regards,
{company_name}`,
    payment_confirmation_email_subject: "Payment Confirmation - Invoice {invoice_number}",
    payment_confirmation_email_message: `Dear {client_name},

We have successfully received your payment for invoice {invoice_number}.

Payment details:
- Invoice: {invoice_number}
- Amount: ${"{total}"}
- Date paid: {payment_date}

Thank you for your prompt payment and continued business!

Best regards,
{company_name}`,
    invoice_footer_message: "Thank you for your business!",
    invoice_footer_message_fr: "Merci pour votre confiance !"
  });

  const [taxes, setTaxes] = useState<Array<{name: string, percentage: number}>>([]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const addTax = () => {
    setTaxes([...taxes, { name: "", percentage: 0 }]);
  };

  const removeTax = (index: number) => {
    setTaxes(taxes.filter((_, i) => i !== index));
  };

  const updateTax = (index: number, field: 'name' | 'percentage', value: string | number) => {
    const newTaxes = [...taxes];
    newTaxes[index] = { ...newTaxes[index], [field]: value };
    setTaxes(newTaxes);
  };

  const validateInvoiceNumbering = async (): Promise<boolean> => {
    try {
      // Get all existing invoices to check for conflicts
      const { data: existingInvoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('invoice_number');

      if (invoicesError) throw invoicesError;

      // Get all companies except the one being edited
      const otherCompanies = companies.filter(c => !editingCompany || c.id !== editingCompany.id);

      // Check if another company has the same prefix
      const prefixConflict = otherCompanies.some(c => 
        (c as any).invoice_prefix === newCompany.invoice_prefix
      );

      if (prefixConflict) {
        toast({
          title: t("companies.validation.error"),
          description: t("companies.validation.prefixConflict"),
          variant: "destructive"
        });
        return false;
      }

      // Generate potential invoice numbers based on the new configuration
      const maxCheck = 100; // Check first 100 potential numbers
      const potentialNumbers: string[] = [];
      for (let i = 0; i < maxCheck; i++) {
        const num = (newCompany.invoice_start_number || 1) + i;
        const formatted = `${newCompany.invoice_prefix}-${num.toString().padStart(newCompany.invoice_digits, '0')}`;
        potentialNumbers.push(formatted);
      }

      // Check if any potential number already exists
      const existingNumbers = new Set(existingInvoices?.map(inv => inv.invoice_number) || []);
      const conflicts = potentialNumbers.filter(num => existingNumbers.has(num));

      if (conflicts.length > 0) {
        toast({
          title: t("companies.validation.error"),
          description: t("companies.validation.numberConflict").replace('{numbers}', conflicts.slice(0, 5).join(', ')),
          variant: "destructive"
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating invoice numbering:', error);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadingLogo(true);

    // Validate email
    const emailSchema = z.string().trim().min(1, { message: t("companies.validation.emailRequired") }).email({ message: t("companies.validation.emailInvalid") });
    
    try {
      emailSchema.parse(newCompany.email);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: t("companies.validation.error"),
          description: error.errors[0].message,
          variant: "destructive"
        });
        setUploadingLogo(false);
        return;
      }
    }

    // Validate invoice numbering configuration
    const isValid = await validateInvoiceNumbering();
    if (!isValid) {
      setUploadingLogo(false);
      return;
    }
    
    let logoUrl = newCompany.logo_url;
    
    // Upload logo if a new file is selected
    if (logoFile) {
      try {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('company-logos')
          .upload(filePath, logoFile);

        if (uploadError) {
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('company-logos')
          .getPublicUrl(filePath);

        logoUrl = publicUrl;
      } catch (error) {
        console.error('Error uploading logo:', error);
        toast({
          title: t("companies.logoError"),
          description: t("companies.logoError"),
          variant: "destructive"
        });
        setUploadingLogo(false);
        return;
      }
    }
    const companyData = {
      name: newCompany.name,
      address: newCompany.address || null,
      street_address: newCompany.street_address || null,
      city: newCompany.city || null,
      province_state: newCompany.province_state || null,
      postal_code: newCompany.postal_code || null,
      country: newCompany.country || null,
      phone: newCompany.phone || null,
      email: newCompany.email || null,
      website: newCompany.website || null,
      tax_id: newCompany.tax_id || null,
      contact_person: newCompany.contact_person || null,
      logo_url: logoUrl || null,
      taxes: taxes.length > 0 ? taxes : [],
      default_due_days: newCompany.default_due_days,
      invoice_prefix: newCompany.invoice_prefix,
      invoice_digits: newCompany.invoice_digits,
      invoice_start_number: newCompany.invoice_start_number,
      invoice_email_subject: newCompany.invoice_email_subject,
      invoice_email_message: newCompany.invoice_email_message,
      overdue_email_subject: newCompany.overdue_email_subject,
      overdue_email_message: newCompany.overdue_email_message,
      payment_confirmation_email_subject: newCompany.payment_confirmation_email_subject,
      payment_confirmation_email_message: newCompany.payment_confirmation_email_message,
      invoice_footer_message: newCompany.invoice_footer_message,
      invoice_footer_message_fr: newCompany.invoice_footer_message_fr
    };
    
    if (editingCompany) {
      await updateCompany(editingCompany.id, companyData);
    } else {
      await createCompany(companyData);
    }

    resetForm();
    setUploadingLogo(false);
  };

  const resetForm = () => {
    setLogoFile(null);
    setNewCompany({
      name: "",
      address: "",
      street_address: "",
      city: "",
      province_state: "",
      postal_code: "",
      country: "Canada",
      phone: "",
      email: "",
      website: "",
      tax_id: "",
      contact_person: "",
      logo_url: "",
      default_due_days: 7,
      invoice_prefix: "INV",
      invoice_digits: 3,
      invoice_start_number: 1,
      invoice_email_subject: "Invoice {invoice_number} from {company_name}",
      invoice_email_message: `Dear {client_name},

Please find attached your invoice {invoice_number} dated {issue_date}.

Amount due: ${"{total}"}
Due date: {due_date}

Thank you for your business!

Best regards,
{company_name}`,
      overdue_email_subject: "Payment Overdue - Invoice {invoice_number}",
      overdue_email_message: `Dear {client_name},

This is a friendly reminder that your invoice {invoice_number} dated {issue_date} is now overdue.

Original amount: ${"{total}"}
Due date: {due_date}
Days overdue: {days_overdue}

Please remit payment at your earliest convenience to avoid any late fees.

If you have already sent payment, please disregard this notice.

Thank you for your prompt attention to this matter.

Best regards,
{company_name}`,
      payment_confirmation_email_subject: "Payment Confirmation - Invoice {invoice_number}",
      payment_confirmation_email_message: `Dear {client_name},

We have successfully received your payment for invoice {invoice_number}.

Payment details:
- Invoice: {invoice_number}
- Amount: ${"{total}"}
- Date paid: {payment_date}

Thank you for your prompt payment and continued business!

Best regards,
{company_name}`,
      invoice_footer_message: "Thank you for your business!",
      invoice_footer_message_fr: "Merci pour votre confiance !"
    });
    setTaxes([]);
    setEditingCompany(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setLogoFile(null);
    setNewCompany({
      name: company.name,
      address: company.address || "",
      street_address: (company as any).street_address || "",
      city: (company as any).city || "",
      province_state: (company as any).province_state || "",
      postal_code: (company as any).postal_code || "",
      country: (company as any).country || "Canada",
      phone: company.phone || "",
      email: company.email || "",
      website: company.website || "",
      tax_id: company.tax_id || "",
      contact_person: company.contact_person || "",
      logo_url: company.logo_url || "",
      default_due_days: company.default_due_days || 7,
      invoice_prefix: (company as any).invoice_prefix || "INV",
      invoice_digits: (company as any).invoice_digits || 3,
      invoice_start_number: (company as any).invoice_start_number || 1,
      invoice_email_subject: (company as any).invoice_email_subject || "Invoice {invoice_number} from {company_name}",
      invoice_email_message: (company as any).invoice_email_message || `Dear {client_name},

Please find attached your invoice {invoice_number} dated {issue_date}.

Amount due: ${"{total}"}
Due date: {due_date}

Thank you for your business!

Best regards,
{company_name}`,
      overdue_email_subject: (company as any).overdue_email_subject || "Payment Overdue - Invoice {invoice_number}",
      overdue_email_message: (company as any).overdue_email_message || `Dear {client_name},

This is a friendly reminder that your invoice {invoice_number} dated {issue_date} is now overdue.

Original amount: ${"{total}"}
Due date: {due_date}
Days overdue: {days_overdue}

Please remit payment at your earliest convenience to avoid any late fees.

If you have already sent payment, please disregard this notice.

Thank you for your prompt attention to this matter.

Best regards,
{company_name}`,
      payment_confirmation_email_subject: (company as any).payment_confirmation_email_subject || "Payment Confirmation - Invoice {invoice_number}",
      payment_confirmation_email_message: (company as any).payment_confirmation_email_message || `Dear {client_name},

We have successfully received your payment for invoice {invoice_number}.

Payment details:
- Invoice: {invoice_number}
- Amount: ${"{total}"}
- Date paid: {payment_date}

Thank you for your prompt payment and continued business!

Best regards,
{company_name}`,
      invoice_footer_message: (company as any).invoice_footer_message || "Thank you for your business!",
      invoice_footer_message_fr: (company as any).invoice_footer_message_fr || "Merci pour votre confiance !"
    });
    // Handle taxes - parse JSON if it exists
    if (company.taxes && Array.isArray(company.taxes)) {
      setTaxes(company.taxes as Array<{name: string, percentage: number}>);
    } else {
      setTaxes([]);
    }
    setIsDialogOpen(true);
  };


  if (loading) {
    return <div>{t("companies.loading")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("companies.title")}</h1>
          <p className="text-muted-foreground">
            {t("companies.subtitle")}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t("companies.addButton")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCompany ? t("companies.dialog.edit") : t("companies.dialog.add")}</DialogTitle>
              <DialogDescription>
                {editingCompany ? t("companies.dialog.editDesc") : t("companies.dialog.addDesc")}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("companies.name")}</Label>
                <Input
                  id="name"
                  placeholder={t("companies.namePlaceholder")}
                  value={newCompany.name}
                  onChange={(e) => setNewCompany({...newCompany, name: e.target.value})}
                  required
                />
              </div>
              {/* Address fields */}
              <div className="space-y-4">
                <Label className="text-base font-medium">{t("companies.address")}</Label>
                
                <div className="space-y-2">
                  <Label htmlFor="street_address">{t("companies.streetAddress")}</Label>
                  <Input
                    id="street_address"
                    placeholder={t("companies.streetPlaceholder")}
                    value={newCompany.street_address}
                    onChange={(e) => setNewCompany({...newCompany, street_address: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="city">{t("companies.city")}</Label>
                    <Input
                      id="city"
                      placeholder={t("companies.cityPlaceholder")}
                      value={newCompany.city}
                      onChange={(e) => setNewCompany({...newCompany, city: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postal_code">{t("companies.postalCode")}</Label>
                    <Input
                      id="postal_code"
                      placeholder={t("companies.postalPlaceholder")}
                      value={newCompany.postal_code}
                      onChange={(e) => setNewCompany({...newCompany, postal_code: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">{t("companies.country")}</Label>
                  <Select value={newCompany.country} onValueChange={(value) => {
                    setNewCompany({...newCompany, country: value, province_state: ""});
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("companies.countryPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((country) => (
                        <SelectItem key={country.value} value={country.value}>
                          {country.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="province_state">
                    {newCompany.country === "Canada" ? t("companies.provinceState") : newCompany.country === "United States" ? t("companies.provinceState") : t("companies.provinceState")}
                  </Label>
                  {newCompany.country === "Canada" || newCompany.country === "United States" ? (
                    <Select value={newCompany.province_state} onValueChange={(value) => {
                      setNewCompany({...newCompany, province_state: value});
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("companies.provinceStatePlaceholder")} />
                      </SelectTrigger>
                      <SelectContent className="z-50 bg-popover">
                        {(newCompany.country === "Canada" ? CANADA_PROVINCES : US_STATES).map((region) => (
                          <SelectItem key={region.value} value={region.value}>
                            {region.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="province_state"
                      placeholder={t("companies.provinceStatePlaceholder")}
                      value={newCompany.province_state}
                      onChange={(e) => setNewCompany({...newCompany, province_state: e.target.value})}
                    />
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t("companies.phone")}</Label>
                <Input
                  id="phone"
                  placeholder={t("companies.phonePlaceholder")}
                  value={newCompany.phone}
                  onChange={(e) => setNewCompany({...newCompany, phone: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t("companies.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("companies.emailPlaceholder")}
                  value={newCompany.email}
                  onChange={(e) => setNewCompany({...newCompany, email: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_person">{t("companies.contactPerson")}</Label>
                <Input
                  id="contact_person"
                  placeholder={t("companies.contactPlaceholder")}
                  value={newCompany.contact_person}
                  onChange={(e) => setNewCompany({...newCompany, contact_person: e.target.value})}
                />
              </div>
              
              {/* Logo Upload */}
              <div className="space-y-2">
                <Label htmlFor="logo">{t("companies.logo")}</Label>
                <div className="flex items-center space-x-4">
                  {newCompany.logo_url && (
                    <div className="w-16 h-16 border rounded-lg overflow-hidden">
                      <img 
                        src={newCompany.logo_url} 
                        alt={t("companies.currentLogo")} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <Input
                      id="logo"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setLogoFile(file);
                          // Show preview
                          const reader = new FileReader();
                          reader.onload = (e) => {
                            setNewCompany({...newCompany, logo_url: e.target?.result as string});
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Upload PNG, JPG, or GIF (max 2MB)
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="website">{t("companies.website")}</Label>
                <Input
                  id="website"
                  placeholder={t("companies.websitePlaceholder")}
                  value={newCompany.website}
                  onChange={(e) => setNewCompany({...newCompany, website: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax_id">{t("companies.taxId")}</Label>
                <Input
                  id="tax_id"
                  placeholder={t("companies.taxIdPlaceholder")}
                  value={newCompany.tax_id}
                  onChange={(e) => setNewCompany({...newCompany, tax_id: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="default_due_days">{t("companies.dueDefault")}</Label>
                <Input
                  id="default_due_days"
                  type="number"
                  min="1"
                  max="365"
                  placeholder="7"
                  value={newCompany.default_due_days}
                  onChange={(e) => setNewCompany({...newCompany, default_due_days: parseInt(e.target.value) || 7})}
                />
              </div>

              <div className="space-y-2">
                <Label>{t("companies.invoiceSettings")}</Label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label htmlFor="invoicePrefix" className="text-sm">{t("companies.invoicePrefix")}</Label>
                    <Input
                      id="invoicePrefix"
                      placeholder={t("companies.invoicePrefixPlaceholder")}
                      value={newCompany.invoice_prefix}
                      onChange={(e) => setNewCompany({...newCompany, invoice_prefix: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="invoiceDigits" className="text-sm">{t("companies.invoiceDigits")}</Label>
                    <Input
                      id="invoiceDigits"
                      type="number"
                      min="1"
                      max="10"
                      value={newCompany.invoice_digits}
                      onChange={(e) => setNewCompany({...newCompany, invoice_digits: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="invoiceStartNumber" className="text-sm">{t("companies.invoiceStart")}</Label>
                    <Input
                      id="invoiceStartNumber"
                      type="number"
                      min="1"
                      value={newCompany.invoice_start_number}
                      onChange={(e) => setNewCompany({...newCompany, invoice_start_number: Number(e.target.value)})}
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Preview: {newCompany.invoice_prefix}-{String(newCompany.invoice_start_number).padStart(newCompany.invoice_digits, '0')}
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t("companies.taxes")}</Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={addTax}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {t("companies.addTax")}
                  </Button>
                </div>
                {taxes.map((tax, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label htmlFor={`tax-name-${index}`}>{t("companies.taxName")}</Label>
                      <Input
                        id={`tax-name-${index}`}
                        placeholder={t("companies.taxNamePlaceholder")}
                        value={tax.name}
                        onChange={(e) => updateTax(index, 'name', e.target.value)}
                      />
                    </div>
                    <div className="w-24">
                      <Label htmlFor={`tax-percentage-${index}`}>{t("companies.taxRate")}</Label>
                      <Input
                        id={`tax-percentage-${index}`}
                        type="number"
                        min="0"
                        max="100"
                        step="0.0001"
                        placeholder={t("companies.taxRatePlaceholder")}
                        value={tax.percentage}
                        onChange={(e) => {
                          const value = e.target.value.replace(',', '.');
                          updateTax(index, 'percentage', parseFloat(value) || 0);
                        }}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeTax(index)}
                      className="mb-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Invoice Email Settings */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Send className="h-4 w-4" />
                  <Label className="text-base font-medium">{t("companies.emailTemplates")}</Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoice_email_subject">{t("companies.invoiceEmailSubject")}</Label>
                  <Input
                    id="invoice_email_subject"
                    placeholder="Invoice {invoice_number} from {company_name}"
                    value={newCompany.invoice_email_subject}
                    onChange={(e) => setNewCompany({...newCompany, invoice_email_subject: e.target.value})}
                  />
                  <p className="text-xs text-muted-foreground">
                    Available placeholders: {"{invoice_number}"}, {"{company_name}"}, {"{client_name}"}, {"{total}"}, {"{issue_date}"}, {"{due_date}"}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoice_email_message">{t("companies.invoiceEmailMessage")}</Label>
                  <Textarea
                    id="invoice_email_message"
                    rows={6}
                    placeholder="Your invoice email message template..."
                    value={newCompany.invoice_email_message}
                    onChange={(e) => setNewCompany({...newCompany, invoice_email_message: e.target.value})}
                  />
                  <p className="text-xs text-muted-foreground">
                    Available placeholders: {"{invoice_number}"}, {"{company_name}"}, {"{client_name}"}, {"{total}"}, {"{issue_date}"}, {"{due_date}"}
                  </p>
                </div>
              </div>

              {/* Overdue Email Settings */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Send className="h-4 w-4" />
                  <Label className="text-base font-medium">{t("companies.overdueSubject")}</Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="overdue_email_subject">{t("companies.overdueSubject")}</Label>
                  <Input
                    id="overdue_email_subject"
                    placeholder="Payment Overdue - Invoice {invoice_number}"
                    value={newCompany.overdue_email_subject}
                    onChange={(e) => setNewCompany({...newCompany, overdue_email_subject: e.target.value})}
                  />
                  <p className="text-xs text-muted-foreground">
                    Available placeholders: {"{invoice_number}"}, {"{company_name}"}, {"{client_name}"}, {"{total}"}, {"{issue_date}"}, {"{due_date}"}, {"{days_overdue}"}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="overdue_email_message">{t("companies.overdueMessage")}</Label>
                  <Textarea
                    id="overdue_email_message"
                    rows={6}
                    placeholder="Your overdue payment reminder email template..."
                    value={newCompany.overdue_email_message}
                    onChange={(e) => setNewCompany({...newCompany, overdue_email_message: e.target.value})}
                  />
                  <p className="text-xs text-muted-foreground">
                    Available placeholders: {"{invoice_number}"}, {"{company_name}"}, {"{client_name}"}, {"{total}"}, {"{issue_date}"}, {"{due_date}"}, {"{days_overdue}"}
                  </p>
                </div>
              </div>

              {/* Payment Confirmation Email Settings */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Send className="h-4 w-4" />
                  <Label className="text-base font-medium">{t("companies.paymentSubject")}</Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment_confirmation_email_subject">{t("companies.paymentSubject")}</Label>
                  <Input
                    id="payment_confirmation_email_subject"
                    placeholder="Payment Confirmation - Invoice {invoice_number}"
                    value={newCompany.payment_confirmation_email_subject}
                    onChange={(e) => setNewCompany({...newCompany, payment_confirmation_email_subject: e.target.value})}
                  />
                  <p className="text-xs text-muted-foreground">
                    Available placeholders: {"{invoice_number}"}, {"{company_name}"}, {"{client_name}"}, {"{total}"}, {"{payment_date}"}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment_confirmation_email_message">{t("companies.paymentMessage")}</Label>
                  <Textarea
                    id="payment_confirmation_email_message"
                    rows={6}
                    placeholder="Your payment confirmation email template..."
                    value={newCompany.payment_confirmation_email_message}
                    onChange={(e) => setNewCompany({...newCompany, payment_confirmation_email_message: e.target.value})}
                  />
                  <p className="text-xs text-muted-foreground">
                    Available placeholders: {"{invoice_number}"}, {"{company_name}"}, {"{client_name}"}, {"{total}"}, {"{payment_date}"}
                  </p>
                </div>
              </div>
              
              {/* Invoice Footer Message */}
              <div className="space-y-2">
                <Label htmlFor="invoice_footer_message">{t("companies.invoiceFooter")} (English)</Label>
                <Textarea
                  id="invoice_footer_message"
                  rows={3}
                  placeholder="Thank you for your business!"
                  value={newCompany.invoice_footer_message}
                  onChange={(e) => setNewCompany({...newCompany, invoice_footer_message: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="invoice_footer_message_fr">{t("companies.invoiceFooter")} (Français)</Label>
                <Textarea
                  id="invoice_footer_message_fr"
                  rows={3}
                  placeholder="Merci pour votre confiance !"
                  value={newCompany.invoice_footer_message_fr}
                  onChange={(e) => setNewCompany({...newCompany, invoice_footer_message_fr: e.target.value})}
                />
                <p className="text-xs text-muted-foreground">
                  {t("companies.invoiceFooterDesc")}
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                  {t("companies.cancel")}
                </Button>
                <Button type="submit" className="flex-1" disabled={uploadingLogo}>
                  {uploadingLogo ? t("companies.uploadingLogo") : editingCompany ? t("companies.updateButton") : t("companies.addCompany")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {companies.map((company) => (
          <Card key={company.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center overflow-hidden">
                    {company.logo_url ? (
                      <img 
                        src={company.logo_url} 
                        alt={`${company.name} logo`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Building2 className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{company.name}</CardTitle>
                    <CardDescription>{t("companies.companyLabel")}</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {formatAddress(company) && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-2" />
                    {formatAddress(company)}
                  </div>
                )}
                {company.phone && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Phone className="h-4 w-4 mr-2" />
                    {company.phone}
                  </div>
                )}
                {company.email && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Mail className="h-4 w-4 mr-2" />
                    {company.email}
                  </div>
                )}
                {company.contact_person && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <User className="h-4 w-4 mr-2" />
                    {company.contact_person}
                  </div>
                )}
              </div>

              {(company.website || company.tax_id || (company.taxes && Array.isArray(company.taxes) && company.taxes.length > 0)) && (
                <div className="pt-4 border-t space-y-2">
                  {company.website && (
                    <div>
                      <p className="text-sm font-medium">{t("companies.websiteLabel")}</p>
                      <p className="text-sm text-muted-foreground">{company.website}</p>
                    </div>
                  )}
                  {company.tax_id && (
                    <div>
                      <p className="text-sm font-medium">{t("companies.taxIdLabel")}</p>
                      <p className="text-sm text-muted-foreground">{company.tax_id}</p>
                    </div>
                  )}
                  {company.taxes && Array.isArray(company.taxes) && company.taxes.length > 0 && (
                    <div>
                      <p className="text-sm font-medium">{t("companies.taxesLabel")}</p>
                      <div className="space-y-1">
                        {(company.taxes as Array<{name: string, percentage: number}>).map((tax, index) => (
                          <div key={index} className="flex items-center text-sm text-muted-foreground">
                            <Percent className="h-4 w-4 mr-2" />
                            {tax.name}: {tax.percentage}%
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(company)}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {t("companies.updateButton")}
                </Button>
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
                      <AlertDialogTitle>{t("companies.delete")}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("companies.deleteConfirm")}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t("companies.cancel")}</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => deleteCompany(company.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {t("companies.deleteButton")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Companies;