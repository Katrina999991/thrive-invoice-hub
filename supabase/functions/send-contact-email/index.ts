import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
  userEmail?: string;
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-CONTACT-EMAIL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM") || "GestionFlow <noreply@gestionflow.net>";
    
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const { name, email, subject, message, userEmail } = await req.json() as ContactRequest;

    logStep("Request data", { name, email, subject, userEmail });

    // Validate inputs
    if (!name || !email || !subject || !message) {
      throw new Error("Missing required fields");
    }

    if (name.length > 100 || email.length > 255 || subject.length > 200 || message.length > 5000) {
      throw new Error("Field length exceeds maximum allowed");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Invalid email format");
    }

    const resend = new Resend(resendApiKey);

    // Send email to support
    const supportEmailResult = await resend.emails.send({
      from: fromEmail,
      to: ["support@gestionflow.net"],
      replyTo: email,
      subject: `[Contact Form] ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New Contact Form Submission</h2>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            ${userEmail ? `<p><strong>Account Email:</strong> ${userEmail}</p>` : ''}
            <p><strong>Subject:</strong> ${subject}</p>
          </div>
          <div style="padding: 20px 0;">
            <h3 style="color: #333;">Message:</h3>
            <p style="white-space: pre-wrap;">${message}</p>
          </div>
        </div>
      `,
    });

    logStep("Support email sent", { id: supportEmailResult.data?.id });

    // Send confirmation email to user
    const confirmationEmailResult = await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: "We received your message - GestionFlow",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Thank you for contacting us!</h2>
          <p>Hi ${name},</p>
          <p>We have received your message and will get back to you as soon as possible.</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Message:</strong></p>
            <p style="white-space: pre-wrap;">${message}</p>
          </div>
          <p>Best regards,<br>The GestionFlow Team</p>
        </div>
      `,
    });

    logStep("Confirmation email sent", { id: confirmationEmailResult.data?.id });

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
