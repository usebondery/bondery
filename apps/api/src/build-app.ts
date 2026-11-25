/**
 * Side-effect-free Fastify app factory: plugins, swagger, routes.
 * Use for OpenAPI generation and route tests. No Redis, rate-limit, JWKS verify, or listen.
 */

import { createRequire } from "node:module";
import { BONDERY_STEP_UP_HEADER, IDEMPOTENCY_KEY_HEADER } from "@bondery/helpers/globals/paths";
import { PERMISSIONS_POLICY } from "@bondery/helpers/security/headers";
import { openApiDocumentOpts } from "@bondery/schemas/openapi/document-opts";
import { registerOpenApiComponentSchemas } from "@bondery/schemas/openapi/registry";
import fastifyAuth from "@fastify/auth";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import fastifyEnv from "@fastify/env";
import formbody from "@fastify/formbody";
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
import { redactSensitiveAuthQuery } from "./lib/auth/redact-auth-query.js";
import { registerExtensionVersionCheck } from "./lib/extension/version-check.js";
import type { ApiTlsOptions } from "./lib/platform/api-tls.js";
import { registerAuthStrategies } from "./lib/platform/auth/strategies.js";
import { UPLOAD_LIMITS } from "./lib/platform/config.js";
import { mapErrorToResponse } from "./lib/platform/errors/map-to-response.js";
import type { AppFastifyInstance } from "./lib/platform/fastify-types.js";
import { registerIdempotency } from "./lib/platform/idempotency.js";
import { IDEMPOTENCY_REPLAYED_HEADER } from "./lib/platform/idempotency-policy.js";
import logger from "./lib/platform/logger.js";
import { swaggerOpenApiConfig } from "./openapi/swagger-config.js";
import { registerAllRoutes } from "./routes/register-all.js";
import { captureServerException } from "./services/analytics/capture-server-exception.js";

const LEADING_SLASH_PATTERN = /^\//u;

const require = createRequire(import.meta.url);

function authLogSerializers() {
  return {
    req(request: { hostname?: string; ip?: string; method?: string; url?: string }) {
      return {
        hostname: request.hostname,
        method: request.method,
        remoteAddress: request.ip,
        url: typeof request.url === "string" ? redactSensitiveAuthQuery(request.url) : request.url,
      };
    },
  };
}

function getLoggerConfig(env: string) {
  if (env === "test") {
    return false;
  }

  if (env === "development") {
    try {
      const target = require.resolve("pino-pretty");
      return {
        level: "info",
        serializers: authLogSerializers(),
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

  return { level: "info", serializers: authLogSerializers() };
}

export type BuildAppOptions = {
  /**
   * TLS for the server Fastify creates. The running API always passes it (buildServer); tests
   * and tools that only call `inject()` or read routes leave it out.
   */
  https?: ApiTlsOptions;
};

export async function buildApp(options: BuildAppOptions = {}): Promise<AppFastifyInstance> {
  registerOpenApiComponentSchemas();
  const environment = process.env["NODE_ENV"] || "development";
  const fastify = Fastify({
    https: options.https ?? null,
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
    const [first] = errors;
    const field = first?.instancePath
      ? first.instancePath.replace(LEADING_SLASH_PATTERN, "").replace(/\//gu, ".")
      : dataVar;
    const message = first?.message ?? "Invalid value";
    return new Error(`${field} ${message}`);
  });

  fastify.setErrorHandler((error, request, reply) => {
    const { statusCode, body } = mapErrorToResponse(
      error as Parameters<typeof mapErrorToResponse>[0],
      request,
    );

    // `mapErrorToResponse` already logged a 5xx. A log line notifies nobody, so a failed
    // request also becomes an Error tracking issue. 4xx responses are ignored.
    captureServerException(error, {
      code: body.error.code,
      method: request.method,
      requestId: request.id,
      route: request.routeOptions?.url ?? "unmatched",
      statusCode,
    });

    return reply.status(statusCode).send(body);
  });

  await fastify.register(fastifyEnv, {
    ...(environment === "production"
      ? {}
      : {
          dotenv: {
            path: `${process.cwd()}/.env.development.local`,
          },
        }),
    schema: envSchema,
  });

  await fastify.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    strictTransportSecurity:
      environment === "production" ? { includeSubDomains: true, maxAge: 31_536_000 } : false,
  });

  /**
   * Helmet has no `Permissions-Policy` option. A JSON API has no page to
   * delegate features from, but sending the same value as the website and webapp
   * keeps the header set uniform across the estate and costs nothing.
   *
   * The value comes from the shared module so the three cannot drift apart.
   */
  fastify.addHook("onSend", async (_request, reply) => {
    reply.header("Permissions-Policy", PERMISSIONS_POLICY);
  });

  const extraOrigins = fastify.config.BONDERY_PUBLIC_EXTRA_ALLOWED_ORIGINS
    ? fastify.config.BONDERY_PUBLIC_EXTRA_ALLOWED_ORIGINS.split(",")
        .map((o: string) => o.trim())
        .filter(Boolean)
    : [];
  const ALLOWED_ORIGINS = [
    fastify.config.BONDERY_PUBLIC_WEBAPP_URL,
    fastify.config.BONDERY_PUBLIC_WEBSITE_URL,
    ...extraOrigins,
  ].filter(Boolean);

  await fastify.register(cors, {
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Bondery-Extension-Version",
      BONDERY_STEP_UP_HEADER,
      IDEMPOTENCY_KEY_HEADER,
    ],
    credentials: true,
    exposedHeaders: ["RateLimit", "RateLimit-Policy", "Retry-After", IDEMPOTENCY_REPLAYED_HEADER],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    origin: ALLOWED_ORIGINS,
  });

  await fastify.register(cookie);

  await fastify.register(formbody);

  // Small default ceiling. A route that takes a larger file (ZIP and export imports) names its
  // own cap in UPLOAD_LIMITS and passes it per call, so a new upload route is safe by default.
  await fastify.register(multipart, {
    limits: {
      fileSize: UPLOAD_LIMITS.default,
    },
  });

  await fastify.register(fastifyAuth);
  registerAuthStrategies(fastify);

  registerExtensionVersionCheck(fastify);

  await fastify.register(fastifySwagger, {
    hiddenTag: "Internal",
    openapi: swaggerOpenApiConfig as unknown as OpenAPIV3.Document,
    ...fastifyZodOpenApiTransformers,
  });

  registerIdempotency(fastify);

  await registerAllRoutes(fastify);

  return fastify;
}
