/** @fastify/env schema and FastifyInstance.config augmentation. */

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
    EXTRA_ALLOWED_ORIGINS: {
      default: "",
      type: "string",
    },
    LOG_LEVEL: {
      default: "info",
      type: "string",
    },
    NEXT_PUBLIC_API_URL: {
      type: "string",
    },
    NEXT_PUBLIC_SUPABASE_URL: {
      type: "string",
    },
    NEXT_PUBLIC_WEBAPP_URL: {
      type: "string",
    },
    NEXT_PUBLIC_WEBSITE_URL: {
      type: "string",
    },
    POLAR_PRODUCT_ID: {
      default: "",
      type: "string",
    },
    POSTHOG_API_SECRET: {
      default: "",
      type: "string",
    },
    POSTHOG_PROJECT_ID: {
      default: "",
      type: "string",
    },
    PRIVATE_ANTHROPIC_API_KEY: {
      default: "",
      type: "string",
    },
    PRIVATE_API_KEY_PEPPER: {
      type: "string",
    },
    PRIVATE_EMAIL_ADDRESS: {
      type: "string",
    },
    PRIVATE_EMAIL_HOST: {
      type: "string",
    },
    PRIVATE_EMAIL_PASS: {
      type: "string",
    },
    PRIVATE_EMAIL_PORT: {
      type: "number",
    },
    PRIVATE_EMAIL_USER: {
      type: "string",
    },
    PRIVATE_MAPS_KEY: {
      default: "",
      type: "string",
    },
    PRIVATE_POLAR_ACCESS_TOKEN: {
      default: "",
      type: "string",
    },
    PRIVATE_POLAR_WEBHOOK_SECRET: {
      default: "",
      type: "string",
    },
    PRIVATE_REDIS_URL: {
      default: "",
      type: "string",
    },
    PRIVATE_SUPABASE_JWT_SIGNING_JWK: {
      type: "string",
    },
    PRIVATE_SUPABASE_SECRET_KEY: {
      type: "string",
    },
    PUBLIC_MAPS_URL: {
      default: "https://api.mapy.com",
      type: "string",
    },
    PUBLIC_POLAR_ENVIRONMENT: {
      default: "production",
      type: "string",
    },
    PUBLIC_SUPABASE_PUBLISHABLE_KEY: {
      type: "string",
    },
    SYNC_WAKE_ENABLED: {
      default: "true",
      type: "string",
    },
  },
  required: [
    "NEXT_PUBLIC_SUPABASE_URL",
    "PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "PRIVATE_SUPABASE_SECRET_KEY",
    "NEXT_PUBLIC_API_URL",
    "PRIVATE_API_KEY_PEPPER",
    "PRIVATE_SUPABASE_JWT_SIGNING_JWK",
    "PRIVATE_EMAIL_HOST",
    "PRIVATE_EMAIL_USER",
    "PRIVATE_EMAIL_PASS",
    "PRIVATE_EMAIL_ADDRESS",
    "PRIVATE_EMAIL_PORT",
  ],
  type: "object",
} as const;

declare module "fastify" {
  interface FastifyInstance {
    config: {
      LOG_LEVEL: string;
      NEXT_PUBLIC_SUPABASE_URL: string;
      PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
      PRIVATE_SUPABASE_SECRET_KEY: string;
      NEXT_PUBLIC_WEBAPP_URL: string;
      NEXT_PUBLIC_WEBSITE_URL: string;
      NEXT_PUBLIC_API_URL: string;
      EXTRA_ALLOWED_ORIGINS: string;
      API_PORT: number;
      API_HOST: string;
      PRIVATE_EMAIL_HOST: string;
      PRIVATE_EMAIL_USER: string;
      PRIVATE_EMAIL_PASS: string;
      PRIVATE_EMAIL_ADDRESS: string;
      PRIVATE_EMAIL_PORT: number;
      POSTHOG_API_SECRET: string;
      POSTHOG_PROJECT_ID: string;
      PRIVATE_ANTHROPIC_API_KEY: string;
      PRIVATE_POLAR_WEBHOOK_SECRET: string;
      PRIVATE_POLAR_ACCESS_TOKEN: string;
      PUBLIC_POLAR_ENVIRONMENT: string;
      POLAR_PRODUCT_ID: string;
      PUBLIC_MAPS_URL: string;
      PRIVATE_MAPS_KEY: string;
      PRIVATE_REDIS_URL: string;
      PRIVATE_API_KEY_PEPPER: string;
      PRIVATE_SUPABASE_JWT_SIGNING_JWK: string;
      SYNC_WAKE_ENABLED: string;
    };
  }
}
