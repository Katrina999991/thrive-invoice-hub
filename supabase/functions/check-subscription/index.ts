import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Map Stripe product IDs to plan types
const PRODUCT_MAP: Record<string, string> = {
  "prod_TMIGO91Sky7JR8": "premium",
  "prod_TMIGEeTzhusHyr": "premium",
  "prod_TMIGrFlCJKwKAp": "pro",
  "prod_TMIHsMZwCbWgYC": "pro",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    logStep("Authenticating user with token");
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, user has no subscription");
      return new Response(JSON.stringify({ 
        subscribed: false,
        plan_type: "free",
        product_id: null,
        subscription_end: null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    const hasActiveSub = subscriptions.data.length > 0;
    let productId = null;
    let planType = "free";
    let subscriptionEnd = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      
      // Safely convert Unix timestamp to ISO string
      if (subscription.current_period_end) {
        try {
          const endDate = new Date(subscription.current_period_end * 1000);
          if (!isNaN(endDate.getTime())) {
            subscriptionEnd = endDate.toISOString();
            logStep("Active subscription found", { subscriptionId: subscription.id, endDate: subscriptionEnd });
          } else {
            logStep("Invalid date from subscription", { subscriptionId: subscription.id, timestamp: subscription.current_period_end });
          }
        } catch (error) {
          logStep("Error converting date", { error: error.message, timestamp: subscription.current_period_end });
        }
      } else {
        logStep("No end date in subscription", { subscriptionId: subscription.id });
      }
      
      productId = subscription.items.data[0]?.price?.product as string;
      planType = PRODUCT_MAP[productId] || "free";
      logStep("Determined plan type", { productId, planType });

      // Upsert user subscription in database
      const { error: upsertError } = await supabaseClient
        .from("user_subscriptions")
        .upsert({
          user_id: user.id,
          plan_type: planType,
          expires_at: subscriptionEnd,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (upsertError) {
        logStep("Error upserting subscription in database", { error: upsertError.message });
      } else {
        logStep("Upserted subscription in database");
      }
    } else {
      logStep("No active subscription found, updating to free plan");
      
      // Upsert user to free plan
      const { error: upsertError } = await supabaseClient
        .from("user_subscriptions")
        .upsert({
          user_id: user.id,
          plan_type: "free",
          expires_at: null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (upsertError) {
        logStep("Error upserting to free plan", { error: upsertError.message });
      }
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      plan_type: planType,
      product_id: productId,
      subscription_end: subscriptionEnd
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
