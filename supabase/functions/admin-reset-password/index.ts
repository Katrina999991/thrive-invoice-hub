import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_USER_ID = "e6c5ca56-8437-4782-bc6a-3b0f77993ebc";

// AES-GCM encryption helpers using ENCRYPTION_KEY secret
async function getKey(): Promise<CryptoKey> {
  const raw = Deno.env.get("ENCRYPTION_KEY") ?? "";
  // Derive a 256-bit key from the secret via SHA-256 (works for any secret length)
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function encryptText(plain: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain))
  );
  const combined = new Uint8Array(iv.length + ct.length);
  combined.set(iv, 0);
  combined.set(ct, iv.length);
  return "enc:v1:" + btoa(String.fromCharCode(...combined));
}

async function decryptText(value: string): Promise<string> {
  if (!value || !value.startsWith("enc:v1:")) return value; // legacy plaintext
  try {
    const key = await getKey();
    const bin = Uint8Array.from(atob(value.slice(7)), (c) => c.charCodeAt(0));
    const iv = bin.slice(0, 12);
    const ct = bin.slice(12);
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
    return new TextDecoder().decode(pt);
  } catch (e) {
    console.error("[ADMIN-RESET-PASSWORD] Decrypt failed:", (e as Error).message);
    return "[decrypt error]";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Authentication failed");
    if (userData.user.id !== ADMIN_USER_ID) throw new Error("Unauthorized: Admin access required");

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "reset";

    if (action === "get-passwords") {
      // Return all stored test passwords (decrypt on the fly)
      const { data, error } = await supabaseClient
        .from("test_account_passwords")
        .select("user_id, email, password_plain, updated_at");

      if (error) throw error;

      const decrypted = await Promise.all(
        (data || []).map(async (row: any) => ({
          ...row,
          password_plain: await decryptText(row.password_plain || ""),
        }))
      );

      return new Response(JSON.stringify({ passwords: decrypted }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default: reset password
    const { userId, newPassword, email } = await req.json();
    if (!userId || !newPassword) throw new Error("Missing userId or newPassword");
    if (newPassword.length < 6) throw new Error("Password must be at least 6 characters");

    console.log(`[ADMIN-RESET-PASSWORD] Resetting password for user ${userId}`);

    const { error: updateError } = await supabaseClient.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (updateError) throw updateError;

    // Store password ENCRYPTED in test_account_passwords table
    const encrypted = await encryptText(newPassword);
    const { error: upsertError } = await supabaseClient
      .from("test_account_passwords")
      .upsert(
        { user_id: userId, email: email || "", password_plain: encrypted, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );

    if (upsertError) {
      console.error(`[ADMIN-RESET-PASSWORD] Failed to store password: ${upsertError.message}`);
    }

    console.log(`[ADMIN-RESET-PASSWORD] Success`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[ADMIN-RESET-PASSWORD] Error: ${msg}`);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
