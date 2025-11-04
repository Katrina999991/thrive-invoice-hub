// Stripe product and price IDs configuration
export const STRIPE_CONFIG = {
  premium: {
    monthly: {
      productId: "prod_TMIGO91Sky7JR8",
      priceId: "price_1SPZfVLQTweNcYLGEr9iGmKV",
      amount: 14.99,
    },
    yearly: {
      productId: "prod_TMIGEeTzhusHyr",
      priceId: "price_1SPZg1LQTweNcYLGrKf34IN9",
      amount: 149.99,
    },
  },
  pro: {
    monthly: {
      productId: "prod_TMIGrFlCJKwKAp",
      priceId: "price_1SPZgHLQTweNcYLGDq989LYh",
      amount: 24.99,
    },
    yearly: {
      productId: "prod_TMIHsMZwCbWgYC",
      priceId: "price_1SPZgXLQTweNcYLGwBiX0E6V",
      amount: 249.99,
    },
  },
} as const;

export type PlanType = keyof typeof STRIPE_CONFIG;
export type BillingCycle = "monthly" | "yearly";
