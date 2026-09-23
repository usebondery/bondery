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
    BONDERY_PRIVATE_ANTHROPIC_API_KEY: {
      default: "",
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
    BONDERY_PRIVATE_EMAIL_REPLY_TO: {
      type: "string",
    },
    BONDERY_PRIVATE_EMAIL_USER: {
      type: "string",
    },
    BONDERY_PRIVATE_MAPS_KEY: {
      default: "",
      type: "string",
    },
    BONDERY_PRIVATE_REDIS_URL: {
      default: "",
      type: "string",
    },
    BONDERY_PRIVATE_S3_ACCESS_KEY_ID: {
      type: "string",
    },
    BONDERY_PRIVATE_S3_ENDPOINT: {
      type: "string",
    },
    BONDERY_PRIVATE_S3_REGION: {
      default: "eu-central-1",
      type: "string",
    },
    BONDERY_PRIVATE_S3_SECRET_ACCESS_KEY: {
      type: "string",
    },
    BONDERY_PRIVATE_SERVICE_SECRET: {
      default: "",
      type: "string",
    },
    BONDERY_PRIVATE_STRIPE_SECRET_KEY: {
      default: "",
      type: "string",
    },
    BONDERY_PRIVATE_STRIPE_WEBHOOK_SECRET: {
      default: "",
      type: "string",
    },
    BONDERY_PUBLIC_API_URL: {
      type: "string",
    },
    BONDERY_PUBLIC_BILLING_UPGRADES_ENABLED: {
      default: "false",
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
    BONDERY_PUBLIC_POSTHOG_HOST: {
      default: "https://eu.i.posthog.com",
      type: "string",
    },
    BONDERY_PUBLIC_POSTHOG_KEY: {
      default: "",
      type: "string",
    },
    BONDERY_PUBLIC_STORAGE_URL: {
      type: "string",
    },
    BONDERY_PUBLIC_STRIPE_PRICE_ID_ANNUAL: {
      default: "",
      type: "string",
    },
    BONDERY_PUBLIC_STRIPE_PRICE_ID_MONTHLY: {
      default: "",
      type: "string",
    },
    BONDERY_PUBLIC_STRIPE_PUBLISHABLE_KEY: {
      default: "",
      type: "string",
    },
    BONDERY_PUBLIC_WEBAPP_URL: {
      type: "string",
    },
    BONDERY_PUBLIC_WEBAUTHN_RP_ID: {
      default: "",
      type: "string",
    },
    BONDERY_PUBLIC_WEBSITE_URL: {
      type: "string",
    },
    DATABASE_URL: {
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
      BONDERY_PUBLIC_WEBAPP_URL: string;
      BONDERY_PUBLIC_WEBAUTHN_RP_ID: string;
      BONDERY_PUBLIC_WEBSITE_URL: string;
      BONDERY_PUBLIC_API_URL: string;
      BONDERY_PUBLIC_EXTRA_ALLOWED_ORIGINS: string;
      API_PORT: number;
      API_HOST: string;
      DATABASE_URL: string;
      BONDERY_PRIVATE_EMAIL_HOST: string;
      BONDERY_PRIVATE_EMAIL_USER: string;
      BONDERY_PRIVATE_EMAIL_PASS: string;
      BONDERY_PRIVATE_EMAIL_ADDRESS: string;
      BONDERY_PRIVATE_EMAIL_REPLY_TO: string;
      BONDERY_PRIVATE_EMAIL_PORT: number;
      BONDERY_PUBLIC_POSTHOG_HOST: string;
      BONDERY_PUBLIC_POSTHOG_KEY: string;
      BONDERY_PRIVATE_ANTHROPIC_API_KEY: string;
      BONDERY_PRIVATE_STRIPE_SECRET_KEY: string;
      BONDERY_PRIVATE_STRIPE_WEBHOOK_SECRET: string;
      BONDERY_PUBLIC_BILLING_UPGRADES_ENABLED: string;
      BONDERY_PUBLIC_STRIPE_PRICE_ID_ANNUAL: string;
      BONDERY_PUBLIC_STRIPE_PRICE_ID_MONTHLY: string;
      BONDERY_PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
      BONDERY_PUBLIC_STORAGE_URL: string;
      BONDERY_PUBLIC_MAPS_URL: string;
      BONDERY_PRIVATE_MAPS_KEY: string;
      BONDERY_PRIVATE_REDIS_URL: string;
      BONDERY_PRIVATE_S3_ACCESS_KEY_ID: string;
      BONDERY_PRIVATE_S3_ENDPOINT: string;
      BONDERY_PRIVATE_S3_REGION: string;
      BONDERY_PRIVATE_S3_SECRET_ACCESS_KEY: string;
      BONDERY_PRIVATE_SERVICE_SECRET: string;
      SYNC_WAKE_ENABLED: string;
    };
  }
}
