
CREATE POLICY "Users can update late fees on their invoices"
ON public.invoice_late_fees
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM invoices i WHERE i.id = invoice_late_fees.invoice_id AND i.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM invoices i WHERE i.id = invoice_late_fees.invoice_id AND i.user_id = auth.uid()
));
