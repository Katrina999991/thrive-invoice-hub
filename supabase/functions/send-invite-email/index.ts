import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.4';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InviteEmailRequest {
  inviteId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { inviteId }: InviteEmailRequest = await req.json();

    if (!inviteId) {
      return new Response(
        JSON.stringify({ error: "Missing inviteId" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Processing invite email for:", inviteId);

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch invite with company and role info
    const { data: invite, error: inviteError } = await supabase
      .from('company_invites')
      .select(`
        *,
        companies (name),
        company_roles (name)
      `)
      .eq('id', inviteId)
      .single();

    if (inviteError || !invite) {
      console.error("Error fetching invite:", inviteError);
      return new Response(
        JSON.stringify({ error: "Invite not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get inviter info
    const { data: inviterProfile } = await supabase
      .from('profiles')
      .select('display_name, username')
      .eq('user_id', invite.invited_by)
      .single();

    const inviterName = inviterProfile?.username || inviterProfile?.display_name || 'Un membre';
    const companyName = invite.companies?.name || 'une entreprise';
    const roleName = invite.company_roles?.name || 'Membre';

    // Build the invite accept URL - use production domain
    const appUrl = 'https://gestionflow.net';
    const acceptUrl = `${appUrl}/accept-invite?token=${invite.token}`;

    // Prepare email content (bilingual)
    const emailSubject = `Invitation à rejoindre ${companyName} sur GestionFlow`;
    
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">GestionFlow</h1>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="color: #1f2937; margin-top: 0;">Vous êtes invité(e) ! / You're Invited!</h2>
    
    <p style="color: #4b5563;">
      <strong>${inviterName}</strong> vous invite à rejoindre <strong>${companyName}</strong> sur GestionFlow en tant que <strong>${roleName}</strong>.
    </p>
    
    <p style="color: #6b7280; font-size: 14px;">
      <em>${inviterName} has invited you to join ${companyName} on GestionFlow as ${roleName}.</em>
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${acceptUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Accepter l'invitation / Accept Invitation
      </a>
    </div>
    
    <p style="color: #6b7280; font-size: 14px;">
      Ou copiez ce lien dans votre navigateur :<br>
      <a href="${acceptUrl}" style="color: #667eea; word-break: break-all;">${acceptUrl}</a>
    </p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
    
    <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
      Cette invitation expire le ${new Date(invite.expires_at).toLocaleDateString('fr-CA')}.<br>
      Si vous n'avez pas demandé cette invitation, vous pouvez ignorer cet email.<br><br>
      <em>This invitation expires on ${new Date(invite.expires_at).toLocaleDateString('en-CA')}.<br>
      If you didn't request this invitation, you can safely ignore this email.</em>
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p style="margin: 0;">GestionFlow - Gestion simplifiée pour votre entreprise</p>
  </div>
</body>
</html>
`;

    const textContent = `
Vous êtes invité(e) à rejoindre ${companyName} sur GestionFlow!

${inviterName} vous invite à rejoindre ${companyName} en tant que ${roleName}.

Cliquez sur le lien ci-dessous pour accepter l'invitation:
${acceptUrl}

Cette invitation expire le ${new Date(invite.expires_at).toLocaleDateString('fr-CA')}.

---

You're invited to join ${companyName} on GestionFlow!

${inviterName} has invited you to join ${companyName} as ${roleName}.

Click the link below to accept the invitation:
${acceptUrl}

This invitation expires on ${new Date(invite.expires_at).toLocaleDateString('en-CA')}.

---
GestionFlow - Simplified management for your business
`;

    console.log("Sending invite email to:", invite.email);

    // Send email
    const { data, error } = await resend.emails.send({
      from: Deno.env.get('RESEND_FROM') || 'GestionFlow <noreply@gestionflow.net>',
      to: [invite.email],
      reply_to: 'support@gestionflow.net',
      subject: emailSubject,
      html: emailHtml,
      text: textContent,
    });

    if (error) {
      console.error("Error sending email:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Invite email sent successfully:", data);

    return new Response(
      JSON.stringify({ success: true, messageId: data?.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in send-invite-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
