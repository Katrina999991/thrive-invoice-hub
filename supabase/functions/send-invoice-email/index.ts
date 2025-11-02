import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.4';
import { jsPDF } from "npm:jspdf@2.5.1";
import "npm:jspdf-autotable@3.8.2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Helper function to translate text using Lovable AI
async function translateText(text: string, targetLanguage: 'french' | 'english'): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    console.warn('LOVABLE_API_KEY not configured, skipping translation');
    return text;
  }

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a professional translator. Translate the following text to ${targetLanguage}. Keep all placeholders like {invoice_number}, {client_name}, {total}, {due_date}, {issue_date}, {company_name}, {days_overdue}, {payment_date} exactly as they are. Only translate the regular text, not the placeholders.`
          },
          {
            role: 'user',
            content: text
          }
        ],
      }),
    });

    if (!response.ok) {
      console.error('Translation API error:', response.status);
      return text;
    }

    const data = await response.json();
    return data.choices[0].message.content || text;
  } catch (error) {
    console.error('Translation error:', error);
    return text;
  }
}

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
  selectedEmails?: string[];
  ccEmails?: string[];
  invoiceTemplate?: string;
  invoiceColor?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { invoiceId, customSubject, customMessage, emailType = "new", selectedEmails, ccEmails = [], invoiceTemplate = "classic", invoiceColor = "blue" }: SendInvoiceEmailRequest = await req.json();

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
            street_address,
            city,
            province_state,
            postal_code,
            taxes,
            invoice_email_subject,
            invoice_email_message,
            overdue_email_subject,
            overdue_email_message,
            payment_confirmation_email_subject,
            payment_confirmation_email_message,
            invoice_footer_message
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
        JSON.stringify({ error: "Invoice not found" }),
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

    // Email subject and message selection with automatic translation
    let emailSubject: string;
    let emailMessage: string;

    // Use custom email content if provided
    if (customSubject && customMessage) {
      emailSubject = customSubject;
      emailMessage = customMessage;
    } else {
      // Default English templates
      const defaultTemplates = {
        new: {
          subject: 'Invoice {invoice_number} from {company_name}',
          message: `Dear {client_name},\n
Please find attached your invoice {invoice_number} dated {issue_date}.\n
Amount due: {total}\n
Due date: {due_date}\n
Thank you for your business!\n
Best regards,\n
{company_name}`
        },
        overdue: {
          subject: 'Payment Overdue - Invoice {invoice_number}',
          message: `Dear {client_name},\n
This is a friendly reminder that your invoice {invoice_number} dated {issue_date} is now overdue.\n
Original amount: {total}\n
Due date: {due_date}\n
Days overdue: {days_overdue}\n
Please remit payment at your earliest convenience to avoid any late fees.\n
If you have already sent payment, please disregard this notice.\n
Thank you for your prompt attention to this matter.\n
Best regards,\n
{company_name}`
        },
        payment_confirmation: {
          subject: 'Payment Confirmation - Invoice {invoice_number}',
          message: `Dear {client_name},\n
We have successfully received your payment for invoice {invoice_number}.\n
Payment details:\n
- Invoice: {invoice_number}\n
- Amount: {total}\n
- Date paid: {payment_date}\n
Thank you for your prompt payment and continued business!\n
Best regards,\n
{company_name}`
        }
      };

      // Get base templates
      let baseSubject: string;
      let baseMessage: string;

      if (emailType === "overdue") {
        baseSubject = company.overdue_email_subject || defaultTemplates.overdue.subject;
        baseMessage = company.overdue_email_message || defaultTemplates.overdue.message;
      } else if (emailType === "payment_confirmation") {
        baseSubject = company.payment_confirmation_email_subject || defaultTemplates.payment_confirmation.subject;
        baseMessage = company.payment_confirmation_email_message || defaultTemplates.payment_confirmation.message;
      } else {
        baseSubject = company.invoice_email_subject || defaultTemplates.new.subject;
        baseMessage = company.invoice_email_message || defaultTemplates.new.message;
      }

      // Translate to French if needed
      if (isFrench) {
        emailSubject = await translateText(baseSubject, 'french');
        emailMessage = await translateText(baseMessage, 'french');
      } else {
        emailSubject = baseSubject;
        emailMessage = baseMessage;
      }
    }

    // Replace template variables in subject and message
    Object.entries(templateVars).forEach(([placeholder, value]) => {
      emailSubject = emailSubject!.replace(new RegExp(placeholder, 'g'), value);
      emailMessage = emailMessage!.replace(new RegExp(placeholder, 'g'), value);
    });

    // Define table headers based on language
    const tableHeaders = isFrench ? {
      invoice: 'FACTURE',
      billTo: 'Facturer à :',
      invoiceNumber: 'Numéro de facture',
      issueDate: 'Date d\'émission',
      dueDate: 'Date d\'échéance',
      status: 'Statut',
      invoiceSummary: 'Résumé de la facture',
      description: 'Description',
      qty: 'Qté',
      unitPrice: 'Prix unitaire',
      total: 'Total',
      subtotal: 'Sous-total',
      tax: 'Taxe',
      notes: 'Notes',
      terms: 'Conditions',
      totalAmount: 'Montant total'
    } : {
      invoice: 'INVOICE',
      billTo: 'Bill To:',
      invoiceNumber: 'Invoice Number',
      issueDate: 'Issue Date',
      dueDate: 'Due Date',
      status: 'Status',
      invoiceSummary: 'Invoice Summary',
      description: 'Description',
      qty: 'Qty',
      unitPrice: 'Unit Price',
      total: 'Total',
      subtotal: 'Subtotal',
      tax: 'Tax',
      notes: 'Notes',
      terms: 'Terms',
      totalAmount: 'Total Amount'
    };

    // Define color mappings (RGB values for jsPDF)
    const colorMap: Record<string, { primary: [number, number, number], light: [number, number, number] }> = {
      blue: { primary: [37, 99, 235], light: [219, 234, 254] },
      green: { primary: [22, 163, 74], light: [220, 252, 231] },
      purple: { primary: [147, 51, 234], light: [243, 232, 255] },
      orange: { primary: [234, 88, 12], light: [255, 237, 213] },
      yellow: { primary: [202, 138, 4], light: [254, 249, 195] },
      gray: { primary: [75, 85, 99], light: [243, 244, 246] }
    };
    
    const selectedColor = colorMap[invoiceColor] || colorMap.blue;
    
    // Generate PDF
    const doc = new jsPDF();
    doc.setFont('helvetica');
    
    // Header section - Left: Company name and address, Right: Logo
    let headerHeight = 20;
    let logoBase64 = ''; // Declare logoBase64 here so it's accessible later for email HTML
    let logoMime = ''; // Track mime type for HTML preview
    
    // Right side - Company Logo
    if (company.logo_url) {
      try {
        console.log('Attempting to load logo from:', company.logo_url);
        
        // Fetch the logo image
        const logoResponse = await fetch(company.logo_url);
        console.log('Logo response status:', logoResponse.status);
        
        if (logoResponse.ok) {
          const logoBuffer = await logoResponse.arrayBuffer();
          console.log('Logo buffer size:', logoBuffer.byteLength);
          
          // Convert to base64 safely without stack overflow
          const bytes = new Uint8Array(logoBuffer);
          
          // Use a simple approach that works in Deno
          let binaryString = '';
          for (let i = 0; i < bytes.length; i++) {
            binaryString += String.fromCharCode(bytes[i]);
          }
          logoBase64 = btoa(binaryString);
          
          // Detect image format from URL
          let imageFormat = 'PNG';
          if (company.logo_url.toLowerCase().includes('.jpg') || 
              company.logo_url.toLowerCase().includes('.jpeg')) {
            imageFormat = 'JPEG';
          }
          
          console.log('Adding logo to PDF with format:', imageFormat);
          
          // Set mime for HTML preview
          logoMime = imageFormat === 'JPEG' ? 'image/jpeg' : 'image/png';
          
          // Compute dimensions preserving aspect ratio using jsPDF helper
          const dataUrl = `data:image/${imageFormat.toLowerCase()};base64,${logoBase64}`;
          let logoWidth = 40;
          let logoHeight = 20;
          try {
            const props = (doc as any).getImageProperties(dataUrl);
            if (props && props.width && props.height) {
              const imgRatio = props.width / props.height;
              // Start by constraining width
              logoWidth = 40;
              logoHeight = logoWidth / imgRatio;
              // If height exceeds max, constrain by height instead
              if (logoHeight > 20) {
                logoHeight = 20;
                logoWidth = logoHeight * imgRatio;
              }
            }
          } catch (_e) {
            // Fallback to simple ratio if helper not available
            logoWidth = 40;
            logoHeight = 20;
          }
          
          console.log('Logo dimensions for PDF:', logoWidth, 'x', logoHeight);
          
          const logoX = 210 - 20 - logoWidth; // Right aligned
          doc.addImage(dataUrl, imageFormat, logoX, headerHeight - 5, logoWidth, logoHeight);
          console.log('Logo successfully added to PDF');
        }
      } catch (error) {
        console.error('Error loading logo, continuing without logo:', error);
      }
    }
    
    // Left side - Company Name and Address
    if (company) {
      // Add rounded background box for creative template
      if (invoiceTemplate === 'creative') {
        doc.setFillColor(selectedColor.light[0], selectedColor.light[1], selectedColor.light[2]);
        const companyNameWidth = doc.getStringUnitWidth(company.name) * 12 / doc.internal.scaleFactor;
        const boxPadding = 8;
        const boxWidth = companyNameWidth + boxPadding;
        doc.roundedRect(18, headerHeight - 5, boxWidth, 8, 2, 2, 'F');
        
        // Center text in the box
        const textX = 18 + (boxWidth / 2);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(selectedColor.primary[0], selectedColor.primary[1], selectedColor.primary[2]);
        doc.text(company.name, textX, headerHeight, { align: 'center' });
      } else {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(selectedColor.primary[0], selectedColor.primary[1], selectedColor.primary[2]);
        doc.text(company.name, 20, headerHeight);
      }
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      
      let yPos = headerHeight + 9;
      if (company.street_address) {
        doc.text(company.street_address, 20, yPos);
        yPos += 5;
      }
      if (company.city && company.province_state) {
        doc.text(`${company.city}, ${company.province_state} ${company.postal_code || ''}`, 20, yPos);
        yPos += 5;
      }
    }
    
    // Separator line after header (not for creative or modern template)
    if (invoiceTemplate !== 'creative' && invoiceTemplate !== 'modern') {
      if (invoiceTemplate === 'classic') {
        // Use the same light color as the line below client info
        doc.setDrawColor(selectedColor.light[0], selectedColor.light[1], selectedColor.light[2]);
      } else {
        // Use a medium shade between light and primary for other templates
        const mediumR = Math.floor((selectedColor.light[0] + selectedColor.primary[0]) / 2);
        const mediumG = Math.floor((selectedColor.light[1] + selectedColor.primary[1]) / 2);
        const mediumB = Math.floor((selectedColor.light[2] + selectedColor.primary[2]) / 2);
        doc.setDrawColor(mediumR, mediumG, mediumB);
      }
      doc.setLineWidth(0.5);
      doc.line(20, 40, 190, 40);
    }
    
    // Only show status for payment confirmations
    if (emailType === "payment_confirmation") {
      doc.setFontSize(10);
      doc.setTextColor(40, 40, 40);
      doc.setFont('helvetica', 'bold');
      doc.text(`${tableHeaders.status}: ${tableHeaders.billTo.includes('Facturer') ? 'Payé' : 'Paid'}`, 20, 48);
    }
    
    // INVOICE label and info
    let invoiceInfoY = emailType === "payment_confirmation" ? 58 : 48;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(selectedColor.primary[0], selectedColor.primary[1], selectedColor.primary[2]);
    doc.text(tableHeaders.invoice, 20, invoiceInfoY);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    doc.text(`${tableHeaders.invoiceNumber}: ${invoice.invoice_number}`, 20, invoiceInfoY + 7);
    doc.text(`${tableHeaders.issueDate}: ${invoice.issue_date}`, 20, invoiceInfoY + 12);
    doc.text(`${tableHeaders.dueDate}: ${invoice.due_date || 'N/A'}`, 20, invoiceInfoY + 17);
    
    // Client information
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text(tableHeaders.billTo, 130, invoiceInfoY);
    
    doc.setFont('helvetica', 'normal');
    doc.text(client.name, 130, invoiceInfoY + 7);
    if (client.address) {
      const addressLines = doc.splitTextToSize(client.address, 60);
      let addressY = invoiceInfoY + 12;
      addressLines.forEach((line: string) => {
        doc.text(line, 130, addressY);
        addressY += 5;
      });
    }
    
    // Separator line after invoice info
    const afterInfoY = invoiceInfoY + 30;
    if (invoiceTemplate === 'classic') {
      // Use the same light color as before
      doc.setDrawColor(selectedColor.light[0], selectedColor.light[1], selectedColor.light[2]);
    } else if (invoiceTemplate !== 'creative' && invoiceTemplate !== 'modern') {
      const mediumR = Math.floor((selectedColor.light[0] + selectedColor.primary[0]) / 2);
      const mediumG = Math.floor((selectedColor.light[1] + selectedColor.primary[1]) / 2);
      const mediumB = Math.floor((selectedColor.light[2] + selectedColor.primary[2]) / 2);
      doc.setDrawColor(mediumR, mediumG, mediumB);
    }
    if (invoiceTemplate !== 'creative' && invoiceTemplate !== 'modern') {
      doc.setLineWidth(0.5);
      doc.line(20, afterInfoY, 190, afterInfoY);
    }
    
    // Items table
    const tableStartY = afterInfoY + 8;
    
    // Prepare table data
    const tableData = invoice.invoice_items.map((item: any) => {
      // Calculate item taxes if any
      let itemTaxAmount = 0;
      if (item.product_taxes && Array.isArray(item.product_taxes) && item.product_taxes.length > 0) {
        item.product_taxes.forEach((tax: any) => {
          if (tax.type === 'percentage') {
            itemTaxAmount += (item.unit_price * tax.value / 100) * item.quantity;
          } else if (tax.type === 'amount') {
            itemTaxAmount += tax.value * item.quantity;
          }
        });
      }
      
      const itemSubtotal = item.unit_price * item.quantity;
      const itemTotalWithTax = itemSubtotal + itemTaxAmount;
      
      return [
        item.description,
        item.quantity.toString(),
        `$${item.unit_price.toFixed(2)}`,
        `$${itemTotalWithTax.toFixed(2)}`
      ];
    });

    // Use autoTable for the items table
    (doc as any).autoTable({
      head: [[tableHeaders.description, tableHeaders.qty, tableHeaders.unitPrice, tableHeaders.total]],
      body: tableData,
      startY: tableStartY,
      theme: invoiceTemplate === 'modern' ? 'plain' : 'striped',
      headStyles: {
        fillColor: selectedColor.primary,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9
      },
      styles: {
        fontSize: 9,
        cellPadding: 4
      },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 35, halign: 'right' }
      },
      margin: { left: 20, right: 20 }
    });

    // Get the Y position after the table
    let finalY = (doc as any).lastAutoTable.finalY + 10;

    // Summary section
    const summaryX = 130;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    
    doc.text(`${tableHeaders.subtotal}:`, summaryX, finalY);
    doc.text(`$${invoice.subtotal.toFixed(2)}`, 185, finalY, { align: 'right' });
    
    finalY += 5;
    doc.text(`${tableHeaders.tax}:`, summaryX, finalY);
    doc.text(`$${invoice.tax_amount.toFixed(2)}`, 185, finalY, { align: 'right' });
    
    finalY += 7;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`${tableHeaders.totalAmount}:`, summaryX, finalY);
    doc.text(`$${invoice.total.toFixed(2)}`, 185, finalY, { align: 'right' });

    // Footer section
    finalY += 15;
    
    // Add notes if present
    if (invoice.notes) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 40);
      doc.text(`${tableHeaders.notes}:`, 20, finalY);
      finalY += 5;
      doc.setFont('helvetica', 'normal');
      const notesLines = doc.splitTextToSize(invoice.notes, 170);
      notesLines.forEach((line: string) => {
        doc.text(line, 20, finalY);
        finalY += 5;
      });
      finalY += 5;
    }

    // Add terms if present
    if (invoice.terms) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 40);
      doc.text(`${tableHeaders.terms}:`, 20, finalY);
      finalY += 5;
      doc.setFont('helvetica', 'normal');
      const termsLines = doc.splitTextToSize(invoice.terms, 170);
      termsLines.forEach((line: string) => {
        doc.text(line, 20, finalY);
        finalY += 5;
      });
      finalY += 5;
    }

    // Add company footer message (translate if needed)
    let footerMessage = company.invoice_footer_message || (isFrench ? 'Merci pour votre confiance !' : 'Thank you for your business!');
    
    // Translate footer message if needed
    if (isFrench && company.invoice_footer_message) {
      footerMessage = await translateText(company.invoice_footer_message, 'french');
    }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text(footerMessage, 105, finalY, { align: 'center' });

    // Convert PDF to base64 for email attachment
    const pdfBase64 = doc.output('datauristring').split(',')[1];

    // Send email with PDF attachment using Resend
    const emailResponse = await resend.emails.send({
      from: Deno.env.get("RESEND_FROM") || "Invoice <onboarding@resend.dev>",
      to: emailsToSend,
      cc: ccEmails.length > 0 ? ccEmails : undefined,
      subject: emailSubject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          ${logoBase64 ? `
            <div style="text-align: center; padding: 20px 0;">
              <img src="data:${logoMime};base64,${logoBase64}" alt="${company.name}" style="max-width: 200px; height: auto;" />
            </div>
          ` : ''}
          <div style="white-space: pre-wrap;">${emailMessage}</div>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px;">
            <p>${footerMessage}</p>
          </div>
        </div>
      `,
      attachments: [{
        filename: `${invoice.invoice_number}.pdf`,
        content: pdfBase64,
      }],
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
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
