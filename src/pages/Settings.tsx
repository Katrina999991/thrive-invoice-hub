
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { User, Palette, Languages, FileText, Settings as SettingsIcon, AlertTriangle, Mail, Lock, CreditCard, Loader2, Bell, HelpCircle, Shield } from "lucide-react";
import { useStripeConnect } from "@/hooks/useStripeConnect";
import { useEffect as useReactEffect } from "react";
import PasswordChangeForm from "@/components/PasswordChangeForm";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCompanies } from "@/hooks/useCompanies";
import { z } from "zod";
import { ContactForm } from "@/components/ContactForm";

export default function Settings() {
  const { user, signOut, updateUsername: updateAuthUsername } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const { canUseFeature, planLimits } = useSubscription();
  const [theme, setTheme] = useState<string>("default");
  const [darkMode, setDarkMode] = useState<string>("light");
  const [invoiceTemplate, setInvoiceTemplate] = useState<string>("classic");
  const [invoiceColor, setInvoiceColor] = useState<string>("blue");
  const [username, setUsername] = useState<string>("");
  const [isLoadingUsername, setIsLoadingUsername] = useState(false);
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState<string>("");
  const [isSavingRecoveryEmail, setIsSavingRecoveryEmail] = useState(false);
  const [newPrimaryEmail, setNewPrimaryEmail] = useState<string>("");
  const [passwordForEmailChange, setPasswordForEmailChange] = useState<string>("");
  const [showEmailChangeDialog, setShowEmailChangeDialog] = useState(false);
  const [isSavingPrimaryEmail, setIsSavingPrimaryEmail] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMigratingEncryption, setIsMigratingEncryption] = useState(false);
  const [recoveryEmailError, setRecoveryEmailError] = useState<string>("");
  const [phoneError, setPhoneError] = useState<string>("");
  const [newPrimaryEmailError, setNewPrimaryEmailError] = useState<string>("");
  
  // Stripe Connect
  const { 
    isLoading: isStripeLoading,
    stripeAccountId,
    onboardingComplete,
    loadStripeAccount,
    startOnboarding,
    openDashboard,
    resetStripeAccount
  } = useStripeConnect();
  
  // Email templates
  const { companies, updateCompany } = useCompanies();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [emailTemplates, setEmailTemplates] = useState({
    invoice_email_subject_en: "",
    invoice_email_subject_fr: "",
    invoice_email_message_en: "",
    invoice_email_message_fr: "",
    overdue_email_subject_en: "",
    overdue_email_subject_fr: "",
    overdue_email_message_en: "",
    overdue_email_message_fr: "",
    payment_confirmation_email_subject_en: "",
    payment_confirmation_email_subject_fr: "",
    payment_confirmation_email_message_en: "",
    payment_confirmation_email_message_fr: "",
    invoice_body_message_en: "",
    invoice_body_message_fr: "",
    invoice_footer_message_en: "",
    invoice_footer_message_fr: ""
  });
  const [isSavingTemplates, setIsSavingTemplates] = useState(false);
  const [isTestingReminders, setIsTestingReminders] = useState(false);
  
  // Invoice numbering settings
  const [selectedCompanyForNumbering, setSelectedCompanyForNumbering] = useState<string>("");
  const [invoiceNumbering, setInvoiceNumbering] = useState({
    invoice_prefix: "INV",
    invoice_digits: 3,
    invoice_start_number: 1
  });
  const [isSavingNumbering, setIsSavingNumbering] = useState(false);

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

    // Load username and recovery email from profiles
    const loadUserProfile = async () => {
      if (!user?.id) return;
      setIsLoadingUsername(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("username, recovery_email, phone_number")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;
        if (data?.username) {
          setUsername(data.username);
        }
        if (data?.recovery_email) {
          setRecoveryEmail(data.recovery_email);
        }
        if (data?.phone_number) {
          setPhoneNumber(data.phone_number);
        }
      } catch (error) {
        console.error("Error loading user profile:", error);
      } finally {
        setIsLoadingUsername(false);
      }
    };

    loadUserProfile();
    loadStripeAccount();
  }, [user]);

  // Load email templates when company is selected
  useEffect(() => {
    if (selectedCompanyId && companies.length > 0) {
      const company = companies.find(c => c.id === selectedCompanyId);
      if (company) {
        setEmailTemplates({
          invoice_email_subject_en: (company as any).invoice_email_subject_en || 'Invoice {invoice_number} from {company_name}',
          invoice_email_subject_fr: (company as any).invoice_email_subject_fr || 'Facture {invoice_number} de {company_name}',
          invoice_email_message_en: (company as any).invoice_email_message_en || `Dear {client_name},

Please find attached your invoice {invoice_number} dated {issue_date}.

Amount due: {total}
Due date: {due_date}

Thank you for your business!

Best regards,
{company_name}`,
          invoice_email_message_fr: (company as any).invoice_email_message_fr || `Cher(e) {client_name},

Veuillez trouver ci-joint votre facture {invoice_number} datée du {issue_date}.

Montant dû: {total}
Date d'échéance: {due_date}

Merci pour votre confiance!

Cordialement,
{company_name}`,
          overdue_email_subject_en: (company as any).overdue_email_subject_en || 'Payment Overdue - Invoice {invoice_number}',
          overdue_email_subject_fr: (company as any).overdue_email_subject_fr || 'Paiement en retard - Facture {invoice_number}',
          overdue_email_message_en: (company as any).overdue_email_message_en || `Dear {client_name},

This is a friendly reminder that your invoice {invoice_number} dated {issue_date} is now overdue.

Original amount: {total}
Due date: {due_date}
Days overdue: {days_overdue}

Please remit payment at your earliest convenience to avoid any late fees.

If you have already sent payment, please disregard this notice.

Thank you for your prompt attention to this matter.

Best regards,
{company_name}`,
          overdue_email_message_fr: (company as any).overdue_email_message_fr || `Cher(e) {client_name},

Ceci est un rappel amical que votre facture {invoice_number} datée du {issue_date} est maintenant en retard.

Montant initial: {total}
Date d'échéance: {due_date}
Jours de retard: {days_overdue}

Veuillez effectuer le paiement dès que possible pour éviter des frais de retard.

Si vous avez déjà effectué le paiement, veuillez ignorer cet avis.

Merci de votre attention rapide à cette question.

Cordialement,
{company_name}`,
          payment_confirmation_email_subject_en: (company as any).payment_confirmation_email_subject_en || 'Payment Confirmation - Invoice {invoice_number}',
          payment_confirmation_email_subject_fr: (company as any).payment_confirmation_email_subject_fr || 'Confirmation de paiement - Facture {invoice_number}',
          payment_confirmation_email_message_en: (company as any).payment_confirmation_email_message_en || `Dear {client_name},

This confirms that we have received your payment for invoice {invoice_number}.

Amount paid: {total}
Payment date: {payment_date}

Thank you for your prompt payment!

Best regards,
{company_name}`,
          payment_confirmation_email_message_fr: (company as any).payment_confirmation_email_message_fr || `Cher(e) {client_name},

Ceci confirme que nous avons bien reçu votre paiement pour la facture {invoice_number}.

Montant payé: {total}
Date de paiement: {payment_date}

Merci pour votre paiement rapide!

Cordialement,
{company_name}`,
          invoice_body_message_en: (company as any).invoice_body_message_en || '',
          invoice_body_message_fr: (company as any).invoice_body_message_fr || '',
          invoice_footer_message_en: (company as any).invoice_footer_message_en || 'Thank you for your business!',
          invoice_footer_message_fr: (company as any).invoice_footer_message_fr || 'Merci pour votre confiance!'
        });
      }
    }
  }, [selectedCompanyId, companies]);

  // Set first company as default when companies are loaded
  useEffect(() => {
    if (companies.length > 0 && !selectedCompanyId) {
      setSelectedCompanyId(companies[0].id);
    }
    if (companies.length > 0 && !selectedCompanyForNumbering) {
      setSelectedCompanyForNumbering(companies[0].id);
    }
  }, [companies]);
  
  // Load invoice numbering settings when company is selected
  useEffect(() => {
    if (selectedCompanyForNumbering && companies.length > 0) {
      const company = companies.find(c => c.id === selectedCompanyForNumbering);
      if (company) {
        setInvoiceNumbering({
          invoice_prefix: (company as any).invoice_prefix || "INV",
          invoice_digits: (company as any).invoice_digits || 3,
          invoice_start_number: (company as any).invoice_start_number || 1
        });
      }
    }
  }, [selectedCompanyForNumbering, companies]);

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

      updateAuthUsername(username.trim());

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

  const handleSaveRecoveryEmail = async () => {
    if (!user?.id) return;
    
    // Validation détaillée
    const trimmedEmail = recoveryEmail.trim();
    
    if (trimmedEmail) {
      if (!trimmedEmail.includes('@')) {
        setRecoveryEmailError(language === "fr" ? "L'email doit contenir un @" : "Email must contain an @");
        return;
      }
      
      const parts = trimmedEmail.split('@');
      if (parts.length > 2) {
        setRecoveryEmailError(language === "fr" ? "L'email contient trop de @" : "Email contains too many @");
        return;
      }
      
      if (!parts[0] || parts[0].length === 0) {
        setRecoveryEmailError(language === "fr" ? "L'email doit avoir un nom avant le @" : "Email must have a name before @");
        return;
      }
      
      if (!parts[1] || parts[1].length === 0) {
        setRecoveryEmailError(language === "fr" ? "L'email doit avoir un domaine après le @" : "Email must have a domain after @");
        return;
      }
      
      if (!parts[1].includes('.')) {
        setRecoveryEmailError(language === "fr" ? "Le domaine doit contenir un point (.)" : "Domain must contain a dot (.)");
        return;
      }
      
      const domainParts = parts[1].split('.');
      if (domainParts[domainParts.length - 1].length < 2) {
        setRecoveryEmailError(language === "fr" ? "L'extension du domaine est trop courte" : "Domain extension is too short");
        return;
      }
      
      if (trimmedEmail.length > 255) {
        setRecoveryEmailError(language === "fr" ? "L'email doit contenir moins de 255 caractères" : "Email must be less than 255 characters");
        return;
      }
      
      // Validation regex finale
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        setRecoveryEmailError(language === "fr" ? "Format d'email invalide" : "Invalid email format");
        return;
      }
    }
    
    setRecoveryEmailError("");
    
    setIsSavingRecoveryEmail(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ recovery_email: recoveryEmail.trim() || null })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: language === "fr" ? "Email de récupération mis à jour" : "Recovery email updated",
        description: language === "fr" ? "Votre email de récupération a été mis à jour avec succès." : "Your recovery email has been successfully updated.",
      });
    } catch (error: any) {
      console.error("Error updating recovery email:", error);
      toast({
        title: language === "fr" ? "Erreur" : "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSavingRecoveryEmail(false);
    }
  };

  const handleSavePrimaryEmail = async () => {
    if (!user?.id || !user?.email || !newPrimaryEmail.trim() || !passwordForEmailChange.trim()) return;
    
    // Validation détaillée de l'email
    const trimmedEmail = newPrimaryEmail.trim();
    
    if (!trimmedEmail.includes('@')) {
      setNewPrimaryEmailError(language === "fr" ? "L'email doit contenir un @" : "Email must contain an @");
      return;
    }
    
    const parts = trimmedEmail.split('@');
    if (parts.length > 2) {
      setNewPrimaryEmailError(language === "fr" ? "L'email contient trop de @" : "Email contains too many @");
      return;
    }
    
    if (!parts[0] || parts[0].length === 0) {
      setNewPrimaryEmailError(language === "fr" ? "L'email doit avoir un nom avant le @" : "Email must have a name before @");
      return;
    }
    
    if (!parts[1] || parts[1].length === 0) {
      setNewPrimaryEmailError(language === "fr" ? "L'email doit avoir un domaine après le @" : "Email must have a domain after @");
      return;
    }
    
    if (!parts[1].includes('.')) {
      setNewPrimaryEmailError(language === "fr" ? "Le domaine doit contenir un point (.)" : "Domain must contain a dot (.)");
      return;
    }
    
    const domainParts = parts[1].split('.');
    if (domainParts[domainParts.length - 1].length < 2) {
      setNewPrimaryEmailError(language === "fr" ? "L'extension du domaine est trop courte" : "Domain extension is too short");
      return;
    }
    
    if (trimmedEmail.length > 255) {
      setNewPrimaryEmailError(language === "fr" ? "L'email doit contenir moins de 255 caractères" : "Email must be less than 255 characters");
      return;
    }
    
    // Validation regex finale
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setNewPrimaryEmailError(language === "fr" ? "Format d'email invalide" : "Invalid email format");
      return;
    }
    
    setNewPrimaryEmailError("");
    
    setIsSavingPrimaryEmail(true);
    try {
      // Verify password first
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordForEmailChange
      });

      if (signInError) {
        toast({
          title: language === "fr" ? "Erreur" : "Error",
          description: language === "fr" ? "Mot de passe incorrect" : "Incorrect password",
          variant: "destructive",
        });
        return;
      }

      // Update email
      const { error } = await supabase.auth.updateUser({
        email: trimmedEmail
      });

      if (error) throw error;

      toast({
        title: language === "fr" ? "Email de confirmation envoyé" : "Confirmation email sent",
        description: language === "fr" 
          ? "Un email de confirmation a été envoyé à votre nouvelle adresse. Utilisez ce nouvel email pour vous connecter après confirmation."
          : "A confirmation email has been sent to your new address. Use this new email to sign in after confirmation.",
      });
      
      setNewPrimaryEmail("");
      setPasswordForEmailChange("");
      setShowEmailChangeDialog(false);
    } catch (error: any) {
      console.error("Error updating primary email:", error);
      toast({
        title: language === "fr" ? "Erreur" : "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSavingPrimaryEmail(false);
    }
  };

  const handleSavePhone = async () => {
    if (!user?.id) return;
    
    // Validation
    const phoneSchema = z.string().trim()
      .regex(/^[\d\s\-\+\(\)]+$/, { message: language === "fr" ? "Format de téléphone invalide" : "Invalid phone format" })
      .min(10, { message: language === "fr" ? "Le numéro doit contenir au moins 10 caractères" : "Phone must be at least 10 characters" })
      .max(20, { message: language === "fr" ? "Le numéro doit contenir moins de 20 caractères" : "Phone must be less than 20 characters" });
    
    try {
      if (phoneNumber.trim()) {
        phoneSchema.parse(phoneNumber);
      }
      setPhoneError("");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        setPhoneError(error.errors[0].message);
        return;
      }
    }
    
    setIsSavingPhone(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ phone_number: phoneNumber.trim() || null })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: language === "fr" ? "Succès" : "Success",
        description: language === "fr" 
          ? "Numéro de téléphone mis à jour avec succès"
          : "Phone number updated successfully",
      });
    } catch (error: any) {
      console.error("Error updating phone:", error);
      toast({
        title: language === "fr" ? "Erreur" : "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSavingPhone(false);
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

  const handleSaveInvoiceNumbering = async () => {
    if (!selectedCompanyForNumbering) return;

    setIsSavingNumbering(true);
    try {
      await updateCompany(selectedCompanyForNumbering, {
        invoice_prefix: invoiceNumbering.invoice_prefix,
        invoice_digits: invoiceNumbering.invoice_digits,
        invoice_start_number: invoiceNumbering.invoice_start_number
      });

      toast({
        title: language === "fr" ? "Paramètres sauvegardés" : "Settings saved",
        description: language === "fr" ? "Les paramètres de numérotation des factures ont été mis à jour avec succès." : "Invoice numbering settings have been updated successfully.",
      });
    } catch (error: any) {
      console.error("Error updating invoice numbering:", error);
      toast({
        title: language === "fr" ? "Erreur" : "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSavingNumbering(false);
    }
  };

  const handleMigrateEncryption = async () => {
    setIsMigratingEncryption(true);
    try {
      const { data, error } = await supabase.functions.invoke('migrate-encryption', {
        body: {},
      });

      if (error) throw error;

      toast({
        title: language === "fr" ? "Migration terminée" : "Migration completed",
        description: language === "fr" 
          ? `Clients: ${data.results.clients.encrypted} chiffrés, ${data.results.clients.skipped} déjà chiffrés. Profils: ${data.results.profiles.encrypted} chiffrés.`
          : `Clients: ${data.results.clients.encrypted} encrypted, ${data.results.clients.skipped} already encrypted. Profiles: ${data.results.profiles.encrypted} encrypted.`,
      });
    } catch (error: any) {
      console.error("Error migrating encryption:", error);
      toast({
        title: language === "fr" ? "Erreur" : "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsMigratingEncryption(false);
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

  const handleTestOverdueReminders = async () => {
    setIsTestingReminders(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-overdue-reminders', {
        body: { user_id: user?.id }
      });
      
      if (error) throw error;
      
      const result = data as { success: boolean; emailsSent: number; emailsSkipped: number; totalProcessed: number };
      
      toast({
        title: language === "fr" ? "Test terminé" : "Test completed",
        description: language === "fr" 
          ? `${result.emailsSent} email(s) envoyé(s), ${result.emailsSkipped} ignoré(s), ${result.totalProcessed} facture(s) traitée(s)`
          : `${result.emailsSent} email(s) sent, ${result.emailsSkipped} skipped, ${result.totalProcessed} invoice(s) processed`,
      });
    } catch (error: any) {
      console.error("Error testing overdue reminders:", error);
      toast({
        title: language === "fr" ? "Erreur" : "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsTestingReminders(false);
    }
  };

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
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium">{t("settings.account.email")}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
                <div className="pt-2">
                  <Label>
                    {language === "fr" ? "Changer l'email principal" : "Change primary email"}
                  </Label>
                  <Button 
                    onClick={() => setShowEmailChangeDialog(true)} 
                    variant="outline"
                    className="w-full mt-2"
                  >
                    {language === "fr" ? "Modifier l'email" : "Change email"}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    {language === "fr" 
                      ? "Vous devrez confirmer avec votre mot de passe et valider le changement par email"
                      : "You will need to confirm with your password and validate the change by email"}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{language === "fr" ? "Numéro de téléphone" : "Phone number"}</Label>
                <div className="flex gap-2">
                  <Input
                    id="phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value);
                      setPhoneError("");
                    }}
                    placeholder={language === "fr" ? "+1 (555) 123-4567" : "+1 (555) 123-4567"}
                    disabled={isSavingPhone}
                    className={phoneError ? "border-destructive" : ""}
                  />
                  <Button 
                    onClick={handleSavePhone} 
                    disabled={isSavingPhone}
                  >
                    {isSavingPhone ? t("settings.account.saving") : t("settings.account.save")}
                  </Button>
                </div>
                {phoneError && (
                  <p className="text-sm text-destructive">{phoneError}</p>
                )}
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
              <div className="space-y-2">
                <Label htmlFor="recoveryEmail">
                  {language === "fr" ? "Email de récupération" : "Recovery Email"}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="recoveryEmail"
                    type="email"
                    value={recoveryEmail}
                    onChange={(e) => {
                      setRecoveryEmail(e.target.value);
                      setRecoveryEmailError("");
                    }}
                    placeholder={language === "fr" ? "email.recuperation@example.com" : "recovery.email@example.com"}
                    disabled={isLoadingUsername || isSavingRecoveryEmail}
                    className={recoveryEmailError ? "border-destructive" : ""}
                  />
                  <Button 
                    onClick={handleSaveRecoveryEmail} 
                    disabled={isLoadingUsername || isSavingRecoveryEmail}
                  >
                    {isSavingRecoveryEmail ? t("settings.account.saving") : t("settings.account.save")}
                  </Button>
                </div>
                {recoveryEmailError && (
                  <p className="text-sm text-destructive">{recoveryEmailError}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {language === "fr" 
                    ? "Un email secondaire pour la récupération de votre compte"
                    : "A secondary email for account recovery"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {language === "fr" ? "Paiements Stripe" : "Stripe Payments"}
            </CardTitle>
            <CardDescription>
              {language === "fr" 
                ? "Connectez votre compte Stripe pour recevoir des paiements en ligne" 
                : "Connect your Stripe account to receive online payments"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {planLimits?.plan_type === 'free' && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    {language === "fr" 
                      ? "ℹ️ Plan Gratuit : Des frais de plateforme de 2% s'appliquent sur les paiements reçus via Stripe." 
                      : "ℹ️ Free Plan: A 2% platform fee applies to payments received via Stripe."}
                  </p>
                </div>
              )}
              {onboardingComplete ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-sm font-medium">
                      {language === "fr" 
                        ? "Compte Stripe connecté" 
                        : "Stripe account connected"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {language === "fr" 
                      ? "Votre compte Stripe est configuré et prêt à recevoir des paiements. Vous pouvez maintenant générer des liens de paiement pour vos factures." 
                      : "Your Stripe account is set up and ready to receive payments. You can now generate payment links for your invoices."}
                  </p>
                  {stripeAccountId && (
                    <p className="text-xs text-muted-foreground font-mono">
                      {language === "fr" ? "ID du compte: " : "Account ID: "}
                      {stripeAccountId}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button 
                      onClick={openDashboard}
                      disabled={isStripeLoading}
                      variant="outline"
                      className="flex-1"
                    >
                      {isStripeLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {language === "fr" ? "Chargement..." : "Loading..."}
                        </>
                      ) : (
                        <>{language === "fr" ? "Accéder à mon dashboard Stripe" : "Access my Stripe dashboard"}</>
                      )}
                    </Button>
                    <Button 
                      onClick={async () => {
                        const result = await resetStripeAccount();
                        if (result.success) {
                          await loadStripeAccount();
                        }
                      }}
                      disabled={isStripeLoading}
                      variant="destructive"
                      className="flex-1"
                    >
                      {isStripeLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {language === "fr" ? "Chargement..." : "Loading..."}
                        </>
                      ) : (
                        <>{language === "fr" ? "Changer de compte" : "Change account"}</>
                      )}
                    </Button>
                  </div>
                </div>
              ) : stripeAccountId && !onboardingComplete ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded-lg">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {language === "fr" 
                        ? "Configuration Stripe incomplète" 
                        : "Incomplete Stripe setup"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {language === "fr" 
                      ? "Vous avez commencé la configuration de votre compte Stripe mais ne l'avez pas terminée. Vous pouvez continuer ou annuler pour changer de compte." 
                      : "You started setting up your Stripe account but didn't complete it. You can continue or cancel to change accounts."}
                  </p>
                  {stripeAccountId && (
                    <p className="text-xs text-muted-foreground font-mono">
                      {language === "fr" ? "ID du compte: " : "Account ID: "}
                      {stripeAccountId}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button 
                      onClick={startOnboarding}
                      disabled={isStripeLoading}
                      className="flex-1"
                    >
                      {isStripeLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {language === "fr" ? "Chargement..." : "Loading..."}
                        </>
                      ) : (
                        <>{language === "fr" ? "Continuer la configuration" : "Continue setup"}</>
                      )}
                    </Button>
                    <Button 
                      onClick={async () => {
                        const result = await resetStripeAccount();
                        if (result.success) {
                          await loadStripeAccount();
                        }
                      }}
                      disabled={isStripeLoading}
                      variant="outline"
                    >
                      {language === "fr" ? "Annuler et changer" : "Cancel and change"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {language === "fr" 
                      ? "Stripe Connect vous permet de recevoir des paiements directement sur votre compte Stripe. Vos clients pourront payer leurs factures en ligne." 
                      : "Stripe Connect allows you to receive payments directly to your Stripe account. Your clients will be able to pay their invoices online."}
                  </p>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      {language === "fr" ? "Fonctionnalités:" : "Features:"}
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>{language === "fr" ? "Cartes bancaires (Visa, Mastercard, Amex)" : "Credit cards (Visa, Mastercard, Amex)"}</li>
                      <li>{language === "fr" ? "Liens de paiement sécurisés" : "Secure payment links"}</li>
                      <li>{language === "fr" ? "Notifications automatiques" : "Automatic notifications"}</li>
                      <li>{language === "fr" ? "Suivi des paiements en temps réel" : "Real-time payment tracking"}</li>
                    </ul>
                  </div>
                  <Button 
                    onClick={startOnboarding}
                    disabled={isStripeLoading}
                    className="w-full"
                  >
                    {isStripeLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {language === "fr" ? "Chargement..." : "Loading..."}
                      </>
                    ) : (
                      <>{language === "fr" ? "Connecter Stripe" : "Connect Stripe"}</>
                    )}
                  </Button>
                </div>
              )}
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
                  <div className="flex items-center justify-between space-x-2 mb-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem 
                        value="modern" 
                        id="modern" 
                        disabled={planLimits?.plan_type === 'free'}
                      />
                      <Label 
                        htmlFor="modern" 
                        className={planLimits?.plan_type === 'free' ? "opacity-50" : "cursor-pointer"}
                      >
                        {t("settings.invoice.modern")}
                      </Label>
                    </div>
                    {planLimits?.plan_type === 'free' && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Lock className="h-3 w-3" />
                        Premium
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between space-x-2 mb-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem 
                        value="professional" 
                        id="professional" 
                        disabled={planLimits?.plan_type !== 'pro'}
                      />
                      <Label 
                        htmlFor="professional" 
                        className={planLimits?.plan_type !== 'pro' ? "opacity-50" : "cursor-pointer"}
                      >
                        {t("settings.invoice.professional")}
                      </Label>
                    </div>
                    {planLimits?.plan_type !== 'pro' && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Lock className="h-3 w-3" />
                        Pro
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between space-x-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem 
                        value="creative" 
                        id="creative" 
                        disabled={planLimits?.plan_type !== 'pro'}
                      />
                      <Label 
                        htmlFor="creative" 
                        className={planLimits?.plan_type !== 'pro' ? "opacity-50" : "cursor-pointer"}
                      >
                        {t("settings.invoice.creative")}
                      </Label>
                    </div>
                    {planLimits?.plan_type !== 'pro' && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Lock className="h-3 w-3" />
                        Pro
                      </Badge>
                    )}
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
              <SettingsIcon className="h-5 w-5" />
              {language === "fr" ? "Numérotation des factures" : "Invoice Numbering"}
            </CardTitle>
            <CardDescription>
              {language === "fr" ? "Configurez les paramètres de numérotation des factures pour chaque entreprise" : "Configure invoice numbering settings for each company"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{language === "fr" ? "Sélectionner l'entreprise" : "Select Company"}</Label>
                <Select value={selectedCompanyForNumbering} onValueChange={setSelectedCompanyForNumbering}>
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

              {selectedCompanyForNumbering && (
                <>
                  <div className="grid grid-cols-3 gap-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="invoicePrefix">
                        {language === "fr" ? "Préfixe" : "Prefix"} *
                      </Label>
                      <Input
                        id="invoicePrefix"
                        placeholder={language === "fr" ? "INV" : "INV"}
                        value={invoiceNumbering.invoice_prefix}
                        onChange={(e) => setInvoiceNumbering({...invoiceNumbering, invoice_prefix: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invoiceDigits">
                        {language === "fr" ? "Nombre de chiffres" : "Number of digits"} *
                      </Label>
                      <Input
                        id="invoiceDigits"
                        type="number"
                        min="1"
                        max="10"
                        value={invoiceNumbering.invoice_digits}
                        onChange={(e) => setInvoiceNumbering({...invoiceNumbering, invoice_digits: Number(e.target.value)})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invoiceStartNumber">
                        {language === "fr" ? "Numéro de départ" : "Starting number"} *
                      </Label>
                      <Input
                        id="invoiceStartNumber"
                        type="number"
                        min="1"
                        value={invoiceNumbering.invoice_start_number}
                        onChange={(e) => setInvoiceNumbering({...invoiceNumbering, invoice_start_number: Number(e.target.value)})}
                        required
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-sm text-muted-foreground">
                      {language === "fr" ? "Aperçu" : "Preview"}: {invoiceNumbering.invoice_prefix}-{String(invoiceNumbering.invoice_start_number).padStart(invoiceNumbering.invoice_digits, '0')}
                    </p>
                    <Button onClick={handleSaveInvoiceNumbering} disabled={isSavingNumbering}>
                      {isSavingNumbering 
                        ? (language === "fr" ? "Sauvegarde..." : "Saving...") 
                        : (language === "fr" ? "Sauvegarder" : "Save")}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {language === "fr" ? "Personnalisation des messages" : "Message Personalization"}
            </CardTitle>
            <CardDescription>
              {language === "fr" ? "Personnalisez les messages d'email et les factures pour chaque entreprise" : "Customize email messages and invoices for each company"}
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
                  <Accordion type="multiple" className="w-full">
                    <AccordionItem value="invoice-email">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-2">
                          <h4 className="font-medium">{language === "fr" ? "Email de nouvelle facture" : "New Invoice Email"}</h4>
                          {(planLimits?.plan_type === 'free' || planLimits?.plan_type === 'premium') && (
                            <Badge variant="secondary" className="flex items-center gap-1 ml-2">
                              <Lock className="h-3 w-3" />
                              Pro
                            </Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-4">
                        <p className="text-xs text-muted-foreground">
                          {language === "fr" ? "Variables disponibles" : "Available placeholders"}: {"{invoice_number}"}, {"{company_name}"}, {"{client_name}"}, {"{total}"}, {"{issue_date}"}, {"{due_date}"}
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="invoice_email_subject_en" className={(planLimits?.plan_type === 'free' || planLimits?.plan_type === 'premium') ? "opacity-50" : ""}>
                              Subject (English)
                            </Label>
                            <Input
                              id="invoice_email_subject_en"
                              value={emailTemplates.invoice_email_subject_en}
                              onChange={(e) => setEmailTemplates({...emailTemplates, invoice_email_subject_en: e.target.value})}
                              placeholder="Invoice {invoice_number} from {company_name}"
                              disabled={planLimits?.plan_type === 'free' || planLimits?.plan_type === 'premium'}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="invoice_email_subject_fr" className={(planLimits?.plan_type === 'free' || planLimits?.plan_type === 'premium') ? "opacity-50" : ""}>
                              Sujet (Français)
                            </Label>
                            <Input
                              id="invoice_email_subject_fr"
                              value={emailTemplates.invoice_email_subject_fr}
                              onChange={(e) => setEmailTemplates({...emailTemplates, invoice_email_subject_fr: e.target.value})}
                              placeholder="Facture {invoice_number} de {company_name}"
                              disabled={planLimits?.plan_type === 'free' || planLimits?.plan_type === 'premium'}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="invoice_email_message_en" className={(planLimits?.plan_type === 'free' || planLimits?.plan_type === 'premium') ? "opacity-50" : ""}>
                              Message (English)
                            </Label>
                            <Textarea
                              id="invoice_email_message_en"
                              rows={6}
                              value={emailTemplates.invoice_email_message_en}
                              onChange={(e) => setEmailTemplates({...emailTemplates, invoice_email_message_en: e.target.value})}
                              disabled={planLimits?.plan_type === 'free' || planLimits?.plan_type === 'premium'}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="invoice_email_message_fr" className={(planLimits?.plan_type === 'free' || planLimits?.plan_type === 'premium') ? "opacity-50" : ""}>
                              Message (Français)
                            </Label>
                            <Textarea
                              id="invoice_email_message_fr"
                              rows={6}
                              value={emailTemplates.invoice_email_message_fr}
                              onChange={(e) => setEmailTemplates({...emailTemplates, invoice_email_message_fr: e.target.value})}
                              disabled={planLimits?.plan_type === 'free' || planLimits?.plan_type === 'premium'}
                            />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="overdue-email">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-2">
                          <h4 className="font-medium">{language === "fr" ? "Email de rappel de paiement" : "Overdue Payment Reminder"}</h4>
                          {(planLimits?.plan_type === 'free' || planLimits?.plan_type === 'premium') && (
                            <Badge variant="secondary" className="flex items-center gap-1 ml-2">
                              <Lock className="h-3 w-3" />
                              Pro
                            </Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-4">
                        <p className="text-xs text-muted-foreground">
                          {language === "fr" ? "Variables disponibles" : "Available placeholders"}: {"{invoice_number}"}, {"{company_name}"}, {"{client_name}"}, {"{total}"}, {"{issue_date}"}, {"{due_date}"}, {"{days_overdue}"}
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="overdue_email_subject_en" className={(planLimits?.plan_type === 'free' || planLimits?.plan_type === 'premium') ? "opacity-50" : ""}>
                              Subject (English)
                            </Label>
                            <Input
                              id="overdue_email_subject_en"
                              value={emailTemplates.overdue_email_subject_en}
                              onChange={(e) => setEmailTemplates({...emailTemplates, overdue_email_subject_en: e.target.value})}
                              placeholder="Payment Overdue - Invoice {invoice_number}"
                              disabled={planLimits?.plan_type === 'free' || planLimits?.plan_type === 'premium'}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="overdue_email_subject_fr" className={(planLimits?.plan_type === 'free' || planLimits?.plan_type === 'premium') ? "opacity-50" : ""}>
                              Sujet (Français)
                            </Label>
                            <Input
                              id="overdue_email_subject_fr"
                              value={emailTemplates.overdue_email_subject_fr}
                              onChange={(e) => setEmailTemplates({...emailTemplates, overdue_email_subject_fr: e.target.value})}
                              placeholder="Paiement en retard - Facture {invoice_number}"
                              disabled={planLimits?.plan_type === 'free' || planLimits?.plan_type === 'premium'}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="overdue_email_message_en" className={(planLimits?.plan_type === 'free' || planLimits?.plan_type === 'premium') ? "opacity-50" : ""}>
                              Message (English)
                            </Label>
                            <Textarea
                              id="overdue_email_message_en"
                              rows={6}
                              value={emailTemplates.overdue_email_message_en}
                              onChange={(e) => setEmailTemplates({...emailTemplates, overdue_email_message_en: e.target.value})}
                              disabled={planLimits?.plan_type === 'free' || planLimits?.plan_type === 'premium'}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="overdue_email_message_fr" className={(planLimits?.plan_type === 'free' || planLimits?.plan_type === 'premium') ? "opacity-50" : ""}>
                              Message (Français)
                            </Label>
                            <Textarea
                              id="overdue_email_message_fr"
                              rows={6}
                              value={emailTemplates.overdue_email_message_fr}
                              onChange={(e) => setEmailTemplates({...emailTemplates, overdue_email_message_fr: e.target.value})}
                              disabled={planLimits?.plan_type === 'free' || planLimits?.plan_type === 'premium'}
                            />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="payment-confirmation">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-2">
                          <h4 className="font-medium">{language === "fr" ? "Email de confirmation de paiement" : "Payment Confirmation Email"}</h4>
                          {(planLimits?.plan_type === 'free' || planLimits?.plan_type === 'premium') && (
                            <Badge variant="secondary" className="flex items-center gap-1 ml-2">
                              <Lock className="h-3 w-3" />
                              Pro
                            </Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-4">
                        <p className="text-xs text-muted-foreground">
                          {language === "fr" ? "Variables disponibles" : "Available placeholders"}: {"{invoice_number}"}, {"{company_name}"}, {"{client_name}"}, {"{total}"}, {"{payment_date}"}
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="payment_confirmation_email_subject_en" className={(planLimits?.plan_type === 'free' || planLimits?.plan_type === 'premium') ? "opacity-50" : ""}>
                              Subject (English)
                            </Label>
                            <Input
                              id="payment_confirmation_email_subject_en"
                              value={emailTemplates.payment_confirmation_email_subject_en}
                              onChange={(e) => setEmailTemplates({...emailTemplates, payment_confirmation_email_subject_en: e.target.value})}
                              placeholder="Payment Confirmation - Invoice {invoice_number}"
                              disabled={planLimits?.plan_type === 'free' || planLimits?.plan_type === 'premium'}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="payment_confirmation_email_subject_fr" className={(planLimits?.plan_type === 'free' || planLimits?.plan_type === 'premium') ? "opacity-50" : ""}>
                              Sujet (Français)
                            </Label>
                            <Input
                              id="payment_confirmation_email_subject_fr"
                              value={emailTemplates.payment_confirmation_email_subject_fr}
                              onChange={(e) => setEmailTemplates({...emailTemplates, payment_confirmation_email_subject_fr: e.target.value})}
                              placeholder="Confirmation de paiement - Facture {invoice_number}"
                              disabled={planLimits?.plan_type === 'free' || planLimits?.plan_type === 'premium'}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="payment_confirmation_email_message_en" className={(planLimits?.plan_type === 'free' || planLimits?.plan_type === 'premium') ? "opacity-50" : ""}>
                              Message (English)
                            </Label>
                            <Textarea
                              id="payment_confirmation_email_message_en"
                              rows={6}
                              value={emailTemplates.payment_confirmation_email_message_en}
                              onChange={(e) => setEmailTemplates({...emailTemplates, payment_confirmation_email_message_en: e.target.value})}
                              disabled={planLimits?.plan_type === 'free' || planLimits?.plan_type === 'premium'}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="payment_confirmation_email_message_fr" className={(planLimits?.plan_type === 'free' || planLimits?.plan_type === 'premium') ? "opacity-50" : ""}>
                              Message (Français)
                            </Label>
                            <Textarea
                              id="payment_confirmation_email_message_fr"
                              rows={6}
                              value={emailTemplates.payment_confirmation_email_message_fr}
                              onChange={(e) => setEmailTemplates({...emailTemplates, payment_confirmation_email_message_fr: e.target.value})}
                              disabled={planLimits?.plan_type === 'free' || planLimits?.plan_type === 'premium'}
                            />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="invoice-body">
                      <AccordionTrigger className="hover:no-underline">
                        <h4 className="font-medium">{language === "fr" ? "Message dans le corps de la facture" : "Invoice Body Message"}</h4>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-4">
                        <p className="text-sm text-muted-foreground">
                          {language === "fr" ? "Ce message apparaîtra après le tableau des produits/services dans la facture PDF" : "This message will appear after the products/services table in the PDF invoice"}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="invoice_body_message_en">Message (English)</Label>
                            <Textarea
                              id="invoice_body_message_en"
                              rows={3}
                              value={emailTemplates.invoice_body_message_en}
                              onChange={(e) => setEmailTemplates({...emailTemplates, invoice_body_message_en: e.target.value})}
                              placeholder="Additional message in invoice body..."
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="invoice_body_message_fr">Message (Français)</Label>
                            <Textarea
                              id="invoice_body_message_fr"
                              rows={3}
                              value={emailTemplates.invoice_body_message_fr}
                              onChange={(e) => setEmailTemplates({...emailTemplates, invoice_body_message_fr: e.target.value})}
                              placeholder="Message additionnel dans le corps de la facture..."
                            />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="invoice-footer">
                      <AccordionTrigger className="hover:no-underline">
                        <h4 className="font-medium">{language === "fr" ? "Message de pied de page de facture" : "Invoice Footer Message"}</h4>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="invoice_footer_message_en">Message (English)</Label>
                            <Textarea
                              id="invoice_footer_message_en"
                              rows={3}
                              value={emailTemplates.invoice_footer_message_en}
                              onChange={(e) => setEmailTemplates({...emailTemplates, invoice_footer_message_en: e.target.value})}
                              placeholder="Thank you for your business!"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="invoice_footer_message_fr">Message (Français)</Label>
                            <Textarea
                              id="invoice_footer_message_fr"
                              rows={3}
                              value={emailTemplates.invoice_footer_message_fr}
                              onChange={(e) => setEmailTemplates({...emailTemplates, invoice_footer_message_fr: e.target.value})}
                              placeholder="Merci pour votre confiance!"
                            />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              {language === "fr" ? "Rappels de paiement automatiques" : "Automatic Payment Reminders"}
            </CardTitle>
            <CardDescription>
              {language === "fr" 
                ? "Les rappels automatiques sont envoyés quotidiennement à 9h00 UTC uniquement aux clients avec l'option 'Envoyer email de rappel auto' activée." 
                : "Automatic reminders are sent daily at 9:00 AM UTC only to clients with the 'Send auto reminder email' option enabled."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground mb-3">
                  {language === "fr" 
                    ? "Envoyez manuellement les rappels pour toutes vos factures en retard qui n'ont pas encore reçu de rappel. Tous les clients avec une facture en retard recevront un email. Chaque facture ne reçoit qu'un seul rappel automatique." 
                    : "Manually send reminders for all your overdue invoices that haven't received a reminder yet. All clients with an overdue invoice will receive an email. Each invoice receives only one automatic reminder."}
                </p>
                <Button 
                  onClick={handleTestOverdueReminders} 
                  disabled={isTestingReminders}
                  className="w-full"
                >
                  {isTestingReminders ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {language === "fr" ? "Envoi en cours..." : "Sending..."}
                    </>
                  ) : (
                    <>
                      <Bell className="mr-2 h-4 w-4" />
                      {language === "fr" ? "Envoyer les rappels en attente" : "Send pending reminders"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Encryption Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {language === "fr" ? "Chiffrement des données" : "Data Encryption"}
            </CardTitle>
            <CardDescription>
              {language === "fr" 
                ? "Chiffrer les données sensibles existantes (emails, téléphones) pour une protection renforcée."
                : "Encrypt existing sensitive data (emails, phones) for enhanced protection."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground mb-3">
                {language === "fr" 
                  ? "Cette action chiffrera toutes les données sensibles non encore chiffrées dans vos clients et votre profil. Les nouvelles données sont automatiquement chiffrées."
                  : "This action will encrypt all sensitive data not yet encrypted in your clients and profile. New data is automatically encrypted."}
              </p>
              <Button 
                onClick={handleMigrateEncryption} 
                disabled={isMigratingEncryption}
                variant="outline"
              >
                {isMigratingEncryption ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {language === "fr" ? "Migration en cours..." : "Migrating..."}
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    {language === "fr" ? "Chiffrer les données existantes" : "Encrypt existing data"}
                  </>
                )}
              </Button>
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
      {/* Contact Us Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            {language === "fr" ? "Contactez-nous" : "Contact Us"}
          </CardTitle>
          <CardDescription>
            {language === "fr" 
              ? "Besoin d'aide ou avez-vous des questions? Remplissez le formulaire ci-dessous."
              : "Need help or have questions? Fill out the form below."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ContactForm language={language} userEmail={user?.email} />
        </CardContent>
      </Card>

      
      {/* Email Change Dialog */}
      <Dialog open={showEmailChangeDialog} onOpenChange={setShowEmailChangeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {language === "fr" ? "Changer l'email principal" : "Change primary email"}
            </DialogTitle>
            <DialogDescription>
              {language === "fr" 
                ? "Entrez votre nouveau email et votre mot de passe actuel pour confirmer le changement."
                : "Enter your new email and current password to confirm the change."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newEmail">
                {language === "fr" ? "Nouvel email" : "New email"}
              </Label>
              <Input
                id="newEmail"
                type="email"
                value={newPrimaryEmail}
                onChange={(e) => {
                  setNewPrimaryEmail(e.target.value);
                  setNewPrimaryEmailError("");
                }}
                placeholder={language === "fr" ? "nouveau.email@example.com" : "new.email@example.com"}
                disabled={isSavingPrimaryEmail}
                className={newPrimaryEmailError ? "border-destructive" : ""}
              />
              {newPrimaryEmailError && (
                <p className="text-sm text-destructive">{newPrimaryEmailError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="passwordConfirm">
                {language === "fr" ? "Mot de passe actuel" : "Current password"}
              </Label>
              <Input
                id="passwordConfirm"
                type="password"
                value={passwordForEmailChange}
                onChange={(e) => setPasswordForEmailChange(e.target.value)}
                placeholder="••••••••"
                disabled={isSavingPrimaryEmail}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEmailChangeDialog(false);
                setNewPrimaryEmail("");
                setPasswordForEmailChange("");
              }}
              disabled={isSavingPrimaryEmail}
            >
              {language === "fr" ? "Annuler" : "Cancel"}
            </Button>
            <Button
              onClick={handleSavePrimaryEmail}
              disabled={isSavingPrimaryEmail || !newPrimaryEmail.trim() || !passwordForEmailChange.trim()}
            >
              {isSavingPrimaryEmail ? (language === "fr" ? "Modification..." : "Changing...") : (language === "fr" ? "Changer l'email" : "Change email")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
