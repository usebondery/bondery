/**
 * Bondery API Server
 * Fastify-based REST API for Bondery application
 */

import Fastify from "fastify";
import type { FastifyError } from "fastify";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import fastifyEnv from "@fastify/env";
import helmet from "@fastify/helmet";
import fastifyAuth from "@fastify/auth";
import fastifySwagger from "@fastify/swagger";
import { createRequire } from "module";
import { API_ROUTES, CHROME_EXTENSION_URL, MIN_EXTENSION_VERSION } from "@bondery/helpers";
import { registerAuthStrategies } from "./lib/auth.js";
import { registerExtensionVersionCheck } from "./lib/extensionVersionCheck.js";

import { contactRoutes } from "./routes/contacts/index.js";
import { meRoutes } from "./routes/me/index.js";
import { meSettingsRoutes } from "./routes/me/settings/index.js";
import { extensionRoutes } from "./routes/extension/index.js";
import { meFeedbackRoutes } from "./routes/me/feedback/index.js";
import { reminderDigestRoutes } from "./routes/internal/reminder-digest.js";
import { groupRoutes } from "./routes/groups/index.js";
import { tagRoutes } from "./routes/tags/index.js";
import { interactionRoutes } from "./routes/interactions/index.js";
import { linkedInImportRoutes } from "./routes/import/linkedin/index.js";
import { instagramImportRoutes } from "./routes/import/instagram/index.js";
import { vcardImportRoutes } from "./routes/import/vcard/index.js";
import { shareRoutes } from "./routes/contacts/share/index.js";
import { statsRoutes } from "./routes/admin/stats/index.js";

// Environment variable schema
const envSchema = {
  type: "object",
  required: [
    "NEXT_PUBLIC_SUPABASE_URL",
    "PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "PRIVATE_SUPABASE_SECRET_KEY",
    "NEXT_PUBLIC_API_URL",
    "PRIVATE_EMAIL_HOST",
    "PRIVATE_EMAIL_USER",
    "PRIVATE_EMAIL_PASS",
    "PRIVATE_EMAIL_ADDRESS",
    "PRIVATE_EMAIL_PORT",
  ],
  properties: {
    LOG_LEVEL: {
      type: "string",
      default: "info",
    },
    NEXT_PUBLIC_SUPABASE_URL: {
      type: "string",
    },
    PUBLIC_SUPABASE_PUBLISHABLE_KEY: {
      type: "string",
    },
    PRIVATE_SUPABASE_SECRET_KEY: {
      type: "string",
    },
    NEXT_PUBLIC_WEBAPP_URL: {
      type: "string",
    },
    NEXT_PUBLIC_WEBSITE_URL: {
      type: "string",
    },
    NEXT_PUBLIC_API_URL: {
      type: "string",
    },
    API_PORT: {
      type: "number",
      default: 3000,
    },
    API_HOST: {
      type: "string",
      default: "0.0.0.0",
    },
    PRIVATE_EMAIL_HOST: {
      type: "string",
    },
    PRIVATE_EMAIL_USER: {
      type: "string",
    },
    PRIVATE_EMAIL_PASS: {
      type: "string",
    },
    PRIVATE_EMAIL_ADDRESS: {
      type: "string",
    },
    PRIVATE_EMAIL_PORT: {
      type: "number",
    },
    MAPS_URL: {
      type: "string",
      default: "https://api.mapy.com",
    },
    MAPS_KEY: {
      type: "string",
      default: "",
    },
    POSTHOG_API_SECRET: {
      type: "string",
      default: "",
    },
    POSTHOG_PROJECT_ID: {
      type: "string",
      default: "",
    },
  },
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
      API_PORT: number;
      API_HOST: string;
      PRIVATE_EMAIL_HOST: string;
      PRIVATE_EMAIL_USER: string;
      PRIVATE_EMAIL_PASS: string;
      PRIVATE_EMAIL_ADDRESS: string;
      PRIVATE_EMAIL_PORT: number;
      POSTHOG_API_SECRET: string;
      POSTHOG_PROJECT_ID: string;
    };
  }
}

function resolveListenAddress(config: {
  NEXT_PUBLIC_API_URL: string;
  API_PORT: number;
  API_HOST: string;
}) {
  const fallbackPort = Number(process.env.PORT) || Number(config.API_PORT) || 3000;
  const fallbackHost = config.API_HOST || "0.0.0.0";

  try {
    const url = new URL(config.NEXT_PUBLIC_API_URL);
    const urlPort = url.port ? Number(url.port) : undefined;
    return {
      port: urlPort || fallbackPort,
      host: fallbackHost,
    };
  } catch (error) {
    console.warn("Invalid NEXT_PUBLIC_API_URL, using defaults", error);
    return { port: fallbackPort, host: fallbackHost };
  }
}

const require = createRequire(import.meta.url);

function getLoggerConfig(env: string) {
  if (env === "test") return false;

  if (env === "development") {
    try {
      // Pino v9+ pretty logging via transport
      const target = require.resolve("pino-pretty");
      return {
        level: "info",
        transport: {
          target,
          options: {
            translateTime: "HH:MM:ss Z",
            ignore: "pid,hostname",
            colorize: true,
          },
        },
      };
    } catch (error) {
      console.warn("pino-pretty not available, falling back to default logger", error);
    }
  }

  return { level: "info" };
}

async function buildServer() {
  const environment = process.env.NODE_ENV || "development";
  const fastify = Fastify({
    logger: getLoggerConfig(environment),
    routerOptions: {
      ignoreTrailingSlash: true,
    },
    ajv: {
      customOptions: {
        removeAdditional: true,
        coerceTypes: true,
      },
    },
  }).withTypeProvider<TypeBoxTypeProvider>();

  // Custom schema error formatter to match existing { error: "..." } response format
  fastify.setSchemaErrorFormatter((errors, dataVar) => {
    const first = errors[0];
    const field = first?.instancePath
      ? first.instancePath.replace(/^\//, "").replace(/\//g, ".")
      : dataVar;
    const message = first?.message ?? "Invalid value";
    return new Error(`${field} ${message}`);
  });

  // Custom error handler for validation errors
  fastify.setErrorHandler((error: FastifyError, _request, reply) => {
    if (error.validation) {
      return reply.status(400).send({ error: error.message });
    }
    reply.status(error.statusCode ?? 500).send({ error: error.message });
  });

  // Register environment variable validation
  await fastify.register(fastifyEnv, {
    schema: envSchema,
    dotenv: {
      path: `${process.cwd()}/.env.development.local`,
    },
  });

  // Register security headers
  await fastify.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    strictTransportSecurity:
      environment === "production" ? { maxAge: 31536000, includeSubDomains: true } : false,
  });

  // Allowed origins for CORS
  const ALLOWED_ORIGINS = [
    fastify.config.NEXT_PUBLIC_WEBAPP_URL,
    fastify.config.NEXT_PUBLIC_WEBSITE_URL,
  ].filter(Boolean);

  // Register CORS
  await fastify.register(cors, {
    origin: ALLOWED_ORIGINS,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Bondery-Extension-Version"],
  });

  // Register cookie parser
  await fastify.register(cookie);

  // Register multipart for file uploads
  await fastify.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB max
    },
  });

  // Register auth plugin and strategies
  await fastify.register(fastifyAuth);
  registerAuthStrategies(fastify);

  // Register extension version enforcement (426 Upgrade Required for outdated extensions)
  registerExtensionVersionCheck(fastify);

  // Register OpenAPI spec generator
  await fastify.register(fastifySwagger, {
    openapi: {
      openapi: "3.0.3",
      info: {
        title: "Bondery API",
        description:
          "REST API for the Bondery application — a contact and relationship management platform.\n\n" +
          "## Authentication\n\n" +
          "All endpoints (except `/status` and `GET /api/extension`) require authentication " +
          "via a Supabase session cookie or a Bearer token in the Authorization header.",
        version: "1.0.0",
        contact: { name: "Bondery Support", url: "https://usebondery.com" },
        license: { name: "Proprietary" },
      },
      servers: [
        { url: "http://localhost:3001", description: "Local development server" },
        { url: "https://api.usebondery.com", description: "Production server" },
      ],
      tags: [
        { name: "Health", description: "Server health check endpoints" },
        { name: "Contacts", description: "Contact management operations" },
        { name: "Groups", description: "Group management operations" },
        { name: "Tags", description: "Tag management operations" },
        { name: "Interactions", description: "Interaction timeline events" },
        { name: "Import", description: "Contact import from social platforms" },
        { name: "Me", description: "Authenticated user profile, settings, and feedback" },
        { name: "Extension", description: "Browser extension integration endpoints" },
        { name: "Internal", description: "Service-to-service endpoints (not user-facing)" },
        { name: "Share", description: "Share contacts via email" },
        { name: "Stats", description: "Admin KPI dashboard metrics" },
      ],
    },
  });

  // Health check endpoint
  fastify.get("/status", { schema: { tags: ["Health"] } }, async () => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      extension: {
        minVersion: MIN_EXTENSION_VERSION,
        storeUrl: CHROME_EXTENSION_URL,
      },
    };
  });

  // Register route modules
  await fastify.register(contactRoutes, { prefix: API_ROUTES.CONTACTS });
  await fastify.register(linkedInImportRoutes, { prefix: API_ROUTES.CONTACTS_IMPORT_LINKEDIN });
  await fastify.register(instagramImportRoutes, { prefix: API_ROUTES.CONTACTS_IMPORT_INSTAGRAM });
  await fastify.register(vcardImportRoutes, { prefix: API_ROUTES.CONTACTS_IMPORT_VCARD });
  await fastify.register(groupRoutes, { prefix: API_ROUTES.GROUPS });
  await fastify.register(tagRoutes, { prefix: API_ROUTES.TAGS });
  await fastify.register(meRoutes, { prefix: API_ROUTES.ME });
  await fastify.register(meSettingsRoutes, { prefix: API_ROUTES.ME_SETTINGS });
  await fastify.register(extensionRoutes, { prefix: API_ROUTES.EXTENSION });
  await fastify.register(meFeedbackRoutes, { prefix: API_ROUTES.ME_FEEDBACK });
  await fastify.register(reminderDigestRoutes, { prefix: API_ROUTES.INTERNAL_REMINDER_DIGEST });
  await fastify.register(interactionRoutes, { prefix: API_ROUTES.INTERACTIONS });
  await fastify.register(shareRoutes, { prefix: API_ROUTES.CONTACTS_SHARE });
  await fastify.register(statsRoutes, { prefix: API_ROUTES.ADMIN_STATS });

  return fastify;
}

async function start() {
  const server = await buildServer();
  const { port, host } = resolveListenAddress(server.config);

  try {
    await server.listen({ port, host });
    console.log(`🚀 Bondery API Server running at http://${host}:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

// Export for Vercel serverless
export { buildServer };

// Vercel serverless handler
let serverPromise: ReturnType<typeof buildServer> | null = null;

export default async function handler(req: any, res: any) {
  // Reuse server instance for warm starts
  if (!serverPromise) {
    serverPromise = buildServer();
  }
  const server = await serverPromise;
  await server.ready();
  server.server.emit("request", req, res);
}

// Start server in non-serverless environments (skip during OpenAPI generation)
if (
  (process.env.NODE_ENV !== "production" || !process.env.VERCEL) &&
  !process.env.GENERATE_OPENAPI
) {
  start();
}
