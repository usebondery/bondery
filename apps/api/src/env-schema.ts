/** @fastify/env schema and FastifyInstance.config augmentation. */

import { getApiRequiredEnvVars } from "./lib/platform/required-env.js";

export const envSchema = {
  properties: {
    API_HOST: {
      default: "0.0.0.0",
      type: "string",
    },
    API_PORT: {
      default: 26631,
      type: "number",
    },
    BONDERY_INFRA_INTERNAL_SUPABASE_URL: {
      default: "",
      type: "string",
    },
    BONDERY_PRIVATE_ANTHROPIC_API_KEY: {
      default: "",
      type: "string",
    },
    BONDERY_PRIVATE_API_KEY_PEPPER: {
      type: "string",
    },
    BONDERY_PRIVATE_EMAIL_ADDRESS: {
      type: "string",
    },
    BONDERY_PRIVATE_EMAIL_HOST: {
      type: "string",
    },
    BONDERY_PRIVATE_EMAIL_PASS: {
      type: "string",
    },
    BONDERY_PRIVATE_EMAIL_PORT: {
      type: "number",
    },
    BONDERY_PRIVATE_EMAIL_USER: {
      type: "string",
    },
    BONDERY_PRIVATE_MAPS_KEY: {
      default: "",
      type: "string",
    },
    BONDERY_PRIVATE_POLAR_ACCESS_TOKEN: {
      default: "",
      type: "string",
    },
    BONDERY_PRIVATE_POLAR_WEBHOOK_SECRET: {
      default: "",
      type: "string",
    },
    BONDERY_PRIVATE_POSTHOG_API_SECRET: {
      default: "",
      type: "string",
    },
    BONDERY_PRIVATE_POSTHOG_PROJECT_ID: {
      default: "",
      type: "string",
    },
    BONDERY_PRIVATE_REDIS_URL: {
      default: "",
      type: "string",
    },
    BONDERY_PRIVATE_SUPABASE_JWT_SIGNING_JWK: {
      type: "string",
    },
    BONDERY_PRIVATE_SUPABASE_SECRET_KEY: {
      type: "string",
    },
    BONDERY_PUBLIC_API_URL: {
      type: "string",
    },
    BONDERY_PUBLIC_EXTRA_ALLOWED_ORIGINS: {
      default: "",
      type: "string",
    },
    BONDERY_PUBLIC_MAPS_URL: {
      default: "https://api.mapy.com",
      type: "string",
    },
    BONDERY_PUBLIC_POLAR_ENVIRONMENT: {
      default: "production",
      type: "string",
    },
    BONDERY_PUBLIC_POLAR_PRODUCT_ID: {
      default: "",
      type: "string",
    },
    BONDERY_PUBLIC_SUPABASE_PUBLISHABLE_KEY: {
      type: "string",
    },
    BONDERY_PUBLIC_SUPABASE_URL: {
      type: "string",
    },
    BONDERY_PUBLIC_WEBAPP_URL: {
      type: "string",
    },
    BONDERY_PUBLIC_WEBSITE_URL: {
      type: "string",
    },
    LOG_LEVEL: {
      default: "info",
      type: "string",
    },
    SYNC_WAKE_ENABLED: {
      default: "true",
      type: "string",
    },
  },
  // Development always-required set from the manifest (production extras checked at boot).
  required: [...getApiRequiredEnvVars("development")],
  type: "object",
} as const;

declare module "fastify" {
  interface FastifyInstance {
    config: {
      LOG_LEVEL: string;
      BONDERY_PUBLIC_SUPABASE_URL: string;
      BONDERY_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
      BONDERY_PRIVATE_SUPABASE_SECRET_KEY: string;
      BONDERY_INFRA_INTERNAL_SUPABASE_URL: string;
      BONDERY_PUBLIC_WEBAPP_URL: string;
      BONDERY_PUBLIC_WEBSITE_URL: string;
      BONDERY_PUBLIC_API_URL: string;
      BONDERY_PUBLIC_EXTRA_ALLOWED_ORIGINS: string;
      API_PORT: number;
      API_HOST: string;
      BONDERY_PRIVATE_EMAIL_HOST: string;
      BONDERY_PRIVATE_EMAIL_USER: string;
      BONDERY_PRIVATE_EMAIL_PASS: string;
      BONDERY_PRIVATE_EMAIL_ADDRESS: string;
      BONDERY_PRIVATE_EMAIL_PORT: number;
      BONDERY_PRIVATE_POSTHOG_API_SECRET: string;
      BONDERY_PRIVATE_POSTHOG_PROJECT_ID: string;
      BONDERY_PRIVATE_ANTHROPIC_API_KEY: string;
      BONDERY_PRIVATE_POLAR_WEBHOOK_SECRET: string;
      BONDERY_PRIVATE_POLAR_ACCESS_TOKEN: string;
      BONDERY_PUBLIC_POLAR_ENVIRONMENT: string;
      BONDERY_PUBLIC_POLAR_PRODUCT_ID: string;
      BONDERY_PUBLIC_MAPS_URL: string;
      BONDERY_PRIVATE_MAPS_KEY: string;
      BONDERY_PRIVATE_REDIS_URL: string;
      BONDERY_PRIVATE_API_KEY_PEPPER: string;
      BONDERY_PRIVATE_SUPABASE_JWT_SIGNING_JWK: string;
      SYNC_WAKE_ENABLED: string;
    };
  }
}
