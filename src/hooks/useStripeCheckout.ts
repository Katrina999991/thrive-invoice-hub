import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { STRIPE_CONFIG, PlanType, BillingCycle } from "@/lib/stripeConfig";

export const useStripeCheckout = () => {
  const [isLoading, setIsLoading] = useState(false);

  const createCheckout = async (planType: PlanType, billingCycle: BillingCycle) => {
    try {
      setIsLoading(true);
      
      const priceId = STRIPE_CONFIG[planType][billingCycle].priceId;
      
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId },
      });

      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error('No checkout URL returned');
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
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) throw error;
      
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
      
      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error('No portal URL returned');
      }
    } catch (error: any) {
      console.error('Customer portal error:', error);
      toast.error(error.message || 'Failed to open customer portal');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createCheckout,
    checkSubscription,
    openCustomerPortal,
    isLoading,
  };
};
