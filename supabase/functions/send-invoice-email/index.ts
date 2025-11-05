import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.4';
import { jsPDF } from "npm:jspdf@2.5.1";
import "npm:jspdf-autotable@3.8.2";
import { translateTemplate, emailTranslations } from './translations.ts';
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
      invoiceColor 
    } = validationResult.data;

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

    // Define table headers based on language
    const translations = isFrench ? {
      invoice: 'FACTURE',
      billTo: 'Facturer à :',
      invoiceNumber: 'Numéro de facture',
      issueDate: 'Date d\'émission',
      dueDate: 'Date d\'échéance',
      status: 'Statut',
      description: 'Description',
      qty: 'Qté',
      unitPrice: 'Prix unitaire',
      total: 'Total',
      subtotal: 'Sous-total',
      tax: 'Taxe',
      notes: 'Notes',
      terms: 'Conditions',
      thankYou: 'Merci pour votre confiance !',
      phone: 'Téléphone',
      email: 'Courriel',
      website: 'Site web'
    } : {
      invoice: 'INVOICE',
      billTo: 'Bill To:',
      invoiceNumber: 'Invoice Number',
      issueDate: 'Issue Date',
      dueDate: 'Due Date',
      status: 'Status',
      description: 'Description',
      qty: 'Qty',
      unitPrice: 'Unit Price',
      total: 'Total',
      subtotal: 'Subtotal',
      tax: 'Tax',
      notes: 'Notes',
      terms: 'Terms',
      thankYou: 'Thank you for your business!',
      phone: 'Phone',
      email: 'Email',
      website: 'Website'
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
    let logoBase64 = '';
    let logoMime = '';
    
    // Right side - Company Logo
    if (company.logo_url) {
      try {
        console.log('Attempting to load logo from:', company.logo_url);
        
        const logoResponse = await fetch(company.logo_url);
        console.log('Logo response status:', logoResponse.status);
        
        if (logoResponse.ok) {
          const logoBuffer = await logoResponse.arrayBuffer();
          console.log('Logo buffer size:', logoBuffer.byteLength);
          
          const bytes = new Uint8Array(logoBuffer);
          
          let binaryString = '';
          for (let i = 0; i < bytes.length; i++) {
            binaryString += String.fromCharCode(bytes[i]);
          }
          logoBase64 = btoa(binaryString);
          
          let imageFormat = 'PNG';
          if (company.logo_url.toLowerCase().includes('.jpg') || 
              company.logo_url.toLowerCase().includes('.jpeg')) {
            imageFormat = 'JPEG';
          }
          
          console.log('Adding logo to PDF with format:', imageFormat);
          
          logoMime = imageFormat === 'JPEG' ? 'image/jpeg' : 'image/png';
          
          const dataUrl = `data:image/${imageFormat.toLowerCase()};base64,${logoBase64}`;
          let logoWidth = 40;
          let logoHeight = 20;
          try {
            const props = (doc as any).getImageProperties(dataUrl);
            if (props && props.width && props.height) {
              const imgRatio = props.width / props.height;
              logoWidth = 40;
              logoHeight = logoWidth / imgRatio;
              if (logoHeight > 20) {
                logoHeight = 20;
                logoWidth = logoHeight * imgRatio;
              }
            }
          } catch (_e) {
            logoWidth = 40;
            logoHeight = 20;
          }
          
          console.log('Logo dimensions for PDF:', logoWidth, 'x', logoHeight);
          
          const logoX = 210 - 20 - logoWidth;
          doc.addImage(dataUrl, imageFormat, logoX, headerHeight - 5, logoWidth, logoHeight);
          console.log('Logo successfully added to PDF');
        }
      } catch (error) {
        console.error('Error loading logo, continuing without logo:', error);
      }
    }
    
    // Left side - Company Name and Address
    if (company) {
      if (invoiceTemplate === 'creative') {
        doc.setFillColor(selectedColor.light[0], selectedColor.light[1], selectedColor.light[2]);
        const companyNameWidth = doc.getStringUnitWidth(company.name) * 12 / doc.internal.scaleFactor;
        const boxPadding = 8;
        const boxWidth = companyNameWidth + boxPadding;
        doc.roundedRect(18, headerHeight - 5, boxWidth, 8, 2, 2, 'F');
        
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
      if (company.tax_id) {
        doc.text(`${company.tax_id}`, 20, yPos);
        yPos += 5;
      }
    }
    
    // Separator line after header (not for creative or modern template)
    if (invoiceTemplate !== 'creative' && invoiceTemplate !== 'modern') {
      if (invoiceTemplate === 'classic') {
        doc.setDrawColor(selectedColor.light[0], selectedColor.light[1], selectedColor.light[2]);
      } else {
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
      doc.text(`${translations.status}: ${invoice.status.toUpperCase()}`, 20, 50);
    }
    
    // Client information
    const clientInfoY = emailType === "payment_confirmation" ? 60 : 50;
    let nextY = clientInfoY;
    if (client) {
      if (invoiceTemplate === 'modern') {
        doc.setFillColor(245, 245, 245);
        const boxHeight = 20 + (client.contact_person ? 5 : 0) + (client.address ? 5 : 0);
        doc.roundedRect(20, clientInfoY - 3, 170, boxHeight, 2, 2, 'F');
      } else if (invoiceTemplate === 'creative') {
        const boxHeight = 20 + (client.contact_person ? 5 : 0) + (client.address ? 5 : 0);
        
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(20, clientInfoY - 3, 170, boxHeight, 2, 2, 'F');
        
        doc.setDrawColor(selectedColor.light[0], selectedColor.light[1], selectedColor.light[2]);
        doc.setLineWidth(0.5);
        doc.roundedRect(20, clientInfoY - 3, 170, boxHeight, 2, 2, 'S');
      }
      
      const textYOffset = invoiceTemplate === 'creative' ? 2 : invoiceTemplate === 'modern' ? 2 : 0;
      
      doc.setFontSize(11);
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
      doc.text(translations.billTo, leftMargin, clientInfoY + textYOffset);
      
      // Right side - Invoice Number and Date (aligned with Bill To)
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      if (invoiceTemplate === 'professional') {
        const mediumR = Math.floor((selectedColor.light[0] + selectedColor.primary[0]) / 2);
        const mediumG = Math.floor((selectedColor.light[1] + selectedColor.primary[1]) / 2);
        const mediumB = Math.floor((selectedColor.light[2] + selectedColor.primary[2]) / 2);
        doc.setTextColor(mediumR, mediumG, mediumB);
      } else {
        doc.setTextColor(40, 40, 40);
      }
      const invoiceTitle = `${translations.invoice} ${invoice.invoice_number}`;
      const titleWidth = doc.getTextWidth(invoiceTitle);
      doc.text(invoiceTitle, 210 - rightMargin - titleWidth, clientInfoY + textYOffset);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      const issueDateText = `${translations.issueDate}: ${invoice.issue_date}`;
      const issueDateWidth = doc.getTextWidth(issueDateText);
      doc.text(issueDateText, 210 - rightMargin - issueDateWidth, clientInfoY + 6 + textYOffset);
      
      if (invoice.due_date) {
        const dueDateText = `${translations.dueDate}: ${invoice.due_date}`;
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
    
    if (invoiceTemplate === 'classic') {
      doc.setDrawColor(selectedColor.light[0], selectedColor.light[1], selectedColor.light[2]);
      doc.setLineWidth(0.5);
      doc.line(20, startY - 5, 190, startY - 5);
    }
    
    const tableHeaders = [translations.description, translations.qty, translations.unitPrice, translations.total];
    const tableData: any[] = [];
    
    if (invoice.invoice_items && invoice.invoice_items.length > 0) {
      invoice.invoice_items.forEach((item: any) => {
        tableData.push([
          item.description,
          item.quantity.toString(),
          `$${item.unit_price.toFixed(2)}`,
          `$${item.total.toFixed(2)}`
        ]);
        
        if (item.notes) {
          tableData.push([
            `      ${translations.notes}: ${item.notes}`,
            '',
            '',
            ''
          ]);
        }
        
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
              `  ${translations.tax}: ${taxDetails}`,
              '',
              '',
              `$${taxAmount.toFixed(2)}`
            ]);
          });
        }
      });
    } else {
      tableData.push(['Invoice items not available', '', '', '']);
    }
    
    tableData.push(['', '', `${translations.subtotal}:`, `$${invoice.subtotal.toFixed(2)}`]);
    
    if (company?.taxes && Array.isArray(company.taxes) && company.taxes.length > 0) {
      company.taxes.forEach((tax: any) => {
        const taxAmount = invoice.subtotal * (tax.percentage / 100);
        tableData.push(['', '', `${tax.name} (${tax.percentage}%):`, `$${taxAmount.toFixed(2)}`]);
      });
    } else if (invoice.tax_amount > 0) {
      tableData.push(['', '', `${translations.tax}:`, `$${invoice.tax_amount.toFixed(2)}`]);
    }
    
    tableData.push(['', '', `${translations.total}:`, `$${invoice.total.toFixed(2)}`]);
    
    const tableTheme = invoiceTemplate === 'professional' ? 'grid' : 
                      invoiceTemplate === 'modern' ? 'plain' : 
                      invoiceTemplate === 'classic' ? 'grid' : 
                      invoiceTemplate === 'creative' ? 'plain' : 'plain';
    
    (doc as any).autoTable({
      head: [tableHeaders],
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
        if (invoiceTemplate === 'classic' && data.section === 'body') {
          const isLastRow = data.row.index === data.table.body.length - 1;
          if (isLastRow) {
            data.cell.styles.textColor = selectedColor.primary;
            data.cell.styles.fontStyle = 'bold';
          }
        }
        if (invoiceTemplate === 'creative' && data.section === 'body') {
          const bodyLen = (data.table && data.table.body) ? data.table.body.length : 0;
          const isLastRow = data.row.index === bodyLen - 1;
          if (isLastRow) {
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
        if (invoiceTemplate === 'creative' && data.section === 'head') {
          data.cell.styles.fillColor = undefined;
          data.cell.styles.lineWidth = 0;
        }
      },
      willDrawCell: function(data: any) {
        if (invoiceTemplate === 'modern' && data.section === 'head') {
          if (data.column.index === 0) {
            const doc = data.doc;
            
            let totalWidth = 0;
            if (data.table && data.table.columns) {
              data.table.columns.forEach((col: any) => {
                totalWidth += col.width;
              });
            }
            
            const startX = data.table && (data.table as any).pageStartX ? (data.table as any).pageStartX : 20;
            const y = data.cell.y;
            const height = data.row.height;
            
            doc.setFillColor(selectedColor.light[0], selectedColor.light[1], selectedColor.light[2]);
            doc.roundedRect(startX, y, totalWidth, height, 2, 2, 'F');
          }
        }
        
        if (invoiceTemplate === 'classic' && data.section === 'head') {
          if (data.column.index === 0) {
            const doc = data.doc;
            
            let totalWidth = 0;
            if (data.table && data.table.columns) {
              data.table.columns.forEach((col: any) => {
                totalWidth += col.width;
              });
            }
            
            const startX = data.table && (data.table as any).pageStartX ? (data.table as any).pageStartX : 20;
            const y = data.cell.y;
            const height = data.row.height;
            
            doc.setFillColor(selectedColor.light[0], selectedColor.light[1], selectedColor.light[2]);
            doc.roundedRect(startX, y, totalWidth, height, 1.5, 1.5, 'F');
          }
        }
        
        if (invoiceTemplate === 'creative' && data.section === 'body') {
          const bodyLen = (data.table && data.table.body) ? data.table.body.length : 0;
          const isLastRow = data.row.index === bodyLen - 1;
          
          if (isLastRow && data.column.index === 0) {
            const doc = data.doc;
            
            let totalWidth = 0;
            if (data.table && data.table.columns) {
              data.table.columns.forEach((col: any) => {
                totalWidth += col.width;
              });
            }
            
            const startX = data.table && (data.table as any).pageStartX ? (data.table as any).pageStartX : 20;
            const y = data.cell.y;
            const height = data.row.height;
            
            doc.setFillColor(selectedColor.primary[0], selectedColor.primary[1], selectedColor.primary[2]);
            doc.roundedRect(startX, y, totalWidth, height, 2, 2, 'F');
          }
        }
        
        if (invoiceTemplate === 'modern' && data.section === 'body') {
          const bodyLen = (data.table && data.table.body) ? data.table.body.length : 0;
          const isLastRow = data.row.index === bodyLen - 1;
          
          if (isLastRow && data.column.index === 0) {
            const doc = data.doc;
            
            let totalWidth = 0;
            if (data.table && data.table.columns) {
              data.table.columns.forEach((col: any) => {
                totalWidth += col.width;
              });
            }
            
            const startX = data.table && (data.table as any).pageStartX ? (data.table as any).pageStartX : 20;
            const y = data.cell.y;
            const height = data.row.height;
            
            doc.setFillColor(selectedColor.primary[0], selectedColor.primary[1], selectedColor.primary[2]);
            doc.roundedRect(startX, y, totalWidth, height, 2, 2, 'F');
          }
        }
      },
      didDrawCell: function(data: any) {
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
      didDrawPage: function(_data: any) {
      }
    });
    
    const tableEndY = (doc as any).lastAutoTable?.finalY || (doc as any).autoTable?.previous?.finalY || startY + 100;
    
    if (invoice.notes) {
      const finalY = tableEndY + 20;
      doc.setFontSize(12);
      doc.setTextColor(40, 40, 40);
      doc.text(`${translations.notes}:`, 20, finalY);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      const splitNotes = doc.splitTextToSize(invoice.notes, 170);
      doc.text(splitNotes, 20, finalY + 10);
    }
    
    // Add invoice body message if available (appears after table)
    if (company && ((company as any).invoice_body_message_en || (company as any).invoice_body_message_fr)) {
      const hasNotes = !!invoice.notes;
      const hasTerms = !!invoice.terms;
      let offset = 20;
      if (hasNotes && hasTerms) offset = 60;
      else if (hasNotes || hasTerms) offset = 40;
      
      const finalY = tableEndY + offset;
      const bodyMessage = isFrench
        ? ((company as any).invoice_body_message_fr || (company as any).invoice_body_message_en)
        : ((company as any).invoice_body_message_en || (company as any).invoice_body_message_fr);
      
      if (bodyMessage) {
        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        doc.setFont('helvetica', 'normal');
        const splitBody = doc.splitTextToSize(bodyMessage, 170);
        doc.text(splitBody, 20, finalY);
      }
    }
    
    if (invoice.terms) {
      const hasNotes = !!invoice.notes;
      const hasBodyMessage = !!(company && ((company as any).invoice_body_message_en || (company as any).invoice_body_message_fr));
      let offset = 20;
      if (hasNotes && hasBodyMessage) offset = 80;
      else if (hasNotes || hasBodyMessage) offset = 50;
      else if (hasNotes) offset = 40;
      
      const finalY = tableEndY + offset;
      doc.setFontSize(12);
      doc.setTextColor(40, 40, 40);
      doc.text(`${translations.terms}:`, 20, finalY);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      const splitTerms = doc.splitTextToSize(invoice.terms, 170);
      doc.text(splitTerms, 20, finalY + 10);
    }
    
    if (company?.invoice_footer_message) {
      const hasNotes = !!invoice.notes;
      const hasTerms = !!invoice.terms;
      const hasBodyMessage = !!(company && ((company as any).invoice_body_message_en || (company as any).invoice_body_message_fr));
      let offset = 20;
      if (hasNotes && hasTerms && hasBodyMessage) offset = 100;
      else if ((hasNotes && hasTerms) || (hasNotes && hasBodyMessage) || (hasTerms && hasBodyMessage)) offset = 70;
      else if (hasNotes || hasTerms || hasBodyMessage) offset = 50;
      
      const finalY = tableEndY + offset;
      const pageSize = doc.internal.pageSize;
      const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
      
      const footerMessage = isFrench 
        ? ((company as any).invoice_footer_message_fr || company.invoice_footer_message)
        : company.invoice_footer_message;
      
      if (finalY > pageHeight - 40) {
        doc.addPage();
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
        doc.setFontSize(8);
        doc.setTextColor(invoiceTemplate === 'creative' ? selectedColor.primary[0] : 100, 
                        invoiceTemplate === 'creative' ? selectedColor.primary[1] : 100, 
                        invoiceTemplate === 'creative' ? selectedColor.primary[2] : 100);
        doc.text(translations.thankYou, 20, pageHeight - 20);
      } else {
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'italic');
        const splitFooter = doc.splitTextToSize(footerMessage, 170);
        doc.text(splitFooter, 20, finalY);
        
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
        doc.text(translations.thankYou, 20, pageHeight - 20);
      }
    } else {
      const pageSize = doc.internal.pageSize;
      const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
      
      if (invoiceTemplate === 'modern') {
        doc.setFillColor(selectedColor.light[0], selectedColor.light[1], selectedColor.light[2]);
        doc.rect(0, pageHeight - 30, 210, 30, 'F');
      } else if (invoiceTemplate === 'professional') {
        doc.setDrawColor(selectedColor.primary[0], selectedColor.primary[1], selectedColor.primary[2]);
        doc.setLineWidth(2);
        doc.line(20, pageHeight - 25, 190, pageHeight - 25);
      } else if (invoiceTemplate === 'creative') {
        doc.setDrawColor(selectedColor.light[0], selectedColor.light[1], selectedColor.light[2]);
        doc.setLineWidth(1);
        doc.line(20, pageHeight - 25, 190, pageHeight - 25);
      }
      
      doc.setFontSize(8);
      doc.setTextColor(invoiceTemplate === 'creative' ? selectedColor.primary[0] : 100, 
                      invoiceTemplate === 'creative' ? selectedColor.primary[1] : 100, 
                      invoiceTemplate === 'creative' ? selectedColor.primary[2] : 100);
      doc.text(translations.thankYou, 20, pageHeight - 20);
    }

    // Convert PDF to base64
    const pdfBase64 = doc.output('datauristring').split(',')[1];

    // Build rich HTML email
    const formatCurrency = (v: number) => new Intl.NumberFormat(isFrench ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' }).format(v || 0);
    const items: Array<any> = (invoice as any).invoice_items || [];
    const itemRows = items.map((it) => `
      <tr>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;">${it.description || ''}</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:center;">${Number(it.quantity || 0)}</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:right;">${formatCurrency(Number(it.unit_price || 0))}</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:right;">${formatCurrency(Number(it.total || 0))}</td>
      </tr>
    `).join('');

    const summaryRows = `
      <tr>
        <td colspan="3" style="padding:8px 12px;border:1px solid #e5e7eb;text-align:right;font-weight:600;">${isFrench ? 'Sous-total' : 'Subtotal'}:</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:right;">${formatCurrency(Number(invoice.subtotal || 0))}</td>
      </tr>
      ${Number(invoice.tax_amount || 0) > 0 ? `
      <tr>
        <td colspan="3" style="padding:8px 12px;border:1px solid #e5e7eb;text-align:right;">${isFrench ? 'Taxes' : 'Taxes'}:</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:right;">${formatCurrency(Number(invoice.tax_amount || 0))}</td>
      </tr>` : ''}
      <tr>
        <td colspan="3" style="padding:12px;border:1px solid #e5e7eb;text-align:right;font-weight:700;">${isFrench ? 'Montant total' : 'Total'}:</td>
        <td style="padding:12px;border:1px solid #e5e7eb;text-align:right;font-weight:700;">${formatCurrency(Number(invoice.total || 0))}</td>
      </tr>`;

    const emailHtml = `
      <div style="background:#f6f9fc;padding:24px;font-family:Arial,Helvetica,sans-serif;">
        <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #eaeaea;border-radius:8px;overflow:hidden;">
          <div style="display:flex;align-items:center;gap:12px;padding:20px 24px;background:#fafafa;border-bottom:1px solid #eaeaea;">
            ${company.logo_url ? `<img src="${company.logo_url}" alt="${company.name}" style="width:48px;height:48px;border-radius:8px;object-fit:cover;" />` : ''}
            <div>
              <div style="font-size:22px;font-weight:700;color:#111827;">${company.name}</div>
              <div style="font-size:14px;color:#6b7280;">${isFrench ? 'Facture' : 'Invoice'} ${invoice.invoice_number}</div>
            </div>
          </div>
          <div style="padding:20px 24px;">
            <div style="font-size:14px;line-height:1.7;color:#111827;">${emailMessage}</div>

            <h3 style="margin:24px 0 8px;font-size:16px;color:#111827;">${isFrench ? 'Résumé de la facture' : 'Invoice Summary'}</h3>
            <table style="width:100%;border-collapse:collapse;font-size:13px;color:#111827;">
              <thead>
                <tr style="background:#f3f4f6;">
                  <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;">${isFrench ? 'Description' : 'Description'}</th>
                  <th style="text-align:center;padding:10px 12px;border:1px solid #e5e7eb;">${isFrench ? 'Qté' : 'Qty'}</th>
                  <th style="text-align:right;padding:10px 12px;border:1px solid #e5e7eb;">${isFrench ? 'Prix unitaire' : 'Unit price'}</th>
                  <th style="text-align:right;padding:10px 12px;border:1px solid #e5e7eb;">${isFrench ? 'Total' : 'Total'}</th>
                </tr>
              </thead>
              <tbody>
                ${itemRows}
                ${summaryRows}
              </tbody>
            </table>
          </div>
        </div>
      </div>`;

    // Send email using Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: Deno.env.get('RESEND_FROM') || 'onboarding@resend.dev',
      to: emailsToSend,
      cc: ccEmails && ccEmails.length > 0 ? ccEmails : undefined,
      subject: emailSubject,
      html: emailHtml,
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
