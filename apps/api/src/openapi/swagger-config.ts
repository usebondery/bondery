/** Static OpenAPI document metadata for @fastify/swagger. */

import { DEV_URLS } from "@bondery/schemas/constants";

export const swaggerOpenApiConfig = {
  components: {
    securitySchemes: {
      apiKeyAuth: {
        bearerFormat: "API Key",
        description:
          "Long-lived API key created in Settings → API keys. " +
          "Format: `bondery_key_<keyId>_<secret>`. " +
          "Only works on integration routes (contacts, groups, tags, interactions, " +
          "imports, share, geocode). Supports `read` (GET/HEAD) or `full` access.",
        scheme: "bearer",
        type: "http",
      },
      bearerAuth: {
        bearerFormat: "JWT",
        description:
          "Supabase session access token from the webapp or mobile app. " +
          "Send as `Authorization: Bearer <access_token>`.",
        scheme: "bearer",
        type: "http",
      },
    },
  },
  info: {
    contact: { name: "Bondery Support", url: "https://usebondery.com" },
    description:
      "REST API for the Bondery application — a contact and relationship management platform.\n\n" +
      "## Authentication\n\n" +
      "Most endpoints require authentication via a Supabase session cookie or a " +
      "Bearer token (session JWT or long-lived API key).\n\n" +
      "**Session auth:** Sign in via the webapp; the browser sends session cookies " +
      "or a Supabase access token.\n\n" +
      "**API keys:** Create keys in Settings → API keys. Send " +
      "`Authorization: Bearer bondery_key_…` on allowed integration routes " +
      "(contacts, groups, tags, interactions, imports, share, geocode). " +
      "Keys support `read` (GET/HEAD) or `full` access. See the authentication guide.\n\n" +
      "Endpoints under `/api/me/api-keys`, `/api/sync`, `/api/chat`, `/api/admin`, " +
      "`/api/subscriptions`, and `/api/extension` do not accept API keys.",
    license: { name: "Proprietary" },
    title: "Bondery API",
    version: "1.0.0",
  },
  openapi: "3.0.3",
  servers: [
    {
      description: "Local development server",
      url: DEV_URLS.api,
    },
    { description: "Production server", url: "https://api.usebondery.com" },
  ],
  tags: [
    {
      description:
        "Liveness and readiness probes. `GET /status` returns 200 when the process is running (no dependency checks). `GET /health` probes Supabase, Redis, and integration config; cached for one minute, rate limited to one request per minute per client; returns 503 when critical dependencies are unavailable.",
      name: "Health",
    },
    { description: "Contact management operations", name: "Contacts" },
    { description: "Group management operations", name: "Groups" },
    { description: "Tag management operations", name: "Tags" },
    { description: "Interaction timeline events", name: "Interactions" },
    { description: "Contact import from social platforms", name: "Import" },
    { description: "Share contacts via email", name: "Share" },
    { description: "Address autocomplete and geocoding proxy", name: "Geocode" },
    {
      description: "Authenticated user profile, settings, and feedback",
      name: "Me",
    },
    {
      description: "Mobile offline sync — bootstrap, pull, and push",
      name: "Sync",
    },
    {
      description: "Browser extension integration endpoints",
      name: "Extension",
    },
    { description: "AI chat assistant", name: "Chat" },
    {
      description: "Subscription and billing management",
      name: "Subscriptions",
    },
    { description: "Admin KPI dashboard metrics", name: "Stats" },
    {
      description: "Inbound webhooks from third-party services",
      name: "Webhooks",
    },
    {
      description: "Service-to-service endpoints (not user-facing)",
      name: "Internal",
    },
  ],
};
