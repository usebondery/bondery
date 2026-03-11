/**
 * Shared Pino logger for library modules that don't have access to
 * the Fastify request or instance logger.
 *
 * Route handlers should prefer `request.log` or `fastify.log` instead.
 */
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
});

export default logger;
