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
  console.log(`[CREATE-INVOICE-PAYMENT-LINK] ${step}${detailsStr}`);
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

    const body = await req.json();
    const invoiceId = body.invoiceId || body.invoice_id;
    if (!invoiceId) throw new Error("invoiceId is required");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get user_id from invoice since this can be called internally
    // First fetch the invoice to get the user_id
    const { data: invoiceData, error: invoiceCheckError } = await supabaseClient
      .from("invoices")
      .select("user_id")
      .eq("id", invoiceId)
      .single();
    
    if (invoiceCheckError || !invoiceData) {
      throw new Error("Invoice not found");
    }
    
    const userId = invoiceData.user_id;
    logStep("Processing for user", { userId });

    // Get user's Stripe account
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("stripe_account_id, stripe_onboarding_complete")
      .eq("user_id", userId)
      .single();

    if (!profile?.stripe_account_id) {
      throw new Error("Stripe account not connected. Please start Stripe onboarding first.");
    }

    // Decrypt the stripe_account_id if it's encrypted
    const encryptionKey = Deno.env.get("ENCRYPTION_KEY") || "";
    const stripeAccountId = await decryptData(profile.stripe_account_id, encryptionKey);
    logStep("Stripe account ID processed", { encrypted: profile.stripe_account_id.startsWith('ENC:') || profile.stripe_account_id.startsWith('AESENC:') });

    // Log a warning if onboarding is not complete (useful for test mode)
    if (!profile?.stripe_onboarding_complete) {
      logStep("WARNING: Onboarding not complete - may be test mode", { accountId: stripeAccountId.substring(0, 10) + '...' });
    }

    // Get user's subscription plan
    const { data: subscription } = await supabaseClient
      .from("user_subscriptions")
      .select("plan_type")
      .eq("user_id", userId)
      .single();

    const planType = subscription?.plan_type || 'free';
    logStep("User plan", { planType });

    // Get invoice details
    const { data: invoice, error: invoiceError } = await supabaseClient
      .from("invoices")
      .select(`
        *,
        clients (
          name,
          email
        )
      `)
      .eq("id", invoiceId)
      .eq("user_id", userId)
      .single();

    if (invoiceError || !invoice) throw new Error("Invoice not found");
    logStep("Invoice fetched", { invoiceNumber: invoice.invoice_number });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Create payment link
    const origin = req.headers.get("origin") || "http://localhost:3000";
    const amountInCents = Math.round(invoice.total * 100);

    if (amountInCents < 50) {
      throw new Error("Le montant minimum pour un paiement Stripe est de 0,50 $ CAD. Augmentez le total de la facture avant de générer le lien de paiement.");
    }

    // Calculate application fee based on plan: Free 2%, Premium 1%, Pro 0.5%
    let applicationFeeRate = 0;
    if (planType === 'free') {
      applicationFeeRate = 0.02; // 2% commission
    } else if (planType === 'premium') {
      applicationFeeRate = 0.01; // 1% commission
    } else if (planType === 'pro') {
      applicationFeeRate = 0; // 0% commission - free for Pro
    }
    
    const applicationFee = Math.round(amountInCents * applicationFeeRate);
    logStep("Application fee calculated", { planType, applicationFeeRate, amountInCents, applicationFee });

    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: "cad",
            product_data: {
              name: `Facture ${invoice.invoice_number}`,
              description: invoice.notes || `Paiement pour la facture ${invoice.invoice_number}`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      after_completion: {
        type: "redirect",
        redirect: {
          url: `${origin}/payment-success?invoice=${invoiceId}`,
        },
      },
      metadata: {
        invoice_id: invoiceId,
        invoice_number: invoice.invoice_number,
        plan_type: planType,
      },
      application_fee_amount: applicationFee,
    }, {
      stripeAccount: stripeAccountId,
    });

    logStep("Payment link created", { url: paymentLink.url });

    // Save payment link to invoice
    await supabaseClient
      .from("invoices")
      .update({ payment_link: paymentLink.url })
      .eq("id", invoiceId);

    return new Response(JSON.stringify({ 
      url: paymentLink.url,
      payment_link: paymentLink.url,
      paymentLinkId: paymentLink.id 
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