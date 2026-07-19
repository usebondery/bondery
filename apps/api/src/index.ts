/**
 * Bondery API Server entry point.
 */

import "fastify";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkEnvVariables } from "@bondery/helpers/env";
import { buildApp } from "./build-app.js";
import { buildServer } from "./build-server.js";
import logger from "./lib/platform/logger.js";
import { getApiRequiredEnvVars } from "./lib/platform/required-env.js";

function resolveListenAddress(config: {
  BONDERY_PUBLIC_API_URL: string;
  API_PORT: number;
  API_HOST: string;
}) {
  const fallbackPort = Number(process.env.PORT) || Number(config.API_PORT) || 26631;
  const fallbackHost = config.API_HOST || "0.0.0.0";

  try {
    const url = new URL(config.BONDERY_PUBLIC_API_URL);
    const urlPort = url.port ? Number(url.port) : undefined;
    return {
      host: fallbackHost,
      port: urlPort || fallbackPort,
    };
  } catch (error) {
    logger.warn({ err: error }, "Invalid BONDERY_PUBLIC_API_URL, using defaults");
    return { host: fallbackHost, port: fallbackPort };
  }
}

function assertRequiredEnvAtStartup(): void {
  const environment = (process.env.NODE_ENV || "development") as "production" | "development";
  const appPath = resolve(dirname(fileURLToPath(import.meta.url)), "..");

  checkEnvVariables({
    appPath,
    environment,
    requiredVars: [...getApiRequiredEnvVars(environment)],
  });
}

async function start() {
  // Fail loud before Fastify boots (mirrors webapp instrumentation.ts).
  // Docker CMD stays `node apps/api/dist/index.js` — validation runs in-process.
  assertRequiredEnvAtStartup();

  const server = await buildServer();
  const { port, host } = resolveListenAddress(server.config);

  try {
    await server.listen({ host, port });
    server.log.info(`Bondery API running at http://${host}:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

export { buildApp, buildServer };

void start();
