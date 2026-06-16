/**
 * Polar.sh SDK client singleton for the Bondery API.
 * Used server-side only for subscription sync and customer lookups.
 */

import { Polar } from "@polar-sh/sdk";

let _polar: Polar | null = null;

/**
 * Returns a lazy-initialized Polar SDK client using the server-side access token.
 * Throws if POLAR_ACCESS_TOKEN is not configured.
 */
export function getPolarClient(): Polar {
  if (!_polar) {
    const accessToken = process.env.POLAR_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error("POLAR_ACCESS_TOKEN is not configured");
    }
    _polar = new Polar({
      accessToken,
      server:
        process.env.POLAR_ENVIRONMENT === "sandbox" ? "sandbox" : "production",
    });
  }
  return _polar;
}
