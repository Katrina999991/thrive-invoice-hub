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

    const { userId, planType } = await req.json();
    if (!userId || !planType) throw new Error("Missing userId or planType");
    if (!["free", "premium", "pro"].includes(planType)) throw new Error("Invalid plan type");

    console.log(`[UPDATE-USER-PLAN] Updating user ${userId} to plan ${planType}`);

    // Update user_subscriptions
    const { data: existing } = await supabaseClient
      .from("user_subscriptions")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabaseClient
        .from("user_subscriptions")
        .update({ plan_type: planType, started_at: new Date().toISOString() })
        .eq("user_id", userId);
      if (error) throw error;
    } else {
      const { error } = await supabaseClient
        .from("user_subscriptions")
        .insert({ user_id: userId, plan_type: planType, started_at: new Date().toISOString() });
      if (error) throw error;
    }

    // Also update company_subscriptions for all companies owned by this user
    const { data: companies } = await supabaseClient
      .from("companies")
      .select("id")
      .eq("user_id", userId);

    if (companies && companies.length > 0) {
      for (const company of companies) {
        const { data: compSub } = await supabaseClient
          .from("company_subscriptions")
          .select("id")
          .eq("company_id", company.id)
          .maybeSingle();

        if (compSub) {
          await supabaseClient
            .from("company_subscriptions")
            .update({ plan_type: planType })
            .eq("company_id", company.id);
        } else {
          await supabaseClient
            .from("company_subscriptions")
            .insert({ company_id: company.id, plan_type: planType });
        }
      }
    }

    console.log(`[UPDATE-USER-PLAN] Success`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[UPDATE-USER-PLAN] Error: ${msg}`);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
