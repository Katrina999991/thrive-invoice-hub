-- Add invoice email settings to companies table
ALTER TABLE public.companies 
ADD COLUMN invoice_email_subject TEXT DEFAULT 'Invoice {invoice_number} from {company_name}',
ADD COLUMN invoice_email_message TEXT DEFAULT 'Dear {client_name},

Please find attached your invoice {invoice_number} dated {issue_date}.

Amount due: ${total}
Due date: {due_date}

Thank you for your business!

Best regards,
{company_name}';