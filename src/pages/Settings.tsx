
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { User, Palette, Languages, FileText, Settings as SettingsIcon, AlertTriangle, Mail, Lock, CreditCard, Loader2, Bell, HelpCircle, CheckCircle2, XCircle, Shield, ChevronRight, Users } from "lucide-react";
import { TeamAccessTab } from "@/components/settings/TeamAccessTab";
import { useCompanyPermissions } from "@/hooks/useCompanyPermissions";
import { InvoiceDesignSettings } from "@/components/InvoiceDesignSettings";
import { useStripeConnect } from "@/hooks/useStripeConnect";
import { useEffect as useReactEffect } from "react";
import PasswordChangeForm from "@/components/PasswordChangeForm";
import { MFASecuritySection } from "@/components/MFASecuritySection";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
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
import { useEncryption } from "@/hooks/useEncryption";
import { useEmailPreferences } from "@/hooks/useEmailPreferences";
import { PWAInstallSection } from "@/components/PWAInstallSection";


export default function Settings() {
  const { user, signOut, updateUsername: updateAuthUsername } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const { canUseFeature, planLimits } = useSubscription();
  const { encryptFields, decryptFields } = useEncryption();
  const { preferences: emailPreferences, loading: emailPreferencesLoading, updatePreference: updateEmailPreference } = useEmailPreferences();
  const [theme, setTheme] = useState<string>("default");
  const [darkMode, setDarkMode] = useState<string>("light");
  const [username, setUsername] = useState<string>("");
  const [originalUsername, setOriginalUsername] = useState<string>("");
  const [isLoadingUsername, setIsLoadingUsername] = useState(false);
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [showUsernameExistsDialog, setShowUsernameExistsDialog] = useState(false);
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
  
  // Get first company for permissions check
  const firstCompanyId = companies.length > 0 ? companies[0].id : null;
  const { hasPermission } = useCompanyPermissions(firstCompanyId);
  const canViewTeamAccess = hasPermission("access:view_members");
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
    quote_body_message_en: "",
    quote_body_message_fr: ""
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
    setTheme(savedTheme);
    setDarkMode(savedDarkMode);
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
        
        if (data) {
          // Decrypt sensitive fields
          const decryptedData = await decryptFields('profiles', data);
          
          if (decryptedData.username) {
            setUsername(decryptedData.username);
            setOriginalUsername(decryptedData.username);
          }
          if (decryptedData.recovery_email) {
            setRecoveryEmail(decryptedData.recovery_email);
          }
          if (decryptedData.phone_number) {
            setPhoneNumber(decryptedData.phone_number);
          }
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

  // Check username availability with debounce
  useEffect(() => {
    const trimmedUsername = username.trim();
    
    // Reset if empty or same as original
    if (!trimmedUsername || trimmedUsername === originalUsername) {
      setUsernameAvailable(null);
      setIsCheckingUsername(false);
      return;
    }

    setIsCheckingUsername(true);
    const timeoutId = setTimeout(async () => {
      try {
        // Use the database function that bypasses RLS
        const { data, error } = await supabase
          .rpc('check_username_available', {
            check_username: trimmedUsername,
            current_user_id: user?.id
          });

        if (error) throw error;

        setUsernameAvailable(data === true);
      } catch (error) {
        console.error("Error checking username:", error);
        setUsernameAvailable(null);
      } finally {
        setIsCheckingUsername(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [username, originalUsername, user?.id]);

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
          quote_body_message_en: (company as any).quote_body_message_en || '',
          quote_body_message_fr: (company as any).quote_body_message_fr || ''
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


  const handleSaveUsername = async () => {
    if (!user?.id) return;
    
    const trimmedUsername = username.trim();
    
    setIsSavingUsername(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ username: trimmedUsername || null })
        .eq("user_id", user.id);

      if (error) {
        // Check if it's a unique constraint violation
        if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('profiles_username_key')) {
          setShowUsernameExistsDialog(true);
          return;
        }
        throw error;
      }

      updateAuthUsername(trimmedUsername);

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
      // Encrypt recovery email before saving
      const dataToSave = { recovery_email: recoveryEmail.trim() || null };
      const encryptedData = await encryptFields('profiles', dataToSave);
      
      const { error } = await supabase
        .from("profiles")
        .update({ recovery_email: encryptedData.recovery_email })
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
      // Encrypt phone number before saving
      const dataToSave = { phone_number: phoneNumber.trim() || null };
      const encryptedData = await encryptFields('profiles', dataToSave);
      
      const { error } = await supabase
        .from("profiles")
        .update({ phone_number: encryptedData.phone_number })
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
      // Build template data based on plan restrictions
      const templateData: Record<string, string> = {};
      
      // Email templates - Premium and Pro can save
      if (planLimits?.plan_type === 'premium' || planLimits?.plan_type === 'pro') {
        templateData.invoice_email_subject_en = emailTemplates.invoice_email_subject_en;
        templateData.invoice_email_subject_fr = emailTemplates.invoice_email_subject_fr;
        templateData.invoice_email_message_en = emailTemplates.invoice_email_message_en;
        templateData.invoice_email_message_fr = emailTemplates.invoice_email_message_fr;
        templateData.overdue_email_subject_en = emailTemplates.overdue_email_subject_en;
        templateData.overdue_email_subject_fr = emailTemplates.overdue_email_subject_fr;
        templateData.overdue_email_message_en = emailTemplates.overdue_email_message_en;
        templateData.overdue_email_message_fr = emailTemplates.overdue_email_message_fr;
        templateData.payment_confirmation_email_subject_en = emailTemplates.payment_confirmation_email_subject_en;
        templateData.payment_confirmation_email_subject_fr = emailTemplates.payment_confirmation_email_subject_fr;
        templateData.payment_confirmation_email_message_en = emailTemplates.payment_confirmation_email_message_en;
        templateData.payment_confirmation_email_message_fr = emailTemplates.payment_confirmation_email_message_fr;
      }
      
      // Body messages - Premium and Pro can save
      if (planLimits?.plan_type === 'premium' || planLimits?.plan_type === 'pro') {
        templateData.invoice_body_message_en = emailTemplates.invoice_body_message_en;
        templateData.invoice_body_message_fr = emailTemplates.invoice_body_message_fr;
        templateData.quote_body_message_en = emailTemplates.quote_body_message_en;
        templateData.quote_body_message_fr = emailTemplates.quote_body_message_fr;
      }
      
      // Only save if there's something to save
      if (Object.keys(templateData).length === 0) {
        toast({
          title: language === "fr" ? "Mise à niveau requise" : "Upgrade required",
          description: language === "fr" 
            ? "Passez à Premium ou Pro pour sauvegarder vos modèles." 
            : "Upgrade to Premium or Pro to save your templates.",
          variant: "destructive",
        });
        return;
      }
      
      await updateCompany(selectedCompanyId, templateData);
      
      toast({
        title: language === "fr" ? "Modèles sauvegardés" : "Templates saved",
        description: language === "fr" ? "Les modèles ont été mis à jour avec succès." : "Templates have been updated successfully.",
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

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="general">
            {language === "fr" ? "Général" : "General"}
          </TabsTrigger>
          {canViewTeamAccess && (
            <TabsTrigger value="team">
              <Users className="h-4 w-4 mr-2" />
              {language === "fr" ? "Équipe & Accès" : "Team & Access"}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="general" className="space-y-6">
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
                  <div className="relative flex-1">
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder={t("settings.account.usernamePlaceholder")}
                      disabled={isLoadingUsername || isSavingUsername}
                      className={
                        username.trim() && username.trim() !== originalUsername
                          ? usernameAvailable === true
                            ? "border-green-500 pr-10"
                            : usernameAvailable === false
                              ? "border-destructive pr-10"
                              : "pr-10"
                          : ""
                      }
                    />
                    {username.trim() && username.trim() !== originalUsername && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {isCheckingUsername ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : usernameAvailable === true ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : usernameAvailable === false ? (
                          <XCircle className="h-4 w-4 text-destructive" />
                        ) : null}
                      </div>
                    )}
                  </div>
                  <Button 
                    onClick={handleSaveUsername} 
                    disabled={isLoadingUsername || isSavingUsername || (usernameAvailable === false)}
                  >
                    {isSavingUsername ? t("settings.account.saving") : t("settings.account.save")}
                  </Button>
                </div>
                {username.trim() && username.trim() !== originalUsername && !isCheckingUsername && (
                  <p className={`text-xs ${usernameAvailable === true ? "text-green-500" : usernameAvailable === false ? "text-destructive" : "text-muted-foreground"}`}>
                    {usernameAvailable === true 
                      ? (language === "fr" ? "Ce nom d'utilisateur est disponible" : "This username is available")
                      : usernameAvailable === false 
                        ? (language === "fr" ? "Ce nom d'utilisateur est déjà pris" : "This username is already taken")
                        : t("settings.account.usernameDescription")}
                  </p>
                )}
                {(!username.trim() || username.trim() === originalUsername) && (
                  <p className="text-xs text-muted-foreground">
                    {t("settings.account.usernameDescription")}
                  </p>
                )}
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

        <InvoiceDesignSettings />

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
              {language === "fr" ? "Contenu des documents PDF" : "PDF Document Content"}
            </CardTitle>
            <CardDescription>
              {language === "fr" ? "Personnalisez les messages qui apparaissent dans vos factures et devis PDF." : "Customize the messages that appear in your PDF invoices and quotes."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Global Helper Text */}
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-sm text-muted-foreground">
                  {language === "fr" 
                    ? "Ces messages apparaissent uniquement dans les documents PDF. Pour personnaliser les emails envoyés à vos clients, consultez la section « Modèles d'emails » ci-dessous." 
                    : "These messages appear only in PDF documents. To customize emails sent to your clients, see the \"Email Templates\" section below."}
                </p>
              </div>

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
                  {/* SECTION 1: Invoice Messages */}
                  <div className="space-y-4">
                    <div className="border-b pb-2">
                      <h3 className="text-lg font-semibold">{language === "fr" ? "Messages de facture" : "Invoice Messages"}</h3>
                      <p className="text-sm text-muted-foreground">
                        {language === "fr" ? "Personnalisez les messages envoyés avec vos factures." : "Customize the messages sent with your invoices."}
                      </p>
                    </div>
                    
                    {/* Invoice Body Message */}
                    <div className="space-y-4 rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{language === "fr" ? "Message PDF de la facture" : "Invoice PDF Message"}</h4>
                        <Badge variant="secondary">Premium</Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">
                        {language === "fr" 
                          ? "Ce message apparaît après le tableau des articles dans les factures PDF uniquement." 
                          : "This message appears after the items table in PDF invoices only."}
                      </p>
                      
                      {/* Helper text based on plan */}
                      <div className="rounded-lg border bg-muted/30 p-3">
                        <p className="text-xs text-muted-foreground">
                          {planLimits?.plan_type === 'free' ? (
                            language === "fr" 
                              ? "Vous pouvez modifier ce message avant l'envoi.\nPassez à Premium pour le sauvegarder par défaut."
                              : "You can edit this message before sending.\nUpgrade to Premium to save it as default."
                          ) : (
                            language === "fr"
                              ? "Ce message sera utilisé par défaut pour les nouvelles factures."
                              : "This message will be used by default for new invoices."
                          )}
                        </p>
                      </div>

                      {/* Variables section */}
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                        <p className="text-xs font-medium text-foreground mb-1">
                          {language === "fr" ? "Variables disponibles" : "Available placeholders"}:
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {"{invoice_number}"}, {"{company_name}"}, {"{client_name}"}, {"{total}"}, {"{due_date}"}
                        </p>
                      </div>

                      {/* Pro advanced variables hint */}
                      {planLimits?.plan_type === 'pro' && (
                        <p className="text-xs text-muted-foreground italic">
                          {language === "fr" ? "Variables avancées disponibles sur Pro" : "Advanced placeholders available on Pro"}
                        </p>
                      )}

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
                    </div>
                  </div>

                  {/* SECTION 2: Quote Messages */}
                  <div className="space-y-4">
                    <div className="border-b pb-2">
                      <h3 className="text-lg font-semibold">{language === "fr" ? "Messages de devis" : "Quote Messages"}</h3>
                      <p className="text-sm text-muted-foreground">
                        {language === "fr" ? "Personnalisez les messages envoyés avec vos devis." : "Customize the messages sent with your quotes."}
                      </p>
                    </div>
                    
                    {/* Quote Body Message */}
                    <div className="space-y-4 rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{language === "fr" ? "Message PDF du devis" : "Quote PDF Message"}</h4>
                        <Badge variant="secondary">Premium</Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">
                        {language === "fr" 
                          ? "Ce message apparaît après le tableau des articles dans les devis PDF uniquement." 
                          : "This message appears after the items table in PDF quotes only."}
                      </p>
                      
                      {/* Helper text based on plan */}
                      <div className="rounded-lg border bg-muted/30 p-3">
                        <p className="text-xs text-muted-foreground">
                          {planLimits?.plan_type === 'free' ? (
                            language === "fr" 
                              ? "Vous pouvez modifier ce message avant l'envoi.\nPassez à Premium pour le sauvegarder par défaut."
                              : "You can edit this message before sending.\nUpgrade to Premium to save it as default."
                          ) : (
                            language === "fr"
                              ? "Ce message sera utilisé par défaut pour les nouveaux devis."
                              : "This message will be used by default for new quotes."
                          )}
                        </p>
                      </div>

                      {/* Variables section */}
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                        <p className="text-xs font-medium text-foreground mb-1">
                          {language === "fr" ? "Variables disponibles" : "Available placeholders"}:
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {"{quote_number}"}, {"{company_name}"}, {"{client_name}"}, {"{total}"}, {"{expiry_date}"}
                        </p>
                      </div>

                      {/* Pro advanced variables hint */}
                      {planLimits?.plan_type === 'pro' && (
                        <p className="text-xs text-muted-foreground italic">
                          {language === "fr" ? "Variables avancées disponibles sur Pro" : "Advanced placeholders available on Pro"}
                        </p>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="quote_body_message_en">Message (English)</Label>
                          <Textarea
                            id="quote_body_message_en"
                            rows={3}
                            value={emailTemplates.quote_body_message_en}
                            onChange={(e) => setEmailTemplates({...emailTemplates, quote_body_message_en: e.target.value})}
                            placeholder="Additional message in quote body..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="quote_body_message_fr">Message (Français)</Label>
                          <Textarea
                            id="quote_body_message_fr"
                            rows={3}
                            value={emailTemplates.quote_body_message_fr}
                            onChange={(e) => setEmailTemplates({...emailTemplates, quote_body_message_fr: e.target.value})}
                            placeholder="Message additionnel dans le corps du devis..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button onClick={handleSaveEmailTemplates} disabled={isSavingTemplates}>
                      {isSavingTemplates ? (language === "fr" ? "Sauvegarde..." : "Saving...") : (language === "fr" ? "Sauvegarder les messages" : "Save Messages")}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Email Templates Card - Premium and Pro only */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {language === "fr" ? "Modèles d'emails" : "Email Templates"}
              <Badge variant="secondary">Premium</Badge>
            </CardTitle>
            <CardDescription>
              {language === "fr" ? "Ces modèles contrôlent tous les emails envoyés automatiquement à vos clients (factures, rappels, confirmations)." : "These templates control all emails sent automatically to your clients (invoices, reminders, confirmations)."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Helper text for Free users */}
              {planLimits?.plan_type === 'free' && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <p className="text-sm text-muted-foreground">
                    {language === "fr" 
                      ? "Passez à Premium pour personnaliser vos modèles d'emails." 
                      : "Upgrade to Premium to customize your email templates."}
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => navigate("/pricing")}
                  >
                    {language === "fr" ? "Voir les forfaits" : "View Plans"}
                  </Button>
                </div>
              )}

              {(planLimits?.plan_type === 'premium' || planLimits?.plan_type === 'pro') && (
                <>
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
                      {/* Variables Info */}
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                        <p className="text-xs font-medium text-foreground mb-1">
                          {language === "fr" ? "Variables disponibles" : "Available placeholders"}:
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {"{invoice_number}"}, {"{company_name}"}, {"{client_name}"}, {"{total}"}, {"{due_date}"}, {"{issue_date}"}, {"{days_overdue}"}, {"{payment_date}"}
                        </p>
                      </div>

                      {/* Invoice Email Template */}
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="invoice-email">
                          <AccordionTrigger>
                            {language === "fr" ? "Email de facture" : "Invoice Email"}
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-4 pt-2">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="invoice_email_subject_en">{language === "fr" ? "Sujet (Anglais)" : "Subject (English)"}</Label>
                                  <Input
                                    id="invoice_email_subject_en"
                                    value={emailTemplates.invoice_email_subject_en}
                                    onChange={(e) => setEmailTemplates({...emailTemplates, invoice_email_subject_en: e.target.value})}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="invoice_email_subject_fr">{language === "fr" ? "Sujet (Français)" : "Subject (French)"}</Label>
                                  <Input
                                    id="invoice_email_subject_fr"
                                    value={emailTemplates.invoice_email_subject_fr}
                                    onChange={(e) => setEmailTemplates({...emailTemplates, invoice_email_subject_fr: e.target.value})}
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="invoice_email_message_en">{language === "fr" ? "Message (Anglais)" : "Message (English)"}</Label>
                                  <Textarea
                                    id="invoice_email_message_en"
                                    rows={6}
                                    value={emailTemplates.invoice_email_message_en}
                                    onChange={(e) => setEmailTemplates({...emailTemplates, invoice_email_message_en: e.target.value})}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="invoice_email_message_fr">{language === "fr" ? "Message (Français)" : "Message (French)"}</Label>
                                  <Textarea
                                    id="invoice_email_message_fr"
                                    rows={6}
                                    value={emailTemplates.invoice_email_message_fr}
                                    onChange={(e) => setEmailTemplates({...emailTemplates, invoice_email_message_fr: e.target.value})}
                                  />
                                </div>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>

                        {/* Overdue Email Template */}
                        <AccordionItem value="overdue-email">
                          <AccordionTrigger>
                            {language === "fr" ? "Email de rappel (retard)" : "Overdue Reminder Email"}
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-4 pt-2">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="overdue_email_subject_en">{language === "fr" ? "Sujet (Anglais)" : "Subject (English)"}</Label>
                                  <Input
                                    id="overdue_email_subject_en"
                                    value={emailTemplates.overdue_email_subject_en}
                                    onChange={(e) => setEmailTemplates({...emailTemplates, overdue_email_subject_en: e.target.value})}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="overdue_email_subject_fr">{language === "fr" ? "Sujet (Français)" : "Subject (French)"}</Label>
                                  <Input
                                    id="overdue_email_subject_fr"
                                    value={emailTemplates.overdue_email_subject_fr}
                                    onChange={(e) => setEmailTemplates({...emailTemplates, overdue_email_subject_fr: e.target.value})}
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="overdue_email_message_en">{language === "fr" ? "Message (Anglais)" : "Message (English)"}</Label>
                                  <Textarea
                                    id="overdue_email_message_en"
                                    rows={8}
                                    value={emailTemplates.overdue_email_message_en}
                                    onChange={(e) => setEmailTemplates({...emailTemplates, overdue_email_message_en: e.target.value})}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="overdue_email_message_fr">{language === "fr" ? "Message (Français)" : "Message (French)"}</Label>
                                  <Textarea
                                    id="overdue_email_message_fr"
                                    rows={8}
                                    value={emailTemplates.overdue_email_message_fr}
                                    onChange={(e) => setEmailTemplates({...emailTemplates, overdue_email_message_fr: e.target.value})}
                                  />
                                </div>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>

                        {/* Payment Confirmation Email Template */}
                        <AccordionItem value="payment-confirmation-email">
                          <AccordionTrigger>
                            {language === "fr" ? "Email de confirmation de paiement" : "Payment Confirmation Email"}
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-4 pt-2">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="payment_confirmation_email_subject_en">{language === "fr" ? "Sujet (Anglais)" : "Subject (English)"}</Label>
                                  <Input
                                    id="payment_confirmation_email_subject_en"
                                    value={emailTemplates.payment_confirmation_email_subject_en}
                                    onChange={(e) => setEmailTemplates({...emailTemplates, payment_confirmation_email_subject_en: e.target.value})}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="payment_confirmation_email_subject_fr">{language === "fr" ? "Sujet (Français)" : "Subject (French)"}</Label>
                                  <Input
                                    id="payment_confirmation_email_subject_fr"
                                    value={emailTemplates.payment_confirmation_email_subject_fr}
                                    onChange={(e) => setEmailTemplates({...emailTemplates, payment_confirmation_email_subject_fr: e.target.value})}
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="payment_confirmation_email_message_en">{language === "fr" ? "Message (Anglais)" : "Message (English)"}</Label>
                                  <Textarea
                                    id="payment_confirmation_email_message_en"
                                    rows={6}
                                    value={emailTemplates.payment_confirmation_email_message_en}
                                    onChange={(e) => setEmailTemplates({...emailTemplates, payment_confirmation_email_message_en: e.target.value})}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="payment_confirmation_email_message_fr">{language === "fr" ? "Message (Français)" : "Message (French)"}</Label>
                                  <Textarea
                                    id="payment_confirmation_email_message_fr"
                                    rows={6}
                                    value={emailTemplates.payment_confirmation_email_message_fr}
                                    onChange={(e) => setEmailTemplates({...emailTemplates, payment_confirmation_email_message_fr: e.target.value})}
                                  />
                                </div>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>

                      <div className="pt-4 flex gap-2">
                        <Button onClick={handleSaveEmailTemplates} disabled={isSavingTemplates}>
                          {isSavingTemplates ? (language === "fr" ? "Sauvegarde..." : "Saving...") : (language === "fr" ? "Sauvegarder les modèles" : "Save Templates")}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setEmailTemplates({
                              ...emailTemplates,
                              invoice_email_subject_en: 'Invoice {invoice_number} from {company_name}',
                              invoice_email_subject_fr: 'Facture {invoice_number} de {company_name}',
                              invoice_email_message_en: `Dear {client_name},

Please find attached your invoice {invoice_number} dated {issue_date}.

Amount due: {total}
Due date: {due_date}

Thank you for your business!

Best regards,
{company_name}`,
                              invoice_email_message_fr: `Cher(e) {client_name},

Veuillez trouver ci-joint votre facture {invoice_number} datée du {issue_date}.

Montant dû: {total}
Date d'échéance: {due_date}

Merci pour votre confiance!

Cordialement,
{company_name}`,
                              overdue_email_subject_en: 'Payment Overdue - Invoice {invoice_number}',
                              overdue_email_subject_fr: 'Paiement en retard - Facture {invoice_number}',
                              overdue_email_message_en: `Dear {client_name},

This is a friendly reminder that your invoice {invoice_number} dated {issue_date} is now overdue.

Original amount: {total}
Due date: {due_date}
Days overdue: {days_overdue}

Please remit payment at your earliest convenience to avoid any late fees.

If you have already sent payment, please disregard this notice.

Thank you for your prompt attention to this matter.

Best regards,
{company_name}`,
                              overdue_email_message_fr: `Cher(e) {client_name},

Ceci est un rappel amical que votre facture {invoice_number} datée du {issue_date} est maintenant en retard.

Montant initial: {total}
Date d'échéance: {due_date}
Jours de retard: {days_overdue}

Veuillez effectuer le paiement dès que possible pour éviter des frais de retard.

Si vous avez déjà effectué le paiement, veuillez ignorer cet avis.

Merci de votre attention rapide à cette question.

Cordialement,
{company_name}`,
                              payment_confirmation_email_subject_en: 'Payment Confirmation - Invoice {invoice_number}',
                              payment_confirmation_email_subject_fr: 'Confirmation de paiement - Facture {invoice_number}',
                              payment_confirmation_email_message_en: `Dear {client_name},

This confirms that we have received your payment for invoice {invoice_number}.

Amount paid: {total}
Payment date: {payment_date}

Thank you for your prompt payment!

Best regards,
{company_name}`,
                              payment_confirmation_email_message_fr: `Cher(e) {client_name},

Ceci confirme que nous avons bien reçu votre paiement pour la facture {invoice_number}.

Montant payé: {total}
Date de paiement: {payment_date}

Merci pour votre paiement rapide!

Cordialement,
{company_name}`
                            });
                            toast({
                              title: language === "fr" ? "Modèles réinitialisés" : "Templates reset",
                              description: language === "fr" ? "Les modèles d'emails ont été réinitialisés. N'oubliez pas de sauvegarder." : "Email templates have been reset. Don't forget to save.",
                            });
                          }}
                        >
                          {language === "fr" ? "Réinitialiser" : "Reset to Defaults"}
                        </Button>
                      </div>
                    </>
                  )}
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

        {/* Email Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {language === "fr" ? "Préférences d'emails" : "Email Preferences"}
            </CardTitle>
            <CardDescription>
              {language === "fr" 
                ? "Gérez les notifications que vous recevez par email. Certains emails essentiels ne peuvent pas être désactivés."
                : "Manage the notifications you receive by email. Some essential emails cannot be disabled."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Essential Emails Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-medium">
                    {language === "fr" ? "Emails essentiels" : "Essential Emails"}
                  </h3>
                  <Badge variant="secondary" className="text-xs">
                    {language === "fr" ? "Toujours activés" : "Always enabled"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {language === "fr" 
                    ? "Ces emails sont nécessaires au bon fonctionnement de votre compte et ne peuvent pas être désactivés."
                    : "These emails are necessary for your account to function properly and cannot be disabled."}
                </p>
                <div className="space-y-2 pl-6">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium">{language === "fr" ? "Alertes de sécurité" : "Security alerts"}</p>
                      <p className="text-xs text-muted-foreground">
                        {language === "fr" ? "Connexions inhabituelles, changements de mot de passe" : "Unusual logins, password changes"}
                      </p>
                    </div>
                    <Switch checked={true} disabled />
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium">{language === "fr" ? "Authentification" : "Authentication"}</p>
                      <p className="text-xs text-muted-foreground">
                        {language === "fr" ? "Réinitialisation de mot de passe, vérification" : "Password reset, verification"}
                      </p>
                    </div>
                    <Switch checked={true} disabled />
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium">{language === "fr" ? "Actions déclenchées" : "Triggered actions"}</p>
                      <p className="text-xs text-muted-foreground">
                        {language === "fr" ? "Envoi de factures, rapports demandés" : "Sending invoices, requested reports"}
                      </p>
                    </div>
                    <Switch checked={true} disabled />
                  </div>
                </div>
              </div>

              {/* Product Updates Section */}
              <div className="space-y-3 pt-4 border-t">
                <h3 className="font-medium">
                  {language === "fr" ? "Mises à jour produit" : "Product Updates"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {language === "fr" 
                    ? "Restez informé des nouvelles fonctionnalités et améliorations."
                    : "Stay informed about new features and improvements."}
                </p>
                {emailPreferencesLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">
                      {language === "fr" ? "Chargement..." : "Loading..."}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2 pl-6">
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm font-medium">{language === "fr" ? "Nouvelles fonctionnalités" : "New features"}</p>
                        <p className="text-xs text-muted-foreground">
                          {language === "fr" ? "Annonces de nouvelles fonctionnalités" : "Announcements of new features"}
                        </p>
                      </div>
                      <Switch 
                        checked={emailPreferences?.product_updates ?? true} 
                        onCheckedChange={(checked) => updateEmailPreference('product_updates', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm font-medium">{language === "fr" ? "Changements importants" : "Important changes"}</p>
                        <p className="text-xs text-muted-foreground">
                          {language === "fr" ? "Changements de plateforme importants" : "Important platform changes"}
                        </p>
                      </div>
                      <Switch 
                        checked={emailPreferences?.platform_changes ?? true} 
                        onCheckedChange={(checked) => updateEmailPreference('platform_changes', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm font-medium">{language === "fr" ? "Maintenance planifiée" : "Scheduled maintenance"}</p>
                        <p className="text-xs text-muted-foreground">
                          {language === "fr" ? "Notifications de maintenance" : "Maintenance notifications"}
                        </p>
                      </div>
                      <Switch 
                        checked={emailPreferences?.maintenance_notifications ?? true} 
                        onCheckedChange={(checked) => updateEmailPreference('maintenance_notifications', checked)}
                      />
                    </div>
                  </div>
                )}
              </div>

            </div>
          </CardContent>
        </Card>

        {/* Smart Categorization Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              {language === "fr" ? "Catégorisation intelligente" : "Smart Categorization"}
            </CardTitle>
            <CardDescription>
              {language === "fr" 
                ? "Gérez les catégories apprises pour les dépenses scannées."
                : "Manage learned categories for scanned expenses."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {language === "fr"
                  ? "Lorsque vous scannez un reçu et modifiez la catégorie suggérée, le système apprend de vos corrections pour améliorer les suggestions futures."
                  : "When you scan a receipt and change the suggested category, the system learns from your corrections to improve future suggestions."}
              </p>
              <Button
                variant="outline"
                onClick={async () => {
                  const { error } = await supabase
                    .from("expense_category_mappings")
                    .delete()
                    .eq("user_id", user?.id || "");
                  
                  if (error) {
                    toast({
                      title: language === "fr" ? "Erreur" : "Error",
                      description: language === "fr" 
                        ? "Impossible d'effacer les catégories"
                        : "Could not clear categories",
                      variant: "destructive"
                    });
                  } else {
                    toast({
                      title: language === "fr" ? "Succès" : "Success",
                      description: language === "fr"
                        ? "Les catégories apprises ont été effacées"
                        : "Learned categories have been cleared"
                    });
                  }
                }}
              >
                {language === "fr" ? "Effacer les catégories apprises" : "Clear learned categories"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <PWAInstallSection />

        <MFASecuritySection />

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

        {/* Audit Logs Link */}
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate("/dashboard/audit-logs")}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {language === "fr" ? "Audit Logs" : "Audit Logs"}
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardTitle>
            <CardDescription>
              {language === "fr" 
                ? "Consultez l'historique des actions importantes effectuées dans votre compte."
                : "View the history of important actions performed in your account."}
            </CardDescription>
          </CardHeader>
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
        </TabsContent>

        {canViewTeamAccess && (
          <TabsContent value="team">
            <TeamAccessTab />
          </TabsContent>
        )}
      </Tabs>

      
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

      {/* Username already exists Dialog */}
      <AlertDialog open={showUsernameExistsDialog} onOpenChange={setShowUsernameExistsDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {language === "fr" ? "Nom d'utilisateur non disponible" : "Username not available"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === "fr" 
                ? "Ce nom d'utilisateur est déjà utilisé par un autre compte. Veuillez en choisir un autre." 
                : "This username is already taken by another account. Please choose a different one."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowUsernameExistsDialog(false)}>
              {language === "fr" ? "Compris" : "OK"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
