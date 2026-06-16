/**
 * Polar.sh SDK client singleton.
 * Used server-side only (route handlers, never in client bundles).
 */

import { Polar } from "@polar-sh/sdk";

export const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  server:
    process.env.POLAR_ENVIRONMENT === "sandbox" ? "sandbox" : "production",
});

/** The Polar product ID for the Premium subscription plan. */
export const POLAR_PRODUCT_ID = process.env.POLAR_PRODUCT_ID || "";
