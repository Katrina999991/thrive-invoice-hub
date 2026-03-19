
CREATE TABLE public.test_account_passwords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email text NOT NULL,
  password_plain text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.test_account_passwords ENABLE ROW LEVEL SECURITY;

-- No RLS policies - only accessible via service role (edge functions)
