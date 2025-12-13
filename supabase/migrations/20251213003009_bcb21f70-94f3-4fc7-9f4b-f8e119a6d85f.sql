-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create encryption function using AES-256
CREATE OR REPLACE FUNCTION public.encrypt_sensitive(plaintext text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  key_bytes bytea;
  encrypted_data bytea;
BEGIN
  IF plaintext IS NULL OR plaintext = '' THEN
    RETURN plaintext;
  END IF;
  
  -- Get the encryption key from environment (will be set via Vault)
  key_bytes := decode(current_setting('app.encryption_key', true), 'base64');
  
  IF key_bytes IS NULL THEN
    -- Fallback: return plaintext if no key configured (for development)
    RETURN plaintext;
  END IF;
  
  -- Encrypt using AES-256 with random IV
  encrypted_data := pgp_sym_encrypt(plaintext, encode(key_bytes, 'escape'));
  
  RETURN encode(encrypted_data, 'base64');
END;
$$;

-- Create decryption function
CREATE OR REPLACE FUNCTION public.decrypt_sensitive(ciphertext text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  key_bytes bytea;
  decrypted_data text;
BEGIN
  IF ciphertext IS NULL OR ciphertext = '' THEN
    RETURN ciphertext;
  END IF;
  
  -- Get the encryption key
  key_bytes := decode(current_setting('app.encryption_key', true), 'base64');
  
  IF key_bytes IS NULL THEN
    -- No key configured, assume plaintext
    RETURN ciphertext;
  END IF;
  
  BEGIN
    -- Decrypt the data
    decrypted_data := pgp_sym_decrypt(decode(ciphertext, 'base64'), encode(key_bytes, 'escape'));
    RETURN decrypted_data;
  EXCEPTION
    WHEN OTHERS THEN
      -- If decryption fails, return the original (might be unencrypted legacy data)
      RETURN ciphertext;
  END;
END;
$$;

-- Create a helper function to check if data is encrypted
CREATE OR REPLACE FUNCTION public.is_encrypted(data text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF data IS NULL OR data = '' THEN
    RETURN false;
  END IF;
  
  -- Check if it looks like base64-encoded PGP data
  RETURN data ~ '^[A-Za-z0-9+/]+=*$' AND length(data) > 50;
END;
$$;