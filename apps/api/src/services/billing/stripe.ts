/**
 * Stripe SDK client singleton for the Bondery API.
 * Used server-side only for checkout, billing portal, sync recovery, and webhooks.
 */

import Stripe from "stripe";

let _stripe: Stripe | null = null;

/**
 * Returns a lazy-initialized Stripe client using the server-side secret key.
 * Throws if BONDERY_PRIVATE_STRIPE_SECRET_KEY is not configured.
 */
export function getStripeClient(): Stripe {
  if (!_stripe) {
    const secretKey = process.env.BONDERY_PRIVATE_STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error("BONDERY_PRIVATE_STRIPE_SECRET_KEY is not configured");
    }
    _stripe = new Stripe(secretKey, {
      apiVersion: "2026-09-30.endive",
    });
  }
  return _stripe;
}
