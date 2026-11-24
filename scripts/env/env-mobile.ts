/**
 * Public URLs for the mobile target (apps/mobile/.env.local and its example).
 *
 * A phone or an emulator cannot resolve the Portless names (*.usebondery.test) or trust the
 * Portless CA, so the mobile app does not get the root values:
 * - the webapp and website URLs stay on loopback ports, which the app rewrites for Android;
 * - the API serves HTTPS only, so the app gets the Tailscale URL that `pnpm run dev:mobile-api`
 *   stores in BONDERY_DEV_MOBILE_API_URL (a public certificate for the tailnet name).
 */

const MOBILE_LOOPBACK_URLS: Partial<Record<string, string>> = {
  BONDERY_PUBLIC_WEBAPP_URL: "http://localhost:26632",
  BONDERY_PUBLIC_WEBSITE_URL: "http://localhost:26630",
};

const MOBILE_DEV_API_URL_KEY = "BONDERY_DEV_MOBILE_API_URL";
const MOBILE_EXAMPLE_API_URL = "https://your-machine.your-tailnet.ts.net:26631";

/**
 * The value the mobile target gets for `canonical`. `value` is the root (or example) value;
 * it is returned unchanged for any other variable.
 */
export function mobilePublicUrl(
  canonical: string,
  value: string | undefined,
  options: { rootEnv: Partial<Record<string, string>>; useExamples: boolean },
): string | undefined {
  if (canonical === "BONDERY_PUBLIC_API_URL") {
    if (options.useExamples) {
      return MOBILE_EXAMPLE_API_URL;
    }
    return options.rootEnv[MOBILE_DEV_API_URL_KEY]?.trim() || value;
  }
  const loopback = MOBILE_LOOPBACK_URLS[canonical];
  if (loopback !== undefined && (options.useExamples || value !== undefined)) {
    return loopback;
  }
  return value;
}
