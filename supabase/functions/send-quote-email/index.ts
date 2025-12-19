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

// Colors for PDF
const COLORS = {
  primary: [37, 99, 235] as [number, number, number],
  dark: [31, 41, 55] as [number, number, number],
  gray: [107, 114, 128] as [number, number, number],
  lightGray: [156, 163, 175] as [number, number, number],
  tableHeader: [249, 250, 251] as [number, number, number],
  tableAlt: [249, 250, 251] as [number, number, number],
  border: [229, 231, 235] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  totalBg: [239, 246, 255] as [number, number, number],
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

// PDF translations
const pdfTranslations = {
  fr: {
    quote: 'DEVIS',
    preparedFor: 'Préparé pour',
    quoteNumber: 'N° Devis',
    issueDate: 'Date',
    expiryDate: 'Expire le',
    item: 'Article / Description',
    quantity: 'Quantité',
    unitPrice: 'Prix unitaire',
    total: 'Total',
    subtotal: 'Sous-total',
    tax: 'Taxes',
    totalAmount: 'Total',
    terms: 'Conditions',
    notes: 'Notes',
    thankYou: 'Merci pour votre confiance !',
    branding: 'Créé avec GestionFlow',
  },
  en: {
    quote: 'QUOTE',
    preparedFor: 'Prepared for',
    quoteNumber: 'Quote #',
    issueDate: 'Date',
    expiryDate: 'Expires',
    item: 'Item / Description',
    quantity: 'Quantity',
    unitPrice: 'Unit Price',
    total: 'Total',
    subtotal: 'Subtotal',
    tax: 'Taxes',
    totalAmount: 'Total',
    terms: 'Terms',
    notes: 'Notes',
    thankYou: 'Thank you for your business!',
    branding: 'Created with GestionFlow',
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

    // Get authorization header to identify the user
    const authHeader = req.headers.get('Authorization');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user info for Reply-To and display name
    let userEmail: string | null = null;
    let userName: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (!userError && user) {
        userEmail = user.email || null;
        
        // Try to get display name from profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, username')
          .eq('user_id', user.id)
          .single();
        
        userName = profile?.display_name || profile?.username || null;
      }
    }

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
            email,
            phone,
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

    // Generate response link - use production domain
    const baseUrl = 'https://gestionflow.net';
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

    // Get translations for PDF
    const t = isFrench ? pdfTranslations.fr : pdfTranslations.en;
    const primaryColor = COLORS.primary;

    // Generate modern PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPos = 20;

    // ========== HEADER SECTION ==========
    
    // Company info (top-left)
    if (company) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...primaryColor);
      doc.text(company.name, margin, yPos + 5);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.gray);
      let companyY = yPos + 12;
      
      if (company.street_address) {
        doc.text(company.street_address, margin, companyY);
        companyY += 4;
      }
      if (company.city || company.province_state || company.postal_code) {
        const cityLine = [company.city, company.province_state, company.postal_code].filter(Boolean).join(', ');
        doc.text(cityLine, margin, companyY);
        companyY += 4;
      }
      if (company.email) {
        doc.text(company.email, margin, companyY);
        companyY += 4;
      }
      if (company.phone) {
        doc.text(company.phone, margin, companyY);
        companyY += 4;
      }
      if (company.tax_id) {
        doc.text(company.tax_id, margin, companyY);
      }
    }

    // Document title "QUOTE" (right side)
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(t.quote, pageWidth - margin, yPos + 8, { align: 'right' });

    // Quote details (right side, below title)
    let detailsY = yPos + 18;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.dark);
    
    // Quote number
    doc.setFont('helvetica', 'bold');
    doc.text(`${t.quoteNumber}:`, pageWidth - margin - 45, detailsY);
    doc.setFont('helvetica', 'normal');
    doc.text(quote.quote_number, pageWidth - margin, detailsY, { align: 'right' });
    detailsY += 6;
    
    // Issue date
    doc.setFont('helvetica', 'bold');
    doc.text(`${t.issueDate}:`, pageWidth - margin - 45, detailsY);
    doc.setFont('helvetica', 'normal');
    doc.text(quote.issue_date, pageWidth - margin, detailsY, { align: 'right' });
    detailsY += 6;
    
    // Expiry date (highlighted)
    if (quote.expiry_date) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...primaryColor);
      doc.text(`${t.expiryDate}:`, pageWidth - margin - 45, detailsY);
      doc.setFont('helvetica', 'normal');
      doc.text(quote.expiry_date, pageWidth - margin, detailsY, { align: 'right' });
      doc.setTextColor(...COLORS.dark);
    }

    yPos = Math.max(yPos + 40, detailsY) + 15;

    // ========== CLIENT SECTION ==========
    
    // Draw a subtle box for client info
    const clientBoxHeight = client?.address ? 40 : 32;
    doc.setFillColor(...COLORS.tableHeader);
    doc.setDrawColor(...COLORS.border);
    doc.roundedRect(margin, yPos, (pageWidth - margin * 2) / 2 - 5, clientBoxHeight, 3, 3, 'FD');
    
    yPos += 8;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.gray);
    doc.text(t.preparedFor.toUpperCase(), margin + 8, yPos);
    
    yPos += 7;
    if (client) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.dark);
      doc.text(client.name, margin + 8, yPos);
      yPos += 6;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.gray);
      
      if (client.contact_person && client.contact_person !== client.name) {
        doc.text(client.contact_person, margin + 8, yPos);
        yPos += 4;
      }
      if (client.email) {
        doc.text(client.email.split(',')[0].trim(), margin + 8, yPos);
        yPos += 4;
      }
      if (client.address) {
        doc.text(client.address, margin + 8, yPos, { maxWidth: 80 });
      }
    }

    yPos = yPos + 20;

    // ========== ITEMS TABLE ==========
    
    const tableHeaders = [t.item, t.quantity, t.unitPrice, t.total];
    const tableData = (quote.quote_items || []).map((item: any) => [
      item.description,
      item.quantity.toString(),
      `$${item.unit_price.toFixed(2)}`,
      `$${item.total.toFixed(2)}`
    ]);

    (doc as any).autoTable({
      head: [tableHeaders],
      body: tableData,
      startY: yPos,
      theme: 'plain',
      styles: {
        fontSize: 10,
        cellPadding: { top: 6, right: 8, bottom: 6, left: 8 },
        lineColor: COLORS.border,
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: COLORS.tableHeader,
        textColor: COLORS.dark,
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        textColor: COLORS.dark,
      },
      alternateRowStyles: {
        fillColor: COLORS.white,
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { halign: 'center', cellWidth: 25 },
        2: { halign: 'right', cellWidth: 35 },
        3: { halign: 'right', cellWidth: 35, fontStyle: 'bold' }
      },
      didParseCell: (data: any) => {
        if (data.section === 'body' && data.row.index % 2 === 1) {
          data.cell.styles.fillColor = COLORS.tableAlt;
        }
      }
    });

    // ========== TOTALS SECTION ==========
    
    const finalY = (doc as any).lastAutoTable?.finalY || yPos + 50;
    let totalsY = finalY + 10;
    const totalsX = pageWidth - margin - 70;

    // Subtotal
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.gray);
    doc.text(`${t.subtotal}:`, totalsX, totalsY);
    doc.setTextColor(...COLORS.dark);
    doc.text(`$${quote.subtotal.toFixed(2)}`, pageWidth - margin, totalsY, { align: 'right' });
    totalsY += 7;

    // Taxes
    if (quote.tax_amount > 0) {
      doc.setTextColor(...COLORS.gray);
      doc.text(`${t.tax}:`, totalsX, totalsY);
      doc.setTextColor(...COLORS.dark);
      doc.text(`$${quote.tax_amount.toFixed(2)}`, pageWidth - margin, totalsY, { align: 'right' });
      totalsY += 7;
    }

    // Divider line
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.5);
    doc.line(totalsX - 5, totalsY, pageWidth - margin, totalsY);
    totalsY += 8;

    // Total with highlight background
    doc.setFillColor(...COLORS.totalBg);
    doc.roundedRect(totalsX - 10, totalsY - 5, 80, 12, 2, 2, 'F');
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(`${t.totalAmount}:`, totalsX, totalsY + 3);
    doc.text(`$${quote.total.toFixed(2)}`, pageWidth - margin, totalsY + 3, { align: 'right' });

    totalsY += 20;

    // ========== TERMS & NOTES ==========
    
    let contentY = totalsY;
    
    if (quote.terms) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.dark);
      doc.text(t.terms, margin, contentY);
      contentY += 6;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.gray);
      const termsLines = doc.splitTextToSize(quote.terms, pageWidth - margin * 2);
      doc.text(termsLines, margin, contentY);
      contentY += termsLines.length * 4 + 10;
    }

    if (quote.notes) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.dark);
      doc.text(t.notes, margin, contentY);
      contentY += 6;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.gray);
      const notesLines = doc.splitTextToSize(quote.notes, pageWidth - margin * 2);
      doc.text(notesLines, margin, contentY);
    }

    // ========== FOOTER ==========
    
    // Thank you message
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...COLORS.gray);
    doc.text(t.thankYou, pageWidth / 2, pageHeight - 25, { align: 'center' });

    // Branding
    if (!hideBranding) {
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.lightGray);
      doc.text(t.branding, pageWidth / 2, pageHeight - 15, { align: 'center' });
    }

    // Convert PDF to base64
    const pdfOutput = doc.output('arraybuffer');
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfOutput)));

    // Validate user email before sending
    if (!userEmail) {
      console.error('No user email found - cannot send email');
      return new Response(
        JSON.stringify({ error: isFrench 
          ? "Impossible d'envoyer le courriel : votre compte n'a pas d'adresse courriel valide."
          : "Cannot send email: your account does not have a valid email address." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    // Build the from address with user name
    const baseFromEmail = Deno.env.get("RESEND_FROM") || "GestionFlow <noreply@gestionflow.net>";
    const fromDomain = baseFromEmail.match(/<(.+)>/)?.[1] || 'noreply@gestionflow.net';
    const displayName = userName 
      ? `${userName} via GestionFlow`
      : `${company.name} via GestionFlow`;
    const fromAddress = `${displayName} <${fromDomain}>`;
    
    // Always add a response button at the end of the email
    const responseButtonText = isFrench ? 'Répondre au devis' : 'Respond to Quote';
    const responseButtonHtml = `
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
        <a href="${responseLink}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
          ${responseButtonText}
        </a>
        <p style="margin-top: 10px; font-size: 12px; color: #6b7280;">
          ${isFrench ? 'Ou copiez ce lien :' : 'Or copy this link:'} <a href="${responseLink}" style="color: #2563eb;">${responseLink}</a>
        </p>
      </div>
    `;
    
    const emailPayload: any = {
      from: fromAddress,
      replyTo: userEmail,
      to: emailsToSend,
      subject: emailSubject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="padding: 20px;">
            ${emailMessage}
          </div>
          ${responseButtonHtml}
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
