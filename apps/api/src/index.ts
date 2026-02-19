/**
 * Bondery API Server
 * Fastify-based REST API for Bondery application
 */

import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import fastifyEnv from "@fastify/env";
import { createRequire } from "module";
import { API_ROUTES } from "@bondery/helpers";

import { contactRoutes } from "./routes/contacts.js";
import { accountRoutes } from "./routes/account.js";
import { settingsRoutes } from "./routes/settings.js";
import { redirectRoutes } from "./routes/redirect.js";
import { feedbackRoutes } from "./routes/feedback.js";
import { reminderRoutes } from "./routes/reminders.js";
import { groupRoutes } from "./routes/groups.js";
import { activityRoutes } from "./routes/activities.js";
import { linkedInImportRoutes } from "./routes/linkedin-import.js";
import { instagramImportRoutes } from "./routes/instagram-import.js";

// Environment variable schema
const envSchema = {
  type: "object",
  required: [
    "PUBLIC_SUPABASE_URL",
    "PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "PRIVATE_SUPABASE_SECRET_KEY",
    "NEXT_PUBLIC_API_URL",
    "PRIVATE_EMAIL_HOST",
    "PRIVATE_EMAIL_USER",
    "PRIVATE_EMAIL_PASS",
    "PRIVATE_EMAIL_ADDRESS",
    "PRIVATE_EMAIL_PORT",
    "PRIVATE_BONDERY_SUPABASE_HTTP_KEY",
  ],
  properties: {
    LOG_LEVEL: {
      type: "string",
      default: "info",
    },
    PUBLIC_SUPABASE_URL: {
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
    PRIVATE_BONDERY_SUPABASE_HTTP_KEY: {
      type: "string",
    },
  },
} as const;

declare module "fastify" {
  interface FastifyInstance {
    config: {
      LOG_LEVEL: string;
      PUBLIC_SUPABASE_URL: string;
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
      PRIVATE_BONDERY_SUPABASE_HTTP_KEY: string;
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
  });

  // Register environment variable validation
  await fastify.register(fastifyEnv, {
    schema: envSchema,
    dotenv: {
      path: `${process.cwd()}/.env.development.local`,
      debug: true,
    },
  });

  // Allowed origins for CORS
  const ALLOWED_ORIGINS = [
    fastify.config.NEXT_PUBLIC_WEBAPP_URL,
    fastify.config.NEXT_PUBLIC_WEBSITE_URL,
    fastify.config.NEXT_PUBLIC_API_URL,
  ].filter(Boolean);

  // Register CORS
  await fastify.register(cors, {
    origin: ALLOWED_ORIGINS,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  });

  // Register cookie parser
  await fastify.register(cookie);

  // Register multipart for file uploads
  await fastify.register(multipart, {
    limits: {
      fileSize: 300 * 1024 * 1024, // 300MB max
    },
  });

  // Health check endpoint
  fastify.get("/status", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  // Register route modules
  await fastify.register(contactRoutes, { prefix: API_ROUTES.CONTACTS });
  await fastify.register(linkedInImportRoutes, { prefix: API_ROUTES.CONTACTS_IMPORT_LINKEDIN });
  await fastify.register(instagramImportRoutes, { prefix: API_ROUTES.CONTACTS_IMPORT_INSTAGRAM });
  await fastify.register(groupRoutes, { prefix: API_ROUTES.GROUPS });
  await fastify.register(accountRoutes, { prefix: API_ROUTES.ACCOUNT });
  await fastify.register(settingsRoutes, { prefix: API_ROUTES.SETTINGS });
  await fastify.register(redirectRoutes, { prefix: API_ROUTES.REDIRECT });
  await fastify.register(feedbackRoutes, { prefix: API_ROUTES.FEEDBACK });
  await fastify.register(reminderRoutes, { prefix: API_ROUTES.REMINDERS });
  await fastify.register(activityRoutes, { prefix: API_ROUTES.ACTIVITIES });

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

// Start server in non-serverless environments
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  start();
}
