-- Add field to enable automatic payment link in invoice emails
ALTER TABLE clients
ADD COLUMN include_payment_link boolean DEFAULT false;