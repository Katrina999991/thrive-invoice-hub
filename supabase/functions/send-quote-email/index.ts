import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.4';
import { jsPDF } from "npm:jspdf@2.5.1";
import "npm:jspdf-autotable@3.8.2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Generate a secure random token
function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Email translations for quotes
const quoteEmailTranslations = {
  en: {
    subject: 'Quote {quote_number} from {company_name}',
    body: `Dear {client_name},

Please find attached your quote {quote_number} dated {issue_date}.

Total: {total}
Valid until: {expiry_date}

You can accept or refuse this quote directly by clicking the link below:
{response_link}

Thank you for considering our services!

Best regards,
{company_name}`,
    responseLink: 'Click here to respond to this quote'
  },
  fr: {
    subject: 'Devis {quote_number} de {company_name}',
    body: `Cher/Chère {client_name},

Veuillez trouver ci-joint votre devis {quote_number} daté du {issue_date}.

Total : {total}
Valide jusqu'au : {expiry_date}

Vous pouvez accepter ou refuser ce devis directement en cliquant sur le lien ci-dessous :
{response_link}

Merci de considérer nos services !

Cordialement,
{company_name}`,
    responseLink: 'Cliquez ici pour répondre à ce devis'
  }
};

// Validation schema
const SendQuoteEmailSchema = z.object({
  quoteId: z.string().uuid("Invalid quote ID format"),
  customSubject: z.string().max(200, "Subject too long").optional(),
  customMessage: z.string().max(2000, "Message too long").optional(),
  selectedEmails: z.array(z.string().email("Invalid email format")).max(10, "Too many recipients").optional(),
  ccEmails: z.array(z.string().email("Invalid email format")).max(10, "Too many CC recipients").optional().default([]),
  hideBranding: z.boolean().optional().default(false),
});

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const validationResult = SendQuoteEmailSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      console.error("Validation error:", validationResult.error.errors);
      return new Response(
        JSON.stringify({ error: "Invalid request data" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    const { quoteId, customSubject, customMessage, selectedEmails, ccEmails, hideBranding } = validationResult.data;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch quote with related data
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
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
            street_address,
            city,
            province_state,
            postal_code,
            tax_id,
            quote_email_subject_en,
            quote_email_subject_fr,
            quote_email_message_en,
            quote_email_message_fr
          )
        ),
        quote_items (
          description,
          quantity,
          unit_price,
          total,
          product_taxes,
          notes
        )
      `)
      .eq('id', quoteId)
      .single();

    if (quoteError || !quote) {
      console.error('Error fetching quote:', quoteError);
      return new Response(
        JSON.stringify({ error: "Quote not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const client = quote.clients;
    const company = client?.companies;

    let emailsToSend: string[] = [];
    if (selectedEmails && selectedEmails.length > 0) {
      emailsToSend = selectedEmails;
    } else if (client?.email) {
      emailsToSend = client.email.split(",").map((e: string) => e.trim()).filter((e: string) => e !== "");
    }

    if (emailsToSend.length === 0) {
      return new Response(
        JSON.stringify({ error: "No client email addresses found" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!company) {
      return new Response(
        JSON.stringify({ error: "Company information not found" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate and save access token if not already present
    let accessToken = quote.access_token;
    if (!accessToken) {
      accessToken = generateSecureToken();
      const { error: tokenError } = await supabase
        .from('quotes')
        .update({ access_token: accessToken })
        .eq('id', quoteId);
      
      if (tokenError) {
        console.error('Error saving access token:', tokenError);
      }
    }

    // Generate response link
    const baseUrl = 'https://gestionflow.lovable.app'; // Production URL
    const responseLink = `${baseUrl}/quote/${accessToken}`;
    const isFrench = client.language === 'french';
    const responseLinkText = isFrench ? quoteEmailTranslations.fr.responseLink : quoteEmailTranslations.en.responseLink;

    // Template variables
    const templateVars: Record<string, string> = {
      '{client_name}': client.name,
      '{quote_number}': quote.quote_number,
      '{issue_date}': quote.issue_date,
      '{expiry_date}': quote.expiry_date || 'N/A',
      '{total}': `$${quote.total.toFixed(2)}`,
      '{subtotal}': `$${quote.subtotal.toFixed(2)}`,
      '{tax_amount}': `$${quote.tax_amount.toFixed(2)}`,
      '{company_name}': company.name,
      '{response_link}': `<a href="${responseLink}" style="color: #2563eb; text-decoration: underline;">${responseLinkText}</a>`,
    };
    
    let emailSubject: string;
    let emailMessage: string;

    if (customSubject && customMessage) {
      emailSubject = customSubject;
      emailMessage = customMessage;
    } else {
      emailSubject = isFrench 
        ? (company.quote_email_subject_fr || quoteEmailTranslations.fr.subject)
        : (company.quote_email_subject_en || quoteEmailTranslations.en.subject);
      emailMessage = isFrench 
        ? (company.quote_email_message_fr || quoteEmailTranslations.fr.body)
        : (company.quote_email_message_en || quoteEmailTranslations.en.body);
    }

    // Replace template variables
    Object.entries(templateVars).forEach(([placeholder, value]) => {
      emailSubject = emailSubject.replace(new RegExp(placeholder, 'g'), value);
      emailMessage = emailMessage.replace(new RegExp(placeholder, 'g'), value);
    });

    emailMessage = emailMessage.replace(/\n/g, '<br>');

    // Translations for PDF
    const translations = isFrench ? {
      quote: 'DEVIS',
      billTo: 'Client :',
      quoteNumber: 'Numéro de devis',
      issueDate: 'Date d\'émission',
      expiryDate: 'Date d\'expiration',
      description: 'Description',
      qty: 'Qté',
      unitPrice: 'Prix unitaire',
      total: 'Total',
      subtotal: 'Sous-total',
      tax: 'Taxe',
      terms: 'Conditions',
      notes: 'Notes',
      thankYou: 'Merci de votre confiance !'
    } : {
      quote: 'QUOTE',
      billTo: 'Bill To:',
      quoteNumber: 'Quote Number',
      issueDate: 'Issue Date',
      expiryDate: 'Expiry Date',
      description: 'Description',
      qty: 'Qty',
      unitPrice: 'Unit Price',
      total: 'Total',
      subtotal: 'Subtotal',
      tax: 'Tax',
      terms: 'Terms',
      notes: 'Notes',
      thankYou: 'Thank you for considering our services!'
    };

    // Generate PDF
    const doc = new jsPDF();
    doc.setFont('helvetica');
    
    // Header
    doc.setFontSize(24);
    doc.setTextColor(40, 40, 40);
    doc.text(translations.quote, 20, 25);

    // Company info
    if (company) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(37, 99, 235);
      doc.text(company.name, 20, 40);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      let yPos = 47;
      if (company.street_address) { doc.text(company.street_address, 20, yPos); yPos += 5; }
      if (company.city) { doc.text(`${company.city}, ${company.province_state || ''} ${company.postal_code || ''}`, 20, yPos); yPos += 5; }
      if (company.tax_id) { doc.text(company.tax_id, 20, yPos); }
    }

    // Quote info (right side)
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    doc.text(`${translations.quoteNumber}: ${quote.quote_number}`, 140, 40);
    doc.text(`${translations.issueDate}: ${quote.issue_date}`, 140, 47);
    if (quote.expiry_date) {
      doc.text(`${translations.expiryDate}: ${quote.expiry_date}`, 140, 54);
    }

    // Client info
    if (client) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(translations.billTo, 20, 75);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(client.name, 20, 82);
      if (client.address) doc.text(client.address, 20, 89);
    }

    // Items table
    const tableHeaders = [translations.description, translations.qty, translations.unitPrice, translations.total];
    const tableData = (quote.quote_items || []).map((item: any) => [
      item.description,
      item.quantity.toString(),
      `$${item.unit_price.toFixed(2)}`,
      `$${item.total.toFixed(2)}`
    ]);

    tableData.push(['', '', `${translations.subtotal}:`, `$${quote.subtotal.toFixed(2)}`]);
    if (quote.tax_amount > 0) {
      tableData.push(['', '', `${translations.tax}:`, `$${quote.tax_amount.toFixed(2)}`]);
    }
    tableData.push(['', '', `${translations.total}:`, `$${quote.total.toFixed(2)}`]);

    (doc as any).autoTable({
      head: [tableHeaders],
      body: tableData,
      startY: 100,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: undefined, textColor: [40, 40, 40], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { halign: 'center' },
        2: { halign: 'right' },
        3: { halign: 'right', fontStyle: 'bold' }
      }
    });

    // Notes and terms
    let finalY = (doc as any).lastAutoTable?.finalY || 150;
    if (quote.terms) {
      finalY += 10;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(translations.terms, 20, finalY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(quote.terms, 20, finalY + 6, { maxWidth: 170 });
      finalY += 20;
    }
    
    if (quote.notes) {
      finalY += 5;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(translations.notes, 20, finalY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(quote.notes, 20, finalY + 6, { maxWidth: 170 });
    }

    // Footer branding
    if (!hideBranding) {
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(isFrench ? 'Généré avec GestionFlow' : 'Generated with GestionFlow', 105, 285, { align: 'center' });
    }

    // Convert PDF to base64
    const pdfOutput = doc.output('arraybuffer');
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfOutput)));

    // Send email with Resend
    const fromEmail = Deno.env.get("RESEND_FROM") || "GestionFlow <onboarding@resend.dev>";
    
    const emailPayload: any = {
      from: fromEmail,
      to: emailsToSend,
      subject: emailSubject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="padding: 20px;">
            ${emailMessage}
          </div>
        </div>
      `,
      attachments: [{
        filename: `${quote.quote_number}.pdf`,
        content: pdfBase64,
        content_type: 'application/pdf'
      }]
    };

    if (ccEmails && ccEmails.length > 0) {
      emailPayload.cc = ccEmails;
    }

    console.log('Sending quote email to:', emailsToSend);
    const emailResponse = await resend.emails.send(emailPayload);
    console.log('Email sent successfully:', emailResponse);

    // Update quote status to 'sent' if it was draft
    if (quote.status === 'draft') {
      await supabase.from('quotes').update({ status: 'sent' }).eq('id', quoteId);
    }

    return new Response(
      JSON.stringify({ success: true, messageId: emailResponse.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error sending quote email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
