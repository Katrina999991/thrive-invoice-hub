import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-DASHBOARD-LINK] ${step}${detailsStr}`);
};

// Decrypt function to handle encrypted stripe_account_id
const decryptValue = async (supabaseClient: any, encryptedValue: string): Promise<string> => {
  if (!encryptedValue) return encryptedValue;
  
  // Check if value is encrypted (starts with ENC: or AESENC:)
  if (!encryptedValue.startsWith('ENC:') && !encryptedValue.startsWith('AESENC:')) {
    return encryptedValue;
  }
  
  try {
    const { data, error } = await supabaseClient.rpc('decrypt_sensitive', {
      ciphertext: encryptedValue
    });
    
    if (error) {
      logStep("Decryption error", { error: error.message });
      throw error;
    }
    
    return data || encryptedValue;
  } catch (error) {
    logStep("Decryption failed", { error: error.message });
    throw error;
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw userError;
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Get user's Stripe account ID
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("stripe_account_id, stripe_onboarding_complete")
      .eq("user_id", user.id)
      .single();

    if (!profile?.stripe_account_id) {
      throw new Error("No Stripe account found. Please complete onboarding first.");
    }

    if (!profile.stripe_onboarding_complete) {
      throw new Error("Stripe onboarding not complete. Please complete onboarding first.");
    }

    // Decrypt the stripe_account_id if it's encrypted
    const decryptedAccountId = await decryptValue(supabaseClient, profile.stripe_account_id);
    logStep("Stripe account ID decrypted", { accountId: decryptedAccountId });

    logStep("Creating dashboard login link", { accountId: decryptedAccountId });

    // Create a login link for the Express account
    const loginLink = await stripe.accounts.createLoginLink(decryptedAccountId);

    logStep("Dashboard link created", { url: loginLink.url });

    return new Response(JSON.stringify({ url: loginLink.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    logStep("ERROR", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
