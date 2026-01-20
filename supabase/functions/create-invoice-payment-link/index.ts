import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-INVOICE-PAYMENT-LINK] ${step}${detailsStr}`);
};

// Decryption helper for encrypted stripe_account_id
async function decryptData(encryptedData: string): Promise<string> {
  // Check if data is encrypted (starts with ENC:V1)
  if (!encryptedData || !encryptedData.startsWith('ENC:V1')) {
    return encryptedData; // Not encrypted, return as-is
  }

  const encryptionKey = Deno.env.get("ENCRYPTION_KEY");
  if (!encryptionKey) {
    throw new Error("ENCRYPTION_KEY not configured");
  }

  try {
    // Remove the ENC:V1 prefix
    const base64Data = encryptedData.substring(6);
    const encryptedBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    // Extract IV (first 12 bytes) and ciphertext
    const iv = encryptedBytes.slice(0, 12);
    const ciphertext = encryptedBytes.slice(12);
    
    // Derive key from encryption key
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(encryptionKey),
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"]
    );
    
    const key = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: new TextEncoder().encode("gestionflow-salt"),
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );
    
    // Decrypt
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );
    
    return new TextDecoder().decode(decryptedBuffer);
  } catch (error) {
    logStep("Decryption error", { error: error.message });
    throw new Error("Failed to decrypt data");
  }
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
    const stripeAccountId = await decryptData(profile.stripe_account_id);
    logStep("Stripe account ID processed", { encrypted: profile.stripe_account_id.startsWith('ENC:') });

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
      applicationFeeRate = 0.005; // 0.5% commission
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