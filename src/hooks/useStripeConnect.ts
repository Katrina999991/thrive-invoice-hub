import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";

export const useStripeConnect = () => {
  const { toast } = useToast();
  const { language } = useLanguage();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  // Load Stripe account info
  const loadStripeAccount = async () => {
    if (!user?.id) {
      console.log("[useStripeConnect] No user ID available");
      return;
    }
    
    console.log("[useStripeConnect] Loading Stripe account for user:", user.id);
    
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("stripe_account_id, stripe_onboarding_complete")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      
      console.log("[useStripeConnect] Profile data:", { 
        stripe_account_id: data.stripe_account_id, 
        stripe_onboarding_complete: data.stripe_onboarding_complete 
      });
      
      setStripeAccountId(data.stripe_account_id);
      setOnboardingComplete(data.stripe_onboarding_complete || false);

      // If account exists but onboarding not complete, verify with Stripe
      if (data.stripe_account_id && !data.stripe_onboarding_complete) {
        try {
          const { data: verifyData, error: verifyError } = await supabase.functions.invoke("verify-stripe-account");
          if (!verifyError && verifyData?.onboardingComplete) {
            setOnboardingComplete(true);
            toast({
              title: language === "fr" ? "Compte Stripe activé" : "Stripe account activated",
              description: language === "fr" 
                ? "Votre compte Stripe est maintenant actif" 
                : "Your Stripe account is now active",
            });
          }
        } catch (error) {
          console.error("Error verifying Stripe account:", error);
        }
      }
    } catch (error) {
      console.error("Error loading Stripe account:", error);
    }
  };

  // Start Stripe Connect onboarding
  const startOnboarding = async () => {
    setIsLoading(true);
    try {
      // Get fresh session to ensure valid JWT token
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        throw new Error(language === "fr" ? "Session expirée. Veuillez vous reconnecter." : "Session expired. Please sign in again.");
      }

      const { data, error } = await supabase.functions.invoke("stripe-connect-onboarding", {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Redirect to Stripe onboarding in same window
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error("Error starting Stripe onboarding:", error);
      toast({
        title: language === "fr" ? "Erreur" : "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Create payment link for invoice
  const createPaymentLink = async (invoiceId: string) => {
    setIsLoading(true);
    try {
      // Get fresh session to ensure valid JWT token
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        throw new Error(language === "fr" ? "Session expirée. Veuillez vous reconnecter." : "Session expired. Please sign in again.");
      }

      const { data, error } = await supabase.functions.invoke("create-invoice-payment-link", {
        body: { invoice_id: invoiceId },
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.payment_link) {
        // Update invoice with payment link
        const { error: updateError } = await supabase
          .from("invoices")
          .update({ payment_link: data.payment_link })
          .eq("id", invoiceId);

        if (updateError) throw updateError;

        toast({
          title: language === "fr" ? "Lien de paiement créé" : "Payment link created",
          description: language === "fr" 
            ? "Le lien de paiement a été généré avec succès" 
            : "Payment link has been generated successfully",
        });

        return data.payment_link;
      }
    } catch (error: any) {
      console.error("Error creating payment link:", error);
      toast({
        title: language === "fr" ? "Erreur" : "Error",
        description: error.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Open Stripe Express dashboard
  const openDashboard = async () => {
    setIsLoading(true);
    try {
      // Get fresh session to ensure valid JWT token
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        throw new Error(language === "fr" ? "Session expirée. Veuillez vous reconnecter." : "Session expired. Please sign in again.");
      }

      const { data, error } = await supabase.functions.invoke("stripe-dashboard-link", {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Open dashboard in new tab
        window.open(data.url, "_blank");
        toast({
          title: language === "fr" ? "Dashboard Stripe ouvert" : "Stripe dashboard opened",
          description: language === "fr" 
            ? "Consultez le nouvel onglet pour accéder à votre dashboard" 
            : "Check the new tab to access your dashboard",
        });
      }
    } catch (error: any) {
      console.error("Error opening Stripe dashboard:", error);
      toast({
        title: language === "fr" ? "Erreur" : "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetStripeAccount = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('reset-stripe-account');
      
      if (error) throw error;
      
      // Reset local state
      setStripeAccountId(null);
      setOnboardingComplete(false);
      
      toast({
        title: "Compte Stripe réinitialisé",
        description: "Vous pouvez maintenant connecter un nouveau compte Stripe",
      });
      return { success: true };
    } catch (error) {
      console.error("Error resetting Stripe account:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la réinitialisation du compte Stripe",
        variant: "destructive",
      });
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    stripeAccountId,
    onboardingComplete,
    loadStripeAccount,
    startOnboarding,
    createPaymentLink,
    openDashboard,
    resetStripeAccount,
  };
};
