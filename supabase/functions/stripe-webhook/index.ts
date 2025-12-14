import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  try {
    logStep("Webhook received");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const signature = req.headers.get("stripe-signature");
    const body = await req.text();

    let event: Stripe.Event;
    
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature!,
        Deno.env.get("STRIPE_WEBHOOK_SECRET") || ""
      );
    } catch (err) {
      logStep("Webhook signature verification failed", { error: err.message });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
      });
    }

    logStep("Event type", { type: event.type });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Helper function to send subscription emails
    const sendSubscriptionEmail = async (emailData: {
      emailType: string;
      userId?: string;
      email?: string;
      firstName?: string;
      newPlanName: string;
      oldPlanName?: string;
      billingEndDate?: string;
      billingType?: 'monthly' | 'yearly';
      nextRenewalDate?: string;
    }) => {
      try {
        logStep("Sending subscription email", emailData);
        const response = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-subscription-email`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
            },
            body: JSON.stringify(emailData),
          }
        );
        const result = await response.json();
        logStep("Subscription email result", result);
        return result;
      } catch (error) {
        logStep("Error sending subscription email", { error: error.message });
        return { error: error.message };
      }
    };

    // Helper to get plan type from price ID
    const getPlanTypeFromPriceId = async (priceId: string): Promise<string> => {
      try {
        const price = await stripe.prices.retrieve(priceId);
        const product = await stripe.products.retrieve(price.product as string);
        // Try to extract plan type from product metadata or name
        if (product.metadata?.plan_type) {
          return product.metadata.plan_type;
        }
        const productName = product.name.toLowerCase();
        if (productName.includes('pro')) return 'pro';
        if (productName.includes('premium')) return 'premium';
        return 'free';
      } catch (error) {
        logStep("Error getting plan type from price", { error: error.message });
        return 'premium';
      }
    };

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const invoiceId = session.metadata?.invoice_id;
        
        if (invoiceId) {
          logStep("Updating invoice status to paid", { invoiceId });
          
          // Update invoice status
          await supabaseClient
            .from("invoices")
            .update({
              status: "paid",
              paid_at: new Date().toISOString(),
              stripe_payment_intent_id: session.payment_intent as string,
            })
            .eq("id", invoiceId);

          logStep("Invoice updated successfully");

          // Fetch invoice details with client and company info
          const { data: invoice } = await supabaseClient
            .from("invoices")
            .select(`
              *,
              clients (
                name,
                email,
                company_id,
                language
              )
            `)
            .eq("id", invoiceId)
            .single();

          if (invoice?.clients?.email) {
            logStep("Sending payment confirmation emails", { 
              clientEmail: invoice.clients.email,
              invoiceNumber: invoice.invoice_number 
            });

            // Send confirmation email to client
            try {
              await supabaseClient.functions.invoke("send-invoice-email", {
                body: {
                  invoiceId: invoiceId,
                  emailType: "paymentConfirmation",
                },
              });
              logStep("Client confirmation email sent");
            } catch (emailError) {
              logStep("Error sending client email", { error: emailError.message });
            }

            // Fetch company details to send notification
            if (invoice.clients.company_id) {
              const { data: company } = await supabaseClient
                .from("companies")
                .select("name, email")
                .eq("id", invoice.clients.company_id)
                .single();

              if (company?.email) {
                logStep("Sending payment notification to company", { companyEmail: company.email });
                
                try {
                  // Send notification to company
                  const resendApiKey = Deno.env.get("RESEND_API_KEY");
                  const resendFrom = Deno.env.get("RESEND_FROM") || "onboarding@resend.dev";
                  
                  const notificationResponse = await fetch("https://api.resend.com/emails", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${resendApiKey}`,
                    },
                    body: JSON.stringify({
                      from: resendFrom,
                      to: [company.email],
                      subject: `Payment Received - Invoice ${invoice.invoice_number}`,
                      html: `
                        <h2>Payment Confirmation</h2>
                        <p>Good news! Payment has been received for invoice ${invoice.invoice_number}.</p>
                        <p><strong>Client:</strong> ${invoice.clients.name}</p>
                        <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
                        <p><strong>Amount:</strong> $${invoice.total}</p>
                        <p><strong>Payment Date:</strong> ${new Date().toLocaleDateString()}</p>
                      `,
                    }),
                  });

                  if (notificationResponse.ok) {
                    logStep("Company notification email sent");
                  } else {
                    const errorData = await notificationResponse.text();
                    logStep("Error sending company email", { error: errorData });
                  }
                } catch (companyEmailError) {
                  logStep("Error sending company notification", { error: companyEmailError.message });
                }
              }
            }
          }
        } else if (session.mode === 'subscription' && session.customer_email) {
          // This is a subscription checkout - send upgrade email
          logStep("Subscription checkout completed", { 
            customerEmail: session.customer_email,
            subscriptionId: session.subscription 
          });
          
          // Get user by email
          const { data: userData } = await supabaseClient.auth.admin.listUsers();
          const user = userData.users.find(u => u.email === session.customer_email);
          
          if (user && session.subscription) {
            const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
            const priceId = subscription.items.data[0]?.price.id;
            const newPlanType = priceId ? await getPlanTypeFromPriceId(priceId) : 'premium';
            
            await sendSubscriptionEmail({
              emailType: 'upgrade',
              userId: user.id,
              email: session.customer_email,
              newPlanName: newPlanType,
            });
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const previousAttributes = event.data.previous_attributes as any;
        
        logStep("Subscription updated", { 
          subscriptionId: subscription.id,
          status: subscription.status,
          previousAttributes: Object.keys(previousAttributes || {})
        });

        // Get customer email
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        if (!customer.deleted && customer.email) {
          const { data: userData } = await supabaseClient.auth.admin.listUsers();
          const user = userData.users.find(u => u.email === customer.email);

          if (user) {
            const currentPriceId = subscription.items.data[0]?.price.id;
            const currentPlanType = currentPriceId ? await getPlanTypeFromPriceId(currentPriceId) : 'premium';
            const billingEndDate = new Date(subscription.current_period_end * 1000).toLocaleDateString('fr-CA');

            // Check if plan was changed (upgrade/downgrade)
            if (previousAttributes?.items) {
              const previousPriceId = previousAttributes.items?.data?.[0]?.price?.id;
              const previousPlanType = previousPriceId ? await getPlanTypeFromPriceId(previousPriceId) : null;

              if (previousPlanType && previousPlanType !== currentPlanType) {
                const planOrder = ['free', 'premium', 'pro'];
                const isUpgrade = planOrder.indexOf(currentPlanType) > planOrder.indexOf(previousPlanType);

                if (isUpgrade) {
                  await sendSubscriptionEmail({
                    emailType: 'upgrade',
                    userId: user.id,
                    newPlanName: currentPlanType,
                    oldPlanName: previousPlanType,
                  });
                } else {
                  // Downgrade is scheduled for end of period
                  await sendSubscriptionEmail({
                    emailType: 'downgrade_scheduled',
                    userId: user.id,
                    newPlanName: currentPlanType,
                    oldPlanName: previousPlanType,
                    billingEndDate,
                  });
                }
              }
            }

            // Check if billing interval changed
            if (previousAttributes?.items?.data?.[0]?.price?.recurring?.interval) {
              const newInterval = subscription.items.data[0]?.price.recurring?.interval;
              const nextRenewalDate = new Date(subscription.current_period_end * 1000).toLocaleDateString('fr-CA');
              
              await sendSubscriptionEmail({
                emailType: 'billing_change',
                userId: user.id,
                newPlanName: currentPlanType,
                billingType: newInterval === 'year' ? 'yearly' : 'monthly',
                nextRenewalDate,
              });
            }
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        
        logStep("Subscription cancelled", { subscriptionId: subscription.id });

        // Get customer email
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        if (!customer.deleted && customer.email) {
          const { data: userData } = await supabaseClient.auth.admin.listUsers();
          const user = userData.users.find(u => u.email === customer.email);

          if (user) {
            const billingEndDate = new Date(subscription.current_period_end * 1000).toLocaleDateString('fr-CA');
            
            await sendSubscriptionEmail({
              emailType: 'cancellation',
              userId: user.id,
              newPlanName: 'free',
              billingEndDate,
            });

            // Update user subscription to free after period ends
            await supabaseClient
              .from('user_subscriptions')
              .update({ 
                plan_type: 'free',
                expires_at: new Date(subscription.current_period_end * 1000).toISOString()
              })
              .eq('user_id', user.id);
          }
        }
        break;
      }

      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        
        // Check if onboarding is complete
        if (account.charges_enabled && account.payouts_enabled) {
          logStep("Account onboarding complete", { accountId: account.id });
          
          // Update profile
          await supabaseClient
            .from("profiles")
            .update({ stripe_onboarding_complete: true })
            .eq("stripe_account_id", account.id);
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    logStep("ERROR", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});