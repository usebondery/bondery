import { type WebappRuntimeConfig, webappRuntimeConfigSchema } from "@bondery/schemas";
import { normalizeApiBaseUrl } from "@/lib/api/resolveServerApiUrl";
import {
  WEBAPP_RUNTIME_BUILD_PLACEHOLDERS,
  WEBAPP_RUNTIME_ENV,
} from "@/lib/platform/runtimeConfig.env";

const LOCALHOST_OR_LOOPBACK = /localhost|127\.0\.0\.1/i;

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

function assertProductionRuntimeConfig(config: WebappRuntimeConfig): void {
  const errors: string[] = [];

  if (config.apiBaseUrl === WEBAPP_RUNTIME_BUILD_PLACEHOLDERS.apiUrl) {
    errors.push(`${WEBAPP_RUNTIME_ENV.apiUrl} is still the Docker build placeholder`);
  }

  if (config.webappUrl === WEBAPP_RUNTIME_BUILD_PLACEHOLDERS.webappUrl) {
    errors.push(`${WEBAPP_RUNTIME_ENV.webappUrl} is still the Docker build placeholder`);
  }

  if (config.websiteUrl === WEBAPP_RUNTIME_BUILD_PLACEHOLDERS.websiteUrl) {
    errors.push(`${WEBAPP_RUNTIME_ENV.websiteUrl} is still the Docker build placeholder`);
  }

  if (LOCALHOST_OR_LOOPBACK.test(config.webappUrl)) {
    errors.push(`${WEBAPP_RUNTIME_ENV.webappUrl} must not point at localhost in production`);
  }

  if (errors.length > 0) {
    const details = errors.map((message) => `- ${message}`).join("\n");
    throw new Error(`Invalid webapp runtime config:\n${details}`);
  }
}

export function buildWebappRuntimeConfigFromEnv(): WebappRuntimeConfig {
  const apiBaseUrl = normalizeApiBaseUrl(
    requireValue(WEBAPP_RUNTIME_ENV.apiUrl, runtimeEnv(WEBAPP_RUNTIME_ENV.apiUrl)),
  );

  const config = {
    apiBaseUrl,
    gitSha: runtimeEnv("BONDERY_INFRA_GIT_SHA"),
    posthogHost: runtimeEnv(WEBAPP_RUNTIME_ENV.posthogHost),
    posthogKey: runtimeEnv(WEBAPP_RUNTIME_ENV.posthogKey),
    runtimeConfigVersion: 1,
    stripePublishableKey: runtimeEnv(WEBAPP_RUNTIME_ENV.stripePublishableKey),
    version: runtimeEnv("BONDERY_INFRA_VERSION") ?? runtimeEnv("npm_package_version"),
    webappUrl: requireValue(WEBAPP_RUNTIME_ENV.webappUrl, runtimeEnv(WEBAPP_RUNTIME_ENV.webappUrl)),
    websiteUrl: requireValue(
      WEBAPP_RUNTIME_ENV.websiteUrl,
      runtimeEnv(WEBAPP_RUNTIME_ENV.websiteUrl),
    ),
  };

  return webappRuntimeConfigSchema.parse(config);
}

/** Fail fast on boot when production container env is missing or still uses build placeholders. */
export function validateWebappRuntimeConfigAtStartup(): WebappRuntimeConfig {
  const config = buildWebappRuntimeConfigFromEnv();

  if (process.env["NODE_ENV"] === "production") {
    assertProductionRuntimeConfig(config);
  }

  return config;
}

/** Canonical public origin for redirects (uses BONDERY_PUBLIC_WEBAPP_URL, not request host). */
export function getWebappPublicOrigin(config: WebappRuntimeConfig): string {
  return new URL(config.webappUrl).origin;
}
