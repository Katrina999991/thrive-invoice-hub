import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base32Encode, decode as base32Decode } from "https://deno.land/std@0.168.0/encoding/base32.ts";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// TOTP configuration
const TOTP_PERIOD = 30; // seconds
const TOTP_DIGITS = 6;
const RECOVERY_CODE_COUNT = 10;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

// Generate a random secret for TOTP
function generateSecret(): string {
  const buffer = new Uint8Array(20);
  crypto.getRandomValues(buffer);
  return base32Encode(buffer).replace(/=/g, '');
}

// Generate recovery codes
function generateRecoveryCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < RECOVERY_CODE_COUNT; i++) {
    const buffer = new Uint8Array(5);
    crypto.getRandomValues(buffer);
    const code = Array.from(buffer)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
    // Format as XXXX-XXXX-XX
    codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 10)}`);
  }
  return codes;
}

// Hash recovery code for storage
async function hashRecoveryCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code.replace(/-/g, '').toUpperCase());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Add proper base32 padding
function addBase32Padding(secret: string): string {
  // Remove any existing padding and whitespace
  const cleaned = secret.replace(/[\s=]/g, '').toUpperCase();
  // Calculate padding needed (base32 requires length to be multiple of 8)
  const padLength = (8 - (cleaned.length % 8)) % 8;
  return cleaned + '='.repeat(padLength);
}

// HMAC-based OTP generation
async function generateHOTP(secret: string, counter: number): Promise<string> {
  // Decode the base32 secret with proper padding
  const paddedSecret = addBase32Padding(secret);
  console.log(`HOTP: secret length=${secret.length}, padded length=${paddedSecret.length}`);
  
  const secretBytes = base32Decode(paddedSecret);
  
  // Convert counter to 8-byte big-endian buffer
  const counterBuffer = new ArrayBuffer(8);
  const counterView = new DataView(counterBuffer);
  counterView.setBigUint64(0, BigInt(counter), false);
  
  // Import key for HMAC
  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes as unknown as BufferSource,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  
  // Generate HMAC
  const signature = await crypto.subtle.sign('HMAC', key, counterBuffer);
  const hmac = new Uint8Array(signature);
  
  // Dynamic truncation
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = (
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  ) % Math.pow(10, TOTP_DIGITS);
  
  return code.toString().padStart(TOTP_DIGITS, '0');
}

// Generate TOTP for current time
async function generateTOTP(secret: string, time?: number): Promise<string> {
  const counter = Math.floor((time || Date.now() / 1000) / TOTP_PERIOD);
  return generateHOTP(secret, counter);
}

// Verify TOTP with time window tolerance
async function verifyTOTP(secret: string, code: string, window: number = 1): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  
  for (let i = -window; i <= window; i++) {
    const counter = Math.floor((now + (i * TOTP_PERIOD)) / TOTP_PERIOD);
    const expectedCode = await generateHOTP(secret, counter);
    if (expectedCode === code) {
      return true;
    }
  }
  
  return false;
}

// Generate OTP Auth URI for QR code
function generateOtpAuthUri(secret: string, email: string, issuer: string = 'GestionFlow'): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedEmail = encodeURIComponent(email);
  return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}`;
}

// Simple encryption using Web Crypto API
async function encryptSecret(plaintext: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  
  // Derive key from password
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const derivedKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    derivedKey,
    data
  );
  
  // Combine salt + iv + encrypted data
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

// Decrypt secret
async function decryptSecret(ciphertext: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
  
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const encrypted = combined.slice(28);
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  const derivedKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    derivedKey,
    encrypted
  );
  
  return decoder.decode(decrypted);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY') || 'default-mfa-key';
    
    const authHeader = req.headers.get('Authorization');
    
    // Create service client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create user client for auth
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader || '' } }
    });
    
    const { action, code, recoveryCode, userId: bodyUserId } = await req.json();
    
    console.log(`MFA Action: ${action}`);
    
    // For login verification, we might not have a valid session yet
    let userId: string | undefined;
    
    if (action === 'verify-login' || action === 'verify-recovery-login') {
      // For login verification, get user ID from request body
      userId = bodyUserId;
    } else {
      // For other actions, require authentication
      const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
      if (authError || !user) {
        console.error('Auth error:', authError);
        return new Response(
          JSON.stringify({ error: 'Non autorisé' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      userId = user.id;
    }
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get user email for OTP URI
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
    const userEmail = userData?.user?.email || 'user@example.com';
    
    switch (action) {
      case 'setup': {
        // Generate new secret
        const secret = generateSecret();
        const otpAuthUri = generateOtpAuthUri(secret, userEmail);
        
        // Encrypt and store secret (not enabled yet)
        const encryptedSecret = await encryptSecret(secret, encryptionKey);
        
        // Check if user already has MFA setup
        const { data: existing } = await supabaseAdmin
          .from('mfa_secrets')
          .select('id, is_enabled')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (existing?.is_enabled) {
          return new Response(
            JSON.stringify({ error: 'MFA est déjà activé' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        if (existing) {
          // Update existing record
          await supabaseAdmin
            .from('mfa_secrets')
            .update({ encrypted_secret: encryptedSecret, updated_at: new Date().toISOString() })
            .eq('id', existing.id);
        } else {
          // Insert new record
          await supabaseAdmin
            .from('mfa_secrets')
            .insert({ user_id: userId, encrypted_secret: encryptedSecret });
        }
        
        // Log event
        await supabaseAdmin.from('mfa_audit_logs').insert({
          user_id: userId,
          event_type: 'setup_initiated',
          ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
          user_agent: req.headers.get('user-agent')
        });
        
        return new Response(
          JSON.stringify({ secret, otpAuthUri }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      case 'verify-setup': {
        if (!code) {
          return new Response(
            JSON.stringify({ error: 'Code requis' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Get stored secret
        const { data: mfaData } = await supabaseAdmin
          .from('mfa_secrets')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (!mfaData) {
          return new Response(
            JSON.stringify({ error: 'Configuration MFA non trouvée' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Decrypt secret
        const secret = await decryptSecret(mfaData.encrypted_secret, encryptionKey);
        
        // Verify the code
        const isValid = await verifyTOTP(secret, code);
        
        if (!isValid) {
          // Log failed attempt
          await supabaseAdmin.from('mfa_audit_logs').insert({
            user_id: userId,
            event_type: 'setup_verification_failed',
            success: false,
            ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
            user_agent: req.headers.get('user-agent')
          });
          
          return new Response(
            JSON.stringify({ error: 'Code invalide' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Generate recovery codes
        const recoveryCodes = generateRecoveryCodes();
        
        // Delete old recovery codes
        await supabaseAdmin
          .from('mfa_recovery_codes')
          .delete()
          .eq('user_id', userId);
        
        // Store hashed recovery codes
        const hashedCodes = await Promise.all(
          recoveryCodes.map(async (code) => ({
            user_id: userId,
            code_hash: await hashRecoveryCode(code)
          }))
        );
        
        await supabaseAdmin.from('mfa_recovery_codes').insert(hashedCodes);
        
        // Enable MFA
        await supabaseAdmin
          .from('mfa_secrets')
          .update({ 
            is_enabled: true, 
            enabled_at: new Date().toISOString(),
            failed_attempts: 0,
            locked_until: null
          })
          .eq('user_id', userId);
        
        // Log success
        await supabaseAdmin.from('mfa_audit_logs').insert({
          user_id: userId,
          event_type: 'mfa_enabled',
          success: true,
          ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
          user_agent: req.headers.get('user-agent')
        });
        
        return new Response(
          JSON.stringify({ success: true, recoveryCodes }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      case 'verify-login': {
        if (!code) {
          return new Response(
            JSON.stringify({ error: 'Code requis' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Get MFA data
        const { data: mfaData } = await supabaseAdmin
          .from('mfa_secrets')
          .select('*')
          .eq('user_id', userId)
          .eq('is_enabled', true)
          .maybeSingle();
        
        if (!mfaData) {
          return new Response(
            JSON.stringify({ error: 'MFA non configuré' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Check lockout
        if (mfaData.locked_until && new Date(mfaData.locked_until) > new Date()) {
          const remainingMinutes = Math.ceil((new Date(mfaData.locked_until).getTime() - Date.now()) / 60000);
          return new Response(
            JSON.stringify({ error: `Compte verrouillé. Réessayez dans ${remainingMinutes} minutes.` }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Decrypt and verify
        const secret = await decryptSecret(mfaData.encrypted_secret, encryptionKey);
        const isValid = await verifyTOTP(secret, code);
        
        if (!isValid) {
          const newFailedAttempts = (mfaData.failed_attempts || 0) + 1;
          const updateData: any = { failed_attempts: newFailedAttempts };
          
          if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
            updateData.locked_until = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60000).toISOString();
          }
          
          await supabaseAdmin
            .from('mfa_secrets')
            .update(updateData)
            .eq('user_id', userId);
          
          // Log failed attempt
          await supabaseAdmin.from('mfa_audit_logs').insert({
            user_id: userId,
            event_type: 'login_verification_failed',
            success: false,
            details: { attempts: newFailedAttempts },
            ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
            user_agent: req.headers.get('user-agent')
          });
          
          const remainingAttempts = MAX_FAILED_ATTEMPTS - newFailedAttempts;
          return new Response(
            JSON.stringify({ 
              error: remainingAttempts > 0 
                ? `Code invalide. ${remainingAttempts} tentative(s) restante(s).`
                : `Trop de tentatives. Compte verrouillé pour ${LOCKOUT_DURATION_MINUTES} minutes.`
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Reset failed attempts and update last verified
        await supabaseAdmin
          .from('mfa_secrets')
          .update({ 
            failed_attempts: 0, 
            locked_until: null,
            last_verified_at: new Date().toISOString()
          })
          .eq('user_id', userId);
        
        // Log success
        await supabaseAdmin.from('mfa_audit_logs').insert({
          user_id: userId,
          event_type: 'login_verification_success',
          success: true,
          ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
          user_agent: req.headers.get('user-agent')
        });
        
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      case 'verify-recovery-login': {
        if (!recoveryCode) {
          return new Response(
            JSON.stringify({ error: 'Code de récupération requis' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Hash the provided recovery code
        const hashedCode = await hashRecoveryCode(recoveryCode);
        
        // Find matching unused recovery code
        const { data: codeData } = await supabaseAdmin
          .from('mfa_recovery_codes')
          .select('*')
          .eq('user_id', userId)
          .eq('code_hash', hashedCode)
          .eq('is_used', false)
          .maybeSingle();
        
        if (!codeData) {
          // Log failed attempt
          await supabaseAdmin.from('mfa_audit_logs').insert({
            user_id: userId,
            event_type: 'recovery_code_failed',
            success: false,
            ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
            user_agent: req.headers.get('user-agent')
          });
          
          return new Response(
            JSON.stringify({ error: 'Code de récupération invalide ou déjà utilisé' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Mark code as used
        await supabaseAdmin
          .from('mfa_recovery_codes')
          .update({ is_used: true, used_at: new Date().toISOString() })
          .eq('id', codeData.id);
        
        // Reset failed attempts
        await supabaseAdmin
          .from('mfa_secrets')
          .update({ 
            failed_attempts: 0, 
            locked_until: null,
            last_verified_at: new Date().toISOString()
          })
          .eq('user_id', userId);
        
        // Count remaining codes
        const { count } = await supabaseAdmin
          .from('mfa_recovery_codes')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('is_used', false);
        
        // Log success
        await supabaseAdmin.from('mfa_audit_logs').insert({
          user_id: userId,
          event_type: 'recovery_code_used',
          success: true,
          details: { remaining_codes: count },
          ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
          user_agent: req.headers.get('user-agent')
        });
        
        return new Response(
          JSON.stringify({ success: true, remainingCodes: count }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      case 'disable': {
        if (!code) {
          return new Response(
            JSON.stringify({ error: 'Code MFA requis pour désactiver' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Get MFA data
        const { data: mfaData } = await supabaseAdmin
          .from('mfa_secrets')
          .select('*')
          .eq('user_id', userId)
          .eq('is_enabled', true)
          .maybeSingle();
        
        if (!mfaData) {
          return new Response(
            JSON.stringify({ error: 'MFA non activé' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Verify code
        const secret = await decryptSecret(mfaData.encrypted_secret, encryptionKey);
        const isValid = await verifyTOTP(secret, code);
        
        if (!isValid) {
          return new Response(
            JSON.stringify({ error: 'Code invalide' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Delete MFA secret
        await supabaseAdmin
          .from('mfa_secrets')
          .delete()
          .eq('user_id', userId);
        
        // Delete recovery codes
        await supabaseAdmin
          .from('mfa_recovery_codes')
          .delete()
          .eq('user_id', userId);
        
        // Log event
        await supabaseAdmin.from('mfa_audit_logs').insert({
          user_id: userId,
          event_type: 'mfa_disabled',
          success: true,
          ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
          user_agent: req.headers.get('user-agent')
        });
        
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      case 'status': {
        const { data: mfaData } = await supabaseAdmin
          .from('mfa_secrets')
          .select('is_enabled, enabled_at, last_verified_at')
          .eq('user_id', userId)
          .maybeSingle();
        
        const { count: unusedCodesCount } = await supabaseAdmin
          .from('mfa_recovery_codes')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('is_used', false);
        
        return new Response(
          JSON.stringify({ 
            enabled: mfaData?.is_enabled || false,
            enabledAt: mfaData?.enabled_at,
            lastVerifiedAt: mfaData?.last_verified_at,
            remainingRecoveryCodes: unusedCodesCount || 0
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      case 'check-mfa-required': {
        // Check if MFA is enabled for login flow
        const { data: mfaData } = await supabaseAdmin
          .from('mfa_secrets')
          .select('is_enabled')
          .eq('user_id', userId)
          .maybeSingle();
        
        return new Response(
          JSON.stringify({ mfaRequired: mfaData?.is_enabled || false }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      default:
        return new Response(
          JSON.stringify({ error: 'Action non reconnue' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('MFA Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
