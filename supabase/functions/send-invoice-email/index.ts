import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.4';
import { jsPDF } from "npm:jspdf@2.5.1";
import "npm:jspdf-autotable@3.8.2";

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
          language,
          company_id,
          companies (
            name,
            logo_url,
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

    // Define French translations
    const frenchTemplates = {
      overdue: {
        subject: 'Paiement en retard - Facture {invoice_number}',
        message: `Cher/Chère {client_name},

Ceci est un rappel amical que votre facture {invoice_number} datée du {issue_date} est maintenant en retard.

Montant original : {total}$
Date d'échéance : {due_date}
Jours de retard : {days_overdue}

Veuillez effectuer le paiement à votre plus tôt possible pour éviter des frais de retard.

Si vous avez déjà envoyé le paiement, veuillez ignorer cet avis.

Merci pour votre attention prompte à cette question.

Meilleures salutations,
{company_name}`
      },
      payment_confirmation: {
        subject: 'Confirmation de paiement - Facture {invoice_number}',
        message: `Cher/Chère {client_name},

Nous avons reçu avec succès votre paiement pour la facture {invoice_number}.

Détails du paiement :
- Facture : {invoice_number}
- Montant : {total}$
- Date de paiement : {payment_date}

Merci pour votre paiement rapide et votre fidélité !

Meilleures salutations,
{company_name}`
      },
      new: {
        subject: 'Facture {invoice_number} de {company_name}',
        message: `Cher/Chère {client_name},

Veuillez trouver ci-jointe votre facture {invoice_number} datée du {issue_date}.

Montant dû : {total}$
Date d'échéance : {due_date}

Merci pour votre confiance !

Meilleures salutations,
{company_name}`
      }
    };

    // Determine if we should use French templates
    const clientLanguage = client.language || 'english';

    // Use custom email content if provided, otherwise use company templates
    let emailSubject = customSubject;
    let emailMessage = customMessage;

    if (!emailSubject || !emailMessage) {
      // Fallback to company templates or defaults based on client language
      if (emailType === "overdue") {
        if (clientLanguage === 'french') {
          emailSubject = emailSubject || frenchTemplates.overdue.subject;
          emailMessage = emailMessage || frenchTemplates.overdue.message;
        } else {
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
        }
      } else if (emailType === "payment_confirmation") {
        if (clientLanguage === 'french') {
          emailSubject = emailSubject || frenchTemplates.payment_confirmation.subject;
          emailMessage = emailMessage || frenchTemplates.payment_confirmation.message;
        } else {
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
        }
      } else {
        if (clientLanguage === 'french') {
          emailSubject = emailSubject || frenchTemplates.new.subject;
          emailMessage = emailMessage || frenchTemplates.new.message;
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
      }

      // Replace template variables in subject and message
      Object.entries(templateVars).forEach(([placeholder, value]) => {
        emailSubject = emailSubject.replace(new RegExp(placeholder, 'g'), value);
        emailMessage = emailMessage.replace(new RegExp(placeholder, 'g'), value);
      });
    }

    // Define table headers based on language
    const tableHeaders = clientLanguage === 'french' ? {
      invoiceSummary: 'Résumé de la facture',
      description: 'Description',
      qty: 'Qté',
      unitPrice: 'Prix unitaire',
      total: 'Total',
      subtotal: 'Sous-total',
      tax: 'Taxe',
      totalAmount: 'Montant total'
    } : {
      invoiceSummary: 'Invoice Summary',
      description: 'Description',
      qty: 'Qty',
      unitPrice: 'Unit Price',
      total: 'Total',
      subtotal: 'Subtotal',
      tax: 'Tax',
      totalAmount: 'Total Amount'
    };

    // Generate PDF
    const doc = new jsPDF();
    doc.setFont('helvetica');
    
    // Load and add logo if available
    let logoLoaded = false;
    if (company.logo_url) {
      try {
        console.log('Attempting to load logo from:', company.logo_url);
        
        // Fetch the logo image with explicit headers
        const logoResponse = await fetch(company.logo_url, {
          headers: {
            'Accept': 'image/*',
            'User-Agent': 'Mozilla/5.0 (compatible; PDF-Generator/1.0)'
          }
        });
        console.log('Logo fetch response status:', logoResponse.status);
        
        if (logoResponse.ok) {
          const logoBuffer = await logoResponse.arrayBuffer();
          console.log('Logo buffer size:', logoBuffer.byteLength);
          
          // Convert to base64
          const uint8Array = new Uint8Array(logoBuffer);
          let binary = '';
          for (let i = 0; i < uint8Array.byteLength; i++) {
            binary += String.fromCharCode(uint8Array[i]);
          }
          const logoBase64 = btoa(binary);
          
          // Detect image format from URL
          let imageFormat = 'JPEG'; // default
          const url = company.logo_url.toLowerCase();
          if (url.includes('.png')) {
            imageFormat = 'PNG';
          } else if (url.includes('.jpg') || url.includes('.jpeg')) {
            imageFormat = 'JPEG';
          }
          
          console.log('Using image format:', imageFormat, 'Base64 length:', logoBase64.length);
          
          // Try to add the image with error handling
          try {
            doc.addImage(logoBase64, imageFormat, 20, 15, 40, 30);
            logoLoaded = true;
            console.log('Logo successfully added to PDF');
          } catch (imageError) {
            console.error('Error adding image to PDF:', imageError);
            // Try with different format
            try {
              const altFormat = imageFormat === 'PNG' ? 'JPEG' : 'PNG';
              console.log('Trying alternative format:', altFormat);
              doc.addImage(logoBase64, altFormat, 20, 15, 40, 30);
              logoLoaded = true;
              console.log('Logo added with alternative format:', altFormat);
            } catch (altError) {
              console.error('Failed with alternative format too:', altError);
            }
          }
        } else {
          console.error('Failed to fetch logo, status:', logoResponse.status, 'statusText:', logoResponse.statusText);
        }
      } catch (error) {
        console.error('Error loading logo:', error);
        // Continue without logo
      }
    } else {
      console.log('No logo URL provided for company:', company.name);
    }
    
    // Header - adjust position based on whether logo was added
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    if (logoLoaded) {
      doc.text(company.name, 70, 25);
    } else {
      doc.text(company.name, 20, 30);
    }
    
    // Invoice title - adjust position based on whether logo was added
    doc.setFontSize(16);
    if (logoLoaded) {
      doc.text(`${clientLanguage === 'french' ? 'Facture' : 'Invoice'} ${invoice.invoice_number}`, 70, 40);
    } else {
      doc.text(`${clientLanguage === 'french' ? 'Facture' : 'Invoice'} ${invoice.invoice_number}`, 20, 45);
    }
    
    // Company and client info - adjust position based on layout
    doc.setFontSize(10);
    const infoStartY = logoLoaded ? 55 : 60;
    doc.text(`${clientLanguage === 'french' ? 'Date d\'émission' : 'Issue Date'}: ${invoice.issue_date}`, 20, infoStartY);
    doc.text(`${clientLanguage === 'french' ? 'Date d\'échéance' : 'Due Date'}: ${invoice.due_date}`, 20, infoStartY + 10);
    
    // Client info
    const clientInfoStartY = infoStartY + 25;
    doc.text(`${clientLanguage === 'french' ? 'Facturé à' : 'Bill To'}:`, 20, clientInfoStartY);
    doc.text(client.name, 20, clientInfoStartY + 10);
    if (client.contact_person) {
      doc.text(client.contact_person, 20, clientInfoStartY + 20);
    }
    
    // Invoice items table
    const tableData = invoice.invoice_items?.map((item: any) => [
      item.description,
      item.quantity.toString(),
      `$${item.unit_price.toFixed(2)}`,
      `$${item.total.toFixed(2)}`
    ]) || [];
    
    (doc as any).autoTable({
      head: [[
        tableHeaders.description,
        tableHeaders.qty,
        tableHeaders.unitPrice,
        tableHeaders.total
      ]],
      body: tableData,
      startY: clientInfoStartY + 35,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [248, 249, 250] },
    });
    
    // Totals
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.text(`${tableHeaders.subtotal}: $${invoice.subtotal.toFixed(2)}`, 120, finalY);
    doc.text(`${tableHeaders.tax}: $${invoice.tax_amount.toFixed(2)}`, 120, finalY + 10);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`${tableHeaders.totalAmount}: $${invoice.total.toFixed(2)}`, 120, finalY + 20);
    
    // Generate PDF as buffer
    const pdfBuffer = doc.output('arraybuffer');
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));

    // Create HTML email content
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="color: #333; margin: 0;">${company.name}</h1>
          <h2 style="color: #666; margin: 5px 0 0 0;">${clientLanguage === 'french' ? 'Facture' : 'Invoice'} ${invoice.invoice_number}</h2>
        </div>
        
        <div style="background-color: white; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px;">
          <div style="white-space: pre-line; line-height: 1.6; color: #333; margin-bottom: 30px;">
            ${emailMessage}
          </div>
          
          <div style="border-top: 2px solid #e9ecef; padding-top: 20px;">
            <h3 style="color: #333; margin-bottom: 15px;">${tableHeaders.invoiceSummary}</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: #f8f9fa;">
                  <th style="padding: 10px; text-align: left; border: 1px solid #dee2e6;">${tableHeaders.description}</th>
                  <th style="padding: 10px; text-align: center; border: 1px solid #dee2e6;">${tableHeaders.qty}</th>
                  <th style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">${tableHeaders.unitPrice}</th>
                  <th style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">${tableHeaders.total}</th>
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
                  <td colspan="3" style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">${tableHeaders.subtotal}:</td>
                  <td style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">$${invoice.subtotal.toFixed(2)}</td>
                </tr>
                <tr style="background-color: #f8f9fa;">
                  <td colspan="3" style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">${tableHeaders.tax}:</td>
                  <td style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">$${invoice.tax_amount.toFixed(2)}</td>
                </tr>
                <tr style="background-color: #e9ecef; font-weight: bold; font-size: 16px;">
                  <td colspan="3" style="padding: 15px; text-align: right; border: 1px solid #dee2e6;">${tableHeaders.totalAmount}:</td>
                  <td style="padding: 15px; text-align: right; border: 1px solid #dee2e6;">$${invoice.total.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Send email with PDF attachment
    const emailResponse = await resend.emails.send({
      from: `${company.name} <info@gestionflow.net>`,
      to: [client.email],
      subject: emailSubject,
      html: htmlContent,
      attachments: [
        {
          filename: `invoice-${invoice.invoice_number}.pdf`,
          content: pdfBase64,
          type: 'application/pdf',
        },
      ],
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
