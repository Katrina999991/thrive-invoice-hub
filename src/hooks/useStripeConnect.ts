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
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("stripe_account_id, stripe_onboarding_complete")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      
      setStripeAccountId(data.stripe_account_id);
      setOnboardingComplete(data.stripe_onboarding_complete || false);
    } catch (error) {
      console.error("Error loading Stripe account:", error);
    }
  };

  // Start Stripe Connect onboarding
  const startOnboarding = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-connect-onboarding");

      if (error) throw error;

      if (data?.url) {
        // Open Stripe onboarding in new tab
        window.open(data.url, "_blank");
        toast({
          title: language === "fr" ? "Redirection vers Stripe" : "Redirecting to Stripe",
          description: language === "fr" 
            ? "Complétez l'onboarding Stripe dans le nouvel onglet" 
            : "Complete Stripe onboarding in the new tab",
        });
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
      const { data, error } = await supabase.functions.invoke("create-invoice-payment-link", {
        body: { invoice_id: invoiceId },
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

  return {
    isLoading,
    stripeAccountId,
    onboardingComplete,
    loadStripeAccount,
    startOnboarding,
    createPaymentLink,
  };
};
