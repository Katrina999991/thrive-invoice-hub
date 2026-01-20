import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { decode as decodeBase64 } from "https://deno.land/std@0.190.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-DASHBOARD-LINK] ${step}${detailsStr}`);
};

// Convert string key to proper AES-256 key (32 bytes)
async function deriveKey(keyString: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(keyString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', keyData);
  
  return await crypto.subtle.importKey(
    'raw',
    hashBuffer,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
}

// Decryption helper for encrypted stripe_account_id
async function decryptData(ciphertext: string, keyString: string): Promise<string> {
  if (!ciphertext) return ciphertext;
  
  // Handle AES format (AESENC:)
  if (ciphertext.startsWith("AESENC:")) {
    try {
      const key = await deriveKey(keyString);
      const base64Data = ciphertext.slice(7);
      const combined = decodeBase64(base64Data);
      
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);
      
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted
      );
      
      return new TextDecoder().decode(decrypted);
    } catch (error) {
      logStep("AES Decryption error", { error: error.message });
      return ciphertext;
    }
  }
  
  // Handle legacy XOR format (ENC:)
  if (ciphertext.startsWith("ENC:")) {
    try {
      const base64Data = ciphertext.slice(4);
      const encrypted = decodeBase64(base64Data);
      const keyBytes = new TextEncoder().encode(keyString);
      
      const decrypted = new Uint8Array(encrypted.length);
      for (let i = 0; i < encrypted.length; i++) {
        decrypted[i] = encrypted[i] ^ keyBytes[i % keyBytes.length];
      }
      
      return new TextDecoder().decode(decrypted);
    } catch (error) {
      logStep("Legacy XOR Decryption error", { error: error.message });
      return ciphertext;
    }
  }
  
  // Not encrypted, return as-is
  return ciphertext;
}

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
    const encryptionKey = Deno.env.get("ENCRYPTION_KEY") || "";
    const decryptedAccountId = await decryptData(profile.stripe_account_id, encryptionKey);
    logStep("Stripe account ID decrypted", { 
      wasEncrypted: profile.stripe_account_id.startsWith('ENC:') || profile.stripe_account_id.startsWith('AESENC:'),
      accountIdPrefix: decryptedAccountId.substring(0, 10) + '...'
    });

    logStep("Creating dashboard login link", { accountId: decryptedAccountId.substring(0, 10) + '...' });

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
