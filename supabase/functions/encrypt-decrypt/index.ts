import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { encode as encodeBase64, decode as decodeBase64 } from "https://deno.land/std@0.190.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ENCRYPT-DECRYPT] ${step}${detailsStr}`);
};

// Convert string key to proper AES-256 key (32 bytes)
async function deriveKey(keyString: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(keyString);
  
  // Use SHA-256 to derive a consistent 32-byte key
  const hashBuffer = await crypto.subtle.digest('SHA-256', keyData);
  
  return await crypto.subtle.importKey(
    'raw',
    hashBuffer,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// AES-GCM encryption (industry standard)
async function encryptData(plaintext: string, keyString: string): Promise<string> {
  if (!plaintext) return plaintext;
  
  try {
    const key = await deriveKey(keyString);
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    
    // Generate random IV (12 bytes for AES-GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    
    // Combine IV + encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    // Add prefix to identify AES encrypted data
    return "AESENC:" + encodeBase64(combined);
  } catch (error) {
    logStep("Encryption error", { error: String(error) });
    throw new Error("Encryption failed");
  }
}

// AES-GCM decryption
async function decryptData(ciphertext: string, keyString: string): Promise<string> {
  if (!ciphertext) return ciphertext;
  
  // Handle new AES format
  if (ciphertext.startsWith("AESENC:")) {
    try {
      const key = await deriveKey(keyString);
      const base64Data = ciphertext.slice(7); // Remove "AESENC:" prefix
      const combined = decodeBase64(base64Data);
      
      // Extract IV (first 12 bytes) and encrypted data
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);
      
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted
      );
      
      return new TextDecoder().decode(decrypted);
    } catch (error) {
      logStep("Decryption error", { error: String(error) });
      throw new Error("Decryption failed");
    }
  }
  
  // Handle legacy XOR format for backwards compatibility (will be migrated)
  if (ciphertext.startsWith("ENC:")) {
    try {
      const base64Data = ciphertext.slice(4);
      const encrypted = decodeBase64(base64Data);
      const keyBytes = new TextEncoder().encode(keyString);
      
      const decrypted = new Uint8Array(encrypted.length);
      for (let i = 0; i < encrypted.length; i++) {
        decrypted[i] = encrypted[i] ^ keyBytes[i % keyBytes.length];
      }
      
      return new TextDecoder().decode(decrypted);
    } catch (error) {
      logStep("Legacy decryption error", { error: String(error) });
      throw new Error("Legacy decryption failed");
    }
  }
  
  // Return as-is if not encrypted
  return ciphertext;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const encryptionKey = Deno.env.get("ENCRYPTION_KEY");
    if (!encryptionKey) {
      throw new Error("Encryption key not configured");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Verify user is authenticated
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !userData.user) {
      throw new Error("Unauthorized");
    }

    const { action, data, fields } = await req.json();
    logStep("Request received", { action, userId: userData.user.id });

    if (action === "encrypt") {
      // Encrypt specified fields in the data object
      const encryptedData: Record<string, any> = { ...data };
      for (const field of fields) {
        if (data[field]) {
          encryptedData[field] = await encryptData(data[field], encryptionKey);
        }
      }
      
      logStep("Data encrypted with AES-256-GCM", { fields });
      return new Response(JSON.stringify({ success: true, data: encryptedData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else if (action === "decrypt") {
      // Decrypt specified fields in the data object
      const decryptedData: Record<string, any> = { ...data };
      for (const field of fields) {
        if (data[field]) {
          decryptedData[field] = await decryptData(data[field], encryptionKey);
        }
      }
      
      logStep("Data decrypted", { fields });
      return new Response(JSON.stringify({ success: true, data: decryptedData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else if (action === "encrypt-single") {
      // Encrypt a single value
      const encrypted = await encryptData(data, encryptionKey);
      return new Response(JSON.stringify({ success: true, encrypted }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else if (action === "decrypt-single") {
      // Decrypt a single value
      const decrypted = await decryptData(data, encryptionKey);
      return new Response(JSON.stringify({ success: true, decrypted }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      throw new Error("Invalid action. Use 'encrypt', 'decrypt', 'encrypt-single', or 'decrypt-single'");
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500,
    });
  }
});
