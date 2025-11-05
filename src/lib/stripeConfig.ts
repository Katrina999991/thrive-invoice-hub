// Stripe product and price IDs configuration (LIVE MODE)
export const STRIPE_CONFIG = {
  premium: {
    monthly: {
      productId: "prod_TMfovYgDRDg1To",
      priceId: "price_1SPwT0LH2WFAQEA69qD8QvbK",
      amount: 14.99,
    },
    yearly: {
      productId: "prod_TMfpBvWHzZG8d9",
      priceId: "price_1SPwUHLH2WFAQEA67w96dR4k",
      amount: 149.99,
    },
  },
  pro: {
    monthly: {
      productId: "prod_TMfqkVpmz307cM",
      priceId: "price_1SPwUnLH2WFAQEA6Ec9bPKok",
      amount: 24.99,
    },
    yearly: {
      productId: "prod_TMfrCqT8V9f97H",
      priceId: "price_1SPwVYLH2WFAQEA6s2kfAyzS",
      amount: 249.99,
    },
  },
} as const;

export type PlanType = keyof typeof STRIPE_CONFIG;
export type BillingCycle = "monthly" | "yearly";
