-- Add overdue payment email settings to companies table
ALTER TABLE public.companies 
ADD COLUMN overdue_email_subject TEXT DEFAULT 'Payment Overdue - Invoice {invoice_number}',
ADD COLUMN overdue_email_message TEXT DEFAULT 'Dear {client_name},

This is a friendly reminder that your invoice {invoice_number} dated {issue_date} is now overdue.

Original amount: ${total}
Due date: {due_date}
Days overdue: {days_overdue}

Please remit payment at your earliest convenience to avoid any late fees.

If you have already sent payment, please disregard this notice.

Thank you for your prompt attention to this matter.

Best regards,
{company_name}';