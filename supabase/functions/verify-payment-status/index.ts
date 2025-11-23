import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-PAYMENT-STATUS] ${step}${detailsStr}`);
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

    // Get invoice with payment link and its owner
    const { data: invoice, error: invoiceError } = await supabaseClient
      .from("invoices")
      .select("user_id, payment_link, stripe_payment_intent_id, status")
      .eq("id", invoiceId)
      .single();

    if (invoiceError || !invoice) throw new Error("Invoice not found");
    if (!invoice.payment_link) throw new Error("No payment link found for this invoice");
    if (invoice.status === "paid") {
      logStep("Invoice already paid");
      return new Response(JSON.stringify({ status: "paid", alreadyPaid: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Invoice fetched", { invoiceId, status: invoice.status });

    // Get Stripe account for invoice owner
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("stripe_account_id")
      .eq("user_id", invoice.user_id)
      .single();

    if (!profile?.stripe_account_id) {
      throw new Error("Stripe account not found");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Extract payment link ID from URL
    const paymentLinkId = invoice.payment_link.split('/').pop();
    logStep("Checking payment link", { paymentLinkId });

    // Get payment link details
    const paymentLink = await stripe.paymentLinks.retrieve(paymentLinkId, {
      stripeAccount: profile.stripe_account_id,
    });

    // List checkout sessions for this payment link
    const sessions = await stripe.checkout.sessions.list({
      payment_link: paymentLinkId,
      limit: 10,
    }, {
      stripeAccount: profile.stripe_account_id,
    });

    logStep("Sessions found", { count: sessions.data.length });

    // Find a completed session
    const completedSession = sessions.data.find(
      session => session.payment_status === "paid" && session.status === "complete"
    );

    if (completedSession) {
      logStep("Completed session found", { sessionId: completedSession.id });

      // Update invoice
      await supabaseClient
        .from("invoices")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          stripe_payment_intent_id: completedSession.payment_intent as string,
        })
        .eq("id", invoiceId);

      logStep("Invoice marked as paid");

      return new Response(JSON.stringify({ 
        status: "paid",
        sessionId: completedSession.id,
        updated: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      logStep("No completed session found");
      return new Response(JSON.stringify({ 
        status: invoice.status,
        message: "Payment not completed yet"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
  } catch (error) {
    logStep("ERROR", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
