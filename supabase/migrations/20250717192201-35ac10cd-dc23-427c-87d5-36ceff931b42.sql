-- Add payment confirmation email fields to companies table
ALTER TABLE public.companies 
ADD COLUMN payment_confirmation_email_subject TEXT DEFAULT 'Payment Confirmation - Invoice {invoice_number}',
ADD COLUMN payment_confirmation_email_message TEXT DEFAULT 'Dear {client_name},

We have successfully received your payment for invoice {invoice_number}.

Payment details:
- Invoice: {invoice_number}
- Amount: {total}
- Date paid: {payment_date}

Thank you for your prompt payment and continued business!

Best regards,
{company_name}';