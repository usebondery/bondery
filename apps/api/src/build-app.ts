/**
 * Side-effect-free Fastify app factory: plugins, swagger, routes.
 * Use for OpenAPI generation and route tests. No Redis, JWKS verify, or listen.
 */

import { createRequire } from "node:module";
import { openApiDocumentOpts } from "@bondery/schemas/openapi/document-opts";
import { registerOpenApiComponentSchemas } from "@bondery/schemas/openapi/registry";
import fastifyAuth from "@fastify/auth";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import fastifyEnv from "@fastify/env";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import fastifySwagger from "@fastify/swagger";
import Fastify from "fastify";
import {
  type FastifyZodOpenApiTypeProvider,
  fastifyZodOpenApiPlugin,
  fastifyZodOpenApiTransformers,
  serializerCompiler,
  validatorCompiler,
} from "fastify-zod-openapi";
import type { OpenAPIV3 } from "openapi-types";
import { envSchema } from "./env-schema.js";
import { registerExtensionVersionCheck } from "./lib/extension/version-check.js";
import { registerAuthStrategies } from "./lib/platform/auth/strategies.js";
import { mapErrorToResponse } from "./lib/platform/errors/map-to-response.js";
import type { AppFastifyInstance } from "./lib/platform/fastify-types.js";
import logger from "./lib/platform/logger.js";
import { registerNotFoundRateLimit, registerRateLimit } from "./lib/platform/rate-limit.js";
import { swaggerOpenApiConfig } from "./openapi/swagger-config.js";
import { registerAllRoutes } from "./routes/register-all.js";

const require = createRequire(import.meta.url);

function getLoggerConfig(env: string) {
  if (env === "test") {
    return false;
  }

  if (env === "development") {
    try {
      const target = require.resolve("pino-pretty");
      return {
        level: "info",
        transport: {
          options: {
            colorize: true,
            ignore: "pid,hostname",
            translateTime: "HH:MM:ss Z",
          },
          target,
        },
      };
    } catch (error) {
      logger.warn({ err: error }, "pino-pretty not available, falling back to default logger");
    }
  }

  return { level: "info" };
}

export async function buildApp(): Promise<AppFastifyInstance> {
  registerOpenApiComponentSchemas();
  const environment = process.env.NODE_ENV || "development";
  const fastify = Fastify({
    logger: getLoggerConfig(environment),
    routerOptions: {
      ignoreTrailingSlash: true,
    },
    trustProxy: true,
  }).withTypeProvider<FastifyZodOpenApiTypeProvider>();

  await fastify.register(fastifyZodOpenApiPlugin, {
    documentOpts: openApiDocumentOpts,
  });
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  fastify.setSchemaErrorFormatter((errors, dataVar) => {
    const first = errors[0];
    const field = first?.instancePath
      ? first.instancePath.replace(/^\//, "").replace(/\//g, ".")
      : dataVar;
    const message = first?.message ?? "Invalid value";
    return new Error(`${field} ${message}`);
  });

  fastify.setErrorHandler((error, request, reply) => {
    const { statusCode, body } = mapErrorToResponse(
      error as Parameters<typeof mapErrorToResponse>[0],
      request,
    );
    return reply.status(statusCode).send(body);
  });

  await fastify.register(fastifyEnv, {
    dotenv: {
      path: `${process.cwd()}/.env.development.local`,
    },
    schema: envSchema,
  });

  await fastify.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    strictTransportSecurity:
      environment === "production" ? { includeSubDomains: true, maxAge: 31536000 } : false,
  });

  const extraOrigins = fastify.config.EXTRA_ALLOWED_ORIGINS
    ? fastify.config.EXTRA_ALLOWED_ORIGINS.split(",")
        .map((o: string) => o.trim())
        .filter(Boolean)
    : [];
  const ALLOWED_ORIGINS = [
    fastify.config.NEXT_PUBLIC_WEBAPP_URL,
    fastify.config.NEXT_PUBLIC_WEBSITE_URL,
    ...extraOrigins,
  ].filter(Boolean);

  await fastify.register(cors, {
    allowedHeaders: ["Content-Type", "Authorization", "X-Bondery-Extension-Version"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    origin: ALLOWED_ORIGINS,
  });

  await fastify.register(cookie);

  await fastify.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024,
    },
  });

  await fastify.register(fastifyAuth);
  registerAuthStrategies(fastify);
  await registerRateLimit(fastify);
  registerNotFoundRateLimit(fastify);

  registerExtensionVersionCheck(fastify);

  await fastify.register(fastifySwagger, {
    hiddenTag: "Internal",
    openapi: swaggerOpenApiConfig as unknown as OpenAPIV3.Document,
    ...fastifyZodOpenApiTransformers,
  });

  await registerAllRoutes(fastify);

  return fastify;
}
