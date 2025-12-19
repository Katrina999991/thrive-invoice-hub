import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.4';
import { translateTemplate, emailTranslations } from './translations.ts';
import { generateInvoicePdfForEmail } from './invoicePdf.ts';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Validation schema for send invoice email requests
const SendInvoiceEmailSchema = z.object({
  invoiceId: z.string().uuid("Invalid invoice ID format"),
  customSubject: z.string().max(200, "Subject too long").optional(),
  customMessage: z.string().max(2000, "Message too long").optional(),
  emailType: z.enum(['new', 'overdue', 'payment_confirmation']).optional().default('new'),
  selectedEmails: z.array(z.string().email("Invalid email format")).max(10, "Too many recipients").optional(),
  ccEmails: z.array(z.string().email("Invalid email format")).max(10, "Too many CC recipients").optional().default([]),
  invoiceTemplate: z.string().optional().default("classic"),
  invoiceColor: z.string().optional().default("blue"),
  hidePdfBranding: z.boolean().optional().default(false),
});

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate input
    const requestBody = await req.json();
    const validationResult = SendInvoiceEmailSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      console.error("Validation error:", validationResult.error.errors);
      return new Response(
        JSON.stringify({ 
          error: "Invalid request data. Please check your inputs and try again." 
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    const { 
      invoiceId, 
      customSubject, 
      customMessage, 
      emailType,
      selectedEmails,
      ccEmails,
      invoiceTemplate,
      invoiceColor,
      hidePdfBranding
    } = validationResult.data;

    // Get authorization header to identify the user
    const authHeader = req.headers.get('Authorization');
    
    // Initialize Supabase client
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
          notes,
          company_id,
          include_payment_link,
          companies (
            name,
            logo_url,
            street_address,
            city,
            province_state,
            postal_code,
            tax_id,
            taxes,
            invoice_email_subject_en,
            invoice_email_subject_fr,
            invoice_email_message_en,
            invoice_email_message_fr,
            overdue_email_subject_en,
            overdue_email_subject_fr,
            overdue_email_message_en,
            overdue_email_message_fr,
            payment_confirmation_email_subject_en,
            payment_confirmation_email_subject_fr,
            payment_confirmation_email_message_en,
            payment_confirmation_email_message_fr,
            invoice_footer_message,
            invoice_footer_message_en,
            invoice_footer_message_fr,
            invoice_body_message_en,
            invoice_body_message_fr
          )
        ),
        invoice_items (
          description,
          quantity,
          unit_price,
          total,
          product_taxes,
          notes
        )
      `)
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      console.error('Error fetching invoice:', invoiceError);
      return new Response(
        JSON.stringify({ error: "The requested invoice could not be found. Please verify the invoice number." }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const client = invoice.clients;
    const company = client?.companies;

    // Déterminer les emails à utiliser
    let emailsToSend: string[] = [];
    
    if (selectedEmails && selectedEmails.length > 0) {
      // Utiliser les emails sélectionnés
      emailsToSend = selectedEmails;
    } else if (client?.email) {
      // Sinon, utiliser tous les emails du client
      emailsToSend = client.email.split(",").map((e: string) => e.trim()).filter((e: string) => e !== "");
    }

    if (emailsToSend.length === 0) {
      return new Response(
        JSON.stringify({ error: "No client email addresses found or selected" }),
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

    const isFrench = client.language === 'french';
    console.log('Client language:', client.language, 'Is French:', isFrench);

    // Email subject and message selection based on client language
    let emailSubject: string;
    let emailMessage: string;

    // Use custom email content if provided
    if (customSubject && customMessage) {
      emailSubject = customSubject;
      emailMessage = customMessage;
    } else {
      // Select templates based on email type and client language
      if (emailType === "overdue") {
        emailSubject = isFrench 
          ? (company.overdue_email_subject_fr || emailTranslations.fr.overdue.subject)
          : (company.overdue_email_subject_en || emailTranslations.en.overdue.subject);
        emailMessage = isFrench 
          ? (company.overdue_email_message_fr || emailTranslations.fr.overdue.body)
          : (company.overdue_email_message_en || emailTranslations.en.overdue.body);
      } else if (emailType === "payment_confirmation") {
        emailSubject = isFrench 
          ? (company.payment_confirmation_email_subject_fr || emailTranslations.fr.paymentConfirmation.subject)
          : (company.payment_confirmation_email_subject_en || emailTranslations.en.paymentConfirmation.subject);
        emailMessage = isFrench 
          ? (company.payment_confirmation_email_message_fr || emailTranslations.fr.paymentConfirmation.body)
          : (company.payment_confirmation_email_message_en || emailTranslations.en.paymentConfirmation.body);
      } else {
        emailSubject = isFrench 
          ? (company.invoice_email_subject_fr || emailTranslations.fr.newInvoice.subject)
          : (company.invoice_email_subject_en || emailTranslations.en.newInvoice.subject);
        emailMessage = isFrench 
          ? (company.invoice_email_message_fr || emailTranslations.fr.newInvoice.body)
          : (company.invoice_email_message_en || emailTranslations.en.newInvoice.body);
      }
    }

    // Replace template variables in subject and message
    Object.entries(templateVars).forEach(([placeholder, value]) => {
      emailSubject = emailSubject!.replace(new RegExp(placeholder, 'g'), value);
      emailMessage = emailMessage!.replace(new RegExp(placeholder, 'g'), value);
    });

    // Convert line breaks to HTML breaks for email
    emailMessage = emailMessage.replace(/\n/g, '<br>');
    
    // Convert URLs to clickable links
    const urlPattern = /(https?:\/\/[^\s<]+)/g;
    emailMessage = emailMessage.replace(urlPattern, '<a href="$1" style="color: #2563eb; text-decoration: underline;">$1</a>');
    
    // Add payment link if client has the option enabled and invoice is not paid
    console.log('Client include_payment_link:', client?.include_payment_link);
    console.log('Invoice status:', invoice.status);
    
    if (client?.include_payment_link === true && invoice.status !== 'paid') {
      try {
        console.log('Creating payment link for invoice:', invoice.id);
        
        // Create payment link
        const { data: paymentLinkData, error: paymentLinkError } = await supabase.functions.invoke(
          'create-invoice-payment-link',
          {
            body: { invoiceId: invoice.id }
          }
        );
        
        if (paymentLinkError) {
          console.error('Error creating payment link:', paymentLinkError);
        } else if (paymentLinkData?.url) {
          console.log('Payment link created successfully:', paymentLinkData.url);
          
          // Add payment link button to email
          const paymentLinkText = isFrench 
            ? `<br><br><div style="margin: 20px 0;"><strong>Payer en ligne :</strong><br><a href="${paymentLinkData.url}" style="display: inline-block; margin-top: 10px; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Payer maintenant</a></div>`
            : `<br><br><div style="margin: 20px 0;"><strong>Pay online:</strong><br><a href="${paymentLinkData.url}" style="display: inline-block; margin-top: 10px; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Pay Now</a></div>`;
          
          emailMessage += paymentLinkText;
          console.log('Payment link added to email message');
        } else {
          console.log('No payment link URL received');
        }
      } catch (error) {
        console.error('Exception creating payment link:', error);
      }
    } else {
      console.log('Payment link not added - include_payment_link:', client?.include_payment_link, 'status:', invoice.status);
    }

    // Generate PDF using the shared invoice PDF generator
    // This ensures IDENTICAL output to the downloadable PDF from the Invoices tab
    console.log('Generating PDF with template:', invoiceTemplate, 'color:', invoiceColor, 'hideBranding:', hidePdfBranding);
    
    const pdfBase64 = await generateInvoicePdfForEmail({
      invoice: {
        invoice_number: invoice.invoice_number,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        subtotal: invoice.subtotal,
        tax_amount: invoice.tax_amount,
        total: invoice.total,
        terms: invoice.terms,
        notes: invoice.notes,
        items: invoice.invoice_items || []
      },
      client: client ? {
        name: client.name,
        email: client.email,
        address: client.address,
        phone: client.phone,
        contact_person: client.contact_person,
        notes: client.notes,
        language: client.language
      } : null,
      company: company ? {
        name: company.name,
        logo_url: company.logo_url,
        street_address: company.street_address,
        city: company.city,
        province_state: company.province_state,
        postal_code: company.postal_code,
        tax_id: company.tax_id,
        taxes: company.taxes as any,
        invoice_body_message_en: company.invoice_body_message_en,
        invoice_body_message_fr: company.invoice_body_message_fr,
        invoice_footer_message: company.invoice_footer_message,
        invoice_footer_message_en: company.invoice_footer_message_en,
        invoice_footer_message_fr: company.invoice_footer_message_fr
      } : null,
      language: isFrench ? 'fr' : 'en',
      template: invoiceTemplate as any,
      colorPreset: invoiceColor,
      hideBranding: hidePdfBranding
    });

    // Validate user email before sending
    if (!userEmail) {
      console.error('No user email found - cannot send email');
      return new Response(
        JSON.stringify({ error: isFrench 
          ? "Impossible d'envoyer le courriel : votre compte n'a pas d'adresse courriel valide."
          : "Cannot send email: your account does not have a valid email address." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    // Build the from address with user name
    const baseFromEmail = Deno.env.get('RESEND_FROM') || 'GestionFlow <noreply@gestionflow.net>';
    const fromDomain = baseFromEmail.match(/<(.+)>/)?.[1] || 'noreply@gestionflow.net';
    const displayName = userName 
      ? `${userName} via GestionFlow`
      : `${company.name} via GestionFlow`;
    const fromAddress = `${displayName} <${fromDomain}>`;
    
    // Send email using Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: fromAddress,
      replyTo: userEmail,
      to: emailsToSend,
      cc: ccEmails && ccEmails.length > 0 ? ccEmails : undefined,
      subject: emailSubject,
      html: emailMessage,
      attachments: [
        {
          filename: `invoice-${invoice.invoice_number}.pdf`,
          content: pdfBase64,
        },
      ],
    });

    if (emailError) {
      console.error('Error sending email:', emailError);
      return new Response(
        JSON.stringify({ error: 'Failed to send invoice email.' }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log('Email sent successfully:', emailData);

    return new Response(
      JSON.stringify({ message: 'Invoice email sent successfully!', emailData }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error('Error in send-invoice-email function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error occurred while sending email.' }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
