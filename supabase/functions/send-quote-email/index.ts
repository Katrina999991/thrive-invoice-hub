import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.4';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { decode as decodeBase64 } from "https://deno.land/std@0.190.0/encoding/base64.ts";
import { generateQuotePdfForEmail, TemplateType, COLOR_PRESETS } from "./quotePdf.ts";

// Helper to convert hex color to RGB array
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [37, 99, 235]; // Default blue
}

// Helper to create light variant from primary color
function createLightVariant(primary: [number, number, number]): [number, number, number] {
  return [
    Math.min(255, Math.floor(primary[0] + (255 - primary[0]) * 0.85)),
    Math.min(255, Math.floor(primary[1] + (255 - primary[1]) * 0.85)),
    Math.min(255, Math.floor(primary[2] + (255 - primary[2]) * 0.85))
  ];
}

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ========== DECRYPTION FUNCTIONS ==========
// Convert string key to proper AES-256 key (32 bytes)
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

// AES-GCM decryption
async function decryptData(ciphertext: string, keyString: string): Promise<string> {
  if (!ciphertext) return ciphertext;
  
  // Handle AES format
  if (ciphertext.startsWith("AESENC:")) {
    try {
      const key = await deriveKey(keyString);
      const base64Data = ciphertext.slice(7); // Remove "AESENC:" prefix
      const combined = decodeBase64(base64Data);
      
      // Extract IV (first 12 bytes) and encrypted data
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
      return ciphertext; // Return as-is if decryption fails
    }
  }
  
  // Handle legacy XOR format
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
  
  // Return as-is if not encrypted
  return ciphertext;
}

// Decrypt client fields
async function decryptClientData(client: any): Promise<any> {
  const encryptionKey = Deno.env.get("ENCRYPTION_KEY");
  if (!encryptionKey || !client) return client;
  
  const decryptedClient = { ...client };
  
  // Decrypt email and phone if they appear encrypted
  if (client.email && (client.email.startsWith("AESENC:") || client.email.startsWith("ENC:"))) {
    decryptedClient.email = await decryptData(client.email, encryptionKey);
  }
  if (client.phone && (client.phone.startsWith("AESENC:") || client.phone.startsWith("ENC:"))) {
    decryptedClient.phone = await decryptData(client.phone, encryptionKey);
  }
  
  return decryptedClient;
}

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
  template: z.enum(['classic', 'modern', 'professional', 'creative']).optional().default('classic'),
  colorPreset: z.string().optional().default('blue'),
  customColor: z.string().optional().nullable(),
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
    
    const { quoteId, customSubject, customMessage, selectedEmails, ccEmails, hideBranding, template, colorPreset, customColor } = validationResult.data;

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
          contact_title,
          email,
          address,
          phone,
          language,
          company_id,
          chargeback_clause_enabled,
          chargeback_clause_text,
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
            taxes,
            quote_email_subject_en,
            quote_email_subject_fr,
            quote_email_message_en,
            quote_email_message_fr,
            quote_body_message_en,
            quote_body_message_fr,
            quote_footer_message_en,
            quote_footer_message_fr
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

    // Decrypt client data (email, phone may be encrypted)
    console.log("Client data BEFORE decryption:", { 
      email: quote.clients?.email?.substring(0, 20),
      phone: quote.clients?.phone?.substring(0, 20),
      hasEncryptionKey: !!Deno.env.get("ENCRYPTION_KEY")
    });
    
    const client = await decryptClientData(quote.clients);
    const company = client?.companies;

    console.log("Client data AFTER decryption:", { 
      email: client?.email?.substring(0, 20),
      phone: client?.phone?.substring(0, 20),
      emailStillEncrypted: client?.email?.startsWith("AESENC:") || client?.email?.startsWith("ENC:")
    });

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

    // Generate PDF using unified design system (same as frontend download)
    console.log("Generating quote PDF with unified design system...");
    const pdfBase64 = await generateQuotePdfForEmail({
      quote: {
        quote_number: quote.quote_number,
        issue_date: quote.issue_date,
        expiry_date: quote.expiry_date,
        subtotal: quote.subtotal,
        tax_amount: quote.tax_amount,
        total: quote.total,
        terms: quote.terms,
        notes: quote.notes,
        items: (quote.quote_items || []).map((item: any) => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
          notes: item.notes,
          product_taxes: item.product_taxes
        }))
      },
      client: client ? {
        name: client.name,
        email: client.email,
        address: client.address,
        phone: client.phone,
        contact_person: client.contact_person,
        contact_title: client.contact_title,
        language: client.language
      } : null,
      company: company ? {
        name: company.name,
        logo_url: company.logo_url,
        email: company.email,
        phone: company.phone,
        street_address: company.street_address,
        city: company.city,
        province_state: company.province_state,
        postal_code: company.postal_code,
        tax_id: company.tax_id,
        taxes: company.taxes as any,
        quote_body_message_en: company.quote_body_message_en,
        quote_body_message_fr: company.quote_body_message_fr,
        quote_footer_message_en: company.quote_footer_message_en,
        quote_footer_message_fr: company.quote_footer_message_fr
      } : null,
      language: isFrench ? 'fr' : 'en',
      template: template as any,
      colorPreset: customColor ? undefined : colorPreset,
      customColor: customColor ? (() => {
        const primary = hexToRgb(customColor);
        return { primary, light: createLightVariant(primary) };
      })() : undefined,
      hideBranding
    });
    console.log("Quote PDF generated successfully");

    // Get company email for Reply-To and potential sending
    const companyEmail = company.email;
    
    // Validate that we have a reply-to email (prefer company email, fallback to user email)
    const replyToEmail = companyEmail || userEmail;
    if (!replyToEmail) {
      console.error('No email found for Reply-To');
      return new Response(
        JSON.stringify({ error: isFrench 
          ? "Impossible d'envoyer le courriel : aucune adresse courriel valide trouvée."
          : "Cannot send email: no valid email address found." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    // Check if company email domain is verified in Resend
    let fromAddress: string;
    const defaultFromEmail = Deno.env.get('RESEND_FROM') || 'GestionFlow <noreply@gestionflow.net>';
    const defaultDomain = defaultFromEmail.match(/<(.+)>/)?.[1] || 'noreply@gestionflow.net';
    
    if (companyEmail) {
      const companyDomain = companyEmail.split('@')[1];
      
      try {
        // Check verified domains in Resend
        const domainsResponse = await fetch('https://api.resend.com/domains', {
          headers: {
            'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
          },
        });
        
        if (domainsResponse.ok) {
          const domainsData = await domainsResponse.json();
          const verifiedDomains = domainsData.data?.filter((d: any) => d.status === 'verified').map((d: any) => d.name) || [];
          
          console.log('Verified domains:', verifiedDomains);
          console.log('Company domain:', companyDomain);
          
          if (verifiedDomains.includes(companyDomain)) {
            // Company domain is verified - use company email directly
            fromAddress = `${company.name} <${companyEmail}>`;
            console.log('Using verified company email as sender:', fromAddress);
          } else {
            // Domain not verified - use app domain with company name
            fromAddress = `${company.name} via GestionFlow <${defaultDomain}>`;
            console.log('Using app domain with company name:', fromAddress);
          }
        } else {
          // API error - fallback to app domain
          console.log('Could not check Resend domains, using fallback');
          fromAddress = `${company.name} via GestionFlow <${defaultDomain}>`;
        }
      } catch (error) {
        console.error('Error checking Resend domains:', error);
        fromAddress = `${company.name} via GestionFlow <${defaultDomain}>`;
      }
    } else {
      // No company email - use app domain
      fromAddress = `${company.name} via GestionFlow <${defaultDomain}>`;
    }
    
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
      replyTo: replyToEmail,
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
