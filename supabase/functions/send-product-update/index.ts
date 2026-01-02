import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailContent {
  subject: string;
  title: string;
  content: string; // HTML content for the main body
}

interface ProductUpdateRequest {
  fr: EmailContent | null;
  en: EmailContent | null;
  preferencesUrl?: string; // URL to manage email preferences
  testEmails?: string[]; // If provided, only send to these email addresses (test mode)
  testEmail?: string; // DEPRECATED: kept for backwards compatibility
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-PRODUCT-UPDATE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Validate authorization - only allow service role or admin calls
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header required");
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const { fr, en, preferencesUrl, testEmails, testEmail } = await req.json() as ProductUpdateRequest;

    // Support both new testEmails array and deprecated testEmail string
    const testEmailList = testEmails || (testEmail ? [testEmail] : null);
    
    logStep("Request data", { hasFr: !!fr, hasEn: !!en, testMode: !!testEmailList, testCount: testEmailList?.length });

    // Validate inputs - at least one language version must be provided
    if (!fr && !en) {
      throw new Error("At least one language version (fr or en) is required");
    }

    // Create Supabase client with service role to access all users
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate a batch ID to group all emails from this send
    const batchId = crypto.randomUUID();
    logStep("Generated batch ID", { batchId });

    let usersToEmail: { id: string; email: string; language: string }[] = [];

    if (testEmailList && testEmailList.length > 0) {
      // Test mode: send only to the specified email(s)
      logStep("Test mode enabled", { testEmails: testEmailList });
      
      // Try to find the users in auth.users to get their language preferences
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      
      usersToEmail = testEmailList.map(email => {
        const matchingUser = authUsers?.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
        return {
          id: matchingUser?.id || `test-user-${email}`,
          email: email,
          language: matchingUser?.user_metadata?.language || 'fr' // Default to French for test
        };
      });
    } else {
      // Normal mode: fetch all opted-in users
      const { data: optedInUsers, error: fetchError } = await supabase
        .from("email_preferences")
        .select(`
          user_id,
          product_updates
        `)
        .eq("product_updates", true);

      if (fetchError) {
        logStep("Error fetching email preferences", { error: fetchError.message });
        throw new Error(`Failed to fetch email preferences: ${fetchError.message}`);
      }

      if (!optedInUsers || optedInUsers.length === 0) {
        logStep("No users opted in for product updates");
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "No users opted in for product updates",
            sentCount: 0 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      logStep("Found opted-in users", { count: optedInUsers.length });

      // Get user emails from auth.users via profiles or directly
      const userIds = optedInUsers.map(u => u.user_id);
      
      // Fetch user emails and metadata - we need to get them from auth.users
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        logStep("Error fetching auth users", { error: authError.message });
        throw new Error(`Failed to fetch user emails: ${authError.message}`);
      }

      // Emails to exclude from product updates
      const excludedEmails = ['silviu@theresanaiforthat.com'];

      // Filter to only opted-in users and get their emails + language preference
      usersToEmail = authUsers.users
        .filter(user => userIds.includes(user.id) && user.email && !excludedEmails.includes(user.email.toLowerCase()))
        .map(user => ({
          id: user.id,
          email: user.email!,
          language: (user.user_metadata?.language as string) || 'en' // Default to English if not set
        }));
    }

    logStep("Users to email", { count: usersToEmail.length });

    if (usersToEmail.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: testEmail 
            ? "Test email address not found" 
            : "No valid email addresses found for opted-in users",
          sentCount: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const resend = new Resend(resendApiKey);
    const fromEmail = "GestionFlow Updates <no-reply@gestionflow.net>";
    const replyTo = "support@gestionflow.net";
    const managePreferencesUrl = preferencesUrl || "https://gestionflow.net/dashboard/settings";

    let sentCount = 0;
    let errorCount = 0;
    let rateLimitCount = 0; // Count 429 errors specifically
    const errors: string[] = [];

    // Footer translations
    const footerTexts = {
      fr: {
        optInMessage: "Vous recevez cet email car vous avez activé les mises à jour produit dans vos préférences.",
        manageLink: "Gérer les préférences",
        copyright: `© ${new Date().getFullYear()} GestionFlow. Tous droits réservés.`
      },
      en: {
        optInMessage: "You are receiving this email because you enabled product updates in your email preferences.",
        manageLink: "Manage email preferences",
        copyright: `© ${new Date().getFullYear()} GestionFlow. All rights reserved.`
      }
    };

    // Helper function to add delay between emails (Resend rate limit: 2 requests/second)
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Send emails to each opted-in user in their preferred language
    for (let i = 0; i < usersToEmail.length; i++) {
      const user = usersToEmail[i];
      
      // Add delay between emails to respect Resend rate limit (600ms = ~1.6 req/sec, safe margin)
      if (i > 0) {
        await delay(600);
      }
      
      try {
        // Determine which content to send based on user's language and available content
        let emailContent: EmailContent;
        let footerText: typeof footerTexts.en;
        let actualLanguage: string;

        if (user.language === 'fr' && fr) {
          emailContent = fr;
          footerText = footerTexts.fr;
          actualLanguage = 'fr';
        } else if (user.language === 'en' && en) {
          emailContent = en;
          footerText = footerTexts.en;
          actualLanguage = 'en';
        } else if (fr) {
          // Fallback to French if English not available
          emailContent = fr;
          footerText = footerTexts.fr;
          actualLanguage = 'fr';
        } else {
          // Fallback to English if French not available
          emailContent = en!;
          footerText = footerTexts.en;
          actualLanguage = 'en';
        }

        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
            <div style="background-color: #ffffff; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <h1 style="color: #111827; font-size: 24px; font-weight: 600; margin: 0 0 24px 0;">
                ${emailContent.title}
              </h1>
              
              <div style="color: #374151; font-size: 16px; line-height: 1.6;">
                ${emailContent.content}
              </div>
            </div>
            
            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="color: #6b7280; font-size: 12px; margin: 0 0 8px 0;">
                ${footerText.optInMessage}
              </p>
              <p style="margin: 0;">
                <a href="${managePreferencesUrl}" style="color: #2563eb; font-size: 12px; text-decoration: underline;">
                  ${footerText.manageLink}
                </a>
              </p>
            </div>
            
            <div style="margin-top: 16px; text-align: center;">
              <p style="color: #9ca3af; font-size: 11px; margin: 0;">
                ${footerText.copyright}
              </p>
            </div>
          </body>
          </html>
        `;

        const emailResult = await resend.emails.send({
          from: fromEmail,
          to: [user.email],
          replyTo: replyTo,
          subject: emailContent.subject,
          html: emailHtml,
        });

        // Log detailed response from Resend
        logStep("Resend API response", { 
          email: user.email, 
          result: emailResult,
          hasId: !!emailResult?.data?.id,
          error: emailResult?.error
        });

        // Log the successful send to database
        await supabase.from("product_update_logs").insert({
          batch_id: batchId,
          subject_fr: fr?.subject || null,
          subject_en: en?.subject || null,
          title_fr: fr?.title || null,
          title_en: en?.title || null,
          content_fr: fr?.content || null,
          content_en: en?.content || null,
          recipient_email: user.email,
          recipient_user_id: user.id,
          recipient_language: actualLanguage,
          status: "sent",
        });

        sentCount++;
        logStep("Email sent successfully", { userId: user.id, email: user.email, language: actualLanguage });
      } catch (emailError: any) {
        errorCount++;
        const errorMsg = emailError?.message || String(emailError);
        const statusCode = emailError?.statusCode || emailError?.status || 'unknown';
        
        // Check for rate limit (429)
        if (statusCode === 429 || errorMsg.includes('429') || errorMsg.toLowerCase().includes('rate limit')) {
          rateLimitCount++;
          logStep("⚠️ RATE LIMIT DETECTED (429)", { 
            email: user.email, 
            statusCode, 
            totalRateLimits: rateLimitCount 
          });
        }
        
        errors.push(`${user.email}: ${errorMsg}`);

        // Log the failed send to database
        await supabase.from("product_update_logs").insert({
          batch_id: batchId,
          subject_fr: fr?.subject || null,
          subject_en: en?.subject || null,
          title_fr: fr?.title || null,
          title_en: en?.title || null,
          content_fr: fr?.content || null,
          content_en: en?.content || null,
          recipient_email: user.email,
          recipient_user_id: user.id,
          recipient_language: user.language,
          status: "error",
          error_message: `[${statusCode}] ${errorMsg}`,
        });

        logStep("Error sending email", { 
          userId: user.id, 
          email: user.email, 
          statusCode, 
          error: errorMsg 
        });
      }
    }

    logStep("Batch complete", { batchId, sentCount, errorCount, rateLimitCount });
    
    if (rateLimitCount > 0) {
      logStep("⚠️ RATE LIMIT SUMMARY", { 
        totalRateLimits: rateLimitCount, 
        percentageRateLimited: ((rateLimitCount / usersToEmail.length) * 100).toFixed(1) + '%'
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Product update emails sent`,
        batchId,
        sentCount,
        errorCount,
        rateLimitCount,
        errors: errors.length > 0 ? errors : undefined
      }),
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
