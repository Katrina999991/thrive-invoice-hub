
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { User, Palette, Languages, FileText, Settings as SettingsIcon, AlertTriangle, Mail } from "lucide-react";
import PasswordChangeForm from "@/components/PasswordChangeForm";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCompanies } from "@/hooks/useCompanies";

export default function Settings() {
  const { user, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<string>("default");
  const [darkMode, setDarkMode] = useState<string>("light");
  const [invoiceTemplate, setInvoiceTemplate] = useState<string>("classic");
  const [invoiceColor, setInvoiceColor] = useState<string>("blue");
  const [username, setUsername] = useState<string>("");
  const [isLoadingUsername, setIsLoadingUsername] = useState(false);
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Email templates
  const { companies, updateCompany } = useCompanies();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [emailTemplates, setEmailTemplates] = useState({
    invoice_email_subject: "",
    invoice_email_message: "",
    overdue_email_subject: "",
    overdue_email_message: "",
    payment_confirmation_email_subject: "",
    payment_confirmation_email_message: "",
    invoice_footer_message: "",
    invoice_footer_message_fr: ""
  });
  const [isSavingTemplates, setIsSavingTemplates] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("app-theme") || "default";
    const savedDarkMode = localStorage.getItem("app-dark-mode") || "light";
    const savedInvoiceTemplate = localStorage.getItem("invoice-template") || "classic";
    const savedInvoiceColor = localStorage.getItem("invoice-color") || "blue";
    setTheme(savedTheme);
    setDarkMode(savedDarkMode);
    setInvoiceTemplate(savedInvoiceTemplate);
    setInvoiceColor(savedInvoiceColor);
    document.documentElement.setAttribute("data-theme", savedTheme);
    if (savedDarkMode === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // Load username from profiles
    const loadUsername = async () => {
      if (!user?.id) return;
      setIsLoadingUsername(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("username")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;
        if (data?.username) {
          setUsername(data.username);
        }
      } catch (error) {
        console.error("Error loading username:", error);
      } finally {
        setIsLoadingUsername(false);
      }
    };

    loadUsername();
  }, [user]);

  // Load email templates when company is selected
  useEffect(() => {
    if (selectedCompanyId && companies.length > 0) {
      const company = companies.find(c => c.id === selectedCompanyId);
      if (company) {
        // Default English templates
        const defaultEnglish = {
          invoice_subject: 'Invoice {invoice_number} from {company_name}',
          invoice_message: `Dear {client_name},

Please find attached your invoice {invoice_number} dated {issue_date}.

Amount due: {total}
Due date: {due_date}

Thank you for your business!

Best regards,
{company_name}`,
          overdue_subject: 'Payment Overdue - Invoice {invoice_number}',
          overdue_message: `Dear {client_name},

This is a friendly reminder that your invoice {invoice_number} dated {issue_date} is now overdue.

Original amount: {total}
Due date: {due_date}
Days overdue: {days_overdue}

Please remit payment at your earliest convenience to avoid any late fees.

If you have already sent payment, please disregard this notice.

Thank you for your prompt attention to this matter.

Best regards,
{company_name}`,
          payment_subject: 'Payment Confirmation - Invoice {invoice_number}',
          payment_message: `Dear {client_name},

We have successfully received your payment for invoice {invoice_number}.

Payment details:
- Invoice: {invoice_number}
- Amount: {total}
- Date paid: {payment_date}

Thank you for your prompt payment and continued business!

Best regards,
{company_name}`,
          footer: 'Thank you for your business!'
        };

        // Default French templates
        const defaultFrench = {
          invoice_subject: 'Facture {invoice_number} de {company_name}',
          invoice_message: `Cher/Chère {client_name},

Veuillez trouver ci-jointe votre facture {invoice_number} datée du {issue_date}.

Montant dû : {total}$
Date d'échéance : {due_date}

Merci pour votre confiance !

Meilleures salutations,
{company_name}`,
          overdue_subject: 'Paiement en retard - Facture {invoice_number}',
          overdue_message: `Cher/Chère {client_name},

Ceci est un rappel amical que votre facture {invoice_number} datée du {issue_date} est maintenant en retard.

Montant original : {total}$
Date d'échéance : {due_date}
Jours de retard : {days_overdue}

Veuillez effectuer le paiement à votre plus tôt possible pour éviter des frais de retard.

Si vous avez déjà envoyé le paiement, veuillez ignorer cet avis.

Merci pour votre attention prompte à cette question.

Meilleures salutations,
{company_name}`,
          payment_subject: 'Confirmation de paiement - Facture {invoice_number}',
          payment_message: `Cher/Chère {client_name},

Nous avons reçu avec succès votre paiement pour la facture {invoice_number}.

Détails du paiement :
- Facture : {invoice_number}
- Montant : {total}$
- Date de paiement : {payment_date}

Merci pour votre paiement rapide et votre fidélité !

Meilleures salutations,
{company_name}`,
          footer: 'Merci pour votre confiance !'
        };

        // Use French defaults if interface is French and company has default English or empty templates
        const isFrench = language === 'fr';
        const invoiceSubject = (company as any).invoice_email_subject;
        const invoiceMessage = (company as any).invoice_email_message;
        const overdueSubject = (company as any).overdue_email_subject;
        const overdueMessage = (company as any).overdue_email_message;
        const paymentSubject = (company as any).payment_confirmation_email_subject;
        const paymentMessage = (company as any).payment_confirmation_email_message;
        const footerMessage = (company as any).invoice_footer_message;

        setEmailTemplates({
          invoice_email_subject: (!invoiceSubject || invoiceSubject === defaultEnglish.invoice_subject) && isFrench
            ? defaultFrench.invoice_subject
            : invoiceSubject || "",
          invoice_email_message: (!invoiceMessage || invoiceMessage === defaultEnglish.invoice_message) && isFrench
            ? defaultFrench.invoice_message
            : invoiceMessage || "",
          overdue_email_subject: (!overdueSubject || overdueSubject === defaultEnglish.overdue_subject) && isFrench
            ? defaultFrench.overdue_subject
            : overdueSubject || "",
          overdue_email_message: (!overdueMessage || overdueMessage === defaultEnglish.overdue_message) && isFrench
            ? defaultFrench.overdue_message
            : overdueMessage || "",
          payment_confirmation_email_subject: (!paymentSubject || paymentSubject === defaultEnglish.payment_subject) && isFrench
            ? defaultFrench.payment_subject
            : paymentSubject || "",
          payment_confirmation_email_message: (!paymentMessage || paymentMessage === defaultEnglish.payment_message) && isFrench
            ? defaultFrench.payment_message
            : paymentMessage || "",
          invoice_footer_message: (!footerMessage || footerMessage === defaultEnglish.footer) && isFrench
            ? defaultFrench.footer
            : footerMessage || "",
          invoice_footer_message_fr: (company as any).invoice_footer_message_fr || ""
        });
      }
    }
  }, [selectedCompanyId, companies, language]);

  // Set first company as default when companies are loaded
  useEffect(() => {
    if (companies.length > 0 && !selectedCompanyId) {
      setSelectedCompanyId(companies[0].id);
    }
  }, [companies]);

  const handleThemeChange = (value: string) => {
    setTheme(value);
    localStorage.setItem("app-theme", value);
    document.documentElement.setAttribute("data-theme", value);
  };

  const handleDarkModeChange = (value: string) => {
    setDarkMode(value);
    localStorage.setItem("app-dark-mode", value);
    if (value === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleInvoiceTemplateChange = (value: string) => {
    setInvoiceTemplate(value);
    localStorage.setItem("invoice-template", value);
  };

  const handleInvoiceColorChange = (value: string) => {
    setInvoiceColor(value);
    localStorage.setItem("invoice-color", value);
  };

  const handleSaveUsername = async () => {
    if (!user?.id) return;
    
    setIsSavingUsername(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ username: username.trim() || null })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: t("settings.account.usernameUpdated"),
        description: t("settings.account.usernameUpdatedDescription"),
      });
    } catch (error: any) {
      console.error("Error updating username:", error);
      toast({
        title: t("settings.account.usernameError"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSavingUsername(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user?.id) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase.functions.invoke('delete-user-account');

      if (error) throw error;

      toast({
        title: language === "fr" ? "Compte supprimé" : "Account deleted",
        description: language === "fr" ? "Votre compte a été supprimé avec succès." : "Your account has been successfully deleted.",
      });

      // Sign out and redirect to auth page
      await signOut();
      navigate("/auth");
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast({
        title: language === "fr" ? "Erreur" : "Error",
        description: error.message || (language === "fr" ? "Impossible de supprimer le compte" : "Failed to delete account"),
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleSaveEmailTemplates = async () => {
    if (!selectedCompanyId) return;
    
    setIsSavingTemplates(true);
    try {
      await updateCompany(selectedCompanyId, emailTemplates);
      
      toast({
        title: language === "fr" ? "Modèles sauvegardés" : "Templates saved",
        description: language === "fr" ? "Les modèles d'email ont été mis à jour avec succès." : "Email templates have been updated successfully.",
      });
    } catch (error: any) {
      console.error("Error updating email templates:", error);
      toast({
        title: language === "fr" ? "Erreur" : "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSavingTemplates(false);
    }
  };

  const getColorClasses = () => {
    const colorMap = {
      blue: {
        bg: "bg-blue-600",
        text: "text-blue-600",
        border: "border-blue-600",
        bgLight: "bg-blue-100",
        borderLight: "border-blue-200",
        gradient: "from-blue-50 to-blue-100",
        gradientAccent: "from-blue-600 to-blue-700"
      },
      green: {
        bg: "bg-green-600",
        text: "text-green-600",
        border: "border-green-600",
        bgLight: "bg-green-100",
        borderLight: "border-green-200",
        gradient: "from-green-50 to-green-100",
        gradientAccent: "from-green-600 to-green-700"
      },
      purple: {
        bg: "bg-purple-600",
        text: "text-purple-600",
        border: "border-purple-600",
        bgLight: "bg-purple-100",
        borderLight: "border-purple-200",
        gradient: "from-purple-50 to-purple-100",
        gradientAccent: "from-purple-600 to-purple-700"
      },
      orange: {
        bg: "bg-orange-600",
        text: "text-orange-600",
        border: "border-orange-600",
        bgLight: "bg-orange-100",
        borderLight: "border-orange-200",
        gradient: "from-orange-50 to-orange-100",
        gradientAccent: "from-orange-600 to-orange-700"
      },
      yellow: {
        bg: "bg-yellow-600",
        text: "text-yellow-700",
        border: "border-yellow-600",
        bgLight: "bg-yellow-100",
        borderLight: "border-yellow-200",
        gradient: "from-yellow-50 to-yellow-100",
        gradientAccent: "from-yellow-600 to-yellow-700"
      },
      gray: {
        bg: "bg-gray-600",
        text: "text-gray-700",
        border: "border-gray-600",
        bgLight: "bg-gray-100",
        borderLight: "border-gray-200",
        gradient: "from-gray-50 to-gray-100",
        gradientAccent: "from-gray-600 to-gray-700"
      }
    };
    return colorMap[invoiceColor as keyof typeof colorMap] || colorMap.blue;
  };

  const colors = getColorClasses();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("settings.title")}</h1>
        <p className="text-muted-foreground">
          {t("settings.description")}
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t("settings.account.title")}
            </CardTitle>
            <CardDescription>
              {t("settings.account.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">{t("settings.account.email")}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">{t("settings.account.username")}</Label>
                <div className="flex gap-2">
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t("settings.account.usernamePlaceholder")}
                    disabled={isLoadingUsername || isSavingUsername}
                  />
                  <Button 
                    onClick={handleSaveUsername} 
                    disabled={isLoadingUsername || isSavingUsername}
                  >
                    {isSavingUsername ? t("settings.account.saving") : t("settings.account.save")}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("settings.account.usernameDescription")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              {t("settings.appearance.title")}
            </CardTitle>
            <CardDescription>
              {t("settings.appearance.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <Label className="text-sm font-medium mb-3 block">{t("settings.appearance.displayMode")}</Label>
                <RadioGroup value={darkMode} onValueChange={handleDarkModeChange}>
                  <div className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value="light" id="light" />
                    <Label htmlFor="light" className="cursor-pointer">{t("settings.appearance.light")}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="dark" id="dark" />
                    <Label htmlFor="dark" className="cursor-pointer">{t("settings.appearance.dark")}</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div>
                <Label className="text-sm font-medium mb-3 block">{t("settings.appearance.colorTheme")}</Label>
                <RadioGroup value={theme} onValueChange={handleThemeChange}>
                  <div className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value="default" id="default" />
                    <Label htmlFor="default" className="cursor-pointer">{t("settings.appearance.classic")}</Label>
                  </div>
                  <div className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value="modern" id="modern" />
                    <Label htmlFor="modern" className="cursor-pointer">{t("settings.appearance.modern")}</Label>
                  </div>
                  <div className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value="warm" id="warm" />
                    <Label htmlFor="warm" className="cursor-pointer">{t("settings.appearance.warm")}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="nature" id="nature" />
                    <Label htmlFor="nature" className="cursor-pointer">{t("settings.appearance.nature")}</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Languages className="h-5 w-5" />
              {t("settings.language.title")}
            </CardTitle>
            <CardDescription>
              {t("settings.language.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup value={language} onValueChange={(value: "en" | "fr") => setLanguage(value)}>
              <div className="flex items-center space-x-2 mb-2">
                <RadioGroupItem value="en" id="en" />
                <Label htmlFor="en" className="cursor-pointer">{t("settings.language.english")}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fr" id="fr" />
                <Label htmlFor="fr" className="cursor-pointer">{t("settings.language.french")}</Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t("settings.invoice.title")}
            </CardTitle>
            <CardDescription>
              {t("settings.invoice.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-3 block">{t("settings.invoice.templateLabel")}</Label>
                <RadioGroup value={invoiceTemplate} onValueChange={handleInvoiceTemplateChange}>
                  <div className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value="classic" id="classic" />
                    <Label htmlFor="classic" className="cursor-pointer">{t("settings.invoice.classic")}</Label>
                  </div>
                  <div className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value="modern" id="modern" />
                    <Label htmlFor="modern" className="cursor-pointer">{t("settings.invoice.modern")}</Label>
                  </div>
                  <div className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value="professional" id="professional" />
                    <Label htmlFor="professional" className="cursor-pointer">{t("settings.invoice.professional")}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="creative" id="creative" />
                    <Label htmlFor="creative" className="cursor-pointer">{t("settings.invoice.creative")}</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label className="text-sm font-medium mb-3 block">{t("settings.invoice.colorLabel")}</Label>
                <RadioGroup value={invoiceColor} onValueChange={handleInvoiceColorChange}>
                  <div className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value="blue" id="blue" />
                    <Label htmlFor="blue" className="cursor-pointer flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-blue-600"></div>
                      {t("settings.invoice.blue")}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value="green" id="green" />
                    <Label htmlFor="green" className="cursor-pointer flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-green-600"></div>
                      {t("settings.invoice.green")}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value="purple" id="purple" />
                    <Label htmlFor="purple" className="cursor-pointer flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-purple-600"></div>
                      {t("settings.invoice.purple")}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value="orange" id="orange" />
                    <Label htmlFor="orange" className="cursor-pointer flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-orange-600"></div>
                      {t("settings.invoice.orange")}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value="yellow" id="yellow" />
                    <Label htmlFor="yellow" className="cursor-pointer flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-yellow-600"></div>
                      {t("settings.invoice.yellow")}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="gray" id="gray" />
                    <Label htmlFor="gray" className="cursor-pointer flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-gray-600"></div>
                      {t("settings.invoice.gray")}
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="border rounded-lg p-4 bg-muted/30">
                <p className="text-sm font-medium mb-3">{t("settings.invoice.preview")}</p>
                {invoiceTemplate === "classic" && (
                  <div className="bg-white border rounded p-4 space-y-3 text-xs">
                    <div className="flex justify-between items-start pb-2">
                      <div>
                        <div className={`font-bold text-sm ${colors.text}`}>ACME Company</div>
                        <div className="text-gray-600">123 Main St, City</div>
                      </div>
                      <div className="w-10 h-8 bg-gray-200 rounded flex items-center justify-center text-[8px] text-gray-500">
                        Logo
                      </div>
                    </div>
                    <div className={`border-t ${colors.borderLight} pt-2`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold mb-1 text-gray-900">Bill To:</div>
                          <div className="text-gray-700">Client Name</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-gray-900">INVOICE #001</div>
                          <div className="text-gray-600 text-[10px]">Issue Date: 2024-01-15</div>
                          <div className="text-gray-600 text-[10px]">Due Date: 2024-01-30</div>
                        </div>
                      </div>
                    </div>
                    <div className="border-t pt-2 space-y-1">
                      <div className={`flex justify-between font-semibold text-gray-900 ${colors.bgLight} p-1 rounded`}>
                        <span>Item</span>
                        <span>Amount</span>
                      </div>
                      <div className="flex justify-between text-gray-700">
                        <span>Service 1</span>
                        <span>$100.00</span>
                      </div>
                    </div>
                    <div className={`border-t ${colors.borderLight} pt-2`}>
                      <div className={`flex justify-between font-bold ${colors.text}`}>
                        <span>Total</span>
                        <span>$100.00</span>
                      </div>
                    </div>
                  </div>
                )}
                {invoiceTemplate === "modern" && (
                  <div className="bg-white border rounded p-4 space-y-3 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className={`font-bold text-sm ${colors.text}`}>ACME Company</div>
                        <div className="text-gray-600">123 Main St, City</div>
                      </div>
                      <div className="w-10 h-8 bg-gray-200 rounded flex items-center justify-center text-[8px] text-gray-500">
                        Logo
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <div className="font-semibold mb-1 text-gray-900">Bill To:</div>
                      <div className="text-gray-700">Client Name</div>
                    </div>
                    <div className="space-y-1">
                      <div className={`flex justify-between font-semibold text-gray-900 ${colors.bgLight} p-1 rounded`}>
                        <span>Item</span>
                        <span>Amount</span>
                      </div>
                      <div className="flex justify-between text-gray-700">
                        <span>Service 1</span>
                        <span>$100.00</span>
                      </div>
                    </div>
                    <div className={`${colors.bg} text-white p-2 rounded`}>
                      <div className="flex justify-between font-bold">
                        <span>Total</span>
                        <span>$100.00</span>
                      </div>
                    </div>
                  </div>
                )}
                {invoiceTemplate === "professional" && (
                  <div className={`bg-white border-2 ${colors.border} rounded p-4 space-y-3 text-xs`}>
                    <div className={`border-b-2 ${colors.border} pb-2 flex justify-between items-start`}>
                      <div>
                        <div className={`font-bold text-base ${colors.text}`}>ACME Company</div>
                        <div className="text-gray-600 text-xs">123 Main St, City</div>
                      </div>
                      <div className="w-10 h-8 bg-gray-200 rounded flex items-center justify-center text-[8px] text-gray-500">
                        Logo
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className={`font-semibold text-xs uppercase ${colors.text} mb-1`}>Bill To</div>
                        <div className="text-gray-700">Client Name</div>
                      </div>
                    </div>
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className={`border-b ${colors.borderLight}`}>
                          <th className="text-left py-1 font-semibold text-gray-900">Description</th>
                          <th className="text-right py-1 font-semibold text-gray-900">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="py-1 text-gray-700">Service 1</td>
                          <td className="text-right text-gray-700">$100.00</td>
                        </tr>
                      </tbody>
                    </table>
                    <div className={`border-t-2 ${colors.border} pt-2 flex justify-end`}>
                      <div className="w-1/3">
                        <div className={`flex justify-between font-bold text-sm ${colors.text}`}>
                          <span>TOTAL</span>
                          <span>$100.00</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {invoiceTemplate === "creative" && (
                  <div className={`bg-white border-2 ${colors.border} rounded-lg p-4 space-y-3 text-xs`}>
                    <div className="flex justify-between items-start">
                      <div className={`${colors.bgLight} rounded-lg p-2`}>
                        <div className={`font-bold text-sm ${colors.text}`}>ACME</div>
                        <div className="text-xs text-gray-700">Company</div>
                      </div>
                      <div className="w-10 h-8 bg-gray-200 rounded flex items-center justify-center text-[8px] text-gray-500">
                        Logo
                      </div>
                    </div>
                    <div className="text-gray-600 text-xs">123 Main St, City</div>
                    <div className={`bg-gray-50 rounded-lg p-2 border ${colors.borderLight}`}>
                      <div className="font-semibold mb-1 text-gray-900">Client Name</div>
                      <div className="text-gray-600 text-xs">Customer</div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between p-1">
                        <span className="text-gray-600">Service 1</span>
                        <span className="font-semibold text-gray-900">$100.00</span>
                      </div>
                    </div>
                    <div className={`${colors.bg} text-white p-2 rounded-lg`}>
                      <div className="flex justify-between font-bold">
                        <span>Total</span>
                        <span>$100.00</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {language === "fr" ? "Modèles d'email" : "Email Templates"}
            </CardTitle>
            <CardDescription>
              {language === "fr" ? "Personnalisez les modèles d'email pour chaque entreprise" : "Customize email templates for each company"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{language === "fr" ? "Sélectionner l'entreprise" : "Select Company"}</Label>
                <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                  <SelectTrigger>
                    <SelectValue placeholder={language === "fr" ? "Choisir une entreprise" : "Choose a company"} />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedCompanyId && (
                <>
                  <div className="space-y-4 pt-4 border-t">
                    <h4 className="font-medium">{language === "fr" ? "Email de nouvelle facture" : "New Invoice Email"}</h4>
                    <div className="space-y-2">
                      <Label htmlFor="invoice_email_subject">{language === "fr" ? "Sujet" : "Subject"}</Label>
                      <Input
                        id="invoice_email_subject"
                        value={emailTemplates.invoice_email_subject}
                        onChange={(e) => setEmailTemplates({...emailTemplates, invoice_email_subject: e.target.value})}
                        placeholder={language === "fr" ? "Facture {invoice_number} de {company_name}" : "Invoice {invoice_number} from {company_name}"}
                      />
                      <p className="text-xs text-muted-foreground">
                        {language === "fr" ? "Variables disponibles" : "Available placeholders"}: {"{invoice_number}"}, {"{company_name}"}, {"{client_name}"}, {"{total}"}, {"{issue_date}"}, {"{due_date}"}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invoice_email_message">{language === "fr" ? "Message" : "Message"}</Label>
                      <Textarea
                        id="invoice_email_message"
                        rows={6}
                        value={emailTemplates.invoice_email_message}
                        onChange={(e) => setEmailTemplates({...emailTemplates, invoice_email_message: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <h4 className="font-medium">{language === "fr" ? "Email de rappel de paiement" : "Overdue Payment Reminder"}</h4>
                    <div className="space-y-2">
                      <Label htmlFor="overdue_email_subject">{language === "fr" ? "Sujet" : "Subject"}</Label>
                      <Input
                        id="overdue_email_subject"
                        value={emailTemplates.overdue_email_subject}
                        onChange={(e) => setEmailTemplates({...emailTemplates, overdue_email_subject: e.target.value})}
                        placeholder={language === "fr" ? "Paiement en retard - Facture {invoice_number}" : "Payment Overdue - Invoice {invoice_number}"}
                      />
                      <p className="text-xs text-muted-foreground">
                        {language === "fr" ? "Variables disponibles" : "Available placeholders"}: {"{invoice_number}"}, {"{company_name}"}, {"{client_name}"}, {"{total}"}, {"{issue_date}"}, {"{due_date}"}, {"{days_overdue}"}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="overdue_email_message">{language === "fr" ? "Message" : "Message"}</Label>
                      <Textarea
                        id="overdue_email_message"
                        rows={6}
                        value={emailTemplates.overdue_email_message}
                        onChange={(e) => setEmailTemplates({...emailTemplates, overdue_email_message: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <h4 className="font-medium">{language === "fr" ? "Email de confirmation de paiement" : "Payment Confirmation Email"}</h4>
                    <div className="space-y-2">
                      <Label htmlFor="payment_confirmation_email_subject">{language === "fr" ? "Sujet" : "Subject"}</Label>
                      <Input
                        id="payment_confirmation_email_subject"
                        value={emailTemplates.payment_confirmation_email_subject}
                        onChange={(e) => setEmailTemplates({...emailTemplates, payment_confirmation_email_subject: e.target.value})}
                        placeholder={language === "fr" ? "Confirmation de paiement - Facture {invoice_number}" : "Payment Confirmation - Invoice {invoice_number}"}
                      />
                      <p className="text-xs text-muted-foreground">
                        {language === "fr" ? "Variables disponibles" : "Available placeholders"}: {"{invoice_number}"}, {"{company_name}"}, {"{client_name}"}, {"{total}"}, {"{payment_date}"}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="payment_confirmation_email_message">{language === "fr" ? "Message" : "Message"}</Label>
                      <Textarea
                        id="payment_confirmation_email_message"
                        rows={6}
                        value={emailTemplates.payment_confirmation_email_message}
                        onChange={(e) => setEmailTemplates({...emailTemplates, payment_confirmation_email_message: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <h4 className="font-medium">{language === "fr" ? "Messages de pied de page de facture" : "Invoice Footer Messages"}</h4>
                    <div className="space-y-2">
                      <Label htmlFor="invoice_footer_message">{language === "fr" ? "Message (Anglais)" : "Message (English)"}</Label>
                      <Textarea
                        id="invoice_footer_message"
                        rows={3}
                        value={emailTemplates.invoice_footer_message}
                        onChange={(e) => setEmailTemplates({...emailTemplates, invoice_footer_message: e.target.value})}
                        placeholder={language === "fr" ? "Merci pour votre confiance !" : "Thank you for your business!"}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invoice_footer_message_fr">{language === "fr" ? "Message (Français)" : "Message (French)"}</Label>
                      <Textarea
                        id="invoice_footer_message_fr"
                        rows={3}
                        value={emailTemplates.invoice_footer_message_fr}
                        onChange={(e) => setEmailTemplates({...emailTemplates, invoice_footer_message_fr: e.target.value})}
                        placeholder="Merci pour votre confiance !"
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button onClick={handleSaveEmailTemplates} disabled={isSavingTemplates}>
                      {isSavingTemplates ? (language === "fr" ? "Sauvegarde..." : "Saving...") : (language === "fr" ? "Sauvegarder les modèles" : "Save Templates")}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <PasswordChangeForm />

        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <SettingsIcon className="h-5 w-5" />
              {language === "fr" ? "Système" : "System"}
            </CardTitle>
            <CardDescription>
              {language === "fr" 
                ? "Gérer votre compte et les paramètres système" 
                : "Manage your account and system settings"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-destructive mb-1">
                      {language === "fr" ? "Zone de danger" : "Danger Zone"}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {language === "fr" 
                        ? "La suppression de votre compte est irréversible. Toutes vos données seront définitivement supprimées." 
                        : "Deleting your account is irreversible. All your data will be permanently deleted."}
                    </p>
                    <Button 
                      variant="destructive" 
                      onClick={() => setShowDeleteDialog(true)}
                      disabled={isDeleting}
                    >
                      {language === "fr" ? "Supprimer le compte" : "Delete Account"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {language === "fr" ? "Confirmer la suppression" : "Confirm Deletion"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === "fr" 
                ? "Êtes-vous absolument sûr de vouloir supprimer votre compte ? Cette action est irréversible et supprimera toutes vos données, y compris vos factures, clients, produits et dépenses." 
                : "Are you absolutely sure you want to delete your account? This action is irreversible and will delete all your data, including invoices, clients, products, and expenses."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {language === "fr" ? "Annuler" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting 
                ? (language === "fr" ? "Suppression..." : "Deleting...") 
                : (language === "fr" ? "Oui, supprimer mon compte" : "Yes, delete my account")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
