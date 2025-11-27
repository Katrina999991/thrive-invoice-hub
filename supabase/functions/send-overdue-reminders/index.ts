import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Optional: filter by user_id for testing
    const { user_id } = await req.json().catch(() => ({}));
    
    console.log("Starting overdue reminders check...", user_id ? `for user ${user_id}` : "for all users");

    // Get current date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all invoices that are:
    // 1. Due date is in the past (overdue)
    // 2. Status is 'sent' or 'overdue' (not draft or paid)
    // 3. No reminder email has been sent yet (overdue_reminder_sent_at IS NULL)
    // 4. Optionally filtered by user_id for testing
    let query = supabase
      .from("invoices")
      .select(`
        *,
        clients!invoices_client_id_fkey (
          id,
          name,
          email,
          language,
          send_overdue_email_auto,
          companies (
            id,
            name,
            email,
            overdue_email_subject,
            overdue_email_subject_en,
            overdue_email_subject_fr,
            overdue_email_message,
            overdue_email_message_en,
            overdue_email_message_fr
          )
        )
      `)
      .in("status", ["sent", "overdue"])
      .lt("due_date", today.toISOString().split('T')[0])
      .is("overdue_reminder_sent_at", null);
    
    // Filter by user_id if provided (for testing)
    if (user_id) {
      query = query.eq("user_id", user_id);
    }
    
    const { data: overdueInvoices, error: invoicesError } = await query;

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
      const client = invoice.clients;
      
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

      // Replace placeholders
      emailSubject = emailSubject
        .replace(/{invoice_number}/g, invoice.invoice_number)
        .replace(/{company_name}/g, company.name)
        .replace(/{client_name}/g, client.name)
        .replace(/{issue_date}/g, new Date(invoice.issue_date).toLocaleDateString())
        .replace(/{due_date}/g, new Date(invoice.due_date).toLocaleDateString())
        .replace(/{total}/g, invoice.total.toFixed(2))
        .replace(/{days_overdue}/g, daysOverdue.toString());

      emailMessage = emailMessage
        .replace(/{invoice_number}/g, invoice.invoice_number)
        .replace(/{company_name}/g, company.name)
        .replace(/{client_name}/g, client.name)
        .replace(/{issue_date}/g, new Date(invoice.issue_date).toLocaleDateString())
        .replace(/{due_date}/g, new Date(invoice.due_date).toLocaleDateString())
        .replace(/{total}/g, invoice.total.toFixed(2))
        .replace(/{days_overdue}/g, daysOverdue.toString());

      // Split emails if multiple
      const clientEmails = client.email.split(",").map((e: string) => e.trim());

      try {
        // Send email via Resend
        const { data: emailData, error: emailError } = await resend.emails.send({
          from: resendFrom,
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
            reminder_type: user_id ? "manual" : "automatic",
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
          reminder_type: user_id ? "manual" : "automatic",
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
