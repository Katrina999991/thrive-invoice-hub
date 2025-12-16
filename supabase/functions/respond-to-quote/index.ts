import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RespondRequest {
  token: string;
  response: "accepted" | "refused";
  note?: string;
}

// Email templates
const emailTemplates = {
  en: {
    accepted: {
      subject: "Quote {quote_number} has been accepted!",
      body: `Great news! Your quote {quote_number} has been accepted by {client_name}.

Quote Details:
- Quote Number: {quote_number}
- Client: {client_name}
- Total: {total}
- Responded on: {response_date}
{client_note}

You can now convert this quote into an invoice in GestionFlow.

Best regards,
GestionFlow`
    },
    refused: {
      subject: "Quote {quote_number} has been refused",
      body: `Your quote {quote_number} has been refused by {client_name}.

Quote Details:
- Quote Number: {quote_number}
- Client: {client_name}
- Total: {total}
- Responded on: {response_date}
{client_note}

You can view more details in GestionFlow.

Best regards,
GestionFlow`
    }
  },
  fr: {
    accepted: {
      subject: "Le devis {quote_number} a été accepté !",
      body: `Excellente nouvelle ! Votre devis {quote_number} a été accepté par {client_name}.

Détails du devis :
- Numéro de devis : {quote_number}
- Client : {client_name}
- Total : {total}
- Répondu le : {response_date}
{client_note}

Vous pouvez maintenant convertir ce devis en facture dans GestionFlow.

Cordialement,
GestionFlow`
    },
    refused: {
      subject: "Le devis {quote_number} a été refusé",
      body: `Votre devis {quote_number} a été refusé par {client_name}.

Détails du devis :
- Numéro de devis : {quote_number}
- Client : {client_name}
- Total : {total}
- Répondu le : {response_date}
{client_note}

Vous pouvez consulter plus de détails dans GestionFlow.

Cordialement,
GestionFlow`
    }
  }
};

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

    // Fetch the quote with client info
    const { data: quote, error: fetchError } = await supabase
      .from("quotes")
      .select(`
        *,
        clients (
          name,
          email,
          language,
          company_id
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
    const respondedAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("quotes")
      .update({
        status: response,
        responded_at: respondedAt,
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

    // Send notification email to the quote owner
    try {
      // Get user email from auth.users
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(quote.user_id);
      
      if (userError || !userData?.user?.email) {
        console.error("Could not fetch user email:", userError);
      } else {
        const userEmail = userData.user.email;
        const client = quote.clients;
        
        // Determine user's preferred language (default to French for this app)
        // We could store this in profiles, but for now default to French
        const lang = 'fr';
        const template = emailTemplates[lang][response];
        
        // Format date
        const responseDate = new Date(respondedAt).toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-CA', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        // Prepare template variables
        const clientNote = note 
          ? (lang === 'fr' ? `\nNote du client : ${note}` : `\nClient note: ${note}`)
          : '';

        let emailSubject = template.subject
          .replace('{quote_number}', quote.quote_number);
        
        let emailBody = template.body
          .replace(/{quote_number}/g, quote.quote_number)
          .replace('{client_name}', client?.name || 'Client')
          .replace('{total}', `$${quote.total.toFixed(2)}`)
          .replace('{response_date}', responseDate)
          .replace('{client_note}', clientNote);

        // Convert line breaks to HTML
        const htmlBody = emailBody.replace(/\n/g, '<br>');

        // Send notification email
        const fromEmail = Deno.env.get("RESEND_FROM") || "GestionFlow <onboarding@resend.dev>";
        
        const emailResponse = await resend.emails.send({
          from: fromEmail,
          to: [userEmail],
          subject: emailSubject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: ${response === 'accepted' ? '#dcfce7' : '#fee2e2'}; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="margin: 0; color: ${response === 'accepted' ? '#166534' : '#991b1b'};">
                  ${response === 'accepted' ? '✅' : '❌'} ${lang === 'fr' ? (response === 'accepted' ? 'Devis accepté' : 'Devis refusé') : (response === 'accepted' ? 'Quote Accepted' : 'Quote Refused')}
                </h2>
              </div>
              <div style="line-height: 1.6; color: #333;">
                ${htmlBody}
              </div>
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
                <a href="https://gestionflow.lovable.app/dashboard/quotes" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
                  ${lang === 'fr' ? 'Voir dans GestionFlow' : 'View in GestionFlow'}
                </a>
              </div>
            </div>
          `,
        });

        console.log("Notification email sent to:", userEmail, emailResponse);
      }
    } catch (emailError) {
      // Don't fail the response if email fails - just log it
      console.error("Failed to send notification email:", emailError);
    }

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
