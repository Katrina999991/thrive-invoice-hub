import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "npm:resend@4.0.0";
import { encode as encodeBase64, decode as decodeBase64 } from "https://deno.land/std@0.190.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ========== DECRYPTION FUNCTIONS ==========
async function deriveKey(keyString: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(keyString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', keyData);
  
  return await crypto.subtle.importKey(
    'raw',
    hashBuffer,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
}

async function decryptData(ciphertext: string, keyString: string): Promise<string> {
  if (!ciphertext) return ciphertext;
  
  if (ciphertext.startsWith("AESENC:")) {
    try {
      const key = await deriveKey(keyString);
      const base64Data = ciphertext.slice(7);
      const combined = decodeBase64(base64Data);
      
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);
      
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted
      );
      
      return new TextDecoder().decode(decrypted);
    } catch (error) {
      console.error("Decryption error:", error);
      return ciphertext;
    }
  }
  
  if (ciphertext.startsWith("ENC:")) {
    try {
      const base64Data = ciphertext.slice(4);
      const encrypted = decodeBase64(base64Data);
      const keyBytes = new TextEncoder().encode(keyString);
      
      const decrypted = new Uint8Array(encrypted.length);
      for (let i = 0; i < encrypted.length; i++) {
        decrypted[i] = encrypted[i] ^ keyBytes[i % keyBytes.length];
      }
      
      return new TextDecoder().decode(decrypted);
    } catch (error) {
      console.error("Legacy decryption error:", error);
      return ciphertext;
    }
  }
  
  return ciphertext;
}

async function decryptClientData(client: any): Promise<any> {
  const encryptionKey = Deno.env.get("ENCRYPTION_KEY");
  if (!encryptionKey || !client) return client;
  
  const decryptedClient = { ...client };
  
  if (client.email && (client.email.startsWith("AESENC:") || client.email.startsWith("ENC:"))) {
    decryptedClient.email = await decryptData(client.email, encryptionKey);
  }
  if (client.phone && (client.phone.startsWith("AESENC:") || client.phone.startsWith("ENC:"))) {
    decryptedClient.phone = await decryptData(client.phone, encryptionKey);
  }
  
  return decryptedClient;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;
    const resendFrom = Deno.env.get("RESEND_FROM") || "GestionFlow <onboarding@resend.dev>";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);
    
    console.log("Starting overdue reminders check for all users...");

    // Get current date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all invoices that are:
    // 1. Due date is in the past (overdue)
    // 2. Status is 'sent' or 'overdue' (not draft or paid)
    // 3. No reminder email has been sent yet (overdue_reminder_sent_at IS NULL)
    const { data: overdueInvoices, error: invoicesError } = await supabase
      .from("invoices")
      .select(`
        *,
        clients!invoices_client_id_fkey (
          id,
          name,
          email,
          contact_person,
          contact_title,
          language,
          send_overdue_email_auto,
          include_payment_link,
          companies (
            id,
            name,
            email,
            overdue_email_subject,
            overdue_email_subject_en,
            overdue_email_subject_fr,
            overdue_email_message,
            overdue_email_message_en,
            overdue_email_message_fr,
            user_id
          )
        )
      `)
      .in("status", ["sent", "overdue"])
      .lt("due_date", today.toISOString().split('T')[0])
      .is("overdue_reminder_sent_at", null);

    if (invoicesError) {
      console.error("Error fetching overdue invoices:", invoicesError);
      throw invoicesError;
    }

      console.log(`Found ${overdueInvoices?.length || 0} overdue invoices to process`);

    let emailsSent = 0;
    let emailsSkipped = 0;
    const reminderLogs: Array<{
      invoice_id: string;
      user_id: string;
      client_id: string | null;
      reminder_type: string;
      status: string;
      error_message: string | null;
    }> = [];

    for (const invoice of overdueInvoices || []) {
      // Decrypt client data (email, phone may be encrypted)
      const client = await decryptClientData(invoice.clients);
      
      // Skip if client has no email
      if (!client?.email) {
        console.log(`Skipping invoice ${invoice.invoice_number}: client ${client?.name} has no email`);
        emailsSkipped++;
        continue;
      }

      // Skip if client has not opted in to automatic overdue emails
      if (!client.send_overdue_email_auto) {
        console.log(`Skipping invoice ${invoice.invoice_number}: client ${client.name} has not enabled automatic overdue emails`);
        emailsSkipped++;
        continue;
      }

      const company = client.companies;
      if (!company) {
        console.log(`Skipping invoice ${invoice.invoice_number}: no company found`);
        emailsSkipped++;
        continue;
      }

      // Add delay to avoid rate limiting (500ms between emails)
      if (emailsSent > 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Determine language
      const clientLanguage = client.language || "english";
      const isEnglish = clientLanguage === "english";
      const isFrench = clientLanguage === "french";

      // Get email templates based on language
      let emailSubject = company.overdue_email_subject || "Payment Overdue - Invoice {invoice_number}";
      let emailMessage = company.overdue_email_message || `Dear {client_name},

This is a friendly reminder that your invoice {invoice_number} dated {issue_date} is now overdue.

Original amount: ${invoice.total}
Due date: {due_date}
Days overdue: {days_overdue}

Please remit payment at your earliest convenience to avoid any late fees.

If you have already sent payment, please disregard this notice.

Thank you for your prompt attention to this matter.

Best regards,
{company_name}`;

      if (isFrench && company.overdue_email_subject_fr) {
        emailSubject = company.overdue_email_subject_fr;
      } else if (isEnglish && company.overdue_email_subject_en) {
        emailSubject = company.overdue_email_subject_en;
      }

      if (isFrench && company.overdue_email_message_fr) {
        emailMessage = company.overdue_email_message_fr;
      } else if (isEnglish && company.overdue_email_message_en) {
        emailMessage = company.overdue_email_message_en;
      }

      // Calculate days overdue
      const dueDate = new Date(invoice.due_date);
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      // Format client display name with title
      const clientDisplayName = client.contact_title && client.contact_person
        ? `${client.contact_title} ${client.contact_person}`
        : (client.contact_person || client.name);

      // Replace placeholders
      emailSubject = emailSubject
        .replace(/{invoice_number}/g, invoice.invoice_number)
        .replace(/{company_name}/g, company.name)
        .replace(/{client_name}/g, clientDisplayName)
        .replace(/{issue_date}/g, new Date(invoice.issue_date).toLocaleDateString())
        .replace(/{due_date}/g, new Date(invoice.due_date).toLocaleDateString())
        .replace(/{total}/g, invoice.total.toFixed(2))
        .replace(/{days_overdue}/g, daysOverdue.toString());

      emailMessage = emailMessage
        .replace(/{invoice_number}/g, invoice.invoice_number)
        .replace(/{company_name}/g, company.name)
        .replace(/{client_name}/g, clientDisplayName)
        .replace(/{issue_date}/g, new Date(invoice.issue_date).toLocaleDateString())
        .replace(/{due_date}/g, new Date(invoice.due_date).toLocaleDateString())
        .replace(/{total}/g, invoice.total.toFixed(2))
        .replace(/{days_overdue}/g, daysOverdue.toString());

      // Add payment link - create automatically if client has option enabled and no link exists
      let paymentLink = invoice.payment_link;
      
      if (!paymentLink && client.include_payment_link === true) {
        try {
          console.log(`Creating payment link for overdue invoice ${invoice.invoice_number}`);
          
          const paymentLinkResponse = await fetch(
            `${supabaseUrl}/functions/v1/create-invoice-payment-link`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({ invoiceId: invoice.id }),
            }
          );
          
          if (paymentLinkResponse.ok) {
            const paymentLinkData = await paymentLinkResponse.json();
            if (paymentLinkData?.url) {
              paymentLink = paymentLinkData.url;
              console.log(`Payment link created successfully: ${paymentLink}`);
            }
          } else {
            const errorText = await paymentLinkResponse.text();
            console.error(`Error creating payment link: ${errorText}`);
          }
        } catch (error) {
          console.error(`Exception creating payment link for invoice ${invoice.invoice_number}:`, error);
        }
      }
      
      if (paymentLink) {
        const paymentLinkText = isFrench 
          ? `<br><br><div style="margin: 20px 0;"><strong>Payer en ligne :</strong><br><a href="${paymentLink}" style="display: inline-block; margin-top: 10px; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Payer maintenant</a></div>`
          : `<br><br><div style="margin: 20px 0;"><strong>Pay online:</strong><br><a href="${paymentLink}" style="display: inline-block; margin-top: 10px; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Pay Now</a></div>`;
        emailMessage += paymentLinkText;
      }

      // Split emails if multiple
      const clientEmails = client.email.split(",").map((e: string) => e.trim());

      try {
        // Get company email for Reply-To
        const companyEmail = company.email;
        const replyToEmail = companyEmail || undefined;
        
        // Check if company email domain is verified in Resend
        let fromAddress: string;
        const defaultDomain = resendFrom.match(/<(.+)>/)?.[1] || 'noreply@gestionflow.net';
        
        if (companyEmail) {
          const companyDomain = companyEmail.split('@')[1];
          
          try {
            // Check verified domains in Resend
            const domainsResponse = await fetch('https://api.resend.com/domains', {
              headers: {
                'Authorization': `Bearer ${resendApiKey}`,
              },
            });
            
            if (domainsResponse.ok) {
              const domainsData = await domainsResponse.json();
              const verifiedDomains = domainsData.data?.filter((d: any) => d.status === 'verified').map((d: any) => d.name) || [];
              
              if (verifiedDomains.includes(companyDomain)) {
                // Company domain is verified - use company email directly
                fromAddress = `${company.name} <${companyEmail}>`;
                console.log(`Using verified company email as sender for invoice ${invoice.invoice_number}`);
              } else {
                // Domain not verified - use app domain with company name
                fromAddress = `${company.name} via GestionFlow <${defaultDomain}>`;
              }
            } else {
              fromAddress = `${company.name} via GestionFlow <${defaultDomain}>`;
            }
          } catch (error) {
            console.error('Error checking Resend domains:', error);
            fromAddress = `${company.name} via GestionFlow <${defaultDomain}>`;
          }
        } else {
          fromAddress = `${company.name} via GestionFlow <${defaultDomain}>`;
        }

        // Send email via Resend
        const { data: emailData, error: emailError } = await resend.emails.send({
          from: fromAddress,
          replyTo: replyToEmail,
          to: clientEmails,
          subject: emailSubject,
          html: emailMessage.replace(/\n/g, "<br>"),
        });

        if (emailError) {
          console.error(`Error sending email for invoice ${invoice.invoice_number}:`, emailError);
          continue;
        }

        console.log(`Email sent successfully for invoice ${invoice.invoice_number}`, emailData);

        // Mark email as sent
        const { error: updateError } = await supabase
          .from("invoices")
          .update({ overdue_reminder_sent_at: new Date().toISOString() })
          .eq("id", invoice.id);

        if (updateError) {
          console.error(`Error updating invoice ${invoice.invoice_number}:`, updateError);
        } else {
          emailsSent++;
          // Log successful reminder
          reminderLogs.push({
            invoice_id: invoice.id,
            user_id: invoice.user_id,
            client_id: client.id,
            reminder_type: "automatic",
            status: "sent",
            error_message: null,
          });
        }
      } catch (error) {
        console.error(`Exception sending email for invoice ${invoice.invoice_number}:`, error);
        // Log failed reminder
        reminderLogs.push({
          invoice_id: invoice.id,
          user_id: invoice.user_id,
          client_id: client?.id || null,
          reminder_type: "automatic",
          status: "failed",
          error_message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Insert all reminder logs
    if (reminderLogs.length > 0) {
      const { error: logsError } = await supabase
        .from("invoice_reminder_logs")
        .insert(reminderLogs);

      if (logsError) {
        console.error("Error inserting reminder logs:", logsError);
      }
    }

    console.log(`Overdue reminders check completed: ${emailsSent} sent, ${emailsSkipped} skipped`);

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent,
        emailsSkipped,
        totalProcessed: (overdueInvoices?.length || 0),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in send-overdue-reminders function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
