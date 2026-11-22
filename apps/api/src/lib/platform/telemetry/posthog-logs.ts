/**
 * Ships Pino warnings and errors to PostHog Logs over OpenTelemetry (OTLP).
 *
 * `startPosthogLogs` must run before `pino` or `fastify` are loaded, because the
 * instrumentation patches Pino as it is required. `src/index.ts` guarantees that order.
 * Do not import the shared logger, Fastify or anything that loads them from this file.
 *
 * Only `require("pino")` is patched. No ESM loader hook is registered, so a logger
 * created from `import { pino } from "pino"` would not be shipped: see `../logger.ts`.
 *
 * It is off without `BONDERY_PUBLIC_POSTHOG_KEY` (local dev, self-hosted) and in tests.
 */
import { readBuildMetadata } from "@bondery/helpers/infra/build-metadata";
import { logs } from "@opentelemetry/api";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { PinoInstrumentation } from "@opentelemetry/instrumentation-pino";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  BatchLogRecordProcessor,
  LoggerProvider,
  type LogRecordExporter,
} from "@opentelemetry/sdk-logs";
import { isTestEnvironment } from "../runtime-env.js";
import { FilteringLogRecordProcessor } from "./filter-log-processor.js";

const TRAILING_SLASHES_PATTERN = /\/+$/;

const DEFAULT_POSTHOG_HOST = "https://eu.i.posthog.com";
const SERVICE_NAME = "bondery-api";

let loggerProvider: LoggerProvider | null = null;

function createPosthogExporter(projectToken: string): LogRecordExporter {
  const host = (process.env.BONDERY_PUBLIC_POSTHOG_HOST || DEFAULT_POSTHOG_HOST).replace(
    TRAILING_SLASHES_PATTERN,
    "",
  );

  return new OTLPLogExporter({
    headers: { Authorization: `Bearer ${projectToken}` },
    url: `${host}/i/v1/logs`,
  });
}

/**
 * Patches Pino so every logger created afterwards also writes to `exporter`.
 * Pass an exporter in tests; production uses the PostHog one.
 *
 * @returns `true` when log shipping was started.
 */
export function startPosthogLogs(exporter?: LogRecordExporter): boolean {
  if (loggerProvider) {
    return true;
  }

  const projectToken = process.env.BONDERY_PUBLIC_POSTHOG_KEY ?? "";
  if (!exporter && (!projectToken || isTestEnvironment())) {
    return false;
  }

  const { gitSha, version } = readBuildMetadata();

  loggerProvider = new LoggerProvider({
    processors: [
      new FilteringLogRecordProcessor(
        new BatchLogRecordProcessor({ exporter: exporter ?? createPosthogExporter(projectToken) }),
      ),
    ],
    resource: resourceFromAttributes({
      "deployment.environment.name": process.env.NODE_ENV || "development",
      "service.name": SERVICE_NAME,
      ...(version ? { "service.version": version } : {}),
      ...(gitSha ? { "vcs.ref.head.revision": gitSha } : {}),
    }),
  });
  logs.setGlobalLoggerProvider(loggerProvider);

  registerInstrumentations({
    // No tracing SDK is running, so there is no trace context to add to log lines.
    instrumentations: [new PinoInstrumentation({ disableLogCorrelation: true })],
    loggerProvider,
  });

  return true;
}

/** Sends the last batch. Call once, after everything else has shut down. */
export async function shutdownPosthogLogs(): Promise<void> {
  const provider = loggerProvider;
  loggerProvider = null;
  if (!provider) {
    return;
  }

  try {
    await provider.shutdown();
  } catch {
    // Best effort: a failed final flush must not block process exit.
  }
}
