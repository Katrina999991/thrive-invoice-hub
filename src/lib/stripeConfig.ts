// Stripe product and price IDs configuration (LIVE MODE)
export const STRIPE_CONFIG = {
  premium: {
    monthly: {
      productId: "prod_TMfovYgDRDg1To",
      priceId: "price_1SPwT0LH2WFAQEA69qD8QvbK", // À METTRE À JOUR dans Stripe avec 19.99$
      amount: 19.99,
    },
    yearly: {
      productId: "prod_TMfpBvWHzZG8d9",
      priceId: "price_1SPwUHLH2WFAQEA67w96dR4k", // À METTRE À JOUR dans Stripe avec 199$
      amount: 199.00,
    },
  },
  pro: {
    monthly: {
      productId: "prod_TMfqkVpmz307cM",
      priceId: "price_1SPwUnLH2WFAQEA6Ec9bPKok", // À METTRE À JOUR dans Stripe avec 34.99$
      amount: 34.99,
    },
    yearly: {
      productId: "prod_TMfrCqT8V9f97H",
      priceId: "price_1SPwVYLH2WFAQEA6s2kfAyzS", // À METTRE À JOUR dans Stripe avec 349$
      amount: 349.00,
    },
  },
} as const;

export type PlanType = keyof typeof STRIPE_CONFIG;
export type BillingCycle = "monthly" | "yearly";
