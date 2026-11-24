import { getApiUrl, getWebappUrl, getWebsiteUrl } from "@/lib/env";

/**
 * Validate website runtime env for readiness probes.
 *
 * It reads through `lib/env.ts` rather than `lib/config.ts`, because `config.ts`
 * carries `server-only` and throws at load when a value is missing. A probe must
 * report that failure as a status code, not crash the module graph.
 */

const PLACEHOLDER_HOST_MARKERS = ["example.com"];

function isPlaceholder(value: string): boolean {
  const lower = value.toLowerCase();
  return PLACEHOLDER_HOST_MARKERS.some((marker) => lower.includes(marker));
}

function assertRuntimeUrl(name: string, readValue: () => string | undefined): void {
  const value = readValue();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  if (isPlaceholder(value)) {
    throw new Error(
      `${name} still has a build placeholder value (${value}). Set a real URL at deploy time.`,
    );
  }
}

/** Throws if website public URLs are missing or still Docker build placeholders. */
export function validateWebsiteRuntimeEnv(): void {
  assertRuntimeUrl("BONDERY_PUBLIC_API_URL", getApiUrl);
  assertRuntimeUrl("BONDERY_PUBLIC_WEBAPP_URL", getWebappUrl);
  assertRuntimeUrl("BONDERY_PUBLIC_WEBSITE_URL", getWebsiteUrl);
}
