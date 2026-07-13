import { type WebappRuntimeConfig, webappRuntimeConfigSchema } from "@bondery/schemas";

function requireValue(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Normalize API base URL to origin-only format.
 * Prevents accidental `/api/api/...` requests when configured with a trailing `/api`.
 */
function normalizeApiBaseUrl(rawUrl: string): string {
  return rawUrl.replace(/\/+$/, "").replace(/\/api$/, "");
}

export function buildWebappRuntimeConfigFromEnv(): WebappRuntimeConfig {
  const apiBaseUrl = normalizeApiBaseUrl(
    requireValue("NEXT_PUBLIC_API_URL", process.env.NEXT_PUBLIC_API_URL),
  );

  const config = {
    apiBaseUrl,
    gitSha: process.env.BONDERY_GIT_SHA || process.env.GIT_SHA || undefined,
    posthogHost: process.env.NEXT_PUBLIC_POSTHOG_HOST || undefined,
    posthogKey: process.env.NEXT_PUBLIC_POSTHOG_KEY || undefined,
    runtimeConfigVersion: 1,
    supabasePublishableKey: requireValue(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
    supabaseUrl: requireValue("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    version: process.env.BONDERY_VERSION || process.env.npm_package_version || undefined,
    webappUrl: requireValue("NEXT_PUBLIC_WEBAPP_URL", process.env.NEXT_PUBLIC_WEBAPP_URL),
    websiteUrl: requireValue("NEXT_PUBLIC_WEBSITE_URL", process.env.NEXT_PUBLIC_WEBSITE_URL),
  };

  return webappRuntimeConfigSchema.parse(config);
}
