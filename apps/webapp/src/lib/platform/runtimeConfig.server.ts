import { type WebappRuntimeConfig, webappRuntimeConfigSchema } from "@bondery/schemas";
import {
  WEBAPP_RUNTIME_BUILD_PLACEHOLDERS,
  WEBAPP_RUNTIME_ENV,
} from "@/lib/platform/runtimeConfig.env";

/**
 * Read env at runtime. Never use literal `process.env.NEXT_PUBLIC_*` — Next.js inlines those at build time.
 */
function runtimeEnv(name: string): string | undefined {
  const value = process.env[name];
  return value === "" ? undefined : value;
}

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
    requireValue(WEBAPP_RUNTIME_ENV.apiUrl, runtimeEnv(WEBAPP_RUNTIME_ENV.apiUrl)),
  );

  const config = {
    apiBaseUrl,
    gitSha: runtimeEnv("BONDERY_GIT_SHA") ?? runtimeEnv("GIT_SHA"),
    posthogHost: runtimeEnv(WEBAPP_RUNTIME_ENV.posthogHost),
    posthogKey: runtimeEnv(WEBAPP_RUNTIME_ENV.posthogKey),
    runtimeConfigVersion: 1,
    supabasePublishableKey: requireValue(
      WEBAPP_RUNTIME_ENV.supabasePublishableKey,
      runtimeEnv(WEBAPP_RUNTIME_ENV.supabasePublishableKey),
    ),
    supabaseUrl: requireValue(
      WEBAPP_RUNTIME_ENV.supabaseUrl,
      runtimeEnv(WEBAPP_RUNTIME_ENV.supabaseUrl),
    ),
    version: runtimeEnv("BONDERY_VERSION") ?? runtimeEnv("npm_package_version"),
    webappUrl: requireValue(WEBAPP_RUNTIME_ENV.webappUrl, runtimeEnv(WEBAPP_RUNTIME_ENV.webappUrl)),
    websiteUrl: requireValue(
      WEBAPP_RUNTIME_ENV.websiteUrl,
      runtimeEnv(WEBAPP_RUNTIME_ENV.websiteUrl),
    ),
  };

  return webappRuntimeConfigSchema.parse(config);
}

function assertProductionRuntimeConfig(config: WebappRuntimeConfig): void {
  const errors: string[] = [];

  if (config.supabaseUrl === WEBAPP_RUNTIME_BUILD_PLACEHOLDERS.supabaseUrl) {
    errors.push(`${WEBAPP_RUNTIME_ENV.supabaseUrl} is still the Docker build placeholder`);
  }

  if (config.supabasePublishableKey === WEBAPP_RUNTIME_BUILD_PLACEHOLDERS.supabasePublishableKey) {
    errors.push(
      `${WEBAPP_RUNTIME_ENV.supabasePublishableKey} is still the Docker build placeholder`,
    );
  }

  if (config.apiBaseUrl === WEBAPP_RUNTIME_BUILD_PLACEHOLDERS.apiUrl) {
    errors.push(`${WEBAPP_RUNTIME_ENV.apiUrl} is still the Docker build placeholder`);
  }

  if (config.webappUrl === WEBAPP_RUNTIME_BUILD_PLACEHOLDERS.webappUrl) {
    errors.push(`${WEBAPP_RUNTIME_ENV.webappUrl} is still the Docker build placeholder`);
  }

  if (config.websiteUrl === WEBAPP_RUNTIME_BUILD_PLACEHOLDERS.websiteUrl) {
    errors.push(`${WEBAPP_RUNTIME_ENV.websiteUrl} is still the Docker build placeholder`);
  }

  if (/localhost|127\.0\.0\.1/i.test(config.webappUrl)) {
    errors.push(`${WEBAPP_RUNTIME_ENV.webappUrl} must not point at localhost in production`);
  }

  if (errors.length > 0) {
    throw new Error(
      `Invalid webapp runtime config:\n${errors.map((message) => `- ${message}`).join("\n")}`,
    );
  }
}

/** Fail fast on boot when production container env is missing or still uses build placeholders. */
export function validateWebappRuntimeConfigAtStartup(): WebappRuntimeConfig {
  const config = buildWebappRuntimeConfigFromEnv();

  if (process.env.NODE_ENV === "production") {
    assertProductionRuntimeConfig(config);
  }

  return config;
}

/** Canonical public origin for redirects (uses BONDERY_PUBLIC_WEBAPP_URL, not request host). */
export function getWebappPublicOrigin(config: WebappRuntimeConfig): string {
  return new URL(config.webappUrl).origin;
}
