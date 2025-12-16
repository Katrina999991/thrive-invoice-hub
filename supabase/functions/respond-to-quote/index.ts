import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RespondRequest {
  token: string;
  response: "accepted" | "refused";
  note?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, response, note }: RespondRequest = await req.json();

    if (!token || !response) {
      return new Response(
        JSON.stringify({ error: "Token and response are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!["accepted", "refused"].includes(response)) {
      return new Response(
        JSON.stringify({ error: "Invalid response. Must be 'accepted' or 'refused'" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // First, fetch the quote to verify the token and check current status
    const { data: quote, error: fetchError } = await supabase
      .from("quotes")
      .select(`
        *,
        clients (
          name,
          email
        )
      `)
      .eq("access_token", token)
      .single();

    if (fetchError || !quote) {
      console.error("Quote fetch error:", fetchError);
      return new Response(
        JSON.stringify({ error: "Invalid or expired link" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if already responded
    if (quote.status === "accepted" || quote.status === "refused") {
      return new Response(
        JSON.stringify({ 
          error: "This quote has already been responded to",
          currentStatus: quote.status 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if expired
    if (quote.expiry_date) {
      const expiryDate = new Date(quote.expiry_date);
      if (expiryDate < new Date()) {
        return new Response(
          JSON.stringify({ error: "This quote has expired" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Update the quote status
    const { error: updateError } = await supabase
      .from("quotes")
      .update({
        status: response,
        responded_at: new Date().toISOString(),
        client_response_note: note || null,
      })
      .eq("id", quote.id);

    if (updateError) {
      console.error("Quote update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update quote status" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Quote ${quote.quote_number} ${response} by client`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        status: response,
        quoteNumber: quote.quote_number 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in respond-to-quote function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
