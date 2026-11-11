/** Card top-up amounts offered, in cents. */
export const TOPUP_CENTS = [500, 1000, 2000] as const;
/** Test top-up (no card, used when Stripe isn't configured): once per account per day. */
export const TEST_TOPUP_CENTS = 500;
