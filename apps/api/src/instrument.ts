/**
 * Starts telemetry. Imported first by `index.ts`, before anything loads Pino or Fastify.
 */
import { startPosthogLogs } from "./lib/platform/telemetry/posthog-logs.js";

startPosthogLogs();
