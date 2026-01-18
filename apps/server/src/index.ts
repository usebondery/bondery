/**
 * Bondery API Server
 * Fastify-based REST API for Bondery application
 */

import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import fastifyEnv from "@fastify/env";

import { contactRoutes } from "./routes/contacts.js";
import { accountRoutes } from "./routes/account.js";
import { settingsRoutes } from "./routes/settings.js";
import { redirectRoutes } from "./routes/redirect.js";

// Environment variable schema
const envSchema = {
  type: "object",
  required: ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SECRET_KEY"],
  properties: {
    PORT: {
      type: "number",
      default: 3001,
    },
    HOST: {
      type: "string",
      default: "0.0.0.0",
    },
    LOG_LEVEL: {
      type: "string",
      default: "info",
    },
    SUPABASE_URL: {
      type: "string",
    },
    SUPABASE_PUBLISHABLE_KEY: {
      type: "string",
    },
    SUPABASE_SECRET_KEY: {
      type: "string",
    },
    WEBAPP_URL: {
      type: "string",
      default: "https://app.usebondery.com",
    },
    WEBSITE_URL: {
      type: "string",
      default: "https://usebondery.com",
    },
  },
} as const;

declare module "fastify" {
  interface FastifyInstance {
    config: {
      PORT: number;
      HOST: string;
      LOG_LEVEL: string;
      SUPABASE_URL: string;
      SUPABASE_PUBLISHABLE_KEY: string;
      SUPABASE_SECRET_KEY: string;
      WEBAPP_URL: string;
      WEBSITE_URL: string;
    };
  }
}

async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: "info",
    },
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
    fastify.config.WEBAPP_URL,
    fastify.config.WEBSITE_URL,
    // Development origins
    "http://localhost:3000",
    "http://localhost:3002",
  ];

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
      fileSize: 5 * 1024 * 1024, // 5MB max
    },
  });

  // Health check endpoint
  fastify.get("/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  // Register route modules
  await fastify.register(contactRoutes, { prefix: "/api/contacts" });
  await fastify.register(accountRoutes, { prefix: "/api/account" });
  await fastify.register(settingsRoutes, { prefix: "/api/settings" });
  await fastify.register(redirectRoutes, { prefix: "/api/redirect" });

  return fastify;
}

async function start() {
  const server = await buildServer();

  try {
    await server.listen({ port: server.config.PORT, host: server.config.HOST });
    console.log(`🚀 Bondery API Server running at http://${server.config.HOST}:${server.config.PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();
