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
            invoice_footer_message,
            invoice_footer_message_fr
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
      const isFrench = (clientLanguage || '').toLowerCase().startsWith('fr');

      // Default English templates
      const defaultEnglishTemplates = {
        overdue: {
          subject: 'Payment Overdue - Invoice {invoice_number}',
          message: `Dear {client_name},
\nThis is a friendly reminder that your invoice {invoice_number} dated {issue_date} is now overdue.
\nOriginal amount: {total}
Due date: {due_date}
Days overdue: {days_overdue}
\nPlease remit payment at your earliest convenience to avoid any late fees.
\nIf you have already sent payment, please disregard this notice.
\nThank you for your prompt attention to this matter.
\nBest regards,
{company_name}`
        },
        payment: {
          subject: 'Payment Confirmation - Invoice {invoice_number}',
          message: `Dear {client_name},
\nWe have successfully received your payment for invoice {invoice_number}.
\nPayment details:
- Invoice: {invoice_number}
- Amount: {total}
- Date paid: {payment_date}
\nThank you for your prompt payment and continued business!
\nBest regards,
{company_name}`
        },
        new: {
          subject: 'Invoice {invoice_number} from {company_name}',
          message: `Dear {client_name},
\nPlease find attached your invoice {invoice_number} dated {issue_date}.
\nAmount due: {total}
Due date: {due_date}
\nThank you for your business!
\nBest regards,
{company_name}`
        }
      };

      // Determine which template to use based on email type and client language
      if (emailType === "overdue") {
        if (isFrench) {
          emailSubject = emailSubject || company.overdue_email_subject || frenchTemplates.overdue.subject;
          emailMessage = emailMessage || company.overdue_email_message || frenchTemplates.overdue.message;
        } else {
          emailSubject = emailSubject || company.overdue_email_subject || defaultEnglishTemplates.overdue.subject;
          emailMessage = emailMessage || company.overdue_email_message || defaultEnglishTemplates.overdue.message;
        }
      } else if (emailType === "payment_confirmation") {
        if (isFrench) {
          emailSubject = emailSubject || company.payment_confirmation_email_subject || frenchTemplates.payment_confirmation.subject;
          emailMessage = emailMessage || company.payment_confirmation_email_message || frenchTemplates.payment_confirmation.message;
        } else {
          emailSubject = emailSubject || company.payment_confirmation_email_subject || defaultEnglishTemplates.payment.subject;
          emailMessage = emailMessage || company.payment_confirmation_email_message || defaultEnglishTemplates.payment.message;
        }
      } else {
        if (isFrench) {
          emailSubject = emailSubject || company.invoice_email_subject || frenchTemplates.new.subject;
          emailMessage = emailMessage || company.invoice_email_message || frenchTemplates.new.message;
        } else {
          emailSubject = emailSubject || company.invoice_email_subject || defaultEnglishTemplates.new.subject;
          emailMessage = emailMessage || company.invoice_email_message || defaultEnglishTemplates.new.message;
        }
      }
    }

    // Replace template variables in subject and message
    Object.entries(templateVars).forEach(([placeholder, value]) => {
      emailSubject = emailSubject!.replace(new RegExp(placeholder, 'g'), value);
      emailMessage = emailMessage!.replace(new RegExp(placeholder, 'g'), value);
    });

    // Define table headers based on language
    const tableHeaders = clientLanguage === 'french' ? {
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
      doc.text(`${tableHeaders.status || 'Status'}: ${invoice.status.toUpperCase()}`, 20, 50);
    }
    
    // Client information
    const clientInfoY = emailType === "payment_confirmation" ? 60 : 50;
    let nextY = clientInfoY;
    if (client) {
      // Add background box for modern and creative templates
      if (invoiceTemplate === 'modern') {
        doc.setFillColor(245, 245, 245);
        const boxHeight = 20 + (client.contact_person ? 5 : 0) + (client.address ? 5 : 0);
        doc.roundedRect(20, clientInfoY - 3, 170, boxHeight, 2, 2, 'F');
      } else if (invoiceTemplate === 'creative') {
        // Add gray background with light colored border for creative template
        const boxHeight = 20 + (client.contact_person ? 5 : 0) + (client.address ? 5 : 0);
        
        // Fill with light gray
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(20, clientInfoY - 3, 170, boxHeight, 2, 2, 'F');
        
        // Add light colored border
        doc.setDrawColor(selectedColor.light[0], selectedColor.light[1], selectedColor.light[2]);
        doc.setLineWidth(0.5);
        doc.roundedRect(20, clientInfoY - 3, 170, boxHeight, 2, 2, 'S');
      }
      
      const textYOffset = invoiceTemplate === 'creative' ? 2 : invoiceTemplate === 'modern' ? 2 : 0;
      
      doc.setFontSize(11);
      // Use medium shade color for "Bill To" in professional template (same as separator line)
      if (invoiceTemplate === 'professional') {
        const mediumR = Math.floor((selectedColor.light[0] + selectedColor.primary[0]) / 2);
        const mediumG = Math.floor((selectedColor.light[1] + selectedColor.primary[1]) / 2);
        const mediumB = Math.floor((selectedColor.light[2] + selectedColor.primary[2]) / 2);
        doc.setTextColor(mediumR, mediumG, mediumB);
      } else {
        doc.setTextColor(40, 40, 40);
      }
      doc.setFont('helvetica', 'bold');
      const leftMargin = (invoiceTemplate === 'creative' || invoiceTemplate === 'modern') ? 24 : 20;
      const rightMargin = (invoiceTemplate === 'creative' || invoiceTemplate === 'modern') ? 24 : 20;
      doc.text(tableHeaders.billTo || 'Bill To:', leftMargin, clientInfoY + textYOffset);
      
      // Right side - Invoice Number and Date (aligned with Bill To)
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      // Use same color as "Bill To" for professional template
      if (invoiceTemplate === 'professional') {
        const mediumR = Math.floor((selectedColor.light[0] + selectedColor.primary[0]) / 2);
        const mediumG = Math.floor((selectedColor.light[1] + selectedColor.primary[1]) / 2);
        const mediumB = Math.floor((selectedColor.light[2] + selectedColor.primary[2]) / 2);
        doc.setTextColor(mediumR, mediumG, mediumB);
      } else {
        doc.setTextColor(40, 40, 40);
      }
      const invoiceTitle = `${tableHeaders.invoice || 'INVOICE'} ${invoice.invoice_number}`;
      const titleWidth = doc.getTextWidth(invoiceTitle);
      doc.text(invoiceTitle, 210 - rightMargin - titleWidth, clientInfoY + textYOffset);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      const issueDateText = `${tableHeaders.issueDate || 'Issue Date'}: ${invoice.issue_date}`;
      const issueDateWidth = doc.getTextWidth(issueDateText);
      doc.text(issueDateText, 210 - rightMargin - issueDateWidth, clientInfoY + 6 + textYOffset);
      
      // Add due date below issue date
      if (invoice.due_date) {
        const dueDateText = `${tableHeaders.dueDate || 'Due Date'}: ${invoice.due_date}`;
        const dueDateWidth = doc.getTextWidth(dueDateText);
        doc.text(dueDateText, 210 - rightMargin - dueDateWidth, clientInfoY + 12 + textYOffset);
      }
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      
      nextY = clientInfoY + 7 + textYOffset;
      doc.text(client.name, leftMargin, nextY);
      nextY += 5;
      
      if (client.contact_person) {
        doc.text(client.contact_person, leftMargin, nextY);
        nextY += 5;
      }
      if (client.address) {
        doc.text(client.address, leftMargin, nextY);
        nextY += 5;
      }
    }
    
    // Items table - add some space after client info
    const startY = nextY + 15;
    
    // Add line above table for classic template
    if (invoiceTemplate === 'classic') {
      doc.setDrawColor(selectedColor.light[0], selectedColor.light[1], selectedColor.light[2]);
      doc.setLineWidth(0.5);
      doc.line(20, startY - 5, 190, startY - 5);
    }
    
    const tableData: any[] = [];
    
    // Add invoice items
    if (invoice.invoice_items && invoice.invoice_items.length > 0) {
      invoice.invoice_items.forEach((item: any) => {
        tableData.push([
          item.description,
          item.quantity.toString(),
          `$${item.unit_price.toFixed(2)}`,
          `$${item.total.toFixed(2)}`
        ]);
        
        // Add item notes if they exist
        if (item.notes) {
          tableData.push([
            `      ${tableHeaders.notes}: ${item.notes}`,
            '',
            '',
            ''
          ]);
        }
        
        // Add product taxes if they exist for this item
        if (item.product_taxes && Array.isArray(item.product_taxes) && item.product_taxes.length > 0) {
          item.product_taxes.forEach((tax: any) => {
            const taxType = tax.type || 'percentage';
            const taxValue = tax.value !== undefined ? tax.value : tax.percentage;
            
            let taxAmount = 0;
            if (taxType === 'percentage') {
              taxAmount = item.total * (taxValue / 100);
            } else {
              taxAmount = taxValue * item.quantity;
            }
            
            const taxLabel = taxType === 'percentage' ? `${taxValue}%` : `$${taxValue}`;
            const taxDetails = `${tax.name} (${taxLabel})`;
            
            tableData.push([
              `  ${tableHeaders.tax}: ${taxDetails}`,
              '',
              '',
              `$${taxAmount.toFixed(2)}`
            ]);
          });
        }
      });
    }
    
    // Add subtotal, individual taxes, and total rows
    tableData.push(['', '', `${tableHeaders.subtotal}:`, `$${invoice.subtotal.toFixed(2)}`]);
    
    // Add individual taxes if company has multiple taxes
    if (company.taxes && Array.isArray(company.taxes) && company.taxes.length > 0) {
      company.taxes.forEach((tax: any) => {
        const taxAmount = invoice.subtotal * (tax.percentage / 100);
        tableData.push(['', '', `${tax.name} (${tax.percentage}%):`, `$${taxAmount.toFixed(2)}`]);
      });
    } else if (invoice.tax_amount > 0) {
      tableData.push(['', '', `${tableHeaders.tax}:`, `$${invoice.tax_amount.toFixed(2)}`]);
    }
    
    tableData.push(['', '', `${tableHeaders.totalAmount}:`, `$${invoice.total.toFixed(2)}`]);
    
    // Use autoTable for better table formatting
    const tableTheme = invoiceTemplate === 'professional' ? 'grid' : 
                      invoiceTemplate === 'modern' ? 'plain' : 
                      invoiceTemplate === 'classic' ? 'grid' : 
                      invoiceTemplate === 'creative' ? 'plain' : 'plain';
    
    (doc as any).autoTable({
      head: [[
        tableHeaders.description,
        tableHeaders.qty,
        tableHeaders.unitPrice,
        tableHeaders.total
      ]],
      body: tableData,
      startY: startY,
      theme: tableTheme,
      tableWidth: invoiceTemplate === 'modern' ? 170 : 'auto',
      margin: invoiceTemplate === 'modern' ? { left: 20, right: 20 } : { left: 20, right: 20 },
      styles: {
        fontSize: 10,
        cellPadding: invoiceTemplate === 'professional' ? 3 : invoiceTemplate === 'modern' ? 2 : invoiceTemplate === 'classic' ? 2 : 3,
        lineColor: [240, 240, 240],
        lineWidth: 0.5,
      },
      headStyles: {
        fillColor: undefined,
        textColor: [40, 40, 40],
        fontStyle: 'bold',
        fontSize: invoiceTemplate === 'professional' ? 11 : invoiceTemplate === 'modern' ? 10 : 10,
        cellPadding: invoiceTemplate === 'modern' ? 4 : 4,
        lineWidth: 0.5,
      },
      alternateRowStyles: undefined,
      columnStyles: {
        0: { cellWidth: invoiceTemplate === 'modern' ? 70 : 'auto' },
        1: { halign: 'center', cellWidth: invoiceTemplate === 'modern' ? 25 : 'auto' },
        2: { halign: 'right', cellWidth: invoiceTemplate === 'modern' ? 30 : 'auto' },
        3: { halign: 'right', fontStyle: 'bold', cellWidth: invoiceTemplate === 'modern' ? 45 : 'auto' },
      },
      bodyStyles: {
        textColor: [60, 60, 60],
        fillColor: undefined,
      },
      didParseCell: function(data: any) {
        // Remove fills so custom rounded backgrounds (drawn in willDrawCell) are fully visible
        if ((invoiceTemplate === 'modern' || invoiceTemplate === 'classic') && data.section === 'head') {
          data.cell.styles.fillColor = undefined;
          data.cell.styles.lineWidth = 0;
        }
        if (invoiceTemplate === 'modern' && data.section === 'body') {
          const bodyLen = (data.table && data.table.body) ? data.table.body.length : 0;
          const isLastRow = data.row.index === bodyLen - 1;
          if (isLastRow) {
            data.cell.styles.fillColor = undefined;
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fontSize = 10;
            data.cell.styles.cellPadding = 4;
            data.cell.styles.lineWidth = 0;
          }
        }
        // Style the last row for classic template
        if (invoiceTemplate === 'classic' && data.section === 'body') {
          const isLastRow = data.row.index === data.table.body.length - 1;
          if (isLastRow) {
            data.cell.styles.textColor = selectedColor.primary;
            data.cell.styles.fontStyle = 'bold';
          }
        }
        // Style for creative template - total row with colored background
        if (invoiceTemplate === 'creative' && data.section === 'body') {
          const bodyLen = (data.table && data.table.body) ? data.table.body.length : 0;
          const isLastRow = data.row.index === bodyLen - 1;
          if (isLastRow) {
            // Don't set fillColor here, it will be drawn in willDrawCell
            data.cell.styles.fillColor = undefined;
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fontSize = 10;
            data.cell.styles.cellPadding = 5;
            data.cell.styles.lineWidth = 0;
          } else {
            data.cell.styles.lineColor = [240, 240, 240];
          }
        }
        // Remove header background for creative template
        if (invoiceTemplate === 'creative' && data.section === 'head') {
          data.cell.styles.fillColor = undefined;
          data.cell.styles.lineWidth = 0;
        }
      },
      willDrawCell: function(data: any) {
        // Draw rounded background for modern template header row
        if (invoiceTemplate === 'modern' && data.section === 'head') {
          // Draw once per row only on the first column
          if (data.column.index === 0) {
            const doc = data.doc;
            
            // Calculate total width by summing column widths
            let totalWidth = 0;
            if (data.table && data.table.columns) {
              data.table.columns.forEach((col: any) => {
                totalWidth += col.width;
              });
            }
            
            const startX = data.table && (data.table as any).pageStartX ? (data.table as any).pageStartX : 20;
            const y = data.cell.y;
            const height = data.row.height;
            
            // Draw rounded rectangle with light colored background
            doc.setFillColor(selectedColor.light[0], selectedColor.light[1], selectedColor.light[2]);
            doc.roundedRect(startX, y, totalWidth, height, 2, 2, 'F');
          }
        }
        
        // Draw rounded background for classic template header row
        if (invoiceTemplate === 'classic' && data.section === 'head') {
          // Draw once per row only on the first column
          if (data.column.index === 0) {
            const doc = data.doc;
            
            // Calculate total width by summing column widths
            let totalWidth = 0;
            if (data.table && data.table.columns) {
              data.table.columns.forEach((col: any) => {
                totalWidth += col.width;
              });
            }
            
            const startX = data.table && (data.table as any).pageStartX ? (data.table as any).pageStartX : 20;
            const y = data.cell.y;
            const height = data.row.height;
            
            // Draw rounded rectangle with light colored background
            doc.setFillColor(selectedColor.light[0], selectedColor.light[1], selectedColor.light[2]);
            doc.roundedRect(startX, y, totalWidth, height, 1.5, 1.5, 'F');
          }
        }
        
        // Draw rounded background for creative template total row
        if (invoiceTemplate === 'creative' && data.section === 'body') {
          const bodyLen = (data.table && data.table.body) ? data.table.body.length : 0;
          const isLastRow = data.row.index === bodyLen - 1;
          
          // Draw once per row only on the first column
          if (isLastRow && data.column.index === 0) {
            const doc = data.doc;
            
            // Calculate total width by summing column widths
            let totalWidth = 0;
            if (data.table && data.table.columns) {
              data.table.columns.forEach((col: any) => {
                totalWidth += col.width;
              });
            }
            
            const startX = data.table && (data.table as any).pageStartX ? (data.table as any).pageStartX : 20;
            const y = data.cell.y;
            const height = data.row.height;
            
            // Draw rounded rectangle with colored background
            doc.setFillColor(selectedColor.primary[0], selectedColor.primary[1], selectedColor.primary[2]);
            doc.roundedRect(startX, y, totalWidth, height, 2, 2, 'F');
          }
        }
        
        // Draw rounded background for modern template total row
        if (invoiceTemplate === 'modern' && data.section === 'body') {
          const bodyLen = (data.table && data.table.body) ? data.table.body.length : 0;
          const isLastRow = data.row.index === bodyLen - 1;
          
          // Draw once per row only on the first column
          if (isLastRow && data.column.index === 0) {
            const doc = data.doc;
            
            // Calculate total width by summing column widths
            let totalWidth = 0;
            if (data.table && data.table.columns) {
              data.table.columns.forEach((col: any) => {
                totalWidth += col.width;
              });
            }
            
            const startX = data.table && (data.table as any).pageStartX ? (data.table as any).pageStartX : 20;
            const y = data.cell.y;
            const height = data.row.height;
            
            // Draw rounded rectangle with colored background
            doc.setFillColor(selectedColor.primary[0], selectedColor.primary[1], selectedColor.primary[2]);
            doc.roundedRect(startX, y, totalWidth, height, 2, 2, 'F');
          }
        }
      },
      didDrawCell: function(data: any) {
        // Add line above total row for professional template
        if (invoiceTemplate === 'professional' && data.section === 'body') {
          const bodyLen = data.table && data.table.body ? data.table.body.length : 0;
          const colLen = data.table && data.table.columns ? data.table.columns.length : 0;
          const isLastRow = bodyLen > 0 && data.row.index === bodyLen - 1;
          const isLastColumn = colLen > 0 && data.column.index === colLen - 1;
          
          if (isLastRow && isLastColumn) {
            const doc = data.doc;
            
            let tableWidth = 0;
            if (data.table && Array.isArray(data.table.columns)) {
              tableWidth = data.table.columns.reduce((sum: number, col: any) => sum + (col?.width || 0), 0);
            }
            
            const startX = (data.table && typeof (data.table as any).pageStartX === 'number')
              ? (data.table as any).pageStartX
              : 20;
            
            const lineY = data.cell.y;
            
            if (typeof startX === 'number' && tableWidth > 0 && typeof lineY === 'number') {
              const mediumR = Math.floor((selectedColor.light[0] + selectedColor.primary[0]) / 2);
              const mediumG = Math.floor((selectedColor.light[1] + selectedColor.primary[1]) / 2);
              const mediumB = Math.floor((selectedColor.light[2] + selectedColor.primary[2]) / 2);
              doc.setDrawColor(mediumR, mediumG, mediumB);
              doc.setLineWidth(0.5);
              doc.line(startX, lineY, startX + tableWidth, lineY);
            }
          }
        }
      },
      didDrawPage: function(data: any) {
        // Footer elements will be drawn on last page only
      }
    });
    
    // Add notes if available
    if (invoice.notes) {
      const finalY = (doc as any).autoTable.previous.finalY + 20;
      doc.setFontSize(12);
      doc.setTextColor(40, 40, 40);
      doc.text(`${tableHeaders.notes || 'Notes'}:`, 20, finalY);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      const splitNotes = doc.splitTextToSize(invoice.notes, 170);
      doc.text(splitNotes, 20, finalY + 10);
    }
    
    // Add terms if available
    if (invoice.terms) {
      const finalY = (doc as any).autoTable.previous.finalY + (invoice.notes ? 40 : 20);
      doc.setFontSize(12);
      doc.setTextColor(40, 40, 40);
      doc.text(`${tableHeaders.terms || 'Terms'}:`, 20, finalY);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      const splitTerms = doc.splitTextToSize(invoice.terms, 170);
      doc.text(splitTerms, 20, finalY + 10);
    }
    
    // Add footer message from company settings on last page only
    if (company.invoice_footer_message) {
      const hasNotes = !!invoice.notes;
      const hasTerms = !!invoice.terms;
      let offset = 20;
      if (hasNotes && hasTerms) offset = 60;
      else if (hasNotes || hasTerms) offset = 40;
      
      const finalY = (doc as any).autoTable.previous.finalY + offset;
      const pageSize = (doc as any).internal.pageSize;
      const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
      
      // Use client language to determine which footer message to use
      const footerMessage = clientLanguage === 'french'
        ? (company.invoice_footer_message_fr || company.invoice_footer_message)
        : company.invoice_footer_message;
      
      const thankYouText = clientLanguage === 'french' ? 'Merci pour votre confiance !' : 'Thank you for your business!';
      
      // Check if we have enough space, otherwise add new page
      if (finalY > pageHeight - 40) {
        doc.addPage();
        // Add decorative footer on new page
        if (invoiceTemplate === 'modern') {
          doc.setFillColor(selectedColor.light[0], selectedColor.light[1], selectedColor.light[2]);
          doc.rect(0, pageHeight - 30, 210, 30, 'F');
        } else if (invoiceTemplate === 'professional') {
          doc.setDrawColor(selectedColor.primary[0], selectedColor.primary[1], selectedColor.primary[2]);
          doc.setLineWidth(2);
          doc.line(20, pageHeight - 25, 190, pageHeight - 25);
        }
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'italic');
        const splitFooter = doc.splitTextToSize(footerMessage, 170);
        doc.text(splitFooter, 20, 20);
        // Add thank you text at bottom
        doc.setFontSize(8);
        doc.setTextColor(invoiceTemplate === 'creative' ? selectedColor.primary[0] : 100, 
                        invoiceTemplate === 'creative' ? selectedColor.primary[1] : 100, 
                        invoiceTemplate === 'creative' ? selectedColor.primary[2] : 100);
        doc.text(thankYouText, 20, pageHeight - 20);
      } else {
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'italic');
        const splitFooter = doc.splitTextToSize(footerMessage, 170);
        doc.text(splitFooter, 20, finalY);
        
        // Add decorative footer elements on last page
        if (invoiceTemplate === 'modern') {
          doc.setFillColor(selectedColor.light[0], selectedColor.light[1], selectedColor.light[2]);
          doc.rect(0, pageHeight - 30, 210, 30, 'F');
        } else if (invoiceTemplate === 'professional') {
          doc.setDrawColor(selectedColor.primary[0], selectedColor.primary[1], selectedColor.primary[2]);
          doc.setLineWidth(2);
          doc.line(20, pageHeight - 25, 190, pageHeight - 25);
        }
        
        // Add thank you text at bottom of last page
        doc.setFontSize(8);
        doc.setTextColor(invoiceTemplate === 'creative' ? selectedColor.primary[0] : 100, 
                        invoiceTemplate === 'creative' ? selectedColor.primary[1] : 100, 
                        invoiceTemplate === 'creative' ? selectedColor.primary[2] : 100);
        doc.text(thankYouText, 20, pageHeight - 20);
      }
    } else {
      // If no footer message, still add decorative footer and thank you text on last page
      const pageSize = (doc as any).internal.pageSize;
      const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
      const thankYouText = clientLanguage === 'french' ? 'Merci pour votre confiance !' : 'Thank you for your business!';
      
      // Add decorative footer elements
      if (invoiceTemplate === 'modern') {
        doc.setFillColor(selectedColor.light[0], selectedColor.light[1], selectedColor.light[2]);
        doc.rect(0, pageHeight - 30, 210, 30, 'F');
      } else if (invoiceTemplate === 'professional') {
        doc.setDrawColor(selectedColor.primary[0], selectedColor.primary[1], selectedColor.primary[2]);
        doc.setLineWidth(2);
        doc.line(20, pageHeight - 25, 190, pageHeight - 25);
      }
      
      doc.setFontSize(8);
      doc.setTextColor(invoiceTemplate === 'creative' ? selectedColor.primary[0] : 100, 
                      invoiceTemplate === 'creative' ? selectedColor.primary[1] : 100, 
                      invoiceTemplate === 'creative' ? selectedColor.primary[2] : 100);
      doc.text(thankYouText, 20, pageHeight - 20);
    }
    
    // Generate PDF as buffer
    const pdfBuffer = doc.output('arraybuffer');
    const pdfBytes = new Uint8Array(pdfBuffer);
    
    // Convert PDF to base64 safely
    let pdfBinaryString = '';
    for (let i = 0; i < pdfBytes.length; i++) {
      pdfBinaryString += String.fromCharCode(pdfBytes[i]);
    }
    const pdfBase64 = btoa(pdfBinaryString);

    // Create HTML email content
    // Build items HTML including product taxes per item
    const itemsHtml = (invoice.invoice_items || []).map((item: any) => {
      const baseRow = `
                  <tr>
                    <td style="padding: 10px; border: 1px solid #dee2e6;">${item.description}</td>
                    <td style="padding: 10px; text-align: center; border: 1px solid #dee2e6;">${item.quantity}</td>
                    <td style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">$${item.unit_price.toFixed(2)}</td>
                    <td style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">$${item.total.toFixed(2)}</td>
                  </tr>`;
      let taxesRow = '';
      if (item.product_taxes && Array.isArray(item.product_taxes) && item.product_taxes.length > 0) {
        item.product_taxes.forEach((t: any) => {
          // Support both old format and new format
          const taxType = t.type || 'percentage';
          const taxValue = t.value !== undefined ? t.value : t.percentage;
          
          let taxAmount = 0;
          if (taxType === 'percentage') {
            taxAmount = item.total * (taxValue / 100);
          } else {
            taxAmount = taxValue * item.quantity;
          }
          
          const taxLabel = taxType === 'percentage' ? `${taxValue}%` : `$${taxValue}`;
          
          taxesRow += `
                  <tr>
                    <td style="padding: 10px; border: 1px solid #dee2e6; color: #555; padding-left: 30px;">${tableHeaders.tax}: ${t.name} (${taxLabel})</td>
                    <td style="padding: 10px; text-align: center; border: 1px solid #dee2e6;"></td>
                    <td style="padding: 10px; text-align: right; border: 1px solid #dee2e6;"></td>
                    <td style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">$${taxAmount.toFixed(2)}</td>
                  </tr>`;
        });
      }
      return baseRow + taxesRow;
    }).join('');

    // Build company taxes rows
    let companyTaxesHtml = '';
    if (company.taxes && Array.isArray(company.taxes) && company.taxes.length > 0) {
      companyTaxesHtml = company.taxes.map((tax: any) => {
        const taxAmount = invoice.subtotal * (tax.percentage / 100);
        return `
                <tr style="background-color: #f8f9fa;">
                  <td colspan="3" style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">${tax.name} (${tax.percentage}%):</td>
                  <td style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">$${taxAmount.toFixed(2)}</td>
                </tr>`;
      }).join('');
    } else if (invoice.tax_amount > 0) {
      companyTaxesHtml = `
                <tr style="background-color: #f8f9fa;">
                  <td colspan="3" style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">${tableHeaders.tax}:</td>
                  <td style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">$${invoice.tax_amount.toFixed(2)}</td>
                </tr>`;
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; display: flex; align-items: center; gap: 20px;">
          ${company.logo_url && logoBase64 ? `<img src="data:${logoMime || 'image/png'};base64,${logoBase64}" alt="${company.name} Logo" style="max-width: 80px; max-height: 60px; object-fit: contain;" />` : ''}
          <div>
            <h1 style="color: #333; margin: 0;">${company.name}</h1>
            <h2 style="color: #666; margin: 5px 0 0 0;">${clientLanguage === 'french' ? 'Facture' : 'Invoice'} ${invoice.invoice_number}</h2>
          </div>
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
                ${itemsHtml}
                <tr style="background-color: #f8f9fa; font-weight: bold;">
                  <td colspan="3" style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">${tableHeaders.subtotal}:</td>
                  <td style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">$${invoice.subtotal.toFixed(2)}</td>
                </tr>
                ${companyTaxesHtml}
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
    const emailPayload: any = {
      from: `${company.name} <info@gestionflow.net>`,
      to: emailsToSend,
      subject: emailSubject,
      html: htmlContent,
      attachments: [
        {
          filename: `invoice-${invoice.invoice_number}.pdf`,
          content: pdfBase64,
          type: 'application/pdf',
        },
      ],
    };
    
    // Add CC emails if provided
    if (ccEmails && ccEmails.length > 0) {
      const validCcEmails = ccEmails.filter(email => email.trim() !== "");
      if (validCcEmails.length > 0) {
        emailPayload.cc = validCcEmails;
      }
    }
    
    const emailResponse = await resend.emails.send(emailPayload);

    console.log(`Email sent successfully to ${emailsToSend.length} recipient(s):`, emailResponse);

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
