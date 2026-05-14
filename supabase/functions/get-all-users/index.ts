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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    
    logStep("Environment check", { 
      hasUrl: !!supabaseUrl, 
      hasServiceKey: !!serviceRoleKey,
      hasAnonKey: !!anonKey
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

    logStep("Verifying user token via user-context client");

    // Use a user-context client (anon key) and pass the JWT explicitly to getUser().
    // Calling getUser() with no argument relies on a stored session, which doesn't
    // exist in an edge function context and yields "Auth session missing!".
    const userClient = createClient(
      supabaseUrl ?? "",
      anonKey ?? "",
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: userData, error: userError } = await userClient.auth.getUser(token);

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
      .select("user_id, display_name, username, stripe_account_id, stripe_onboarding_complete, last_seen_at, total_session_minutes");

    if (profileError) {
      logStep("Error fetching profiles", { error: profileError.message });
      throw new Error(`Failed to fetch profiles: ${profileError.message}`);
    }

    logStep("Profiles fetched", { count: profiles?.length || 0 });

    // Fetch companies count per user
    const { data: companies, error: companiesError } = await supabaseClient
      .from("companies")
      .select("id, name, user_id");

    if (companiesError) {
      logStep("Error fetching companies", { error: companiesError.message });
      throw new Error(`Failed to fetch companies: ${companiesError.message}`);
    }

    // Fetch invoices existence per user (paginated to bypass 1000-row limit)
    const invoices: any[] = [];
    {
      const pageSize = 1000;
      let from = 0;
      while (true) {
        const { data, error } = await supabaseClient
          .from("invoices")
          .select("user_id, created_at, sent_at, paid_at, status")
          .range(from, from + pageSize - 1);
        if (error) {
          logStep("Error fetching invoices", { error: error.message });
          throw new Error(`Failed to fetch invoices: ${error.message}`);
        }
        if (!data || data.length === 0) break;
        invoices.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
      }
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
      .select("user_id, created_at, company_id");

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

    // Fetch active company memberships (to filter expenses tooltip to current accesses)
    const { data: activeMembers, error: membersError } = await supabaseClient
      .from("company_members")
      .select("user_id, company_id")
      .eq("status", "active");

    if (membersError) {
      logStep("Error fetching memberships", { error: membersError.message });
      throw new Error(`Failed to fetch memberships: ${membersError.message}`);
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

    // A status in ('sent','paid','overdue') means the invoice has been issued.
    // A status of 'paid' means the invoice has been paid (timestamps are not always populated).
    const SENT_STATUSES = new Set(["sent", "paid", "overdue"]);
    invoices?.forEach((i: any) => {
      invoicesCountMap.set(i.user_id, (invoicesCountMap.get(i.user_id) || 0) + 1);

      const isSent = !!i.sent_at || SENT_STATUSES.has(i.status);
      if (isSent) {
        invoicesSentCountMap.set(i.user_id, (invoicesSentCountMap.get(i.user_id) || 0) + 1);
        const sentTs = i.sent_at || i.created_at;
        if (sentTs) lastInvoiceSentMap.set(i.user_id, maxStr(lastInvoiceSentMap.get(i.user_id), sentTs)!);
      }

      const isPaid = !!i.paid_at || i.status === "paid";
      if (isPaid) {
        invoicesPaidCountMap.set(i.user_id, (invoicesPaidCountMap.get(i.user_id) || 0) + 1);
        const paidTs = i.paid_at || i.created_at;
        if (paidTs) lastInvoicePaidMap.set(i.user_id, maxStr(lastInvoicePaidMap.get(i.user_id), paidTs)!);
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
    // user_id -> (company_id|"none") -> count
    const expensesByCompanyMap = new Map<string, Map<string, number>>();
    expenses?.forEach((e: any) => {
      expensesCountMap.set(e.user_id, (expensesCountMap.get(e.user_id) || 0) + 1);
      if (e.created_at) lastExpenseMap.set(e.user_id, maxStr(lastExpenseMap.get(e.user_id), e.created_at)!);
      const key = e.company_id || "none";
      const inner = expensesByCompanyMap.get(e.user_id) || new Map<string, number>();
      inner.set(key, (inner.get(key) || 0) + 1);
      expensesByCompanyMap.set(e.user_id, inner);
    });

    // company_id -> name lookup
    const companyNameMap = new Map<string, string>();
    companies?.forEach((c: any) => {
      if (c.id) companyNameMap.set(c.id, c.name || "—");
    });

    // user_id -> Set<company_id> of currently accessible companies (owner OR active member)
    const accessibleCompaniesByUser = new Map<string, Set<string>>();
    companies?.forEach((c: any) => {
      if (!c.user_id || !c.id) return;
      const set = accessibleCompaniesByUser.get(c.user_id) || new Set<string>();
      set.add(c.id);
      accessibleCompaniesByUser.set(c.user_id, set);
    });
    activeMembers?.forEach((m: any) => {
      if (!m.user_id || !m.company_id) return;
      const set = accessibleCompaniesByUser.get(m.user_id) || new Set<string>();
      set.add(m.company_id);
      accessibleCompaniesByUser.set(m.user_id, set);
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
        total_session_minutes: profile?.total_session_minutes || 0,
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
        expenses_by_company: (() => {
          const accessible = accessibleCompaniesByUser.get(user.id) || new Set<string>();
          const inner = expensesByCompanyMap.get(user.id) || new Map<string, number>();
          const visible: Array<{ company_id: string | null; company_name: string | null; count: number; orphan?: boolean }> = [];
          let orphanCount = 0;
          for (const [cid, count] of inner.entries()) {
            if (cid !== "none" && accessible.has(cid)) {
              visible.push({ company_id: cid, company_name: companyNameMap.get(cid) || "—", count });
            } else {
              orphanCount += count;
            }
          }
          if (orphanCount > 0) {
            visible.push({ company_id: null, company_name: null, count: orphanCount, orphan: true });
          }
          return visible;
        })(),
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
