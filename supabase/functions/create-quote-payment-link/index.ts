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
  console.log(`[CREATE-QUOTE-PAYMENT-LINK] ${step}${detailsStr}`);
};

async function deriveKey(keyString: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(keyString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', keyData);
  return await crypto.subtle.importKey('raw', hashBuffer, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
}

async function decryptData(ciphertext: string, keyString: string): Promise<string> {
  if (!ciphertext) return ciphertext;
  if (ciphertext.startsWith("AESENC:")) {
    try {
      const key = await deriveKey(keyString);
      const base64Data = ciphertext.slice(7);
      const combined = decodeBase64(base64Data);
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);
      const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted);
      return new TextDecoder().decode(decrypted);
    } catch (error) {
      logStep("AES Decryption error", { error: error.message });
      return ciphertext;
    }
  }
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
  return ciphertext;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const body = await req.json();
    const { quoteId, paymentType } = body;
    // paymentType: 'deposit' or 'full'
    if (!quoteId) throw new Error("quoteId is required");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Fetch quote with client info
    const { data: quote, error: quoteError } = await supabaseClient
      .from("quotes")
      .select(`
        *,
        clients (
          name,
          email,
          company_id
        )
      `)
      .eq("id", quoteId)
      .single();

    if (quoteError || !quote) throw new Error("Quote not found");
    logStep("Quote fetched", { quoteNumber: quote.quote_number, total: quote.total });

    const userId = quote.user_id;

    // Get user's Stripe account
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("stripe_account_id, stripe_onboarding_complete")
      .eq("user_id", userId)
      .single();

    if (!profile?.stripe_account_id) {
      throw new Error("Stripe account not connected. Please complete Stripe onboarding first.");
    }

    const encryptionKey = Deno.env.get("ENCRYPTION_KEY") || "";
    const stripeAccountId = await decryptData(profile.stripe_account_id, encryptionKey);
    logStep("Stripe account resolved");

    // Get subscription plan for fee calculation
    const { data: subscription } = await supabaseClient
      .from("user_subscriptions")
      .select("plan_type")
      .eq("user_id", userId)
      .single();

    const planType = subscription?.plan_type || 'free';

    // Determine payment amount
    let amountToCharge: number;
    let description: string;
    const isFrench = quote.clients?.language === 'french';

    if (paymentType === 'deposit' && quote.deposit_amount > 0) {
      amountToCharge = quote.deposit_amount;
      description = isFrench
        ? `Acompte - Devis ${quote.quote_number}`
        : `Deposit - Quote ${quote.quote_number}`;
    } else {
      amountToCharge = quote.total;
      description = isFrench
        ? `Paiement - Devis ${quote.quote_number}`
        : `Payment - Quote ${quote.quote_number}`;
    }

    const amountInCents = Math.round(amountToCharge * 100);
    if (amountInCents < 50) {
      throw new Error("Minimum payment amount is $0.50 CAD.");
    }

    // Calculate application fee
    let applicationFeeRate = 0;
    if (planType === 'free') applicationFeeRate = 0.02;
    else if (planType === 'premium') applicationFeeRate = 0.01;
    else if (planType === 'pro') applicationFeeRate = 0.005;
    const applicationFee = Math.round(amountInCents * applicationFeeRate);

    logStep("Creating payment link", { amountInCents, applicationFee, paymentType });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const origin = req.headers.get("origin") || "https://gestionflow.net";

    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: "cad",
            product_data: {
              name: description,
              description: quote.notes || description,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      after_completion: {
        type: "redirect",
        redirect: {
          url: `${origin}/payment-success?quote=${quoteId}&type=${paymentType}`,
        },
      },
      metadata: {
        quote_id: quoteId,
        payment_type: paymentType || 'full',
        plan_type: planType,
      },
      application_fee_amount: applicationFee,
    }, {
      stripeAccount: stripeAccountId,
    });

    logStep("Payment link created", { url: paymentLink.url });

    // Save payment link to quote
    await supabaseClient
      .from("quotes")
      .update({ payment_link: paymentLink.url })
      .eq("id", quoteId);

    return new Response(JSON.stringify({
      url: paymentLink.url,
      payment_link: paymentLink.url,
    }), {
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
