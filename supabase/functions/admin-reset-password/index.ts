import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_USER_ID = "e6c5ca56-8437-4782-bc6a-3b0f77993ebc";

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
      // Return all stored test passwords
      const { data, error } = await supabaseClient
        .from("test_account_passwords")
        .select("user_id, email, password_plain, updated_at");

      if (error) throw error;

      return new Response(JSON.stringify({ passwords: data || [] }), {
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

    // Store password in test_account_passwords table
    const { error: upsertError } = await supabaseClient
      .from("test_account_passwords")
      .upsert(
        { user_id: userId, email: email || "", password_plain: newPassword, updated_at: new Date().toISOString() },
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
