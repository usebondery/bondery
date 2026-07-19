/** Runtime public config env var names (never inlined by Next.js — no NEXT_PUBLIC_ prefix). */
export const WEBAPP_RUNTIME_ENV = {
  apiUrl: "BONDERY_PUBLIC_API_URL",
  posthogHost: "BONDERY_PUBLIC_POSTHOG_HOST",
  posthogKey: "BONDERY_PUBLIC_POSTHOG_KEY",
  supabasePublishableKey: "BONDERY_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  supabaseUrl: "BONDERY_PUBLIC_SUPABASE_URL",
  webappUrl: "BONDERY_PUBLIC_WEBAPP_URL",
  websiteUrl: "BONDERY_PUBLIC_WEBSITE_URL",
} as const;

/** Server-only upstream API URL (Compose internal DNS). Never exposed in runtime-config.json. */
export const WEBAPP_INTERNAL_API_URL_ENV = "BONDERY_INFRA_INTERNAL_API_URL";

export const WEBAPP_RUNTIME_REQUIRED_ENV = [
  WEBAPP_RUNTIME_ENV.apiUrl,
  WEBAPP_RUNTIME_ENV.webappUrl,
  WEBAPP_RUNTIME_ENV.websiteUrl,
  WEBAPP_RUNTIME_ENV.supabaseUrl,
  WEBAPP_RUNTIME_ENV.supabasePublishableKey,
] as const;

/** Values baked into the Docker image for build-time static generation only. */
export const WEBAPP_RUNTIME_BUILD_PLACEHOLDERS = {
  apiUrl: "https://api.example.com",
  supabasePublishableKey: "build-placeholder",
  supabaseUrl: "https://example.supabase.co",
  webappUrl: "https://app.example.com",
  websiteUrl: "https://example.com",
} as const;
