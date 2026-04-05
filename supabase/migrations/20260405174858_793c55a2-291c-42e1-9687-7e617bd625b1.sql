-- Add chargeback/receipt acknowledgment clause fields to clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS chargeback_clause_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS chargeback_clause_text text DEFAULT NULL;