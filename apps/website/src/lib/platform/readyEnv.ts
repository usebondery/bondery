/**
 * Validate website runtime env for readiness probes.
 * Does not import `config.ts` (that module throws at load if vars are missing).
 */

const PLACEHOLDER_HOST_MARKERS = ["example.com", "example.supabase.co"];

function isPlaceholder(value: string): boolean {
  const lower = value.toLowerCase();
  return PLACEHOLDER_HOST_MARKERS.some((marker) => lower.includes(marker));
}

function requireRuntimeUrl(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  if (isPlaceholder(value)) {
    throw new Error(
      `${name} still has a build placeholder value (${value}). Set a real URL at deploy time.`,
    );
  }
  return value;
}

/** Throws if website public URLs are missing or still Docker build placeholders. */
export function validateWebsiteRuntimeEnv(): void {
  requireRuntimeUrl("BONDERY_PUBLIC_WEBAPP_URL");
  requireRuntimeUrl("BONDERY_PUBLIC_WEBSITE_URL");
}
