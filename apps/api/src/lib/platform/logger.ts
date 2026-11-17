/**
 * Shared Pino logger for library modules that don't have access to
 * the Fastify request or instance logger.
 *
 * Route handlers should prefer `request.log` or `fastify.log` instead.
 */
import { createRequire } from "node:module";
import type { pino as createPino } from "pino";

/*
 * Pino is loaded with `require`, not `import`, on purpose. Log shipping
 * (`telemetry/posthog-logs.ts`) patches Pino as it is required. An ESM `import` of Pino
 * is only patched through a module loader hook, which would intercept every import in
 * the app. Fastify requires Pino the same way, so both loggers are covered.
 */
const require = createRequire(import.meta.url);
const { pino } = require("pino") as { pino: typeof createPino };

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
});

export default logger;
