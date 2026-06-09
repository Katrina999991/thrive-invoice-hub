CREATE POLICY "Users can update their own notice attachments"
ON public.formal_notice_attachments
FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.invoice_formal_notices n WHERE n.id = formal_notice_attachments.formal_notice_id AND n.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.invoice_formal_notices n WHERE n.id = formal_notice_attachments.formal_notice_id AND n.user_id = auth.uid()));