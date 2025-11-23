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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw userError;
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Get user's Stripe account
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("stripe_account_id, stripe_onboarding_complete")
      .eq("user_id", user.id)
      .single();

    if (!profile?.stripe_account_id) {
      throw new Error("Stripe account not connected. Please start Stripe onboarding first.");
    }

    // Log a warning if onboarding is not complete (useful for test mode)
    if (!profile?.stripe_onboarding_complete) {
      logStep("WARNING: Onboarding not complete - may be test mode", { accountId: profile.stripe_account_id });
    }

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
      .eq("user_id", user.id)
      .single();

    if (invoiceError || !invoice) throw new Error("Invoice not found");
    logStep("Invoice fetched", { invoiceNumber: invoice.invoice_number });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Create payment link
    const origin = req.headers.get("origin") || "http://localhost:3000";
    const amountInCents = Math.round(invoice.total * 100);

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
      },
      application_fee_amount: 0,
      automatic_payment_methods: {
        enabled: true,
      },
    }, {
      stripeAccount: profile.stripe_account_id,
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