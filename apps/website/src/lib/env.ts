/**
 * The only module in the website that reads `process.env`.
 *
 * Why the reads are functions, not module constants: the Docker image bakes
 * placeholder URLs at build time and the deployment injects the real values at
 * runtime. A constant would freeze the placeholder into the build.
 *
 * Why this module has no `server-only` marker: `proxy.ts` builds the security
 * headers from these values, and the proxy test runs the proxy outside Next.js,
 * where `server-only` throws. `lib/config.ts` carries the marker instead, so the
 * required page constants still cannot reach a client bundle.
 *
 * Why every read uses a literal key: Biome's `noUndeclaredEnvVars` rule only
 * checks literal keys against the manifest allowlist. A dynamic
 * `process.env[name]` read would pass that rule unchecked.
 *
 * Keys and the apps that receive them live in the env manifest
 * (`packages/helpers/src/env/manifest.ts`). Add a key there before reading it
 * here.
 */

/** Trim the value, and treat an empty value as unset. */
function normalize(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** Convert an optional value into a required one. Callers name the variable. */
export function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/** Public API origin (`BONDERY_PUBLIC_API_URL`). */
export function getApiUrl(): string | undefined {
  return normalize(process.env["BONDERY_PUBLIC_API_URL"]);
}

/** Public web app origin (`BONDERY_PUBLIC_WEBAPP_URL`). */
export function getWebappUrl(): string | undefined {
  return normalize(process.env["BONDERY_PUBLIC_WEBAPP_URL"]);
}

/**
 * Public marketing origin (`BONDERY_PUBLIC_WEBSITE_URL`).
 *
 * Read this at call time from `robots.ts` and `sitemap.ts`, which await
 * `connection()` and must not cache a build-time value.
 */
export function getWebsiteUrl(): string | undefined {
  return normalize(process.env["BONDERY_PUBLIC_WEBSITE_URL"]);
}

/** Plausible site domain (`BONDERY_PUBLIC_PLAUSIBLE_DOMAIN`). Analytics is off when unset. */
export function getPlausibleDomain(): string | undefined {
  return normalize(process.env["BONDERY_PUBLIC_PLAUSIBLE_DOMAIN"]);
}

/** Plausible script origin (`BONDERY_PUBLIC_PLAUSIBLE_HOST`). Analytics is off when unset. */
export function getPlausibleHost(): string | undefined {
  return normalize(process.env["BONDERY_PUBLIC_PLAUSIBLE_HOST"]);
}

/** CSP report flag (`BONDERY_PUBLIC_CSP_REPORT_ENABLED`), passed through unparsed. */
export function getCspReportEnabled(): string | undefined {
  return normalize(process.env["BONDERY_PUBLIC_CSP_REPORT_ENABLED"]);
}

/** Apple Team ID for `apple-app-site-association`. The route returns 404 when unset. */
export function getIosAppTeamId(): string | undefined {
  return normalize(process.env["BONDERY_PUBLIC_IOS_APP_TEAM_ID"]);
}

/** Android SHA-256 fingerprints for `assetlinks.json`. The route returns 404 when unset. */
export function getAndroidCertFingerprints(): string | undefined {
  return normalize(process.env["BONDERY_PUBLIC_ANDROID_SHA256_CERT_FINGERPRINTS"]);
}

/** Current runtime (`NEXT_RUNTIME`): `nodejs` or `edge`. Used by instrumentation only. */
export function getNextRuntime(): string | undefined {
  return normalize(process.env["NEXT_RUNTIME"]);
}

/** True in `next dev` (`NODE_ENV=development`). */
export function isDevelopment(): boolean {
  return normalize(process.env["NODE_ENV"]) === "development";
}
