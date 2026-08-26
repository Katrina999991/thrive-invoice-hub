import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.4";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendReportEmailRequest {
  recipientEmail: string;
  reportTitle: string;
  reportType: string;
  message?: string;
  pdfBase64: string;
  language: string;
  senderEmail?: string;
  senderName?: string;
  companyName?: string;
  companyEmail?: string;
  companyId: string;
}

async function requireAuthorizedUser(req: Request, supabase: ReturnType<typeof createClient>) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");

  const token = authHeader.slice("Bearer ".length);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new Error("Unauthorized");
  return data.user;
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-REPORT-EMAIL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );
    const user = await requireAuthorizedUser(req, supabase);

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM") || "GestionFlow <noreply@gestionflow.net>";
    
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const { 
      recipientEmail, 
      reportTitle, 
      reportType, 
      message, 
      pdfBase64, 
      language,
      senderEmail,
      senderName,
      companyName,
      companyEmail,
      companyId,
    } = await req.json() as SendReportEmailRequest;

    logStep("Request data", { recipientEmail, reportTitle, reportType, language, senderName, senderEmail });

    // Validate inputs
    if (!recipientEmail || !reportTitle || !pdfBase64 || !companyId) {
      throw new Error("Missing required fields");
    }

    const { data: authorization, error: authorizationError } = await supabase.rpc('authorize_action', {
      _company_id: companyId,
      _user_id: user.id,
      _permission: 'reports:export',
    });

    if (authorizationError || !(authorization as { allowed?: boolean } | null)?.allowed) {
      throw new Error("Forbidden");
    }

    // For reports: use user email as reply-to
    const replyToEmail = user.email;
    if (!replyToEmail) {
      throw new Error(language === 'fr' 
        ? "Impossible d'envoyer le courriel : aucune adresse courriel utilisateur trouvée."
        : "Cannot send email: no user email address found.");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      throw new Error("Invalid email format");
    }

    const isFrench = language === 'fr';
    const resend = new Resend(resendApiKey);
    
    // For reports: always use app domain with user's name as display name
    const defaultFromEmail = fromEmail;
    const defaultDomain = defaultFromEmail.match(/<(.+)>/)?.[1] || 'noreply@gestionflow.net';
    
    // Display name is the user's name (senderName)
    const fromAddress = senderName 
      ? `${senderName} via GestionFlow <${defaultDomain}>`
      : `GestionFlow <${defaultDomain}>`;
    
    logStep('Report email sender config', { fromAddress, hasReplyTo: !!replyToEmail });

    // Generate filename
    const date = new Date().toISOString().split('T')[0];
    const sanitizedTitle = reportTitle.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const filename = `${sanitizedTitle}-${date}.pdf`;

    // Email subject
    const subject = isFrench 
      ? `Rapport GestionFlow : ${reportTitle}`
      : `GestionFlow Report: ${reportTitle}`;

    // Email body
    const customMessageHtml = message 
      ? `<div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
           <p style="margin: 0; color: #333; white-space: pre-wrap;">${message}</p>
         </div>`
      : '';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb;">
              <h1 style="color: #1f2937; margin: 0; font-size: 24px;">
                ${isFrench ? 'Rapport' : 'Report'}: ${reportTitle}
              </h1>
              <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 14px;">
                ${isFrench ? 'Généré par GestionFlow' : 'Generated by GestionFlow'}
              </p>
            </div>

            <!-- Greeting -->
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              ${isFrench ? 'Bonjour,' : 'Hello,'}
            </p>

            ${customMessageHtml}

            <!-- Main content -->
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              ${isFrench 
                ? `Veuillez trouver ci-joint le rapport "<strong>${reportTitle}</strong>" en format PDF.`
                : `Please find attached the "<strong>${reportTitle}</strong>" report in PDF format.`}
            </p>

            <!-- Report info box -->
            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #bae6fd;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 14px;">
                    ${isFrench ? 'Type de rapport' : 'Report Type'}:
                  </td>
                  <td style="padding: 8px 0; color: #1e40af; font-weight: 600; text-align: right; font-size: 14px;">
                    ${reportTitle}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 14px;">
                    ${isFrench ? 'Date de génération' : 'Generation Date'}:
                  </td>
                  <td style="padding: 8px 0; color: #1e40af; font-weight: 600; text-align: right; font-size: 14px;">
                    ${new Date().toLocaleDateString(isFrench ? 'fr-FR' : 'en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 14px;">
                    ${isFrench ? 'Fichier joint' : 'Attachment'}:
                  </td>
                  <td style="padding: 8px 0; color: #1e40af; font-weight: 600; text-align: right; font-size: 14px;">
                    📎 ${filename}
                  </td>
                </tr>
              </table>
            </div>

            <!-- Footer -->
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                ${isFrench 
                  ? 'Ce courriel a été envoyé automatiquement par GestionFlow.'
                  : 'This email was automatically sent by GestionFlow.'}
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 5px 0 0 0;">
                © ${new Date().getFullYear()} GestionFlow - ${isFrench ? 'Tous droits réservés' : 'All rights reserved'}
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    logStep("PDF base64 length", { length: pdfBase64.length });

    // Send email with PDF attachment
    const emailResult = await resend.emails.send({
      from: fromAddress,
      replyTo: replyToEmail,
      to: [recipientEmail],
      subject: subject,
      html: emailHtml,
      attachments: [
        {
          filename: filename,
          content: pdfBase64,
        },
      ],
    });

    logStep("Email sent successfully", { id: emailResult.data?.id });

    return new Response(
      JSON.stringify({ success: true, message: "Report email sent successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    const status = errorMessage === 'Unauthorized' ? 401 : errorMessage === 'Forbidden' ? 403 : 500;
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status }
    );
  }
});
