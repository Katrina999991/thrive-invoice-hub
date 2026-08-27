import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Token is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the quote with client and items
    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .select(`
        id,
        quote_number,
        status,
        issue_date,
        expiry_date,
        subtotal,
        tax_amount,
        total,
        notes,
        terms,
        responded_at,
        client_response_note,
        deposit_type,
        deposit_value,
        deposit_amount,
        payment_link,
        deposit_paid_at,
        online_payment_enabled,
        has_ranges,
        min_total,
        max_total,
        clients (
          name,
          email,
          address,
          phone
        ),
        quote_items (
          id,
          description,
          quantity,
          unit_price,
          total,
          product_taxes
        )
      `)
      .eq("access_token", token)
      .single();

    if (quoteError || !quote) {
      console.error("Quote fetch error:", quoteError);
      return new Response(
        JSON.stringify({ error: "Invalid or expired link" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Recover gracefully if the deposit was requested but link creation failed
    // during acceptance. The public quote page can safely retry this operation.
    if (quote.status === 'deposit_requested' && !quote.payment_link) {
      try {
        const paymentResponse = await fetch(`${supabaseUrl}/functions/v1/create-quote-payment-link`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ quoteId: quote.id, paymentType: 'deposit' }),
        });
        const paymentResult = await paymentResponse.json();
        if (paymentResponse.ok && paymentResult.url) {
          quote.payment_link = paymentResult.url;
        } else {
          console.error('Deposit payment link retry failed:', paymentResult.error || paymentResult);
        }
      } catch (paymentError) {
        console.error('Deposit payment link retry error:', paymentError);
      }
    }

    // Get company info for branding
    const { data: companyData } = await supabase
      .from("quotes")
      .select("user_id")
      .eq("id", quote.id)
      .single();

    let company = null;
    if (companyData?.user_id) {
      const { data: companyInfo } = await supabase
        .from("companies")
        .select("name, logo_url, email, phone, street_address, city, province_state, postal_code, country")
        .eq("user_id", companyData.user_id)
        .limit(1)
        .single();
      company = companyInfo;
    }

    // Check if expired
    const isExpired = quote.expiry_date ? new Date(quote.expiry_date) < new Date() : false;

    // Calculate deposit display info
    let depositInfo = null;
    if (quote.deposit_type && quote.deposit_type !== 'none' && quote.deposit_amount > 0) {
      depositInfo = {
        type: quote.deposit_type,
        value: quote.deposit_value,
        amount: quote.deposit_amount,
        hasRanges: quote.has_ranges,
        minAmount: quote.deposit_amount,
        maxAmount: quote.has_ranges && quote.deposit_type === 'percentage' && quote.max_total
          ? Math.round(quote.max_total * (quote.deposit_value / 100) * 100) / 100
          : quote.deposit_amount,
        isPaid: !!quote.deposit_paid_at,
        paidAt: quote.deposit_paid_at,
      };
    }

    return new Response(
      JSON.stringify({ 
        quote: {
          ...quote,
          isExpired,
          canRespond: !isExpired && !["accepted", "refused", "rejected", "deposit_requested", "deposit_paid"].includes(quote.status),
          depositInfo,
        },
        company 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in get-quote-by-token function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
