import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Admin user ID - only this user can access this function
const ADMIN_USER_ID = "e6c5ca56-8437-4782-bc6a-3b0f77993ebc";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GET-ALL-USERS] ${step}${detailsStr}`);
};

serve(async (req) => {
  logStep("Function invoked", { method: req.method });
  
  if (req.method === "OPTIONS") {
    logStep("Handling OPTIONS request");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Creating Supabase client");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    logStep("Environment check", { 
      hasUrl: !!supabaseUrl, 
      hasServiceKey: !!serviceRoleKey 
    });

    const supabaseClient = createClient(
      supabaseUrl ?? "",
      serviceRoleKey ?? "",
      { auth: { persistSession: false } }
    );

    // Verify the requesting user is admin
    const authHeader = req.headers.get("Authorization");
    logStep("Auth header check", { hasAuthHeader: !!authHeader });
    
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    logStep("Verifying user token");
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      logStep("Auth error", { error: userError?.message });
      throw new Error("Authentication failed");
    }

    logStep("User authenticated", { userId: userData.user.id });

    if (userData.user.id !== ADMIN_USER_ID) {
      logStep("Unauthorized user", { userId: userData.user.id, adminId: ADMIN_USER_ID });
      throw new Error("Unauthorized: Admin access required");
    }

    logStep("Admin verified, fetching users");

    // Fetch all users from auth.users (paginated API)
    const perPage = 1000;
    let page = 1;
    const allAuthUsers: Array<any> = [];

    while (true) {
      const { data: authUsersPage, error: authError } = await supabaseClient.auth.admin.listUsers({
        page,
        perPage,
      });

      if (authError) {
        logStep("Error fetching auth users", { error: authError.message, page });
        throw new Error(`Failed to fetch users: ${authError.message}`);
      }

      const pageUsers = authUsersPage?.users || [];
      allAuthUsers.push(...pageUsers);

      logStep("Auth users page fetched", { page, count: pageUsers.length });

      if (pageUsers.length < perPage) break;
      page += 1;
    }

    logStep("All auth users fetched", { count: allAuthUsers.length, pages: page });

    // Fetch all subscriptions
    const { data: subscriptions, error: subError } = await supabaseClient
      .from("user_subscriptions")
      .select("user_id, plan_type, billing_cycle, started_at, expires_at");

    if (subError) {
      logStep("Error fetching subscriptions", { error: subError.message });
      throw new Error(`Failed to fetch subscriptions: ${subError.message}`);
    }

    logStep("Subscriptions fetched", { count: subscriptions?.length || 0 });

    // Fetch all profiles for display names and Stripe info
    const { data: profiles, error: profileError } = await supabaseClient
      .from("profiles")
      .select("user_id, display_name, username, stripe_account_id, stripe_onboarding_complete, last_seen_at");

    if (profileError) {
      logStep("Error fetching profiles", { error: profileError.message });
      throw new Error(`Failed to fetch profiles: ${profileError.message}`);
    }

    logStep("Profiles fetched", { count: profiles?.length || 0 });

    // Fetch companies count per user
    const { data: companies, error: companiesError } = await supabaseClient
      .from("companies")
      .select("user_id");

    if (companiesError) {
      logStep("Error fetching companies", { error: companiesError.message });
      throw new Error(`Failed to fetch companies: ${companiesError.message}`);
    }

    // Fetch invoices existence per user
    const { data: invoices, error: invoicesError } = await supabaseClient
      .from("invoices")
      .select("user_id, created_at, sent_at, paid_at, status");

    if (invoicesError) {
      logStep("Error fetching invoices", { error: invoicesError.message });
      throw new Error(`Failed to fetch invoices: ${invoicesError.message}`);
    }

    // Fetch quotes existence per user
    const { data: quotes, error: quotesError } = await supabaseClient
      .from("quotes")
      .select("user_id, created_at");

    if (quotesError) {
      logStep("Error fetching quotes", { error: quotesError.message });
      throw new Error(`Failed to fetch quotes: ${quotesError.message}`);
    }

    // Fetch expenses existence per user
    const { data: expenses, error: expensesError } = await supabaseClient
      .from("expenses")
      .select("user_id, created_at");

    if (expensesError) {
      logStep("Error fetching expenses", { error: expensesError.message });
      throw new Error(`Failed to fetch expenses: ${expensesError.message}`);
    }

    // Fetch clients count per user
    const { data: clients, error: clientsError } = await supabaseClient
      .from("clients")
      .select("user_id, created_at");

    if (clientsError) {
      logStep("Error fetching clients", { error: clientsError.message });
      throw new Error(`Failed to fetch clients: ${clientsError.message}`);
    }

    logStep("All data fetched, processing");

    // Group counts by user_id
    const companiesCountMap = new Map<string, number>();
    companies?.forEach((c) => {
      companiesCountMap.set(c.user_id, (companiesCountMap.get(c.user_id) || 0) + 1);
    });

    // Per-user aggregates
    const invoicesCountMap = new Map<string, number>();
    const invoicesSentCountMap = new Map<string, number>();
    const invoicesPaidCountMap = new Map<string, number>();
    const lastInvoiceCreatedMap = new Map<string, string>();
    const lastInvoiceSentMap = new Map<string, string>();
    const lastInvoicePaidMap = new Map<string, string>();
    const maxStr = (a: string | undefined, b: string | null | undefined) =>
      b ? (a && a > b ? a : b) : a;

    invoices?.forEach((i: any) => {
      invoicesCountMap.set(i.user_id, (invoicesCountMap.get(i.user_id) || 0) + 1);
      if (i.sent_at) {
        invoicesSentCountMap.set(i.user_id, (invoicesSentCountMap.get(i.user_id) || 0) + 1);
        lastInvoiceSentMap.set(i.user_id, maxStr(lastInvoiceSentMap.get(i.user_id), i.sent_at)!);
      }
      if (i.paid_at) {
        invoicesPaidCountMap.set(i.user_id, (invoicesPaidCountMap.get(i.user_id) || 0) + 1);
        lastInvoicePaidMap.set(i.user_id, maxStr(lastInvoicePaidMap.get(i.user_id), i.paid_at)!);
      }
      if (i.created_at) {
        lastInvoiceCreatedMap.set(i.user_id, maxStr(lastInvoiceCreatedMap.get(i.user_id), i.created_at)!);
      }
    });

    const quotesCountMap = new Map<string, number>();
    const lastQuoteMap = new Map<string, string>();
    quotes?.forEach((q: any) => {
      quotesCountMap.set(q.user_id, (quotesCountMap.get(q.user_id) || 0) + 1);
      if (q.created_at) lastQuoteMap.set(q.user_id, maxStr(lastQuoteMap.get(q.user_id), q.created_at)!);
    });

    const expensesCountMap = new Map<string, number>();
    const lastExpenseMap = new Map<string, string>();
    expenses?.forEach((e: any) => {
      expensesCountMap.set(e.user_id, (expensesCountMap.get(e.user_id) || 0) + 1);
      if (e.created_at) lastExpenseMap.set(e.user_id, maxStr(lastExpenseMap.get(e.user_id), e.created_at)!);
    });

    const clientsCountMap = new Map<string, number>();
    const lastClientMap = new Map<string, string>();
    clients?.forEach((c: any) => {
      clientsCountMap.set(c.user_id, (clientsCountMap.get(c.user_id) || 0) + 1);
      if (c.created_at) lastClientMap.set(c.user_id, maxStr(lastClientMap.get(c.user_id), c.created_at)!);
    });

    // Combine data
    const users = allAuthUsers.map((user) => {
      const subscription = subscriptions?.find((s) => s.user_id === user.id);
      const profile = profiles?.find((p) => p.user_id === user.id);

      const lastInvoiceSent = lastInvoiceSentMap.get(user.id) || null;
      const lastInvoiceCreated = lastInvoiceCreatedMap.get(user.id) || null;
      const lastInvoicePaid = lastInvoicePaidMap.get(user.id) || null;
      const lastQuote = lastQuoteMap.get(user.id) || null;
      const lastExpense = lastExpenseMap.get(user.id) || null;
      const lastClient = lastClientMap.get(user.id) || null;

      const candidates = [
        lastInvoiceCreated,
        lastInvoiceSent,
        lastInvoicePaid,
        lastClient,
        lastQuote,
        lastExpense,
      ].filter(Boolean) as string[];
      const lastActivityAt = candidates.length
        ? candidates.reduce((a, b) => (a > b ? a : b))
        : null;

      return {
        id: user.id,
        email: user.email,
        display_name: profile?.display_name || profile?.username || null,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        last_seen_at: profile?.last_seen_at || null,
        plan_type: subscription?.plan_type || "free",
        billing_cycle: subscription?.billing_cycle || null,
        subscription_started_at: subscription?.started_at || null,
        subscription_expires_at: subscription?.expires_at || null,
        // Activation data
        stripe_connected: !!(profile?.stripe_account_id && profile?.stripe_onboarding_complete),
        companies_count: companiesCountMap.get(user.id) || 0,
        invoices_count: invoicesCountMap.get(user.id) || 0,
        invoices_sent_count: invoicesSentCountMap.get(user.id) || 0,
        invoices_paid_count: invoicesPaidCountMap.get(user.id) || 0,
        quotes_count: quotesCountMap.get(user.id) || 0,
        expenses_count: expensesCountMap.get(user.id) || 0,
        clients_count: clientsCountMap.get(user.id) || 0,
        last_invoice_sent_at: lastInvoiceSent,
        last_invoice_paid_at: lastInvoicePaid,
        last_activity_at: lastActivityAt,
      };
    });

    // Sort by created_at descending (newest first)
    users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    logStep("Success", { userCount: users.length });

    return new Response(JSON.stringify({ users }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("Error", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
