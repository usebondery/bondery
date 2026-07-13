/**
 * Polar.sh SDK client singleton for the Bondery API.
 * Used server-side only for subscription sync, checkout, and customer portal.
 */

import { DEFAULT_LOCALE } from "@bondery/schemas/locale/supported-locale";
import { Polar } from "@polar-sh/sdk";

let _polar: Polar | null = null;

/**
 * Polar checkout locales accepted by the Polar API.
 *
 * @see https://polar.sh/docs/features/checkout/localization
 *
 * Bondery app locales not in this list (e.g. `cs`) are coerced to {@link DEFAULT_LOCALE}
 * before checkout so Polar does not reject the session.
 */
const SUPPORTED_POLAR_LOCALES = [
  "en",
  "de",
  "es",
  "fr",
  "it",
  "ja",
  "nl",
  "pl",
  "pt",
  "sv",
  "zh",
] as const;

type PolarLocale = (typeof SUPPORTED_POLAR_LOCALES)[number];

/**
 * Coerces a Bondery language code to a Polar-supported checkout locale.
 */
export function sanitizePolarLocale(lang: string | null | undefined): PolarLocale {
  const normalized = (lang ?? DEFAULT_LOCALE).toLowerCase().split("-")[0];
  return (SUPPORTED_POLAR_LOCALES as readonly string[]).includes(normalized)
    ? (normalized as PolarLocale)
    : "en";
}

/**
 * Returns a lazy-initialized Polar SDK client using the server-side access token.
 * Throws if PRIVATE_POLAR_ACCESS_TOKEN is not configured.
 */
export function getPolarClient(): Polar {
  if (!_polar) {
    const accessToken = process.env.PRIVATE_POLAR_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error("PRIVATE_POLAR_ACCESS_TOKEN is not configured");
    }
    _polar = new Polar({
      accessToken,
      server: process.env.PUBLIC_POLAR_ENVIRONMENT === "sandbox" ? "sandbox" : "production",
    });
  }
  return _polar;
}
