// Stripe product and price IDs configuration (LIVE MODE)
export const STRIPE_CONFIG = {
  premium: {
    monthly: {
      productId: "prod_TMfovYgDRDg1To",
      priceId: "price_1TwTQkLH2WFAQEA6zVV33Udq",
      amount: 9.99,
    },
    yearly: {
      productId: "prod_TMfpBvWHzZG8d9",
      priceId: "price_1TwTR7LH2WFAQEA6zYpPOvu9",
      amount: 99.90,
    },
  },
  pro: {
    monthly: {
      productId: "prod_TMfqkVpmz307cM",
      priceId: "price_1TwTROLH2WFAQEA6DFhQhL64",
      amount: 14.99,
    },
    yearly: {
      productId: "prod_TMfrCqT8V9f97H",
      priceId: "price_1TwTReLH2WFAQEA60pGhKGw6",
      amount: 149.90,
    },
  },
} as const;

export type PlanType = keyof typeof STRIPE_CONFIG;
export type BillingCycle = "monthly" | "yearly";
