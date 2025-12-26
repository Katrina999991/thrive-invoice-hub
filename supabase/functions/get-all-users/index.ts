import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Admin user ID - only this user can access this function
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

    // Verify the requesting user is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error("Authentication failed");
    }

    if (userData.user.id !== ADMIN_USER_ID) {
      throw new Error("Unauthorized: Admin access required");
    }

    // Fetch all users from auth.users
    const { data: authUsers, error: authError } = await supabaseClient.auth.admin.listUsers();
    
    if (authError) {
      throw new Error(`Failed to fetch users: ${authError.message}`);
    }

    // Fetch all subscriptions
    const { data: subscriptions, error: subError } = await supabaseClient
      .from("user_subscriptions")
      .select("user_id, plan_type, billing_cycle, started_at, expires_at");

    if (subError) {
      throw new Error(`Failed to fetch subscriptions: ${subError.message}`);
    }

    // Fetch all profiles for display names and Stripe info
    const { data: profiles, error: profileError } = await supabaseClient
      .from("profiles")
      .select("user_id, display_name, username, stripe_account_id, stripe_onboarding_complete");

    if (profileError) {
      throw new Error(`Failed to fetch profiles: ${profileError.message}`);
    }

    // Fetch companies count per user
    const { data: companies, error: companiesError } = await supabaseClient
      .from("companies")
      .select("user_id");

    if (companiesError) {
      throw new Error(`Failed to fetch companies: ${companiesError.message}`);
    }

    // Fetch invoices existence per user
    const { data: invoices, error: invoicesError } = await supabaseClient
      .from("invoices")
      .select("user_id");

    if (invoicesError) {
      throw new Error(`Failed to fetch invoices: ${invoicesError.message}`);
    }

    // Fetch quotes existence per user
    const { data: quotes, error: quotesError } = await supabaseClient
      .from("quotes")
      .select("user_id");

    if (quotesError) {
      throw new Error(`Failed to fetch quotes: ${quotesError.message}`);
    }

    // Fetch expenses existence per user
    const { data: expenses, error: expensesError } = await supabaseClient
      .from("expenses")
      .select("user_id");

    if (expensesError) {
      throw new Error(`Failed to fetch expenses: ${expensesError.message}`);
    }

    // Group counts by user_id
    const companiesCountMap = new Map<string, number>();
    companies?.forEach((c) => {
      companiesCountMap.set(c.user_id, (companiesCountMap.get(c.user_id) || 0) + 1);
    });

    const usersWithInvoices = new Set(invoices?.map((i) => i.user_id) || []);
    const usersWithQuotes = new Set(quotes?.map((q) => q.user_id) || []);
    const usersWithExpenses = new Set(expenses?.map((e) => e.user_id) || []);

    // Combine data
    const users = authUsers.users.map((user) => {
      const subscription = subscriptions?.find((s) => s.user_id === user.id);
      const profile = profiles?.find((p) => p.user_id === user.id);
      
      return {
        id: user.id,
        email: user.email,
        display_name: profile?.display_name || profile?.username || null,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        plan_type: subscription?.plan_type || "free",
        billing_cycle: subscription?.billing_cycle || null,
        subscription_started_at: subscription?.started_at || null,
        subscription_expires_at: subscription?.expires_at || null,
        // Activation data
        stripe_connected: !!(profile?.stripe_account_id && profile?.stripe_onboarding_complete),
        companies_count: companiesCountMap.get(user.id) || 0,
        has_invoices: usersWithInvoices.has(user.id),
        has_quotes: usersWithQuotes.has(user.id),
        has_expenses: usersWithExpenses.has(user.id),
      };
    });

    // Sort by created_at descending (newest first)
    users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return new Response(JSON.stringify({ users }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
