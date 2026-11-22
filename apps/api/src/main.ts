/**
 * Bondery API Server startup. Loaded by `index.ts` after telemetry has started.
 */

import "fastify";
import "./fastify-plugin-types.js";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { detachPromise } from "@bondery/helpers/async";
import { checkEnvVariables } from "@bondery/helpers/env";
import { readBuildMetadata } from "@bondery/helpers/infra/build-metadata";
import { buildApp } from "./build-app.js";
import { buildServer } from "./build-server.js";
import { runDevelopmentBootstrap } from "./lib/bootstrap/dev-startup.js";
import {
  apiCertificateDaysLeft,
  logApiCertificateExpiry,
  resolveListenAddress,
} from "./lib/platform/api-tls.js";
import { getApiRequiredEnvVars } from "./lib/platform/required-env.js";

function assertRequiredEnvAtStartup(): void {
  const environment = (process.env["NODE_ENV"] || "development") as "production" | "development";
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

  const { app: server, tls } = await buildServer();
  const environment = process.env["NODE_ENV"] || "development";
  const { port, host } = resolveListenAddress(server.config, environment);
  const isDevelopment = environment === "development";

  try {
    await server.listen({ host, port });
    const { gitSha, version } = readBuildMetadata();
    const certificateDaysLeft = apiCertificateDaysLeft(tls);
    server.log.info(
      { certificateDaysLeft, gitSha, tlsMinVersion: "TLSv1.3", version },
      `Bondery API running at https://${host}:${port}`,
    );
    logApiCertificateExpiry(server.log, certificateDaysLeft);
    if (isDevelopment) {
      await runDevelopmentBootstrap();
    }
  } catch (error) {
    server.log.error(error);
    process.exitCode = 1;
  }
}

detachPromise(start());

export { buildApp, buildServer };
