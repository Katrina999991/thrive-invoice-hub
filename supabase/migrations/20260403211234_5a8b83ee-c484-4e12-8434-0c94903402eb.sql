
-- Advanced Late Fees: company-level auto-apply and cap settings
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS late_fee_auto_apply_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS late_fee_auto_apply_mode text NOT NULL DEFAULT 'manual_only',
  ADD COLUMN IF NOT EXISTS late_fee_cap_amount numeric DEFAULT NULL;

-- Advanced Late Fees: client-level override fields
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS late_fee_override_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS late_fee_enabled_override boolean DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS late_fee_type_override text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS late_fee_rate_override numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS late_fee_amount_override numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS late_fee_grace_days_override integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS late_fee_auto_apply_mode_override text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS late_fee_cap_amount_override numeric DEFAULT NULL;

-- Advanced Late Fees: enhanced audit fields on invoice_late_fees
ALTER TABLE public.invoice_late_fees
  ADD COLUMN IF NOT EXISTS company_id uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS client_id uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS rate_used numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS remaining_balance_at_calc numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS grace_days_used integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cap_in_effect numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS removed_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS removed_by uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS removal_reason text DEFAULT NULL;
