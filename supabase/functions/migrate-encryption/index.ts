import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { encode as encodeBase64 } from "https://deno.land/std@0.190.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MIGRATE-ENCRYPTION] ${step}${detailsStr}`);
};

function encryptData(plaintext: string, key: string): string {
  if (!plaintext) return plaintext;
  
  // Check if already encrypted
  if (plaintext.startsWith("ENC:")) {
    return plaintext;
  }
  
  const textBytes = new TextEncoder().encode(plaintext);
  const keyBytes = new TextEncoder().encode(key);
  
  const encrypted = new Uint8Array(textBytes.length);
  for (let i = 0; i < textBytes.length; i++) {
    encrypted[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  
  return "ENC:" + encodeBase64(encrypted);
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

    logStep("Migration started", { userId: userData.user.id });

    const results = {
      clients: { total: 0, encrypted: 0, skipped: 0, errors: 0 },
      profiles: { total: 0, encrypted: 0, skipped: 0, errors: 0 },
    };

    // Migrate clients table
    logStep("Fetching clients...");
    const { data: clients, error: clientsError } = await supabaseClient
      .from("clients")
      .select("id, email, phone")
      .eq("user_id", userData.user.id);

    if (clientsError) {
      logStep("Error fetching clients", { error: clientsError.message });
    } else if (clients) {
      results.clients.total = clients.length;
      
      for (const client of clients) {
        try {
          const updates: Record<string, string> = {};
          let needsUpdate = false;
          
          if (client.email && !client.email.startsWith("ENC:")) {
            updates.email = encryptData(client.email, encryptionKey);
            needsUpdate = true;
          }
          
          if (client.phone && !client.phone.startsWith("ENC:")) {
            updates.phone = encryptData(client.phone, encryptionKey);
            needsUpdate = true;
          }
          
          if (needsUpdate) {
            const { error: updateError } = await supabaseClient
              .from("clients")
              .update(updates)
              .eq("id", client.id);
            
            if (updateError) {
              logStep("Error updating client", { id: client.id, error: updateError.message });
              results.clients.errors++;
            } else {
              results.clients.encrypted++;
            }
          } else {
            results.clients.skipped++;
          }
        } catch (err) {
          logStep("Client encryption error", { id: client.id, error: String(err) });
          results.clients.errors++;
        }
      }
    }

    // Migrate profiles table
    logStep("Fetching profiles...");
    const { data: profiles, error: profilesError } = await supabaseClient
      .from("profiles")
      .select("id, phone_number, recovery_email, stripe_account_id")
      .eq("user_id", userData.user.id);

    if (profilesError) {
      logStep("Error fetching profiles", { error: profilesError.message });
    } else if (profiles) {
      results.profiles.total = profiles.length;
      
      for (const profile of profiles) {
        try {
          const updates: Record<string, string> = {};
          let needsUpdate = false;
          
          if (profile.phone_number && !profile.phone_number.startsWith("ENC:")) {
            updates.phone_number = encryptData(profile.phone_number, encryptionKey);
            needsUpdate = true;
          }
          
          if (profile.recovery_email && !profile.recovery_email.startsWith("ENC:")) {
            updates.recovery_email = encryptData(profile.recovery_email, encryptionKey);
            needsUpdate = true;
          }
          
          if (profile.stripe_account_id && !profile.stripe_account_id.startsWith("ENC:")) {
            updates.stripe_account_id = encryptData(profile.stripe_account_id, encryptionKey);
            needsUpdate = true;
          }
          
          if (needsUpdate) {
            const { error: updateError } = await supabaseClient
              .from("profiles")
              .update(updates)
              .eq("id", profile.id);
            
            if (updateError) {
              logStep("Error updating profile", { id: profile.id, error: updateError.message });
              results.profiles.errors++;
            } else {
              results.profiles.encrypted++;
            }
          } else {
            results.profiles.skipped++;
          }
        } catch (err) {
          logStep("Profile encryption error", { id: profile.id, error: String(err) });
          results.profiles.errors++;
        }
      }
    }

    logStep("Migration completed", results);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Migration completed",
      results 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500,
    });
  }
});
