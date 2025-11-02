import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RecoveryRequest {
  recoveryEmail: string;
  language?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recoveryEmail, language = "fr" }: RecoveryRequest = await req.json();

    console.log("Account recovery requested for:", recoveryEmail);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find profile with this recovery email
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("recovery_email", recoveryEmail)
      .single();

    if (profileError || !profile) {
      console.error("Recovery email not found:", profileError);
      // Return success anyway to avoid email enumeration
      return new Response(
        JSON.stringify({ success: true, message: "If this recovery email exists, a recovery link has been sent." }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get user's primary email
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(profile.user_id);

    if (userError || !userData.user) {
      console.error("User not found:", userError);
      return new Response(
        JSON.stringify({ success: true, message: "If this recovery email exists, a recovery link has been sent." }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const primaryEmail = userData.user.email;

    // Generate a password reset link for the user with explicit redirect to the app /auth page
    const originHeader = req.headers.get("origin") || req.headers.get("referer") || "";
    let redirectTo: string | undefined = undefined;
    try {
      if (originHeader) {
        const base = new URL(originHeader).origin;
        redirectTo = `${base}/auth`;
      }
    } catch (_) { /* noop */ }
    console.log("Account recovery redirectTo:", redirectTo);

    const { data: resetData, error: resetError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: primaryEmail!,
      options: { redirectTo: redirectTo || undefined }
    });

    if (resetError) {
      console.error("Error generating recovery link:", resetError);
      return new Response(
        JSON.stringify({ error: "Failed to generate recovery link" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send email to recovery email address
    const emailSubject = language === "en" 
      ? "Account Recovery - Reset Your Password"
      : "Récupération de compte - Réinitialiser votre mot de passe";

    const emailBody = language === "en"
      ? `
        <h1>Account Recovery</h1>
        <p>You requested to recover your account using your recovery email address.</p>
        <p>Click the link below to reset your password and regain access to your account:</p>
        <p><a href="${resetData.properties.action_link}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this recovery, please ignore this email.</p>
        <p style="color: #666; font-size: 14px; margin-top: 24px;">Your primary email: ${primaryEmail}</p>
      `
      : `
        <h1>Récupération de compte</h1>
        <p>Vous avez demandé à récupérer votre compte en utilisant votre adresse email de récupération.</p>
        <p>Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe et retrouver l'accès à votre compte :</p>
        <p><a href="${resetData.properties.action_link}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Réinitialiser le mot de passe</a></p>
        <p>Ce lien expirera dans 1 heure.</p>
        <p>Si vous n'avez pas demandé cette récupération, veuillez ignorer cet email.</p>
        <p style="color: #666; font-size: 14px; margin-top: 24px;">Votre email principal : ${primaryEmail}</p>
      `;

    const emailResponse = await resend.emails.send({
      from: Deno.env.get("RESEND_FROM") || "Lovable <onboarding@resend.dev>",
      to: [recoveryEmail],
      subject: emailSubject,
      html: emailBody,
    });

    console.log("Recovery email sent:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: language === "en" 
          ? "If this recovery email exists, a recovery link has been sent." 
          : "Si cet email de récupération existe, un lien de récupération a été envoyé."
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in account-recovery function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
