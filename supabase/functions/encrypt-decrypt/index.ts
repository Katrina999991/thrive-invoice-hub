import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { 
  encodeBase64, 
  decodeBase64 
} from "https://deno.land/std@0.190.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ENCRYPT-DECRYPT] ${step}${detailsStr}`);
};

// Simple XOR-based encryption with the key (for demonstration)
// In production, you'd want a proper AES implementation
function encryptData(plaintext: string, key: string): string {
  if (!plaintext) return plaintext;
  
  const textBytes = new TextEncoder().encode(plaintext);
  const keyBytes = new TextEncoder().encode(key);
  
  const encrypted = new Uint8Array(textBytes.length);
  for (let i = 0; i < textBytes.length; i++) {
    encrypted[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  
  // Add a prefix to identify encrypted data
  return "ENC:" + encodeBase64(encrypted);
}

function decryptData(ciphertext: string, key: string): string {
  if (!ciphertext) return ciphertext;
  
  // Check if data is encrypted
  if (!ciphertext.startsWith("ENC:")) {
    return ciphertext; // Return as-is if not encrypted
  }
  
  const base64Data = ciphertext.slice(4); // Remove "ENC:" prefix
  const encrypted = decodeBase64(base64Data);
  const keyBytes = new TextEncoder().encode(key);
  
  const decrypted = new Uint8Array(encrypted.length);
  for (let i = 0; i < encrypted.length; i++) {
    decrypted[i] = encrypted[i] ^ keyBytes[i % keyBytes.length];
  }
  
  return new TextDecoder().decode(decrypted);
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
          encryptedData[field] = encryptData(data[field], encryptionKey);
        }
      }
      
      logStep("Data encrypted", { fields });
      return new Response(JSON.stringify({ success: true, data: encryptedData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else if (action === "decrypt") {
      // Decrypt specified fields in the data object
      const decryptedData: Record<string, any> = { ...data };
      for (const field of fields) {
        if (data[field]) {
          decryptedData[field] = decryptData(data[field], encryptionKey);
        }
      }
      
      logStep("Data decrypted", { fields });
      return new Response(JSON.stringify({ success: true, data: decryptedData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else if (action === "encrypt-single") {
      // Encrypt a single value
      const encrypted = encryptData(data, encryptionKey);
      return new Response(JSON.stringify({ success: true, encrypted }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else if (action === "decrypt-single") {
      // Decrypt a single value
      const decrypted = decryptData(data, encryptionKey);
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
