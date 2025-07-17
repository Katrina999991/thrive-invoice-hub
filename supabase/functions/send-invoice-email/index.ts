import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.4';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendInvoiceEmailRequest {
  invoiceId: string;
  customSubject?: string;
  customMessage?: string;
  emailType?: "new" | "overdue" | "payment_confirmation";
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { invoiceId, customSubject, customMessage, emailType = "new" }: SendInvoiceEmailRequest = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch invoice with related data
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        clients (
          name,
          contact_person,
          email,
          address,
          phone,
          company_id,
          companies (
            name,
            invoice_email_subject,
            invoice_email_message,
            overdue_email_subject,
            overdue_email_message,
            payment_confirmation_email_subject,
            payment_confirmation_email_message
          )
        ),
        invoice_items (
          description,
          quantity,
          unit_price,
          total
        )
      `)
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      console.error('Error fetching invoice:', invoiceError);
      return new Response(
        JSON.stringify({ error: "Invoice not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const client = invoice.clients;
    const company = client?.companies;

    if (!client?.email) {
      return new Response(
        JSON.stringify({ error: "Client email not found" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!company) {
      return new Response(
        JSON.stringify({ error: "Company information not found" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Calculate days until due date and overdue days
    const dueDate = new Date(invoice.due_date);
    const today = new Date();
    const timeDiff = dueDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    const daysOverdue = Math.max(0, -daysDiff);

    // Prepare template variables
    const templateVars = {
      '{client_name}': client.name,
      '{invoice_number}': invoice.invoice_number,
      '{issue_date}': invoice.issue_date,
      '{due_date}': invoice.due_date || 'N/A',
      '{total}': invoice.total.toFixed(2),
      '{subtotal}': invoice.subtotal.toFixed(2),
      '{tax_amount}': invoice.tax_amount.toFixed(2),
      '{company_name}': company.name,
      '{days_until_due}': daysDiff.toString(),
      '{days_overdue}': daysOverdue.toString(),
      '{payment_date}': today.toLocaleDateString(),
    };

    // Use custom email content if provided, otherwise use company templates
    let emailSubject = customSubject;
    let emailMessage = customMessage;

    if (!emailSubject || !emailMessage) {
      // Fallback to company templates or defaults
      if (emailType === "overdue") {
        emailSubject = emailSubject || company.overdue_email_subject || 'Payment Overdue - Invoice {invoice_number}';
        emailMessage = emailMessage || company.overdue_email_message || `Dear {client_name},

This is a friendly reminder that your invoice {invoice_number} dated {issue_date} is now overdue.

Original amount: {total}
Due date: {due_date}
Days overdue: {days_overdue}

Please remit payment at your earliest convenience to avoid any late fees.

If you have already sent payment, please disregard this notice.

Thank you for your prompt attention to this matter.

Best regards,
{company_name}`;
      } else if (emailType === "payment_confirmation") {
        emailSubject = emailSubject || company.payment_confirmation_email_subject || 'Payment Confirmation - Invoice {invoice_number}';
        emailMessage = emailMessage || company.payment_confirmation_email_message || `Dear {client_name},

We have successfully received your payment for invoice {invoice_number}.

Payment details:
- Invoice: {invoice_number}
- Amount: {total}
- Date paid: {payment_date}

Thank you for your prompt payment and continued business!

Best regards,
{company_name}`;
      } else {
        emailSubject = emailSubject || company.invoice_email_subject || 'Invoice {invoice_number} from {company_name}';
        emailMessage = emailMessage || company.invoice_email_message || `Dear {client_name},

Please find attached your invoice {invoice_number} dated {issue_date}.

Amount due: {total}
Due date: {due_date}

Thank you for your business!

Best regards,
{company_name}`;
      }

      // Replace template variables in subject and message
      Object.entries(templateVars).forEach(([placeholder, value]) => {
        emailSubject = emailSubject.replace(new RegExp(placeholder, 'g'), value);
        emailMessage = emailMessage.replace(new RegExp(placeholder, 'g'), value);
      });
    }

    // Create HTML email content
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="color: #333; margin: 0;">${company.name}</h1>
          <h2 style="color: #666; margin: 5px 0 0 0;">Invoice ${invoice.invoice_number}</h2>
        </div>
        
        <div style="background-color: white; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px;">
          <div style="white-space: pre-line; line-height: 1.6; color: #333; margin-bottom: 30px;">
            ${emailMessage}
          </div>
          
          <div style="border-top: 2px solid #e9ecef; padding-top: 20px;">
            <h3 style="color: #333; margin-bottom: 15px;">Invoice Summary</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: #f8f9fa;">
                  <th style="padding: 10px; text-align: left; border: 1px solid #dee2e6;">Description</th>
                  <th style="padding: 10px; text-align: center; border: 1px solid #dee2e6;">Qty</th>
                  <th style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">Unit Price</th>
                  <th style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${invoice.invoice_items?.map((item: any) => `
                  <tr>
                    <td style="padding: 10px; border: 1px solid #dee2e6;">${item.description}</td>
                    <td style="padding: 10px; text-align: center; border: 1px solid #dee2e6;">${item.quantity}</td>
                    <td style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">$${item.unit_price.toFixed(2)}</td>
                    <td style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">$${item.total.toFixed(2)}</td>
                  </tr>
                `).join('') || ''}
                <tr style="background-color: #f8f9fa; font-weight: bold;">
                  <td colspan="3" style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">Subtotal:</td>
                  <td style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">$${invoice.subtotal.toFixed(2)}</td>
                </tr>
                <tr style="background-color: #f8f9fa;">
                  <td colspan="3" style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">Tax:</td>
                  <td style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">$${invoice.tax_amount.toFixed(2)}</td>
                </tr>
                <tr style="background-color: #e9ecef; font-weight: bold; font-size: 16px;">
                  <td colspan="3" style="padding: 15px; text-align: right; border: 1px solid #dee2e6;">Total Amount:</td>
                  <td style="padding: 15px; text-align: right; border: 1px solid #dee2e6;">$${invoice.total.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Send email
    const emailResponse = await resend.emails.send({
      from: "Invoice <onboarding@resend.dev>",
      to: [client.email],
      subject: emailSubject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    // Update invoice status only for new invoices (not for confirmations or reminders)
    if (emailType === "new") {
      const { error: updateError } = await supabase
        .from('invoices')
        .update({ status: 'sent' })
        .eq('id', invoiceId);

      if (updateError) {
        console.error('Error updating invoice status:', updateError);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      emailResponse,
      message: "Invoice email sent successfully" 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-invoice-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);