import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { STRIPE_CONFIG, PlanType, BillingCycle } from "@/lib/stripeConfig";
import { useQueryClient } from "@tanstack/react-query";
import { logAuditEvent } from "@/lib/auditLogger";

export const useStripeCheckout = () => {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const createCheckout = async (planType: PlanType, billingCycle: BillingCycle, isUpgrade: boolean = false) => {
    try {
      setIsLoading(true);
      
      const priceId = STRIPE_CONFIG[planType][billingCycle].priceId;
      
      // Get current user for audit logging
      const { data: { user } } = await supabase.auth.getUser();
      
      // If it's an upgrade from an existing subscription, update it with proration
      if (isUpgrade) {
        const { data, error } = await supabase.functions.invoke('upgrade-subscription', {
          body: { priceId },
        });

        if (error) throw error;
        
        if (data?.success) {
          toast.success('Mise à niveau effectuée avec succès ! Vous avez accès aux fonctionnalités Pro.');
          
          // Log audit event
          if (user) {
            logAuditEvent({
              userId: user.id,
              userName: user.email?.split('@')[0] || 'User',
              category: 'billing',
              eventType: 'subscription_upgraded',
              description: `Mise à niveau vers ${planType} (${billingCycle})`,
              metadata: { plan_type: planType, billing_cycle: billingCycle }
            });
          }
          
          // Refresh subscription data
          queryClient.invalidateQueries({ queryKey: ['planLimits'] });
          queryClient.invalidateQueries({ queryKey: ['currentSubscription'] });
          
          // Optionally open the invoice URL
          if (data.invoiceUrl) {
            window.open(data.invoiceUrl, '_blank');
          }
        } else {
          throw new Error('Upgrade failed');
        }
      } else {
        // For new subscriptions, use checkout session
        const { data, error } = await supabase.functions.invoke('create-checkout', {
          body: { priceId },
        });

        if (error) throw error;
        
        if (data?.url) {
          // Log audit event for checkout initiation
          if (user) {
            logAuditEvent({
              userId: user.id,
              userName: user.email?.split('@')[0] || 'User',
              category: 'billing',
              eventType: 'checkout_initiated',
              description: `Début de souscription ${planType} (${billingCycle})`,
              metadata: { plan_type: planType, billing_cycle: billingCycle }
            });
          }
          window.open(data.url, '_blank');
        } else {
          throw new Error('No checkout URL returned');
        }
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || 'Failed to create checkout session');
    } finally {
      setIsLoading(false);
    }
  };

  const checkSubscription = async () => {
    try {
      // Check if user is authenticated before calling the edge function
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return null;
      }

      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) throw error;
      
      // Invalidate queries to refresh subscription data
      queryClient.invalidateQueries({ queryKey: ['planLimits'] });
      queryClient.invalidateQueries({ queryKey: ['currentSubscription'] });
      
      return data;
    } catch (error: any) {
      console.error('Check subscription error:', error);
      return null;
    }
  };

  const openCustomerPortal = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) throw error;
      
      // Check if the edge function returned an error in the response body
      if (data?.error) {
        throw new Error(data.error);
      }
      
      if (data?.url) {
        // Log audit event
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          logAuditEvent({
            userId: user.id,
            userName: user.email?.split('@')[0] || 'User',
            category: 'billing',
            eventType: 'customer_portal_opened',
            description: 'Accès au portail de facturation Stripe'
          });
        }
        window.open(data.url, '_blank');
      } else {
        throw new Error('No portal URL returned');
      }
    } catch (error: any) {
      console.error('Customer portal error:', error);
      const errorMessage = error.message || 'Failed to open customer portal';
      
      // Provide user-friendly error messages
      if (errorMessage.includes('No Stripe customer found')) {
        toast.error('Aucun compte Stripe trouvé. Veuillez contacter le support pour modifier votre abonnement.');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const scheduleUpgrade = async (planType: PlanType, billingCycle: BillingCycle) => {
    try {
      setIsLoading(true);
      
      const priceId = STRIPE_CONFIG[planType][billingCycle].priceId;
      
      const { data, error } = await supabase.functions.invoke('schedule-upgrade', {
        body: { priceId },
      });

      if (error) throw error;
      
      // Log audit event
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        logAuditEvent({
          userId: user.id,
          userName: user.email?.split('@')[0] || 'User',
          category: 'billing',
          eventType: 'upgrade_scheduled',
          description: `Mise à niveau planifiée vers ${planType} (${billingCycle})`,
          metadata: { plan_type: planType, billing_cycle: billingCycle }
        });
      }
      
      toast.success(
        billingCycle === 'monthly'
          ? 'Mise à niveau planifiée avec succès ! Votre plan Pro sera activé à la fin de votre période actuelle.'
          : 'Upgrade scheduled successfully! Your Pro plan will be activated at the end of your current period.'
      );
      
      // Refresh subscription data
      queryClient.invalidateQueries({ queryKey: ['planLimits'] });
      queryClient.invalidateQueries({ queryKey: ['currentSubscription'] });
    } catch (error: any) {
      console.error('Schedule upgrade error:', error);
      toast.error(error.message || 'Failed to schedule upgrade');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createCheckout,
    checkSubscription,
    openCustomerPortal,
    scheduleUpgrade,
    isLoading,
  };
};
